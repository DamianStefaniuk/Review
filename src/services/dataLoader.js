/**
 * Service for loading sprint data from JSON files or Repository
 */

import {
  isRepoDataConfigured,
  loadSprintFromRepo,
  loadCurrentSprintInfoFromRepo,
  loadSprintListFromRepo
} from './repoDataService'
import { canAccessSprint } from './sprintAccessService'
import { useAuthStore } from '../stores/authStore'

const BASE_PATH = './data'

/**
 * Load current sprint info (from Repository or local file)
 */
export async function loadCurrentSprintInfo() {
  // Try Repository first if configured
  if (isRepoDataConfigured()) {
    try {
      return await loadCurrentSprintInfoFromRepo()
    } catch (error) {
      console.warn('Failed to load from Repository, falling back to local:', error)
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
 * Load sprint data by ID (from Repository or local file)
 */
export async function loadSprint(sprintId) {
  // Check sprint access before loading
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !canAccessSprint(sprintId, authStore.user?.login)) {
    throw new Error(`Brak dostępu do sprintu ${sprintId}`)
  }

  // Try Repository first if configured
  if (isRepoDataConfigured()) {
    try {
      return await loadSprintFromRepo(sprintId)
    } catch (error) {
      console.warn('Failed to load sprint from Repository, falling back to local:', error)
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
 * Load all available sprints (list) - from Repository or local files
 */
export async function loadSprintList() {
  // Try Repository first if configured
  if (isRepoDataConfigured()) {
    try {
      return await loadSprintListFromRepo()
    } catch (error) {
      console.warn('Failed to load sprint list from Repository, falling back to local:', error)
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
 * Calculate sprint statistics
 */
export function calculateSprintStats(sprint) {
  const totalGoals = sprint.goals.length
  const completedGoals = sprint.goals.filter(g => g.completed).length

  // Wszystkie zadania (dla AllTasks, ClientStats)
  const totalTasks = sprint.tasks.length
  const completedTasks = sprint.tasks.filter(t => t.status === 'Done').length

  // Side goals statistics
  const sideGoals = sprint.sideGoals || []
  const totalSideGoals = sideGoals.length
  const completedSideGoals = sideGoals.filter(sg => sg.completed).length

  // Zadania tylko z celów głównych i pobocznych
  const goalTaskKeys = new Set()

  // Zadania z celów głównych
  sprint.goals.forEach(goal => {
    if (goal.tasks && Array.isArray(goal.tasks)) {
      goal.tasks.forEach(key => goalTaskKeys.add(key))
    }
  })

  // Zadania z celów pobocznych
  sideGoals.forEach(sideGoal => {
    if (sideGoal.tasks && Array.isArray(sideGoal.tasks)) {
      sideGoal.tasks.forEach(key => goalTaskKeys.add(key))
    }
  })

  const goalTasks = sprint.tasks.filter(task => goalTaskKeys.has(task.key))
  const totalGoalTasks = goalTasks.length
  const completedGoalTasks = goalTasks.filter(t => t.status === 'Done').length

  const avgProgress = totalGoals > 0
    ? Math.round(sprint.goals.reduce((sum, g) => sum + g.completionPercent, 0) / totalGoals)
    : 0

  return {
    totalGoals,
    completedGoals,
    totalTasks,           // zachowane dla AllTasks
    completedTasks,       // zachowane dla AllTasks
    totalSideGoals,
    completedSideGoals,
    totalGoalTasks,       // tylko z celów
    completedGoalTasks,   // tylko z celów
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
      stats[client] = { goals: 0, tasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0, sideGoals: 0 }
    }
    stats[client].goals++

    const goalTasks = getTasksForGoal(sprint, goal)
    stats[client].tasks += goalTasks.length
    stats[client].completedTasks += goalTasks.filter(t => t.status === 'Done').length
    stats[client].inProgressTasks += goalTasks.filter(t => t.status === 'In Progress').length
    stats[client].todoTasks += goalTasks.filter(t => t.status === 'To Do').length
  })

  // Include side goals in stats
  const sideGoals = sprint.sideGoals || []
  sideGoals.forEach(sideGoal => {
    const client = sideGoal.client || 'Brak klienta'
    if (!stats[client]) {
      stats[client] = { goals: 0, tasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0, sideGoals: 0 }
    }
    stats[client].sideGoals++

    const sgTasks = getTasksForSideGoal(sprint, sideGoal)
    stats[client].tasks += sgTasks.length
    stats[client].completedTasks += sgTasks.filter(t => t.status === 'Done').length
    stats[client].inProgressTasks += sgTasks.filter(t => t.status === 'In Progress').length
    stats[client].todoTasks += sgTasks.filter(t => t.status === 'To Do').length
  })

  return stats
}
