import { ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { POLISH_NOUNS } from '../utils/pluralize'

const renderMarkdown = (text) => {
  if (!text) return ''
  return DOMPurify.sanitize(marked(text))
}

export function usePdfExport() {
  const isExporting = ref(false)

  const exportToPdf = async (sprint, selectedElements = []) => {
    console.log('Export PDF - selectedElements:', selectedElements)
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

      // Wait for fonts and DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
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
        .progress { background: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 8px; }
        .progress-bar { background: #3b82f6; height: 100%; border-radius: 4px; }
        .task { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .task:last-child { border-bottom: none; }
        .task-key { color: #9ca3af; font-family: 'Courier New', Courier, monospace; font-size: 12px; }
        .status-done { color: #059669; }
        .status-progress { color: #2563eb; }
        .status-todo { color: #6b7280; }
        .achievement { padding: 8px 0; font-size: 14px; }
        .comment { background: #fef3c7; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 13px; }
        .comment ul, .comment ol { margin: 4px 0; padding-left: 20px; }
        .comment p { margin: 4px 0; }
      </style>
    `

    // Summary section - header with basic info
    if (selectedElements.includes('summary')) {
      html += `
        <h1>${sprint.name}</h1>
        <p class="meta">${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)} · Status: ${sprint.status === 'active' ? 'Aktywny' : 'Zamknięty'}</p>
      `
    }

    // Goals section - main goals with details and comments
    if (selectedElements.includes('goals')) {
      html += `<h2>Cele sprintu</h2>`
      sprint.goals.forEach((goal, index) => {
        html += `
          <div class="goal">
            <div class="goal-title">${index + 1}. ${goal.title}</div>
            <div class="goal-meta">
              ${goal.client ? `Klient: ${goal.client} · ` : ''}
              Postęp: ${goal.completionPercent}% ·
              ${goal.completed ? '✓ Ukończony' : 'W trakcie'}
            </div>
            <div class="progress">
              <div class="progress-bar" style="width: ${goal.completionPercent}%"></div>
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
          html += `
            <div class="goal" style="background: #fffbeb;">
              <div class="goal-title">${index + 1}. ${sideGoal.title}</div>
              <div class="goal-meta">
                ${sideGoal.client ? `Klient: ${sideGoal.client} · ` : ''}
                Postęp: ${sideGoal.completionPercent}% ·
                ${sideGoal.completed ? '✓ Ukończony' : 'W trakcie'}
              </div>
              <div class="progress">
                <div class="progress-bar" style="width: ${sideGoal.completionPercent}%; background: #f59e0b;"></div>
              </div>
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
      html += `<h2>Wszystkie zadania</h2>`

      const tasksByStatus = {
        'To Do': sprint.tasks.filter(t => t.status === 'To Do'),
        'In Progress': sprint.tasks.filter(t => t.status === 'In Progress'),
        'Done': sprint.tasks.filter(t => t.status === 'Done')
      }

      const statusOrder = ['To Do', 'In Progress', 'Done']
      statusOrder.forEach(status => {
        const tasks = tasksByStatus[status]
        if (tasks.length > 0) {
          const statusClass = status === 'Done' ? 'status-done' : status === 'In Progress' ? 'status-progress' : 'status-todo'
          html += `<h3 class="${statusClass}">${status} (${tasks.length})</h3>`
          tasks.forEach(task => {
            html += `
              <div class="task">
                <span class="task-key">${task.key}</span>
                ${task.summary}
                ${task.assignee ? `<span style="color: #9ca3af;"> - ${task.assignee}</span>` : ''}
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
