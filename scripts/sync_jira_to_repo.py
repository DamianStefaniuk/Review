#!/usr/bin/env python3
"""
Jira to Repository Sync Script

Synchronizes sprint data from Jira to private GitHub repository (Review-Data).
Preserves existing comments when updating sprint data.

Environment variables required:
- JIRA_URL: Base URL of Jira instance
- JIRA_EMAIL: Email for Jira authentication
- JIRA_API_TOKEN: API token for Jira authentication
- JIRA_PROJECT_KEY: Jira project key
- JIRA_BOARD_ID: Jira board ID
- DATA_REPO_OWNER: GitHub organization/user owning the data repository
- DATA_REPO_NAME: Name of the data repository
- DATA_REPO_TOKEN: GitHub Personal Access Token with 'repo' scope

Usage:
    python sync_jira_to_repo.py [--sprint-id SPRINT_ID]
"""

import os
import sys
import json
import argparse
import logging
import base64
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
    map_task_to_side_goal,
    calculate_goal_progress
)
from utils.status_mapper import map_jira_status

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class RepoClient:
    """Client for GitHub Repository Contents API."""

    def __init__(self):
        self.owner = os.getenv('DATA_REPO_OWNER', 'plumspzoo')
        self.repo = os.getenv('DATA_REPO_NAME', 'Review-Data')
        self.token = os.getenv('DATA_REPO_TOKEN', '')
        self.api_url = 'https://api.github.com'
        self.data_path = 'sprints'

        if not self.token:
            logger.error("Missing repository configuration. Set DATA_REPO_TOKEN as repository secret.")
            sys.exit(1)

        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        })

    def _get_file_url(self, filename: str, in_data_path: bool = True) -> str:
        """Get API URL for a file."""
        if in_data_path:
            return f'{self.api_url}/repos/{self.owner}/{self.repo}/contents/{self.data_path}/{filename}'
        return f'{self.api_url}/repos/{self.owner}/{self.repo}/contents/{filename}'

    def get_file(self, filename: str, in_data_path: bool = True) -> Optional[Dict]:
        """Get file content from repository."""
        try:
            url = self._get_file_url(filename, in_data_path)
            response = self.session.get(url)

            if response.status_code == 404:
                return None

            response.raise_for_status()
            data = response.json()

            # Decode base64 content
            content = base64.b64decode(data['content']).decode('utf-8')
            return {
                'content': json.loads(content),
                'sha': data['sha']
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get file {filename}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON in {filename}: {e}")
            return None

    def update_file(self, filename: str, content: Any, sha: str = None, in_data_path: bool = True) -> bool:
        """Update or create file in repository."""
        try:
            url = self._get_file_url(filename, in_data_path)

            # Encode content to base64
            content_str = json.dumps(content, ensure_ascii=False, indent=2)
            content_b64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')

            payload = {
                'message': f'Update {filename}',
                'content': content_b64
            }

            if sha:
                payload['sha'] = sha

            response = self.session.put(url, json=payload)
            response.raise_for_status()
            logger.info(f"Updated {filename} in repository")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to update file {filename}: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return False

    def verify_connection(self) -> bool:
        """Verify connection to repository."""
        try:
            url = f'{self.api_url}/repos/{self.owner}/{self.repo}'
            response = self.session.get(url)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to connect to repository: {e}")
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
        'status': map_jira_status(fields.get('status', {})),
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
            'completed': progress['percent'] == 100,
            'completionPercent': progress['percent'],
            'taskStats': {
                'done': progress['done'],
                'inProgress': progress['inProgress'],
                'todo': progress['todo'],
                'total': progress['total']
            },
            'tasks': goal_tasks,
            'comments': existing_comments
        })

    # Build side goals list (with task mapping and progress)
    side_goals = []
    for sg_data in parsed['sideGoals']:
        sg_tasks = []
        for task in tasks:
            task_tag = map_task_to_side_goal(task['labels'], [sg_data])
            if task_tag == sg_data['tag']:
                sg_tasks.append(task['key'])

        progress = calculate_goal_progress([t for t in tasks if t['key'] in sg_tasks])

        # Preserve existing comments if available
        existing_comments = []
        if existing_data:
            existing_sg = next(
                (sg for sg in existing_data.get('sideGoals', []) if sg['id'] == sg_data['id']),
                None
            )
            if existing_sg:
                existing_comments = existing_sg.get('comments', [])

        side_goals.append({
            'id': sg_data['id'],
            'title': sg_data['title'],
            'client': sg_data['client'],
            'tag': sg_data['tag'],
            'completed': progress['percent'] == 100,
            'completionPercent': progress['percent'],
            'taskStats': {
                'done': progress['done'],
                'inProgress': progress['inProgress'],
                'todo': progress['todo'],
                'total': progress['total']
            },
            'tasks': sg_tasks,
            'comments': existing_comments
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
    timeline_url = f"{jira_url}/jira/software/c/projects/{os.getenv('JIRA_PROJECT_KEY')}/boards/{board_id}/timeline"

    # Preserve existing editable fields (from web UI)
    existing_next_plans = existing_data.get('nextSprintPlans', '') if existing_data else ''
    existing_achievements = existing_data.get('achievements', '') if existing_data else ''

    return {
        'id': sprint['id'],
        'name': sprint.get('name', f"Sprint {sprint['id']}"),
        'status': status,
        'startDate': start_date,
        'endDate': end_date,
        'goals': goals,
        'sideGoals': side_goals,
        'achievements': existing_achievements,  # Editable Markdown text from UI
        'tasks': tasks,
        'nextSprintPlans': existing_next_plans,
        'jiraBaseUrl': jira_url,
        'jiraTimelineUrl': timeline_url,
        'closedAt': existing_data.get('closedAt') if existing_data else None
    }


def main():
    parser = argparse.ArgumentParser(description='Sync Jira sprint data to repository')
    parser.add_argument(
        '--sprint-id',
        type=int,
        help='Specific sprint ID to sync (default: active sprint)'
    )
    args = parser.parse_args()

    # Initialize clients
    jira_client = JiraClient()
    repo_client = RepoClient()

    # Verify repository connection
    if not repo_client.verify_connection():
        logger.error("Cannot connect to repository. Check DATA_REPO_OWNER, DATA_REPO_NAME, and DATA_REPO_TOKEN.")
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

    # Load existing sprint data from repository to preserve comments
    existing_file = repo_client.get_file(f'sprint-{sprint_id}.json')
    existing_data = existing_file['content'] if existing_file else None
    existing_sha = existing_file['sha'] if existing_file else None

    # Check if sprint is closed locally - skip sync to preserve historical data
    if existing_data and existing_data.get('status') == 'closed':
        logger.info(f"Sprint {sprint_id} is closed locally (closedAt: {existing_data.get('closedAt')}). "
                   "Skipping sync to preserve historical task/goal data.")
        logger.info("Only manually editable fields (achievements, nextSprintPlans, comments) can be changed via UI.")
        sys.exit(0)

    # Build sprint data
    sprint_data = build_sprint_data(sprint, tasks, existing_data)

    # Save sprint data to repository
    if not repo_client.update_file(f'sprint-{sprint_id}.json', sprint_data, existing_sha):
        logger.error("Failed to save sprint data to repository")
        sys.exit(1)

    # Update current sprint info
    is_active = sprint.get('state', '').lower() == 'active'
    current_sprint_info = {
        'currentSprintId': sprint_id,
        'isActive': is_active
    }

    # Get existing current-sprint.json SHA
    current_file = repo_client.get_file('current-sprint.json', in_data_path=False)
    current_sha = current_file['sha'] if current_file else None

    if not repo_client.update_file('current-sprint.json', current_sprint_info, current_sha, in_data_path=False):
        logger.error("Failed to update current sprint info in repository")
        sys.exit(1)

    logger.info("Sync completed successfully")


if __name__ == '__main__':
    main()
