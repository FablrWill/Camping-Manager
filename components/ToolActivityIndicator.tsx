'use client'

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: 'Searching knowledge base...',
  list_gear: 'Checking your gear...',
  update_gear: 'Updating gear...',
  list_trips: 'Checking your trips...',
  get_trip: 'Loading trip details...',
  create_trip: 'Creating trip...',
  update_trip: 'Updating trip...',
  list_locations: 'Looking up your spots...',
  get_weather: 'Looking up weather...',
  toggle_packing_item: 'Updating packing list...',
  request_delete_confirmation: 'Preparing to delete...',
}

interface ToolActivityIndicatorProps {
  toolName: string
}

export default function ToolActivityIndicator({ toolName }: ToolActivityIndicatorProps) {
  const label = TOOL_LABELS[toolName] ?? 'Thinking...'

  return (
    <div
      aria-live="polite"
      className="mr-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800"
    >
      <span className="text-xs italic text-stone-500 dark:text-stone-400">{label}</span>
    </div>
  )
}
