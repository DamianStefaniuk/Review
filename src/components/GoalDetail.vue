<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ProgressBar from './ProgressBar.vue'
import CommentEditor from './CommentEditor.vue'
import MediaUploader from './MediaUploader.vue'
import { getTasksForGoal, getTasksForSideGoal } from '../services/dataLoader'
import { pluralize, pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'
import { renderMarkdownWithMedia, processMediaUrls, clearBlobCache, generateMediaMarkdown } from '../utils/markdownMedia'

const props = defineProps({
  goal: {
    type: Object,
    required: true
  },
  sprint: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'addComment', 'updateComment', 'deleteComment'])

const isSideGoal = computed(() => props.goal.isSideGoal === true)

// Edit state
const editingCommentId = ref(null)
const editText = ref('')
const isUpdating = ref(false)
const showEditMediaUploader = ref(false)
const editTextareaRef = ref(null)

// Comment content refs for media processing
const commentsContainerRef = ref(null)

// Computed for edit preview
const editPreview = computed(() => {
  if (!editText.value) return ''
  return DOMPurify.sanitize(marked(editText.value))
})

// Delete state
const deletingCommentId = ref(null)
const isDeleting = ref(false)

const tasks = computed(() => {
  if (isSideGoal.value) {
    return getTasksForSideGoal(props.sprint, props.goal)
  }
  return getTasksForGoal(props.sprint, props.goal)
})

const comments = computed(() => props.goal.comments || [])

const tasksByStatus = computed(() => {
  const grouped = {
    'Done': [],
    'In Progress': [],
    'To Do': []
  }
  tasks.value.forEach(task => {
    if (grouped[task.status]) {
      grouped[task.status].push(task)
    } else {
      grouped['To Do'].push(task)
    }
  })
  return grouped
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusColors = {
  'Done': 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'To Do': 'bg-gray-100 text-gray-600'
}

const handleAddComment = (comment) => {
  emit('addComment', { goalId: props.goal.id, comment, isSideGoal: isSideGoal.value })
}

// Edit functions
const startEditing = (comment) => {
  editingCommentId.value = comment.id
  editText.value = comment.text
  showEditMediaUploader.value = false
}

const cancelEditing = () => {
  editingCommentId.value = null
  editText.value = ''
  showEditMediaUploader.value = false
}

const saveEdit = async () => {
  if (!editText.value.trim()) return

  isUpdating.value = true
  emit('updateComment', {
    goalId: props.goal.id,
    commentId: editingCommentId.value,
    updatedComment: {
      text: editText.value.trim()
    },
    isSideGoal: isSideGoal.value
  })

  // Reset state after emit (parent will handle the actual update)
  editingCommentId.value = null
  editText.value = ''
  isUpdating.value = false
  showEditMediaUploader.value = false
}

// Helper function to render markdown for comments with media support
const renderMarkdown = (text) => {
  if (!text) return ''
  return renderMarkdownWithMedia(text)
}

// Process media URLs after comments render
const processCommentsMedia = async () => {
  await nextTick()
  if (commentsContainerRef.value) {
    processMediaUrls(commentsContainerRef.value)
  }
}

// Watch for comment changes to process media
watch(comments, processCommentsMedia, { deep: true })

onMounted(() => {
  processCommentsMedia()
})

onUnmounted(() => {
  clearBlobCache()
})

// Delete functions
const confirmDelete = (commentId) => {
  deletingCommentId.value = commentId
}

const cancelDelete = () => {
  deletingCommentId.value = null
}

const executeDelete = async () => {
  isDeleting.value = true
  emit('deleteComment', {
    goalId: props.goal.id,
    commentId: deletingCommentId.value,
    isSideGoal: isSideGoal.value
  })

  deletingCommentId.value = null
  isDeleting.value = false
}

// Media upload for edit mode
const toggleEditMediaUploader = () => {
  showEditMediaUploader.value = !showEditMediaUploader.value
}

const handleEditMediaUpload = (result) => {
  const markdown = generateMediaMarkdown(result)
  insertAtEditCursor(markdown)
  showEditMediaUploader.value = false
}

const handleEditMediaError = (error) => {
  console.error('Media upload error:', error)
}

const insertAtEditCursor = (text) => {
  const textarea = editTextareaRef.value
  if (!textarea) {
    editText.value += '\n' + text
    return
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = editText.value.substring(0, start)
  const after = editText.value.substring(end)

  const needsNewlineBefore = before.length > 0 && !before.endsWith('\n')
  const needsNewlineAfter = after.length > 0 && !after.startsWith('\n')

  const insertText = (needsNewlineBefore ? '\n' : '') + text + (needsNewlineAfter ? '\n' : '')

  editText.value = before + insertText + after

  const newPosition = start + insertText.length
  textarea.focus()
  setTimeout(() => {
    textarea.setSelectionRange(newPosition, newPosition)
  }, 0)
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-200">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span
              v-if="goal.completed"
              class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </span>
            <h2 class="text-xl font-bold text-gray-900">{{ goal.title }}</h2>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span v-if="goal.client" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {{ goal.client }}
            </span>
            <span v-if="!isSideGoal && goal.tag" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {{ goal.tag }}
            </span>
            <template v-if="isSideGoal">
              <span v-if="goal.extra1" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ goal.extra1 }}
              </span>
              <span v-if="goal.extra2" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ goal.extra2 }}
              </span>
              <span v-if="goal.extra3" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ goal.extra3 }}
              </span>
            </template>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Progress -->
      <div class="mt-4">
        <ProgressBar :task-stats="goal.taskStats" size="md" />
      </div>
    </div>

    <!-- Comments -->
    <div class="p-6 border-b border-gray-200">
      <CommentEditor
        v-if="sprint.status === 'active'"
        :sprint-id="sprint.id"
        @submit="handleAddComment"
        class="mb-6"
      />

      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Komentarze ({{ comments.length }})
      </h3>

      <div v-if="comments.length > 0" ref="commentsContainerRef" class="space-y-4">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="p-4 bg-gray-50 rounded-lg"
        >
          <!-- Edit mode -->
          <div v-if="editingCommentId === comment.id" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Edycja komentarza</span>
              <button
                @click="toggleEditMediaUploader"
                type="button"
                class="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Media
              </button>
            </div>

            <!-- Media Uploader for edit -->
            <div v-if="showEditMediaUploader">
              <MediaUploader
                :sprint-id="sprint.id"
                @upload="handleEditMediaUpload"
                @error="handleEditMediaError"
              />
            </div>

            <textarea
              ref="editTextareaRef"
              v-model="editText"
              rows="3"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono"
            ></textarea>
            <p class="text-xs text-gray-500">Markdown: listy (- lub 1.), **pogrubienie**, *kursywa*</p>

            <!-- Preview -->
            <div v-if="editText" class="pt-3 border-t border-gray-200">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Podglad:</h4>
              <div
                class="markdown-content prose prose-sm max-w-none p-3 bg-white rounded-lg border border-gray-200"
                v-html="editPreview"
              ></div>
            </div>

            <div class="flex justify-end gap-2">
              <button
                @click="cancelEditing"
                class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                @click="saveEdit"
                :disabled="!editText.trim() || isUpdating"
                class="px-3 py-1.5 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Zapisz
              </button>
            </div>
          </div>

          <!-- View mode -->
          <template v-else>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
                <span v-if="comment.updatedAt" class="text-xs text-gray-400">(edytowano)</span>
              </div>

              <!-- Edit/Delete buttons -->
              <div v-if="sprint.status === 'active'" class="flex items-center gap-1">
                <button
                  @click="startEditing(comment)"
                  class="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Edytuj"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="confirmDelete(comment.id)"
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Usuń"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              class="text-sm text-gray-700 markdown-content prose prose-sm max-w-none"
              v-html="renderMarkdown(comment.text)"
            ></div>

            <!-- Delete confirmation -->
            <div v-if="deletingCommentId === comment.id" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-700 mb-2">Czy na pewno chcesz usunąć ten komentarz?</p>
              <div class="flex justify-end gap-2">
                <button
                  @click="cancelDelete"
                  class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
                <button
                  @click="executeDelete"
                  :disabled="isDeleting"
                  class="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <p v-else class="text-sm text-gray-500 text-center py-4">Brak komentarzy</p>
    </div>

    <!-- Tasks -->
    <div class="p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 capitalize">
        {{ pluralizeWithCount(tasks.length, POLISH_NOUNS.task) }}
      </h3>

      <div class="space-y-4">
        <!-- Done tasks -->
        <div v-if="tasksByStatus['Done'].length > 0">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Ukończone</h4>
          <div class="space-y-2">
            <a
              v-for="task in tasksByStatus['Done']"
              :key="task.key"
              :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
              :target="sprint.jiraBaseUrl ? '_blank' : undefined"
              :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
              class="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
            </a>
          </div>
        </div>

        <!-- In Progress tasks -->
        <div v-if="tasksByStatus['In Progress'].length > 0">
          <h4 class="text-sm font-medium text-gray-500 mb-2">W trakcie</h4>
          <div class="space-y-2">
            <a
              v-for="task in tasksByStatus['In Progress']"
              :key="task.key"
              :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
              :target="sprint.jiraBaseUrl ? '_blank' : undefined"
              :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
              class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
            </a>
          </div>
        </div>

        <!-- To Do tasks -->
        <div v-if="tasksByStatus['To Do'].length > 0">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Do zrobienia</h4>
          <div class="space-y-2">
            <a
              v-for="task in tasksByStatus['To Do']"
              :key="task.key"
              :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
              :target="sprint.jiraBaseUrl ? '_blank' : undefined"
              :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300"></span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
