/**
 * Mapowanie statusów Jira na polskie etykiety
 */
export const STATUS_MAP = {
  'Done': 'Ukończone',
  'In Progress': 'W trakcie',
  'To Do': 'Do zrobienia'
}

export const STATUS_COLORS = {
  'Done': { bg: 'bg-green-100', text: 'text-green-700', solid: 'bg-green-500' },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700', solid: 'bg-blue-500' },
  'To Do': { bg: 'bg-gray-100', text: 'text-gray-600', solid: 'bg-gray-500' }
}

export const getStatusLabel = (status) => STATUS_MAP[status] || status
export const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS['To Do']
