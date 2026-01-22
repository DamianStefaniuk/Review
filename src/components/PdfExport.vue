<script setup>
import { ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { POLISH_NOUNS } from '../utils/pluralize'

const renderMarkdown = (text) => {
  if (!text) return ''
  return DOMPurify.sanitize(marked(text))
}

const props = defineProps({
  sprint: {
    type: Object,
    required: true
  }
})

const isExporting = ref(false)

const exportToPdf = async () => {
  isExporting.value = true

  try {
    // Dynamically import html2pdf to reduce initial bundle size
    const html2pdf = (await import('html2pdf.js')).default

    // Create a container with the content to export
    const content = document.createElement('div')
    content.innerHTML = generatePdfContent()
    content.style.padding = '20px'
    document.body.appendChild(content)

    const options = {
      margin: 10,
      filename: `${props.sprint.name.replace(/\s+/g, '-')}-review.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
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

const generatePdfContent = () => {
  const { sprint } = props
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pl-PL')

  let html = `
    <style>
      * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
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
      .task-key { color: #9ca3af; font-family: monospace; font-size: 12px; }
      .status-done { color: #059669; }
      .status-progress { color: #2563eb; }
      .status-todo { color: #6b7280; }
      .achievement { padding: 8px 0; font-size: 14px; }
      .comment { background: #fef3c7; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 13px; }
      .comment ul, .comment ol { margin: 4px 0; padding-left: 20px; }
      .comment p { margin: 4px 0; }
    </style>

    <h1>${sprint.name}</h1>
    <p class="meta">${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)} · Status: ${sprint.status === 'active' ? 'Aktywny' : 'Zamknięty'}</p>

    <h2>Cele sprintu</h2>
  `

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
        ${goal.comments.length > 0 ? goal.comments.map(c => `
          <div class="comment">
            ${renderMarkdown(c.text)}
          </div>
        `).join('') : ''}
      </div>
    `
  })

  // Side goals section
  const sideGoals = sprint.sideGoals || []
  if (sideGoals.length > 0) {
    html += `<h2 style="text-transform: capitalize;">${POLISH_NOUNS.sideGoal.few}</h2>`
    sideGoals.forEach((sideGoal, index) => {
      html += `
        <div class="goal" style="background: #fffbeb;">
          <div class="goal-title">${index + 1}. ${sideGoal.title}</div>
          <div class="goal-meta">
            ${sideGoal.client ? `Klient: ${sideGoal.client} · ` : ''}
            Postep: ${sideGoal.completionPercent}% ·
            ${sideGoal.completed ? '✓ Ukonczony' : 'W trakcie'}
          </div>
          <div class="progress">
            <div class="progress-bar" style="width: ${sideGoal.completionPercent}%; background: #f59e0b;"></div>
          </div>
        </div>
      `
    })
  }

  // Achievements section (Markdown text)
  if (sprint.achievements && sprint.achievements.trim()) {
    html += `
      <h2>Osiągnięcia Dodatkowe</h2>
      <div style="font-size: 14px;">${renderMarkdown(sprint.achievements)}</div>
    `
  }

  html += `<h2>Wszystkie zadania</h2>`

  const tasksByStatus = {
    'Done': sprint.tasks.filter(t => t.status === 'Done'),
    'In Progress': sprint.tasks.filter(t => t.status === 'In Progress'),
    'To Do': sprint.tasks.filter(t => t.status === 'To Do')
  }

  Object.entries(tasksByStatus).forEach(([status, tasks]) => {
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

  if (sprint.nextSprintPlans) {
    html += `
      <h2>Plany na następny sprint</h2>
      <div style="font-size: 14px;">${renderMarkdown(sprint.nextSprintPlans)}</div>
    `
  }

  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
      Wygenerowano: ${new Date().toLocaleString('pl-PL')}
    </div>
  `

  return html
}
</script>

<template>
  <button
    @click="exportToPdf"
    :disabled="isExporting"
    class="flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[160px]"
  >
    <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>{{ isExporting ? 'Eksportowanie...' : 'Eksport PDF' }}</span>
  </button>
</template>
