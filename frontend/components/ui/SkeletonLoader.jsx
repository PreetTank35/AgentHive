"use client"

/**
 * SkeletonLoader — reusable pulse/shimmer skeleton for loading states.
 *
 * @param {string} className - Additional Tailwind classes for sizing.
 * @param {string} variant - 'text' | 'circle' | 'rect' | 'card'.
 * @param {number} count - Number of skeleton items to render.
 */
export default function SkeletonLoader({ className = '', variant = 'rect', count = 1 }) {
  const variants = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-xl',
    card: 'rounded-2xl h-32',
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${variants[variant]} ${className}`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </>
  )
}

/**
 * ChatSkeleton — skeleton for the chat view loading state.
 */
export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton w-32 h-4" />
          <div className="skeleton w-20 h-3" />
        </div>
      </div>
      {/* Message skeletons */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-start">
          <div className="skeleton w-[60%] h-16 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton w-[40%] h-10 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <div className="skeleton w-[70%] h-20 rounded-2xl" />
        </div>
      </div>
      {/* Input skeleton */}
      <div className="skeleton w-full h-12 rounded-xl" />
    </div>
  )
}

/**
 * CardSkeleton — skeleton for card grid items.
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="skeleton w-24 h-4" />
              <div className="skeleton w-16 h-3" />
            </div>
          </div>
          <div className="skeleton w-full h-3" />
          <div className="skeleton w-3/4 h-3" />
        </div>
      ))}
    </div>
  )
}
