'use client'

export default function SkeletonBubble() {
  return (
    <div
      className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-stone-100 dark:bg-stone-800"
      aria-label="Loading response"
      role="status"
    >
      <div className="space-y-2">
        <div className="skeleton h-3 rounded-full" style={{ width: '60%' }} />
        <div className="skeleton h-3 rounded-full" style={{ width: '80%' }} />
        <div className="skeleton h-3 rounded-full" style={{ width: '40%' }} />
      </div>
    </div>
  )
}
