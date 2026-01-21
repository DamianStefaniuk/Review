/**
 * Service for loading sprint data from JSON files or Gist
 */

import {
  isGistConfigured,
  loadSprintFromGist,
  loadCurrentSprintInfoFromGist,
  loadSprintListFromGist
} from './gistService'

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
 * Load current sprint info (from Gist or local file)
 */
export async function loadCurrentSprintInfo() {
  // Try Gist first if configured
  if (isGistConfigured()) {
    try {
      return await loadCurrentSprintInfoFromGist()
    } catch (error) {
      console.warn('Failed to load from Gist, falling back to local:', error)
    }
  }

  // Fallback to local file
  const response = await fetch(`${BASE_PATH}/current-sprint.json`)
  if (!response.ok) {
    throw new Error('Failed to load current sprint info')
  }
  return response.json()
}

/**
 * Load sprint data by ID (from Gist or local file)
 */
export async function loadSprint(sprintId) {
  // Try Gist first if configured
  if (isGistConfigured()) {
    try {
      return await loadSprintFromGist(sprintId)
    } catch (error) {
      console.warn('Failed to load sprint from Gist, falling back to local:', error)
    }
  }

  // Fallback to local file
  const response = await fetch(`${BASE_PATH}/sprints/sprint-${sprintId}.json`)
  if (!response.ok) {
    throw new Error(`Failed to load sprint ${sprintId}`)
  }
  return response.json()
}

/**
 * Load all available sprints (list) - from Gist or local files
 */
export async function loadSprintList() {
  // Try Gist first if configured
  if (isGistConfigured()) {
    try {
      return await loadSprintListFromGist()
    } catch (error) {
      console.warn('Failed to load sprint list from Gist, falling back to local:', error)
    }
  }

  // Fallback to local files
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
 * Get tasks for a specific side goal
 */
export function getTasksForSideGoal(sprint, sideGoal) {
  return sideGoal.tasks.map(taskKey => getTaskByKey(sprint, taskKey)).filter(Boolean)
}

/**
 * Get tasks not assigned to any goal or side goal
 */
export function getUnassignedTasks(sprint) {
  const assignedTaskKeys = new Set([
    ...sprint.goals.flatMap(goal => goal.tasks),
    ...(sprint.sideGoals || []).flatMap(sg => sg.tasks)
  ])
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

  // Include clients from side goals
  if (sprint.sideGoals) {
    sprint.sideGoals.forEach(sideGoal => {
      if (sideGoal.client) clients.add(sideGoal.client)
    })
  }

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
 * Filter side goals by client
 */
export function filterSideGoalsByClient(sideGoals, client) {
  if (!client) return sideGoals
  return sideGoals.filter(sideGoal => sideGoal.client === client)
}

/**
 * Calculate sprint statistics
 */
export function calculateSprintStats(sprint) {
  const totalGoals = sprint.goals.length
  const completedGoals = sprint.goals.filter(g => g.completed).length
  const totalTasks = sprint.tasks.length
  const completedTasks = sprint.tasks.filter(t => t.status === 'Done').length

  // Side goals statistics
  const sideGoals = sprint.sideGoals || []
  const totalSideGoals = sideGoals.length
  const completedSideGoals = sideGoals.filter(sg => sg.completed).length

  const avgProgress = totalGoals > 0
    ? Math.round(sprint.goals.reduce((sum, g) => sum + g.completionPercent, 0) / totalGoals)
    : 0

  return {
    totalGoals,
    completedGoals,
    totalTasks,
    completedTasks,
    totalSideGoals,
    completedSideGoals,
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
      stats[client] = { goals: 0, tasks: 0, completedTasks: 0, sideGoals: 0 }
    }
    stats[client].goals++

    const goalTasks = getTasksForGoal(sprint, goal)
    stats[client].tasks += goalTasks.length
    stats[client].completedTasks += goalTasks.filter(t => t.status === 'Done').length
  })

  // Include side goals in stats
  const sideGoals = sprint.sideGoals || []
  sideGoals.forEach(sideGoal => {
    const client = sideGoal.client || 'Brak klienta'
    if (!stats[client]) {
      stats[client] = { goals: 0, tasks: 0, completedTasks: 0, sideGoals: 0 }
    }
    stats[client].sideGoals++

    const sgTasks = getTasksForSideGoal(sprint, sideGoal)
    stats[client].tasks += sgTasks.length
    stats[client].completedTasks += sgTasks.filter(t => t.status === 'Done').length
  })

  return stats
}
