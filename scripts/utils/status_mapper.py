"""
Jira Status Mapper

Maps Jira status to standardized categories for frontend display.
Uses Jira's built-in statusCategory for language-independent mapping.

Status categories in Jira:
- statusCategory.key: "done" -> "Done"
- statusCategory.key: "indeterminate" -> "In Progress"
- statusCategory.key: "new" -> "To Do"
"""

from typing import Dict, Optional


# Mapping from statusCategory.key to frontend status
STATUS_CATEGORY_MAP = {
    'done': 'Done',
    'indeterminate': 'In Progress',
    'new': 'To Do',
}

# Fallback mapping for status names (case-insensitive)
# Used when statusCategory is not available
STATUS_NAME_FALLBACK = {
    # Done statuses
    'done': 'Done',
    'gotowe': 'Done',
    'closed': 'Done',
    'zamknięte': 'Done',
    'zamkniete': 'Done',
    'resolved': 'Done',
    'rozwiązane': 'Done',
    'rozwiazane': 'Done',
    'complete': 'Done',
    'completed': 'Done',
    'zakończone': 'Done',
    'zakonczone': 'Done',

    # In Progress statuses
    'in progress': 'In Progress',
    'w trakcie': 'In Progress',
    'w toku': 'In Progress',
    'in development': 'In Progress',
    'in review': 'In Progress',
    'review': 'In Progress',
    'testing': 'In Progress',
    'testowanie': 'In Progress',
    'in testing': 'In Progress',
    'code review': 'In Progress',
    'przegląd kodu': 'In Progress',
    'przeglad kodu': 'In Progress',

    # To Do statuses
    'to do': 'To Do',
    'do zrobienia': 'To Do',
    'backlog': 'To Do',
    'open': 'To Do',
    'new': 'To Do',
    'nowe': 'To Do',
    'otwarte': 'To Do',
    'selected for development': 'To Do',
    'ready': 'To Do',
    'gotowe do realizacji': 'To Do',
}


def map_jira_status(status_field: Optional[Dict]) -> str:
    """
    Map Jira status field to standardized frontend status.

    Uses statusCategory.key for reliable, language-independent mapping.
    Falls back to status name heuristics for older Jira versions.

    Args:
        status_field: The 'status' field from Jira issue fields
                     Expected structure: {'name': 'Done', 'statusCategory': {'key': 'done'}}

    Returns:
        One of: "Done", "In Progress", "To Do"
    """
    if not status_field:
        return 'To Do'

    # Try statusCategory first (preferred method)
    status_category = status_field.get('statusCategory')
    if status_category:
        category_key = status_category.get('key', '').lower()
        if category_key in STATUS_CATEGORY_MAP:
            return STATUS_CATEGORY_MAP[category_key]

    # Fallback to status name
    status_name = status_field.get('name', '')
    if status_name:
        status_lower = status_name.lower().strip()
        if status_lower in STATUS_NAME_FALLBACK:
            return STATUS_NAME_FALLBACK[status_lower]

    # Default to "To Do" for unknown statuses
    return 'To Do'


if __name__ == '__main__':
    # Test cases
    test_cases = [
        # statusCategory based
        {'name': 'Gotowe', 'statusCategory': {'key': 'done'}},
        {'name': 'W trakcie', 'statusCategory': {'key': 'indeterminate'}},
        {'name': 'Backlog', 'statusCategory': {'key': 'new'}},

        # Fallback to name
        {'name': 'Done'},
        {'name': 'Gotowe'},
        {'name': 'In Progress'},
        {'name': 'W trakcie'},
        {'name': 'To Do'},
        {'name': 'Backlog'},

        # Edge cases
        None,
        {},
        {'name': 'Unknown Status'},
    ]

    print("Status mapping tests:")
    for case in test_cases:
        result = map_jira_status(case)
        print(f"  {case} -> {result}")
