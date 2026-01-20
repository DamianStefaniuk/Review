#!/usr/bin/env python3
"""
Jira to Gist Sync Script

Synchronizes sprint data from Jira to GitHub Gist.
Preserves existing comments when updating sprint data.

Environment variables required:
- JIRA_URL: Base URL of Jira instance
- JIRA_EMAIL: Email for Jira authentication
- JIRA_API_TOKEN: API token for Jira authentication
- JIRA_PROJECT_KEY: Jira project key
- JIRA_BOARD_ID: Jira board ID
- GIST_ID: GitHub Gist ID
- GIST_TOKEN: GitHub Personal Access Token with 'gist' scope

Usage:
    python sync_jira_to_gist.py [--sprint-id SPRINT_ID]
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

import requests
from dotenv import load_dotenv

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from utils.jira_parser import (
    parse_sprint_description,
    map_task_to_goal,
    calculate_goal_progress
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class GistClient:
    """Client for GitHub Gist API."""

    def __init__(self):
        self.gist_id = os.getenv('GIST_ID', '')
        self.token = os.getenv('GIST_TOKEN', '')
        self.api_url = 'https://api.github.com'

        if not self.gist_id or not self.token:
            logger.error("Missing Gist configuration. Set GIST_ID and GIST_TOKEN as repository secrets.")
            sys.exit(1)

        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        })

    def get_gist(self) -> Optional[Dict]:
        """Get Gist data."""
        try:
            response = self.session.get(f'{self.api_url}/gists/{self.gist_id}')
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get Gist: {e}")
            return None

    def get_file(self, filename: str) -> Optional[Dict]:
        """Get file content from Gist."""
        gist = self.get_gist()
        if not gist:
            return None

        files = gist.get('files', {})
        if filename not in files:
            return None

        file_data = files[filename]

        # Handle truncated content
        if file_data.get('truncated') and file_data.get('raw_url'):
            try:
                response = self.session.get(file_data['raw_url'])
                response.raise_for_status()
                return json.loads(response.text)
            except Exception as e:
                logger.error(f"Failed to get raw content: {e}")
                return None

        try:
            return json.loads(file_data.get('content', '{}'))
        except json.JSONDecodeError:
            return None

    def update_file(self, filename: str, content: Any) -> bool:
        """Update file in Gist."""
        try:
            payload = {
                'files': {
                    filename: {
                        'content': json.dumps(content, ensure_ascii=False, indent=2)
                    }
                }
            }
            response = self.session.patch(
                f'{self.api_url}/gists/{self.gist_id}',
                json=payload
            )
            response.raise_for_status()
            logger.info(f"Updated {filename} in Gist")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to update Gist file: {e}")
            return False


class JiraClient:
    """Client for Jira REST API."""

    def __init__(self):
        self.base_url = os.getenv('JIRA_URL', '').rstrip('/')
        self.email = os.getenv('JIRA_EMAIL', '')
        self.api_token = os.getenv('JIRA_API_TOKEN', '')
        self.project_key = os.getenv('JIRA_PROJECT_KEY', '')
        self.board_id = os.getenv('JIRA_BOARD_ID', '')

        if not all([self.base_url, self.email, self.api_token, self.project_key, self.board_id]):
            logger.warning("Missing Jira configuration. Set environment variables.")

        self.session = requests.Session()
        self.session.auth = (self.email, self.api_token)
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make API request to Jira."""
        url = f"{self.base_url}/rest/agile/1.0/{endpoint}"

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json() if response.content else None
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return None

    def _request_v2(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make API request to Jira REST API v2."""
        url = f"{self.base_url}/rest/api/2/{endpoint}"

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json() if response.content else None
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None

    def get_active_sprint(self) -> Optional[Dict]:
        """Get the currently active sprint for the board."""
        result = self._request('GET', f'board/{self.board_id}/sprint', params={'state': 'active'})
        if result and result.get('values'):
            return result['values'][0]
        return None

    def get_sprint(self, sprint_id: int) -> Optional[Dict]:
        """Get sprint details by ID."""
        return self._request('GET', f'sprint/{sprint_id}')

    def get_sprint_issues(self, sprint_id: int) -> List[Dict]:
        """Get all issues in a sprint."""
        issues = []
        start_at = 0
        max_results = 100

        while True:
            result = self._request(
                'GET',
                f'sprint/{sprint_id}/issue',
                params={
                    'startAt': start_at,
                    'maxResults': max_results,
                    'fields': 'summary,status,labels,assignee,customfield_10014'
                }
            )

            if not result or not result.get('issues'):
                break

            issues.extend(result['issues'])

            if len(result['issues']) < max_results:
                break

            start_at += max_results

        return issues

    def get_epic_name(self, epic_key: str) -> Optional[str]:
        """Get epic name by key."""
        result = self._request_v2('GET', f'issue/{epic_key}', params={'fields': 'summary'})
        if result:
            return result.get('fields', {}).get('summary')
        return None


def transform_issue(issue: Dict, epic_cache: Dict[str, str], jira_client: JiraClient) -> Dict:
    """Transform Jira issue to task format."""
    fields = issue.get('fields', {})

    # Get epic name
    epic_key = fields.get('customfield_10014')
    epic_name = None
    if epic_key:
        if epic_key not in epic_cache:
            epic_cache[epic_key] = jira_client.get_epic_name(epic_key)
        epic_name = epic_cache.get(epic_key)

    # Get assignee
    assignee = None
    if fields.get('assignee'):
        assignee = fields['assignee'].get('displayName', fields['assignee'].get('name'))

    return {
        'key': issue['key'],
        'summary': fields.get('summary', ''),
        'status': fields.get('status', {}).get('name', 'To Do'),
        'labels': fields.get('labels', []),
        'epic': epic_name,
        'assignee': assignee
    }


def build_sprint_data(
    sprint: Dict,
    tasks: List[Dict],
    existing_data: Optional[Dict] = None
) -> Dict:
    """Build sprint data structure from Jira data."""
    description = sprint.get('goal', '') or ''
    parsed = parse_sprint_description(description)

    goals = []
    for goal_data in parsed['goals']:
        goal_tasks = []
        for task in tasks:
            task_tag = map_task_to_goal(task['labels'], [goal_data])
            if task_tag == goal_data['tag']:
                goal_tasks.append(task['key'])

        progress = calculate_goal_progress([t for t in tasks if t['key'] in goal_tasks])

        # Preserve existing comments
        existing_comments = []
        if existing_data:
            existing_goal = next(
                (g for g in existing_data.get('goals', []) if g['id'] == goal_data['id']),
                None
            )
            if existing_goal:
                existing_comments = existing_goal.get('comments', [])

        goals.append({
            'id': goal_data['id'],
            'title': goal_data['title'],
            'client': goal_data['client'],
            'tag': goal_data['tag'],
            'completed': progress == 100,
            'completionPercent': progress,
            'tasks': goal_tasks,
            'comments': existing_comments
        })

    achievements = []
    for ach_data in parsed['achievements']:
        achievements.append({
            'id': ach_data['id'],
            'title': ach_data['title'],
            'client': ach_data['client'],
            'completed': ach_data.get('completed', False)
        })

    status = 'active'
    if sprint.get('state', '').lower() == 'closed':
        status = 'closed'

    start_date = sprint.get('startDate', '')
    end_date = sprint.get('endDate', '')

    if start_date:
        start_date = start_date.split('T')[0]
    if end_date:
        end_date = end_date.split('T')[0]

    jira_url = os.getenv('JIRA_URL', '').rstrip('/')
    board_id = os.getenv('JIRA_BOARD_ID', '')
    timeline_url = f"{jira_url}/jira/software/projects/{os.getenv('JIRA_PROJECT_KEY')}/boards/{board_id}/timeline"

    # Preserve existing nextSprintPlans (editable from web UI)
    existing_next_plans = existing_data.get('nextSprintPlans', '') if existing_data else ''

    return {
        'id': sprint['id'],
        'name': sprint.get('name', f"Sprint {sprint['id']}"),
        'status': status,
        'startDate': start_date,
        'endDate': end_date,
        'goals': goals,
        'achievements': achievements,
        'tasks': tasks,
        'nextSprintPlans': existing_next_plans,
        'jiraTimelineUrl': timeline_url,
        'closedAt': existing_data.get('closedAt') if existing_data else None
    }


def main():
    parser = argparse.ArgumentParser(description='Sync Jira sprint data to Gist')
    parser.add_argument(
        '--sprint-id',
        type=int,
        help='Specific sprint ID to sync (default: active sprint)'
    )
    args = parser.parse_args()

    # Initialize clients
    jira_client = JiraClient()
    gist_client = GistClient()

    # Verify Gist connection
    if not gist_client.get_gist():
        logger.error("Cannot connect to Gist. Check GIST_ID and GIST_TOKEN.")
        sys.exit(1)

    # Get sprint to sync
    if args.sprint_id:
        sprint = jira_client.get_sprint(args.sprint_id)
        if not sprint:
            logger.error(f"Sprint {args.sprint_id} not found")
            sys.exit(1)
    else:
        sprint = jira_client.get_active_sprint()
        if not sprint:
            logger.warning("No active sprint found")
            sys.exit(0)

    sprint_id = sprint['id']
    logger.info(f"Syncing sprint: {sprint.get('name', sprint_id)}")

    # Get sprint issues
    issues = jira_client.get_sprint_issues(sprint_id)
    logger.info(f"Found {len(issues)} issues")

    # Transform issues to tasks
    epic_cache = {}
    tasks = [transform_issue(issue, epic_cache, jira_client) for issue in issues]

    # Load existing sprint data from Gist to preserve comments
    existing_data = gist_client.get_file(f'sprint-{sprint_id}.json')

    # Build sprint data
    sprint_data = build_sprint_data(sprint, tasks, existing_data)

    # Save sprint data to Gist
    if not gist_client.update_file(f'sprint-{sprint_id}.json', sprint_data):
        logger.error("Failed to save sprint data to Gist")
        sys.exit(1)

    # Update current sprint info
    is_active = sprint.get('state', '').lower() == 'active'
    current_sprint_info = {
        'currentSprintId': sprint_id,
        'isActive': is_active
    }

    if not gist_client.update_file('current-sprint.json', current_sprint_info):
        logger.error("Failed to update current sprint info in Gist")
        sys.exit(1)

    logger.info("Sync completed successfully")


if __name__ == '__main__':
    main()
