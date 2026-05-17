import Link from "next/link"

export default function IntroPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="intro-world absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-secondary/10 blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div
          className="intro-world-glow pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/25 via-primary/20 to-secondary/25"
          aria-hidden
        />
        <div
          className="intro-world-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.75_0.18_85/0.22)_0%,transparent_65%)] [animation-delay:0.4s]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          <span className="saviour-title bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
            SAVIOUR
          </span>
        </h1>
        <p className="mt-8 max-w-xl text-base text-foreground md:text-lg" />

        <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          Developed by R. Games
        </p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          Designed and created by Michael Mahone
        </p>
        <Link
          href="/landing"
          className="mt-10 rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:from-secondary hover:to-primary"
        >
          Choose your World
        </Link>
      </div>
    </main>
  )
}
