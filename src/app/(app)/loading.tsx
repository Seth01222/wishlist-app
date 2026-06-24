// Shown while an authenticated route's server component is fetching data.
export default function AppLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-raised mb-2" />
      <div className="h-4 w-32 rounded bg-raised mb-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-line rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-raised shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 rounded bg-raised mb-2" />
                <div className="h-3 w-1/2 rounded bg-raised" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-raised" />
          </div>
        ))}
      </div>
    </div>
  )
}
