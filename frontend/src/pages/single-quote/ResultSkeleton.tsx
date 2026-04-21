export function ResultSkeleton() {
  return (
    <div className="motion-safe:animate-pulse space-y-4" aria-hidden="true">
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-line2" />
        <div className="p-6 pt-7">
          <div className="h-3 w-32 bg-line rounded-sm" />
          <div className="mt-4 h-16 w-56 bg-line rounded-sm" />
          <div className="mt-6 flex items-baseline justify-between">
            <div className="h-3 w-20 bg-line rounded-sm" />
            <div className="h-3 w-14 bg-line rounded-sm" />
            <div className="h-3 w-20 bg-line rounded-sm" />
          </div>
          <div className="mt-2 h-2 bg-line rounded-full" />
          <div className="mt-4 flex items-center gap-2">
            <div className="h-3 w-20 bg-line rounded-sm" />
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-1.5 h-1.5 bg-line rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-0 border-b hairline">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 h-10 border-r hairline last:border-r-0 px-4 py-2.5"
            >
              <div className="h-4 w-16 bg-line rounded-sm" />
            </div>
          ))}
        </div>
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-16 bg-line rounded-sm" />
              <div className="h-3 w-14 bg-line rounded-sm" />
              <div className="flex-1 h-2.5 bg-line rounded-sm" />
              <div className="h-3 w-10 bg-line rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-line rounded-sm" />
        <div className="flex-1 h-10 bg-line rounded-sm" />
      </div>
    </div>
  );
}
