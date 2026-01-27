import { ref } from 'vue'
import { POLISH_NOUNS } from '../utils/pluralize'
import { renderMarkdownWithMedia, processMediaUrls } from '../utils/markdownMedia'
import { getStatusLabel } from '../utils/statusMapping'

// Escape HTML to prevent XSS in PDF content
const escapeHtml = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const renderMarkdown = (text) => {
  if (!text) return ''
  return renderMarkdownWithMedia(text)
}

// Helper to get tasks for a goal
const getTasksForGoalPdf = (sprint, goal) => {
  if (!goal.tasks || !Array.isArray(goal.tasks)) return []
  return sprint.tasks.filter(task => goal.tasks.includes(task.key))
}

// Helper to get tasks for a side goal
const getTasksForSideGoalPdf = (sprint, sideGoal) => {
  if (!sideGoal.tasks || !Array.isArray(sideGoal.tasks)) return []
  return sprint.tasks.filter(task => sideGoal.tasks.includes(task.key))
}

// Calculate task stats
const getTaskStatsPdf = (tasks) => {
  return {
    done: tasks.filter(t => t.status === 'Done').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    todo: tasks.filter(t => t.status === 'To Do').length,
    total: tasks.length
  }
}

// Determine goal status
const getGoalStatusPdf = (goal, sprintStatus) => {
  if (goal.completed) return 'completed'
  if (sprintStatus === 'closed') return 'failed'
  return 'inProgress'
}

// Status colors for PDF
const pdfStatusColors = {
  completed: { bg: '#dcfce7', border: '#86efac', text: '#166534', label: 'Ukończony' },
  inProgress: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: 'W trakcie' },
  todo: { bg: '#f3f4f6', border: '#d1d5db', text: '#4b5563', label: 'Do zrobienia' },
  failed: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', label: 'Nie udało się' }
}

