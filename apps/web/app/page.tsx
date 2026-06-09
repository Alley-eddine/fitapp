export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/15 text-3xl">
        💪
      </div>
      <h1 className="text-5xl font-bold tracking-tight">
        FitCoach <span className="text-cyan-400">AI</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-slate-400">
        La plateforme de coaching sportif : le coach prépare, l&apos;élève exécute sans rien
        régler, les données remontent automatiquement.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/login"
          className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-900 transition hover:bg-cyan-300"
        >
          Commencer
        </a>
        <a
          href="/login"
          className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Se connecter
        </a>
      </div>
      <p className="mt-16 text-sm text-slate-500">
        Coach · Élève · Autonome — un seul outil, zéro friction.
      </p>
    </main>
  );
}
