"""
Jira Sprint Description Parser

Parses sprint goals and side goals from Jira sprint description.

Supported formats:

Format 1 (with headers):
## Cele główne
1. [KLIENT] Opis celu
2. [KLIENT] Inny cel

## Cele poboczne
- [KLIENT] Opis celu pobocznego
- Opis bez klienta

Format 2 (auto-detect by list markers):
1. [KLIENT] Cel 1          <- numbered items = goals
2. [KLIENT] Cel 2

- [KLIENT] Cel poboczny 1   <- dash items = side goals
- [KLIENT] Cel poboczny 2

Client tag [KLIENT] can appear anywhere in the line:
- "[KLIENT] Opis celu" - at the beginning
- "Opis celu [KLIENT]" - at the end
- "Opis [KLIENT] celu" - in the middle

Labels:
- cel1, cel2, ... - main goals
- extra1, extra2, ... - side goals
"""

import re
from typing import List, Dict, Optional, Tuple


def parse_client_from_text(text: str) -> Tuple[Optional[str], str]:
    """
    Extract client name from text in format [CLIENT_NAME].

    Searches for [CLIENT_NAME] anywhere in the text (start, middle, or end).
    Examples:
        "[KLIENT] Opis celu" -> ("KLIENT", "Opis celu")
        "Opis celu [KLIENT]" -> ("KLIENT", "Opis celu")
        "Opis [KLIENT] celu" -> ("KLIENT", "Opis celu")

    Returns:
        Tuple of (client_name or None, cleaned_text)
    """
    text = text.strip()
    match = re.search(r'\[([^\]]+)\]', text)
    if match:
        client = match.group(1).strip()
        # Remove the [CLIENT] pattern from text and clean up extra spaces
        cleaned = re.sub(r'\s*\[[^\]]+\]\s*', ' ', text).strip()
        return client, cleaned
    return None, text


def _is_numbered_item(line: str) -> bool:
    """Check if line starts with a number (e.g., '1.', '2)', '3 ')."""
    return bool(re.match(r'^\d+[.)\s]', line))


def _is_dash_item(line: str) -> bool:
    """Check if line starts with a dash or asterisk."""
    return bool(re.match(r'^[-*]\s', line))


def _is_section_header(line: str) -> bool:
    """Check if line is a section header (## or **)."""
    return line.startswith('##') or line.startswith('**')