export function usePdfExport() {
  const isExporting = ref(false)

  const exportToPdf = async (sprint, selectedElements = []) => {
    isExporting.value = true

    try {
      // Dynamically import html2pdf to reduce initial bundle size
      const html2pdf = (await import('html2pdf.js')).default

      // Create a container with the content to export
      const content = document.createElement('div')
      content.innerHTML = generatePdfContent(sprint, selectedElements)
      content.style.padding = '20px'
      content.style.backgroundColor = '#ffffff'
      document.body.appendChild(content)

      // Load all media (convert GitHub paths to blob URLs)
      await processMediaUrls(content)

      // Wait for all images to fully load
      const images = content.querySelectorAll('img[src]')
      await Promise.all(
        Array.from(images).map(img =>
          new Promise((resolve) => {
            if (img.complete) return resolve()
            img.onload = resolve
            img.onerror = resolve  // Continue even on errors
          })
        )
      )

      // Wait for fonts and DOM to be ready
      await document.fonts.ready

      const options = {
        margin: 10,
        filename: `${sprint.name.replace(/\s+/g, '-')}-review.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await html2pdf().set(options).from(content).save()

      document.body.removeChild(content)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Nie udało się wyeksportować PDF. Spróbuj ponownie.')
    } finally {
      isExporting.value = false
    }
  }

  const generatePdfContent = (sprint, selectedElements) => {
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pl-PL')

    let html = `
      <style>
        * { font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
        h1 { color: #1e40af; margin-bottom: 5px; }
        h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px; }
        h3 { color: #4b5563; margin-top: 16px; }
        .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
        .goal { background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
        .goal-title { font-weight: 600; color: #111827; }
        .goal-meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .progress { background: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 8px; overflow: hidden; display: flex; }
        .progress-done { background: #22c55e; height: 100%; }
        .progress-inprogress { background: #3b82f6; height: 100%; }
        .progress-todo { background: #9ca3af; height: 100%; }
        .task { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .task:last-child { border-bottom: none; }
        .task-key { color: #9ca3af; font-family: 'Courier New', Courier, monospace; font-size: 12px; }
        .status-done { color: #059669; }
        .status-progress { color: #2563eb; }
        .status-todo { color: #6b7280; }
        .achievement { padding: 8px 0; font-size: 14px; }
        .comment { background: #f5f5f5; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 13px; border-left: 3px solid #d1d5db; }
        .comment ul, .comment ol { margin: 4px 0; padding-left: 20px; }
        .comment p { margin: 4px 0; }
        .media-container { margin: 8px 0; }
        .media-image { max-width: 100%; height: auto; border-radius: 4px; }
        .media-video { max-width: 100%; }
        .media-placeholder { display: none; }
        .media-loading .media-image, .media-loading .media-video { opacity: 0.5; }
      </style>
    `

    // Summary section - header with basic info (no goals list)
    if (selectedElements.includes('summary')) {
      const isSprintCompleted = sprint.goals.every(g => g.completed)
      const completedGoals = sprint.goals.filter(g => g.completed).length
      const totalGoals = sprint.goals.length
      const completionPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
      const sprintStatusColor = isSprintCompleted ? '#166534' : (sprint.status === 'closed' ? '#991b1b' : '#1e40af')
      const sprintStatusBg = isSprintCompleted ? '#dcfce7' : (sprint.status === 'closed' ? '#fee2e2' : '#dbeafe')
      const sprintStatusLabel = isSprintCompleted ? 'Zrealizowany' : (sprint.status === 'closed' ? 'Nie zrealizowany' : 'W trakcie')

      html += `
        <h1>${escapeHtml(sprint.name)}</h1>
        <p class="meta">${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}</p>
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
          <div style="display: inline-block; background: ${sprintStatusBg}; color: ${sprintStatusColor}; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
            Sprint ${sprintStatusLabel}
          </div>
          <div style="font-size: 18px; font-weight: 600; color: #374151;">
            Ukończenie: <span style="color: ${sprintStatusColor};">${completionPercent}%</span> (${completedGoals}/${totalGoals} celów)
          </div>
        </div>
      `
    }

    // Goals section - main goals with details and comments
    if (selectedElements.includes('goals')) {
      html += `<h2>Cele sprintu</h2>`
      sprint.goals.forEach((goal, index) => {
        const status = getGoalStatusPdf(goal, sprint.status)
        const statusStyle = pdfStatusColors[status]
        const tasks = getTasksForGoalPdf(sprint, goal)
        const taskStats = getTaskStatsPdf(tasks)
        const total = taskStats.total || 1

        html += `
          <div class="goal" style="background: ${statusStyle.bg};">
            <div class="goal-title">${index + 1}. ${escapeHtml(goal.title)}</div>
            <div class="goal-meta">
              ${goal.client ? `Klient: ${escapeHtml(goal.client)} · ` : ''}
              Postęp: ${goal.completionPercent}% ·
              <span style="color: ${statusStyle.text}; font-weight: 600;">${statusStyle.label}</span>
            </div>
            <div class="progress">
              <div class="progress-done" style="width: ${(taskStats.done / total * 100)}%"></div>
              <div class="progress-inprogress" style="width: ${(taskStats.inProgress / total * 100)}%"></div>
              <div class="progress-todo" style="width: ${(taskStats.todo / total * 100)}%"></div>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
              <span style="color: #22c55e;">● ${getStatusLabel('Done')}: ${taskStats.done}</span> ·
              <span style="color: #3b82f6;">● ${getStatusLabel('In Progress')}: ${taskStats.inProgress}</span> ·
              <span style="color: #9ca3af;">● ${getStatusLabel('To Do')}: ${taskStats.todo}</span>
            </div>
            ${goal.comments && goal.comments.length > 0 ? goal.comments.map(c => `
              <div class="comment">
                ${renderMarkdown(c.text)}
              </div>
            `).join('') : ''}
          </div>
        `
      })
    }

    // Side goals section
    if (selectedElements.includes('sideGoals')) {
      const sideGoals = sprint.sideGoals || []
      if (sideGoals.length > 0) {
        html += `<h2 style="text-transform: capitalize;">${POLISH_NOUNS.sideGoal.few}</h2>`

        sideGoals.forEach((sideGoal, index) => {
          const status = getGoalStatusPdf(sideGoal, sprint.status)
          const statusStyle = pdfStatusColors[status]
          const tasks = getTasksForSideGoalPdf(sprint, sideGoal)
          const taskStats = getTaskStatsPdf(tasks)
          const total = taskStats.total || 1

          html += `
            <div class="goal" style="background: ${statusStyle.bg};">
              <div class="goal-title">${index + 1}. ${escapeHtml(sideGoal.title)}</div>
              <div class="goal-meta">
                ${sideGoal.client ? `Klient: ${escapeHtml(sideGoal.client)} · ` : ''}
                Postęp: ${sideGoal.completionPercent}% ·
                <span style="color: ${statusStyle.text}; font-weight: 600;">${statusStyle.label}</span>
              </div>
              <div class="progress">
                <div class="progress-done" style="width: ${(taskStats.done / total * 100)}%"></div>
                <div class="progress-inprogress" style="width: ${(taskStats.inProgress / total * 100)}%"></div>
                <div class="progress-todo" style="width: ${(taskStats.todo / total * 100)}%"></div>
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                <span style="color: #22c55e;">● ${getStatusLabel('Done')}: ${taskStats.done}</span> ·
                <span style="color: #3b82f6;">● ${getStatusLabel('In Progress')}: ${taskStats.inProgress}</span> ·
                <span style="color: #9ca3af;">● ${getStatusLabel('To Do')}: ${taskStats.todo}</span>
              </div>
              ${sideGoal.comments && sideGoal.comments.length > 0 ? sideGoal.comments.map(c => `
                <div class="comment">
                  ${renderMarkdown(c.text)}
                </div>
              `).join('') : ''}
            </div>
          `
        })
      }
    }

    // Achievements section (Markdown text)
    if (selectedElements.includes('achievements')) {
      if (sprint.achievements && sprint.achievements.trim()) {
        html += `
          <h2>Osiągnięcia Dodatkowe</h2>
          <div style="font-size: 14px;">${renderMarkdown(sprint.achievements)}</div>
        `
      }
    }

    // Tasks section
    if (selectedElements.includes('tasks')) {
      const allTaskStats = {
        done: sprint.tasks.filter(t => t.status === 'Done').length,
        inProgress: sprint.tasks.filter(t => t.status === 'In Progress').length,
        todo: sprint.tasks.filter(t => t.status === 'To Do').length,
        total: sprint.tasks.length
      }

      html += `<h2>Wszystkie zadania</h2>`

      // Summary stats - equal width boxes
      html += `
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          <div style="background: #dcfce7; padding: 12px 0; border-radius: 8px; text-align: center; width: 100px;">
            <div style="font-size: 24px; font-weight: bold; color: #166534;">${allTaskStats.done}</div>
            <div style="font-size: 12px; color: #166534;">${getStatusLabel('Done')}</div>
          </div>
          <div style="background: #dbeafe; padding: 12px 0; border-radius: 8px; text-align: center; width: 100px;">
            <div style="font-size: 24px; font-weight: bold; color: #1e40af;">${allTaskStats.inProgress}</div>
            <div style="font-size: 12px; color: #1e40af;">${getStatusLabel('In Progress')}</div>
          </div>
          <div style="background: #f3f4f6; padding: 12px 0; border-radius: 8px; text-align: center; width: 100px;">
            <div style="font-size: 24px; font-weight: bold; color: #4b5563;">${allTaskStats.todo}</div>
            <div style="font-size: 12px; color: #4b5563;">${getStatusLabel('To Do')}</div>
          </div>
        </div>
      `

      // Progress bar
      const total = allTaskStats.total || 1
      html += `
        <div class="progress" style="height: 12px; margin-bottom: 20px;">
          <div class="progress-done" style="width: ${(allTaskStats.done / total * 100)}%"></div>
          <div class="progress-inprogress" style="width: ${(allTaskStats.inProgress / total * 100)}%"></div>
          <div class="progress-todo" style="width: ${(allTaskStats.todo / total * 100)}%"></div>
        </div>
      `

      const tasksByStatus = {
        'Done': sprint.tasks.filter(t => t.status === 'Done'),
        'In Progress': sprint.tasks.filter(t => t.status === 'In Progress'),
        'To Do': sprint.tasks.filter(t => t.status === 'To Do')
      }

      const statusColors = {
        'Done': { color: '#166534', bg: '#dcfce7' },
        'In Progress': { color: '#1e40af', bg: '#dbeafe' },
        'To Do': { color: '#4b5563', bg: '#f3f4f6' }
      }

      const statusOrder = ['Done', 'In Progress', 'To Do']
      statusOrder.forEach(status => {
        const tasks = tasksByStatus[status]
        if (tasks.length > 0) {
          const colors = statusColors[status]
          html += `<h3 style="color: ${colors.color};">${getStatusLabel(status)} (${tasks.length})</h3>`
          tasks.forEach(task => {
            html += `
              <div class="task" style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colors.color}; flex-shrink: 0;"></span>
                <span class="task-key">${escapeHtml(task.key)}</span>
                <span style="flex: 1;">${escapeHtml(task.summary)}</span>
                ${task.assignee ? `<span style="color: #9ca3af; font-size: 12px;">${escapeHtml(task.assignee)}</span>` : ''}
              </div>
            `
          })
        }
      })
    }

    // Next sprint plans section
    if (selectedElements.includes('nextPlans')) {
      if (sprint.nextSprintPlans) {
        html += `
          <h2>Plany na następny sprint</h2>
          <div style="font-size: 14px;">${renderMarkdown(sprint.nextSprintPlans)}</div>
        `
      }
    }

    // Footer with generation date
    html += `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
        Wygenerowano: ${new Date().toLocaleString('pl-PL')}
      </div>
    `

    return html
  }

  return { isExporting, exportToPdf }
}
