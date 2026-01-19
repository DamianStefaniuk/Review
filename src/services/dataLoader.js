/**
 * Service for loading sprint data from JSON files
 */

const BASE_PATH = './data'

/**
 * Load configuration
 */
export async function loadConfig() {
  const response = await fetch(`${BASE_PATH}/config.json`)
  if (!response.ok) {
    throw new Error('Failed to load config')
  }
  return response.json()
}

/**
 * Load current sprint info
 */
export async function loadCurrentSprintInfo() {
  const response = await fetch(`${BASE_PATH}/current-sprint.json`)
  if (!response.ok) {
    throw new Error('Failed to load current sprint info')
  }
  return response.json()
}

/**
 * Load sprint data by ID
 */
export async function loadSprint(sprintId) {
  const response = await fetch(`${BASE_PATH}/sprints/sprint-${sprintId}.json`)
  if (!response.ok) {
    throw new Error(`Failed to load sprint ${sprintId}`)
  }
  return response.json()
}

/**
 * Load all available sprints (list)
 */
export async function loadSprintList() {
  // In a real scenario, this would come from an index file or API
  // For now, we'll try to load sprints from 41 to 50
  const sprints = []

  for (let id = 50; id >= 40; id--) {
    try {
      const response = await fetch(`${BASE_PATH}/sprints/sprint-${id}.json`)
      if (response.ok) {
        const sprint = await response.json()
        sprints.push({
          id: sprint.id,
          name: sprint.name,
          status: sprint.status,
          startDate: sprint.startDate,
          endDate: sprint.endDate
        })
      }
    } catch {
      // Sprint doesn't exist, continue
    }
  }

  return sprints
}

/**
 * Get task by key from sprint data
 */
export function getTaskByKey(sprint, taskKey) {
  return sprint.tasks.find(task => task.key === taskKey)
}

/**
 * Get tasks for a specific goal
 */
export function getTasksForGoal(sprint, goal) {
  return goal.tasks.map(taskKey => getTaskByKey(sprint, taskKey)).filter(Boolean)
}

/**
 * Get tasks not assigned to any goal
 */
export function getUnassignedTasks(sprint) {
  const assignedTaskKeys = new Set(
    sprint.goals.flatMap(goal => goal.tasks)
  )
  return sprint.tasks.filter(task => !assignedTaskKeys.has(task.key))
}

/**
 * Get unique clients from sprint
 */
export function getClients(sprint) {
  const clients = new Set()

  sprint.goals.forEach(goal => {
    if (goal.client) clients.add(goal.client)
  })

  sprint.achievements.forEach(achievement => {
    if (achievement.client) clients.add(achievement.client)
  })

  return Array.from(clients).sort()
}

/**
 * Filter goals by client
 */
export function filterGoalsByClient(goals, client) {
  if (!client) return goals
  return goals.filter(goal => goal.client === client)
}

/**
 * Filter achievements by client
 */
export function filterAchievementsByClient(achievements, client) {
  if (!client) return achievements
  return achievements.filter(achievement => achievement.client === client)
}

/**
 * Calculate sprint statistics
 */
export function calculateSprintStats(sprint) {
  const totalGoals = sprint.goals.length
  const completedGoals = sprint.goals.filter(g => g.completed).length
  const totalTasks = sprint.tasks.length
  const completedTasks = sprint.tasks.filter(t => t.status === 'Done').length
  const totalAchievements = sprint.achievements.length
  const completedAchievements = sprint.achievements.filter(a => a.completed).length

  const avgProgress = totalGoals > 0
    ? Math.round(sprint.goals.reduce((sum, g) => sum + g.completionPercent, 0) / totalGoals)
    : 0

  return {
    totalGoals,
    completedGoals,
    totalTasks,
    completedTasks,
    totalAchievements,
    completedAchievements,
    avgProgress
  }
}

/**
 * Get client statistics
 */
export function getClientStats(sprint) {
  const stats = {}

  sprint.goals.forEach(goal => {
    const client = goal.client || 'Brak klienta'
    if (!stats[client]) {
      stats[client] = { goals: 0, tasks: 0, completedTasks: 0, achievements: 0 }
    }
    stats[client].goals++

    const goalTasks = getTasksForGoal(sprint, goal)
    stats[client].tasks += goalTasks.length
    stats[client].completedTasks += goalTasks.filter(t => t.status === 'Done').length
  })

  sprint.achievements.forEach(achievement => {
    const client = achievement.client || 'Brak klienta'
    if (!stats[client]) {
      stats[client] = { goals: 0, tasks: 0, completedTasks: 0, achievements: 0 }
    }
    stats[client].achievements++
  })

  return stats
}
