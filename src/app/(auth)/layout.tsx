export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-2xl shadow-lg"
            style={{ background: 'var(--a600)' }}
          >
            ♥
          </div>
          <h1 className="text-2xl font-bold text-ink">My Wishlist</h1>
          <p className="text-dim text-sm mt-1">Track what you want. Find the best price.</p>
        </div>
        <div className="bg-card rounded-2xl border border-line shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
