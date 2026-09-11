const REPO = "https://github.com/acidtib/artydog";

const linkClass =
  "text-neutral-300 underline decoration-neutral-700 underline-offset-4 transition-colors hover:text-amber-400 hover:decoration-amber-400";

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-center text-neutral-100">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-amber-500">
        unofficial WARDOGS tool
      </p>
      <h1 className="mt-4 text-7xl font-bold tracking-tight sm:text-8xl">
        ArtyDog
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-neutral-400">
        Instant firing solutions in WARDOGS. Enter your mortar position and
        your target, get the distance, azimuth and elevation.
      </p>
      <p className="mt-3 font-mono text-sm text-neutral-500">coming soon</p>
      <nav className="mt-10 flex gap-8 text-sm" aria-label="Links">
        <a className={linkClass} href={REPO}>
          GitHub
        </a>
        <a className={linkClass} href={`${REPO}/releases/latest`}>
          Releases
        </a>
      </nav>
    </main>
  );
}
