"""
Jira Sprint Description Parser

Parses sprint goals and achievements from Jira sprint description.
Expected format in sprint description:

## Cele główne
1. [KLIENT] Opis celu
2. [KLIENT] Inny cel

## Osiągnięcia dodatkowe
- [KLIENT] Opis osiągnięcia
- Opis bez klienta
"""

import re
from typing import List, Dict, Optional, Tuple


def parse_client_from_text(text: str) -> Tuple[Optional[str], str]:
    """
    Extract client name from text in format [CLIENT_NAME] rest of text.

    Returns:
        Tuple of (client_name or None, cleaned_text)
    """
    match = re.match(r'^\[([^\]]+)\]\s*(.+)$', text.strip())
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return None, text.strip()


def parse_sprint_description(description: str) -> Dict:
    """
    Parse sprint description to extract goals and achievements.

    Args:
        description: Sprint description text from Jira

    Returns:
        Dict with 'goals' and 'achievements' lists
    """
    result = {
        'goals': [],
        'achievements': []
    }

    if not description:
        return result

    lines = description.strip().split('\n')
    current_section = None
    goal_counter = 0
    achievement_counter = 0

    for line in lines:
        line = line.strip()

        # Skip empty lines
        if not line:
            continue

        # Detect section headers
        lower_line = line.lower()
        if 'cele główne' in lower_line or 'cele sprintu' in lower_line or 'sprint goals' in lower_line:
            current_section = 'goals'
            continue
        elif 'osiągnięcia' in lower_line or 'achievements' in lower_line or 'dodatk' in lower_line:
            current_section = 'achievements'
            continue
        elif line.startswith('##') or line.startswith('**'):
            # Other section, reset
            current_section = None
            continue

        # Parse content based on section
        if current_section == 'goals':
            # Remove list markers (1. or - or *)
            cleaned = re.sub(r'^[\d]+[.)\s]+|^[-*]\s+', '', line)
            if cleaned:
                goal_counter += 1
                client, title = parse_client_from_text(cleaned)
                result['goals'].append({
                    'id': goal_counter,
                    'title': title,
                    'client': client,
                    'tag': f'cel{goal_counter}'
                })

        elif current_section == 'achievements':
            # Remove list markers
            cleaned = re.sub(r'^[\d]+[.)\s]+|^[-*]\s+', '', line)
            if cleaned:
                achievement_counter += 1
                client, title = parse_client_from_text(cleaned)
                result['achievements'].append({
                    'id': achievement_counter,
                    'title': title,
                    'client': client,
                    'completed': False
                })

    return result


def extract_next_sprint_plans(description: str) -> str:
    """
    Extract next sprint plans section from description.

    Args:
        description: Sprint description text

    Returns:
        Next sprint plans text or empty string
    """
    if not description:
        return ''

    lines = description.strip().split('\n')
    in_section = False
    plans_lines = []

    for line in lines:
        lower_line = line.lower().strip()

        # Detect section start
        if 'następny sprint' in lower_line or 'next sprint' in lower_line or 'plany' in lower_line:
            in_section = True
            continue

        # Detect section end (another header)
        if in_section and (line.strip().startswith('##') or line.strip().startswith('**')):
            if not any(x in lower_line for x in ['następny', 'next', 'plany']):
                break

        if in_section:
            plans_lines.append(line)

    return '\n'.join(plans_lines).strip()


def map_task_to_goal(task_labels: List[str], goals: List[Dict]) -> Optional[str]:
    """
    Map a task to a goal based on labels.

    Args:
        task_labels: List of task labels
        goals: List of goal dictionaries with 'tag' field

    Returns:
        Goal tag or None if no match
    """
    goal_tags = {g['tag'].lower() for g in goals}

    for label in task_labels:
        label_lower = label.lower()
        if label_lower in goal_tags:
            return label_lower
        # Also check for variations like "cel-1" or "cel_1"
        normalized = re.sub(r'[-_\s]', '', label_lower)
        for tag in goal_tags:
            if normalized == re.sub(r'[-_\s]', '', tag):
                return tag

    return None


def calculate_goal_progress(goal_tasks: List[Dict]) -> int:
    """
    Calculate goal completion percentage based on tasks.

    Args:
        goal_tasks: List of tasks for the goal

    Returns:
        Completion percentage (0-100)
    """
    if not goal_tasks:
        return 0

    done_count = sum(1 for t in goal_tasks if t.get('status', '').lower() in ['done', 'closed', 'resolved'])
    return round((done_count / len(goal_tasks)) * 100)


if __name__ == '__main__':
    # Test parsing
    test_description = """
## Cele główne
1. [Klient A] Implementacja nowego modułu
2. [Klient B] Naprawa błędów krytycznych
3. Optymalizacja wydajności

## Osiągnięcia dodatkowe
- [Klient A] Aktualizacja dokumentacji
- Przegląd kodu

## Plany na następny sprint
- Integracja z API
- Testy E2E
"""

    result = parse_sprint_description(test_description)
    print("Goals:", result['goals'])
    print("Achievements:", result['achievements'])
    print("Next sprint plans:", extract_next_sprint_plans(test_description))
