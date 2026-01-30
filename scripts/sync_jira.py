#!/usr/bin/env python3
"""
Jira Sprint Sync Script

Synchronizes sprint data from Jira to local JSON files for the Sprint Review app.

Environment variables required:
- JIRA_URL: Base URL of Jira instance (e.g., https://jira.example.com)
- JIRA_EMAIL: Email for Jira authentication
- JIRA_API_TOKEN: API token for Jira authentication
- JIRA_PROJECT_KEY: Jira project key (e.g., PROJ)
- JIRA_BOARD_ID: Jira board ID for sprint data

Usage:
    python sync_jira.py [--sprint-id SPRINT_ID]
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
                    'fields': 'summary,status,labels,assignee,customfield_10014'  # customfield_10014 is typically Epic Link
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
    epic_key = fields.get('customfield_10014')  # Epic Link field
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


def load_config(data_dir: Path) -> Dict:
    """Load configuration from config.json."""
    config_path = data_dir / 'config.json'
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def build_sprint_data(
    sprint: Dict,
    tasks: List[Dict],
    existing_data: Optional[Dict] = None,
    goal_prefix: str = 'cel',
    side_goal_prefix: str = 'extra'
) -> Dict:
    """Build sprint data structure from Jira data."""
    # Parse sprint description/goal
    description = sprint.get('goal', '') or ''
    parsed = parse_sprint_description(description, goal_prefix, side_goal_prefix)

    # Map tasks to goals
    goals = []
    for goal_data in parsed['goals']:
        goal_tasks = []
        for task in tasks:
            task_tag = map_task_to_goal(task['labels'], [goal_data])
            if task_tag == goal_data['tag']:
                goal_tasks.append(task['key'])

        progress = calculate_goal_progress([t for t in tasks if t['key'] in goal_tasks])

        # Preserve existing comments if available
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

    # Determine status
    status = 'active'
    if sprint.get('state', '').lower() == 'closed':
        status = 'closed'

    # Format dates
    start_date = sprint.get('startDate', '')
    end_date = sprint.get('endDate', '')

    if start_date:
        start_date = start_date.split('T')[0]
    if end_date:
        end_date = end_date.split('T')[0]

    # Build Jira timeline URL
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


def save_sprint_data(sprint_data: Dict, data_dir: Path):
    """Save sprint data to JSON file."""
    sprint_id = sprint_data['id']
    file_path = data_dir / 'sprints' / f'sprint-{sprint_id}.json'

    # Ensure directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(sprint_data, f, ensure_ascii=False, indent=2)

    logger.info(f"Saved sprint data to {file_path}")


def update_current_sprint(sprint_id: int, is_active: bool, data_dir: Path):
    """Update current-sprint.json file."""
    file_path = data_dir / 'current-sprint.json'

    data = {
        'currentSprintId': sprint_id,
        'isActive': is_active
    }

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    logger.info(f"Updated current sprint info: Sprint {sprint_id}, active={is_active}")


def load_existing_sprint(sprint_id: int, data_dir: Path) -> Optional[Dict]:
    """Load existing sprint data if available."""
    file_path = data_dir / 'sprints' / f'sprint-{sprint_id}.json'

    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    return None


def main():
    parser = argparse.ArgumentParser(description='Sync Jira sprint data')
    parser.add_argument(
        '--sprint-id',
        type=int,
        help='Specific sprint ID to sync (default: active sprint)'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default='data',
        help='Data directory path (default: data)'
    )
    args = parser.parse_args()

    # Determine data directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / args.data_dir

    logger.info(f"Data directory: {data_dir}")

    # Initialize Jira client
    client = JiraClient()

    # Get sprint to sync
    if args.sprint_id:
        sprint = client.get_sprint(args.sprint_id)
        if not sprint:
            logger.error(f"Sprint {args.sprint_id} not found")
            sys.exit(1)
    else:
        sprint = client.get_active_sprint()
        if not sprint:
            logger.warning("No active sprint found")
            sys.exit(0)

    sprint_id = sprint['id']
    logger.info(f"Syncing sprint: {sprint.get('name', sprint_id)}")

    # Get sprint issues
    issues = client.get_sprint_issues(sprint_id)
    logger.info(f"Found {len(issues)} issues")

    # Transform issues to tasks
    epic_cache = {}
    tasks = [transform_issue(issue, epic_cache, client) for issue in issues]

    # Load existing sprint data to preserve comments
    existing_data = load_existing_sprint(sprint_id, data_dir)

    # Check if sprint is closed locally - skip sync to preserve historical data
    if existing_data and existing_data.get('status') == 'closed':
        logger.info(f"Sprint {sprint_id} is closed locally (closedAt: {existing_data.get('closedAt')}). "
                   "Skipping sync to preserve historical task/goal data.")
        logger.info("Only manually editable fields (achievements, nextSprintPlans, comments) can be changed via UI.")
        sys.exit(0)

    # Load config and get label prefixes
    config = load_config(data_dir)
    labels_config = config.get('labels', {})
    goal_prefix = labels_config.get('goalPrefix', 'cel')
    side_goal_prefix = labels_config.get('sideGoalPrefix', 'extra')
    logger.info(f"Using label prefixes: goals='{goal_prefix}', side goals='{side_goal_prefix}'")

    # Build sprint data
    sprint_data = build_sprint_data(sprint, tasks, existing_data, goal_prefix, side_goal_prefix)

    # Save sprint data
    save_sprint_data(sprint_data, data_dir)

    # Update current sprint info
    is_active = sprint.get('state', '').lower() == 'active'
    update_current_sprint(sprint_id, is_active, data_dir)

    logger.info("Sync completed successfully")


if __name__ == '__main__':
    main()
