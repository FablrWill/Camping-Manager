'use client'

interface DeleteConfirmPayload {
  action: 'confirm_delete'
  itemType: string
  itemId: string
  itemName: string
}

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: string[]
  onConfirmDelete?: (itemType: string, itemId: string) => void
  onCancelDelete?: () => void
}

function extractDeleteConfirm(content: string): DeleteConfirmPayload | null {
  // Look for a JSON block with "action":"confirm_delete" inside the content
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*?"action"\s*:\s*"confirm_delete"[\s\S]*?})/m)
  if (!jsonMatch) return null

  const jsonStr = jsonMatch[1] || jsonMatch[2]
  if (!jsonStr) return null

  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed.action === 'confirm_delete' && parsed.itemType && parsed.itemId && parsed.itemName) {
      return parsed as DeleteConfirmPayload
    }
  } catch {
    // Malformed JSON — skip
  }
  return null
}

export default function ChatBubble({ role, content, toolCalls, onConfirmDelete, onCancelDelete }: ChatBubbleProps) {
  const isUser = role === 'user'

  const deleteConfirm = !isUser ? extractDeleteConfirm(content) : null

  // Strip JSON block from displayed text if we have a confirm_delete card
  const displayContent = deleteConfirm
    ? content.replace(/```json\s*[\s\S]*?\s*```/m, '').replace(/{[\s\S]*?"action"\s*:\s*"confirm_delete"[\s\S]*?}/m, '').trim()
    : content

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'ml-auto max-w-[75%] bg-amber-600 text-white dark:bg-amber-500 dark:text-stone-900 rounded-2xl rounded-br-sm px-4 py-2'
            : 'mr-auto max-w-[85%] bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-700 rounded-2xl rounded-bl-sm px-4 py-2'
        }
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap">{displayContent}</p>

        {toolCalls && toolCalls.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {toolCalls.map((tool, i) => (
              <li key={i} className={`text-xs ${isUser ? 'text-amber-100 dark:text-amber-800' : 'text-stone-400 dark:text-stone-500'}`}>
                {tool}
              </li>
            ))}
          </ul>
        )}

        {deleteConfirm && (
          <div className="mt-3 p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/30">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Delete {deleteConfirm.itemName}?</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">This can&apos;t be undone.</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onCancelDelete?.()}
                className="px-3 py-1.5 text-sm rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
              >
                Keep {deleteConfirm.itemName}
              </button>
              <button
                onClick={() => onConfirmDelete?.(deleteConfirm.itemType, deleteConfirm.itemId)}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white dark:bg-red-500"
              >
                Delete {deleteConfirm.itemName}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
