/**
 * useMarkdownEditor composable
 *
 * Provides utility functions for manipulating text in textarea elements,
 * including selection handling, text wrapping, and line prefixing for markdown formatting.
 */

import { ref, nextTick } from 'vue'

/**
 * Create a markdown editor composable for a textarea
 * @param {import('vue').Ref<HTMLTextAreaElement|null>} textareaRef - Ref to the textarea element
 * @param {import('vue').Ref<string>} modelValue - Ref to the text value (v-model)
 * @returns {Object} Markdown editor utilities
 */
export function useMarkdownEditor(textareaRef, modelValue) {
  /**
   * Get current selection info from textarea
   * @returns {{ start: number, end: number, text: string, hasSelection: boolean }}
   */
  const getSelection = () => {
    const textarea = textareaRef.value
    if (!textarea) {
      return { start: 0, end: 0, text: '', hasSelection: false }
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = modelValue.value.substring(start, end)

    return {
      start,
      end,
      text,
      hasSelection: start !== end
    }
  }

  /**
   * Insert text at current cursor position
   * @param {string} text - Text to insert
   */
  const insertText = (text) => {
    const textarea = textareaRef.value
    if (!textarea) {
      modelValue.value += text
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = modelValue.value.substring(0, start)
    const after = modelValue.value.substring(end)

    modelValue.value = before + text + after

    // Set cursor position after inserted text
    const newPosition = start + text.length
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    })
  }

  /**
   * Wrap current selection with prefix and suffix
   * If no selection, insert placeholder and select it
   * @param {string} prefix - Text to add before selection
   * @param {string} suffix - Text to add after selection
   * @param {string} placeholder - Placeholder text if no selection
   */
  const wrapSelection = (prefix, suffix, placeholder = 'tekst') => {
    const textarea = textareaRef.value
    if (!textarea) return

    const { start, end, text, hasSelection } = getSelection()
    const before = modelValue.value.substring(0, start)
    const after = modelValue.value.substring(end)

    if (hasSelection) {
      // Wrap selected text
      modelValue.value = before + prefix + text + suffix + after

      // Position cursor after the wrapped text
      nextTick(() => {
        textarea.focus()
        const newStart = start + prefix.length
        const newEnd = newStart + text.length
        textarea.setSelectionRange(newStart, newEnd)
      })
    } else {
      // Insert placeholder and select it
      modelValue.value = before + prefix + placeholder + suffix + after

      nextTick(() => {
        textarea.focus()
        const newStart = start + prefix.length
        const newEnd = newStart + placeholder.length
        textarea.setSelectionRange(newStart, newEnd)
      })
    }
  }

  /**
   * Get the lines that are currently selected or the line at cursor
   * @returns {{ lines: string[], startLine: number, endLine: number, lineStart: number, lineEnd: number }}
   */
  const getSelectedLines = () => {
    const textarea = textareaRef.value
    if (!textarea) {
      return { lines: [], startLine: 0, endLine: 0, lineStart: 0, lineEnd: 0 }
    }

    const { start, end } = getSelection()
    const text = modelValue.value

    // Find the start of the first selected line
    let lineStart = start
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--
    }

    // Find the end of the last selected line
    let lineEnd = end
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++
    }

    // Get the selected text including full lines
    const selectedText = text.substring(lineStart, lineEnd)
    const lines = selectedText.split('\n')

    // Calculate line numbers
    const textBeforeStart = text.substring(0, lineStart)
    const startLine = textBeforeStart.split('\n').length - 1

    return {
      lines,
      startLine,
      endLine: startLine + lines.length - 1,
      lineStart,
      lineEnd
    }
  }

  /**
   * Prefix selected lines with a string (for bullet lists)
   * If line already has the prefix, remove it (toggle)
   * @param {string} prefix - Prefix to add (e.g., '- ' for bullet list)
   */
  const prefixLines = (prefix) => {
    const textarea = textareaRef.value
    if (!textarea) return

    const { lines, lineStart, lineEnd } = getSelectedLines()
    const text = modelValue.value

    // Check if all selected lines already have the prefix
    const allHavePrefix = lines.every(line => line.startsWith(prefix) || line.trim() === '')

    let newLines
    if (allHavePrefix) {
      // Remove prefix from all lines
      newLines = lines.map(line => {
        if (line.startsWith(prefix)) {
          return line.substring(prefix.length)
        }
        return line
      })
    } else {
      // Add prefix to all non-empty lines that don't have it
      newLines = lines.map(line => {
        if (line.trim() === '') return line
        if (line.startsWith(prefix)) return line
        // Remove other list prefixes before adding new one
        const cleanedLine = line.replace(/^(\d+\.\s*|- )/, '')
        return prefix + cleanedLine
      })
    }

    const before = text.substring(0, lineStart)
    const after = text.substring(lineEnd)
    const newText = newLines.join('\n')

    modelValue.value = before + newText + after

    // Reselect the modified lines
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newText.length)
    })
  }

  /**
   * Prefix selected lines with numbered list (1. 2. 3. etc.)
   * If already numbered, remove numbering
   */
  const prefixLinesNumbered = () => {
    const textarea = textareaRef.value
    if (!textarea) return

    const { lines, lineStart, lineEnd } = getSelectedLines()
    const text = modelValue.value

    // Check if all selected lines already have numbering
    const numberPattern = /^\d+\.\s/
    const allHaveNumbers = lines.every(line => numberPattern.test(line) || line.trim() === '')

    let newLines
    if (allHaveNumbers) {
      // Remove numbering from all lines
      newLines = lines.map(line => line.replace(numberPattern, ''))
    } else {
      // Add numbering to all non-empty lines
      let number = 1
      newLines = lines.map(line => {
        if (line.trim() === '') return line
        // Remove existing list prefixes
        const cleanedLine = line.replace(/^(\d+\.\s*|- )/, '')
        return `${number++}. ${cleanedLine}`
      })
    }

    const before = text.substring(0, lineStart)
    const after = text.substring(lineEnd)
    const newText = newLines.join('\n')

    modelValue.value = before + newText + after

    // Reselect the modified lines
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newText.length)
    })
  }

  /**
   * Insert a link at cursor position
   * If text is selected, use it as link text
   * @param {string} url - URL for the link
   * @param {string} linkText - Optional link text (uses selection if not provided)
   */
  const insertLink = (url, linkText = null) => {
    const textarea = textareaRef.value
    if (!textarea) return

    const { start, end, text, hasSelection } = getSelection()
    const before = modelValue.value.substring(0, start)
    const after = modelValue.value.substring(end)

    const displayText = linkText || (hasSelection ? text : 'link')
    const markdown = `[${displayText}](${url})`

    modelValue.value = before + markdown + after

    nextTick(() => {
      textarea.focus()
      if (!hasSelection && !linkText) {
        // Select the word "link" for easy replacement
        const linkStart = start + 1
        const linkEnd = linkStart + displayText.length
        textarea.setSelectionRange(linkStart, linkEnd)
      } else {
        // Position cursor after the link
        const newPosition = start + markdown.length
        textarea.setSelectionRange(newPosition, newPosition)
      }
    })
  }

  /**
   * Insert media markdown at cursor position
   * Adds newlines if needed
   * @param {string} markdown - Markdown string for the media
   */
  const insertMedia = (markdown) => {
    const textarea = textareaRef.value
    if (!textarea) {
      modelValue.value += '\n' + markdown
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = modelValue.value.substring(0, start)
    const after = modelValue.value.substring(end)

    // Add newlines if needed
    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n')
    const needsNewlineAfter = after.length > 0 && !after.startsWith('\n')

    const insertText = (needsNewlineBefore ? '\n' : '') + markdown + (needsNewlineAfter ? '\n' : '')

    modelValue.value = before + insertText + after

    // Set cursor position after inserted text
    const newPosition = start + insertText.length
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(newPosition, newPosition)
    })
  }

  return {
    getSelection,
    insertText,
    wrapSelection,
    getSelectedLines,
    prefixLines,
    prefixLinesNumbered,
    insertLink,
    insertMedia
  }
}

export default useMarkdownEditor
