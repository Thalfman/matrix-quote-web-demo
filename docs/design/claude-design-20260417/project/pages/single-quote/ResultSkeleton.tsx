// frontend/src/pages/single-quote/ResultSkeleton.tsx
export function ResultSkeleton() {
  return (
    <div className="motion-safe:animate-pulse space-y-4" aria-hidden="true">
      {/* Hero card — matches HeroEstimate: eyebrow, big number, range, confidence row */}
      <div className="card p-6">
        <div className="h-2.5 w-32 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
        <div className="mt-3 h-14 w-48 bg-steel-200 dark:bg-steel-700/50 rounded" />
        <div className="mt-4 h-3 w-60 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
        <div className="mt-3 flex items-center gap-2">
          <div className="h-3 w-20 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1.5 h-1.5 bg-steel-200 dark:bg-steel-700/50 rounded-full" />
            ))}
          </div>
          <div className="h-3 w-16 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
        </div>
      </div>

      {/* Tabs card — tablist header + 6 content rows */}
      <div className="card">
        <div className="flex gap-1 border-b border-border dark:border-border-dark px-2 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-20 bg-steel-200 dark:bg-steel-700/50 rounded-sm mb-2" />
          ))}
        </div>
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-28 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
              <div className="h-3 w-12 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
              <div className="flex-1 h-2 bg-steel-200 dark:bg-steel-700/50 rounded-full" />
              <div className="h-3 w-8 bg-steel-200 dark:bg-steel-700/50 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Action row — matches primary + secondary buttons */}
      <div className="flex gap-2">
        <div className="h-10 w-36 bg-steel-200 dark:bg-steel-700/50 rounded-md" />
        <div className="h-10 w-32 bg-steel-200 dark:bg-steel-700/50 rounded-md" />
      </div>
    </div>
  );
}