def parse_sprint_description(
    description: str,
    goal_prefix: str = 'cel',
    side_goal_prefix: str = 'extra'
) -> Dict:
    """
    Parse sprint description to extract goals and side goals.

    Supports two modes:
    1. Explicit headers: "## Cele główne" and "## Cele poboczne"
    2. Auto-detect: numbered items (1. 2. 3.) = goals, dash items (-) = side goals

    Args:
        description: Sprint description text from Jira
        goal_prefix: Prefix for goal labels (default: 'cel')
        side_goal_prefix: Prefix for side goal labels (default: 'extra')

    Returns:
        Dict with 'goals' and 'sideGoals' lists
    """
    result = {
        'goals': [],
        'sideGoals': []
    }

    if not description:
        return result

    lines = description.strip().split('\n')

    # First pass: check if explicit headers exist
    has_explicit_headers = False
    for line in lines:
        lower_line = line.lower().strip()
        if any(keyword in lower_line for keyword in ['cele główne', 'cele sprintu', 'sprint goals', 'cele poboczne', 'side goals']):
            has_explicit_headers = True
            break

    current_section = None
    goal_counter = 0
    side_goal_counter = 0

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
        elif 'cele poboczne' in lower_line or 'side goals' in lower_line or 'poboczn' in lower_line:
            current_section = 'sideGoals'
            continue
        elif _is_section_header(line):
            # Other section header, reset
            current_section = None
            continue

        # Determine item type
        is_numbered = _is_numbered_item(line)
        is_dash = _is_dash_item(line)

        # Skip lines that are not list items
        if not is_numbered and not is_dash:
            continue

        # Determine target section
        if has_explicit_headers:
            # Use explicit section from headers
            target_section = current_section
        else:
            # Auto-detect: numbered = goals, dash = side goals
            if is_numbered:
                target_section = 'goals'
            elif is_dash:
                target_section = 'sideGoals'
            else:
                target_section = None

        if target_section is None:
            continue

        # Remove list markers
        cleaned = re.sub(r'^[\d]+[.)\s]+|^[-*]\s+', '', line)
        if not cleaned:
            continue

        client, title = parse_client_from_text(cleaned)

        if target_section == 'goals':
            goal_counter += 1
            result['goals'].append({
                'id': goal_counter,
                'title': title,
                'client': client,
                'tag': f'{goal_prefix}{goal_counter}'
            })
        elif target_section == 'sideGoals':
            side_goal_counter += 1
            result['sideGoals'].append({
                'id': side_goal_counter,
                'title': title,
                'client': client,
                'tag': f'{side_goal_prefix}{side_goal_counter}'
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


def map_task_to_side_goal(task_labels: List[str], side_goals: List[Dict]) -> Optional[str]:
    """
    Map a task to a side goal based on labels (extra1, extra2, etc.).

    Args:
        task_labels: List of task labels
        side_goals: List of side goal dictionaries with 'tag' field

    Returns:
        Side goal tag or None if no match
    """
    side_goal_tags = {sg['tag'].lower() for sg in side_goals}

    for label in task_labels:
        label_lower = label.lower()
        if label_lower in side_goal_tags:
            return label_lower
        # Also check for variations like "extra-1" or "extra_1"
        normalized = re.sub(r'[-_\s]', '', label_lower)
        for tag in side_goal_tags:
            if normalized == re.sub(r'[-_\s]', '', tag):
                return tag

    return None


def calculate_goal_progress(goal_tasks: List[Dict]) -> Dict:
    """
    Calculate goal progress statistics.

    Args:
        goal_tasks: List of tasks for the goal

    Returns:
        Dict with done, inProgress, todo, total, and percent values
    """
    if not goal_tasks:
        return {'done': 0, 'inProgress': 0, 'todo': 0, 'total': 0, 'percent': 0}

    total = len(goal_tasks)
    done = sum(1 for t in goal_tasks if t.get('status') == 'Done')
    in_progress = sum(1 for t in goal_tasks if t.get('status') == 'In Progress')
    todo = total - done - in_progress

    return {
        'done': done,
        'inProgress': in_progress,
        'todo': todo,
        'total': total,
        'percent': round((done / total) * 100)
    }


if __name__ == '__main__':
    # Test 1: Format with headers
    print("=== Test 1: Format with headers ===")
    test_description_1 = """
## Cele główne
1. [Klient A] Implementacja nowego modułu
2. [Klient B] Naprawa błędów krytycznych
3. Optymalizacja wydajności

## Cele poboczne
- [Klient A] Aktualizacja dokumentacji
- Przegląd kodu
"""

    result_1 = parse_sprint_description(test_description_1)
    print("Goals:", result_1['goals'])
    print("Side Goals:", result_1['sideGoals'])

    # Test 2: Auto-detect format (no headers)
    print("\n=== Test 2: Auto-detect format (no headers) ===")
    test_description_2 = """
1. [FRAPOL] Zarządca nagrzewnica/agregat/chłodnica

2. [FRAPOL] Panel T5

3. [KLIMOR] Regulacja wydatku rekuperatora

- [VENTS] Zmiana logo na Blauberga

- [ALNOR] Zatwierdzenie panelu T5

- [KLIMOR] Ochrona przeciwzamrożeniowa przez pomiar ciśnienia
"""

    result_2 = parse_sprint_description(test_description_2)
    print("Goals:", result_2['goals'])
    print("Side Goals:", result_2['sideGoals'])

    # Test 3: Client at end of line
    print("\n=== Test 3: Client at end of line ===")
    test_description_3 = """
1. Wdrożenie nowego modułu [KLIENT_A]
2. Naprawa błędów [KLIENT_B]
3. Optymalizacja bez klienta

- Dokumentacja [KLIENT_A]
- Przegląd kodu
"""

    result_3 = parse_sprint_description(test_description_3)
    print("Goals:", result_3['goals'])
    print("Side Goals:", result_3['sideGoals'])
