import type { ReactNode } from "react";
import DemoCalculator from "./components/DemoCalculator";

const REPO = "https://github.com/acidtib/artydog";
// Bump these together when a release ships; the demo footer shows the same.
const VERSION = "0.1.3";
const TAG = `app-v${VERSION}`;

const asset = (file: string) => `${REPO}/releases/download/${TAG}/${file}`;
const EXE = `ArtyDog_${VERSION}_x64-setup.exe`;
const APPIMAGE = `ArtyDog_${VERSION}_amd64.AppImage`;
const DEB = `ArtyDog_${VERSION}_amd64.deb`;

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
      {children}
    </p>
  );
}

// Point at a recording in public/, e.g. `${import.meta.env.BASE_URL}demo.mp4`.
const DEMO_VIDEO: string | null = null;

function DemoVideo() {
  return (
    <div className="rounded-[10px] bg-gradient-to-br from-emerald-500/40 via-tool-border to-amber-500/30 p-px shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
      {DEMO_VIDEO === null ? (
        <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-[9px] bg-tool-base px-6 text-center">
          <div aria-hidden="true" className="video-grid absolute inset-0" />
          <span
            aria-hidden="true"
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 sm:h-20 sm:w-20"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          <p className="relative mt-3 font-display text-base font-semibold uppercase tracking-[0.08em] text-neutral-200 sm:mt-5 sm:text-2xl">
            Watch the overlay in action
          </p>
          <p className="relative mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 sm:text-[11px]">
            Video coming soon
          </p>
        </div>
      ) : (
        <video
          className="block aspect-video w-full rounded-[9px] bg-black"
          src={DEMO_VIDEO}
          controls
          playsInline
          preload="metadata"
        />
      )}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-block rounded-[4px] border border-b-2 border-neutral-700 bg-neutral-800 px-1.5 py-0.5 align-middle font-mono text-[11px] font-medium normal-case leading-none text-neutral-200">
      {children}
    </kbd>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-emerald-400"
    >
      <polyline points="4 12.5 9.5 18 20 6" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="mt-0.5 shrink-0 text-amber-400"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

const GRID = Array.from({ length: 15 }, (_, i) => (i + 1) * 40);

// Values match the verified SPH-2 test vector, 50,50 to 65,50.
function OverlayScene() {
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label="The ArtyDog overlay showing a firing solution on top of the game map"
      className="block h-auto w-full"
    >
      <defs>
        <linearGradient id="scene-terrain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#161b13" />
          <stop offset="1" stopColor="#0b0c0a" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#scene-terrain)" />
      <g stroke="#fff" strokeOpacity="0.06">
        {GRID.map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="360" />
        ))}
        {GRID.slice(0, 8).map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="640" y2={y} />
        ))}
      </g>

      <path
        d="M120 240 Q240 104 360 240"
        fill="none"
        stroke="#34d399"
        strokeOpacity="0.8"
        strokeWidth="1.5"
        strokeDasharray="4 5"
      />
      <rect
        x="113"
        y="233"
        width="14"
        height="14"
        rx="2"
        fill="#34d399"
        fillOpacity="0.2"
        stroke="#34d399"
        strokeWidth="1.5"
      />
      <text x="120" y="268" textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.5" fill="#a3a3a3">
        ARTILLERY
      </text>
      <g stroke="#f59e0b" strokeWidth="1.5" fill="none">
        <circle cx="360" cy="240" r="9" />
        <line x1="360" y1="226" x2="360" y2="254" />
        <line x1="346" y1="240" x2="374" y2="240" />
      </g>
      <text x="360" y="272" textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.5" fill="#a3a3a3">
        TARGET
      </text>

      <g>
        <rect x="404" y="20" width="216" height="150" rx="6" fill="#0d0d0d" fillOpacity="0.96" stroke="#34d399" strokeOpacity="0.45" />
        <line x1="404" y1="46" x2="620" y2="46" stroke="#262626" />
        <text x="417" y="37" fontSize="9" fontWeight="700" letterSpacing="2" fill="#d4d4d4">
          ARTYDOG
        </text>
        <text x="607" y="37" textAnchor="end" fontSize="8" fontWeight="600" letterSpacing="1" fill="#737373">
          IN RANGE
        </text>
        <line x1="404" y1="88" x2="620" y2="88" stroke="#1f1f1f" />
        <line x1="404" y1="128" x2="620" y2="128" stroke="#1f1f1f" />
        {(
          [
            ["DISTANCE", "1500 m", "", 73],
            ["AZIMUTH", "90.0°", " E", 113],
            ["ELEVATION", "84 mil", "", 153],
          ] as const
        ).map(([label, value, suffix, y]) => (
          <g key={label}>
            <text x="417" y={y - 3} fontSize="8.5" fontWeight="700" letterSpacing="1" fill="#a3a3a3">
              {label}
            </text>
            <text x="607" y={y} textAnchor="end" fontSize="18" fontWeight="700" fill="#34d399" className="font-mono">
              {value}
              <tspan fontSize="10" fillOpacity="0.6">
                {suffix}
              </tspan>
            </text>
          </g>
        ))}
      </g>

      <g fontSize="11" className="font-mono">
        <rect x="20" y="318" width="34" height="22" rx="4" fill="#262626" stroke="#404040" />
        <text x="37" y="333" textAnchor="middle" fill="#e5e5e5">
          Alt
        </text>
        <text x="63" y="333" textAnchor="middle" fill="#737373">
          +
        </text>
        <rect x="72" y="318" width="24" height="22" rx="4" fill="#262626" stroke="#404040" />
        <text x="84" y="333" textAnchor="middle" fill="#e5e5e5">
          M
        </text>
        <text x="106" y="333" fill="#a3a3a3">
          shows and hides it
        </text>
      </g>
    </svg>
  );
}

const linkClass =
  "text-neutral-300 underline decoration-neutral-700 underline-offset-4 transition-colors hover:text-emerald-400 hover:decoration-emerald-400";

const primaryButton =
  "rounded-[4px] bg-emerald-400 px-5 py-3 text-center text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-emerald-300";

const secondaryButton =
  "rounded-[4px] border border-tool-border bg-tool-raised px-5 py-3 text-center text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800";

const steps: { title: ReactNode; body: string }[] = [
  {
    title: (
      <>
        Press <Kbd>Alt</Kbd> + <Kbd>M</Kbd>
      </>
    ),
    body: "The calculator pops up over the game, right where you left it.",
  },
  {
    title: "Type both grids",
    body: "Your artillery position and your target's. The solution updates as you type.",
  },
  {
    title: "Dial it in, then hide it",
    body: "Set azimuth and elevation from the readout, then press Alt+M again to put it away.",
  },
];

const does = [
  "Sits on top of the game",
  "Does math on what you type",
  "Listens for one shortcut key",
];

const never = [
  "Inject code into the game",
  "Read game memory",
  "Change game files",
  "Send input to the game",
];

const downloads = [
  {
    platform: "Windows",
    file: EXE,
    action: "Download .exe",
    note: "Not code-signed. SmartScreen will warn on first run: More info, then Run anyway.",
    primary: true,
  },
  {
    platform: "Linux · AppImage",
    file: APPIMAGE,
    action: "Download AppImage",
    note: "Recommended on Linux. Make it executable and run: it updates itself.",
    primary: false,
  },
  {
    platform: "Linux · deb",
    file: DEB,
    action: "Download .deb",
    note: "Installs system-wide: updates are by hand.",
    primary: false,
  },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-tool-hairline">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <a
            href="#top"
            className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-neutral-200 transition-colors hover:text-emerald-400"
          >
            ArtyDog
          </a>
          <nav
            aria-label="Site"
            className="ml-auto flex items-center gap-4 text-sm sm:gap-5"
          >
            <a className={`${linkClass} py-2`} href="#calculator">
              Calculator
            </a>
            <a className={`${linkClass} py-2`} href="#download">
              Download
            </a>
            <a
              className={`${linkClass} py-2`}
              href={REPO}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <span className="hidden rounded-[4px] border border-tool-border bg-tool-raised px-2 py-1 font-mono text-[11px] text-neutral-400 sm:inline-block">
              v{VERSION}
            </span>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="hero-grid absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-14 sm:pb-20 sm:pt-20 md:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-500 sm:tracking-[0.35em]">
                Artillery calculator for WARDOGS
              </p>
              <h1 className="mt-5 font-display text-[clamp(3.2rem,8vw,6.5rem)] font-bold uppercase leading-[0.95] tracking-[0.01em] text-neutral-100">
                Put rounds
                <span className="block">
                  <span className="text-emerald-400">on target</span>.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg">
                Stop guessing your shots. Enter your artillery and target grids
                and get the exact azimuth and elevation to land them.
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-neutral-300 sm:text-lg">
                Run it as an overlay on top of the game, or use it right here in
                your browser.
              </p>
              <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
                <a href="#download" className={primaryButton}>
                  Download the overlay
                </a>
                <a href="#calculator" className={secondaryButton}>
                  Use the browser version
                </a>
              </div>
              <p className="mt-4 font-mono text-xs text-balance text-neutral-500">
                v{VERSION} · Windows &amp; Linux · free, open source (MIT)
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-5xl sm:mt-20">
              <DemoVideo />
            </div>

            <div id="calculator" className="mt-16 scroll-mt-6 sm:mt-24">
              <div className="text-center">
                <p className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
                  <span
                    aria-hidden="true"
                    className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                  Try it now · no download
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold uppercase tracking-[0.01em] text-balance text-neutral-100 sm:text-4xl">
                  Or use it right here.
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
                  This is the real calculator. Enter your artillery and target
                  grids and the solution appears as you type.
                </p>
              </div>
              <div className="mt-8 flex justify-center">
                <DemoCalculator version={VERSION} />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-tool-hairline">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="order-2 overflow-hidden rounded-[8px] border border-tool-border shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] lg:order-1">
              <OverlayScene />
            </div>

            <div className="order-1 lg:order-2">
              <Eyebrow>How the overlay works</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold uppercase tracking-[0.01em] text-balance text-neutral-100 sm:text-4xl">
                Stay in the match.
              </h2>
              <p className="mt-4 leading-relaxed text-neutral-400">
                The overlay floats on top of WARDOGS, so getting a firing
                solution never means alt-tabbing out of the game.
              </p>

              <ol className="mt-8">
                {steps.map((step, index) => (
                  <li key={index} className="relative flex gap-4 pb-7 last:pb-0">
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[13px] top-8 w-px bg-tool-border"
                      />
                    )}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 font-mono text-xs font-semibold text-emerald-400">
                      {index + 1}
                    </span>
                    <div className="pt-0.5">
                      <h3 className="font-display text-lg font-semibold uppercase leading-7 text-neutral-100">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-8 rounded-[6px] border border-tool-border bg-tool-base p-4 text-xs leading-relaxed text-neutral-500">
                Closing the main window keeps ArtyDog in the tray, so the
                shortcut keeps working. You can rebind Alt+M in settings; while
                ArtyDog runs, that key never reaches the game.
              </p>
            </div>
          </div>
        </section>

        {/* Fair play */}
        <section className="border-t border-tool-hairline">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <Eyebrow>Fair play</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold uppercase tracking-[0.01em] text-balance text-neutral-100 sm:text-4xl">
                It never touches the game.
              </h2>
              <p className="mt-4 leading-relaxed text-neutral-300">
                ArtyDog is an ordinary window sitting on top of WARDOGS. It
                doesn't even know the game is running. You read the map, you
                type the grids, it does the math.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">
                It's open source, so you don't have to take our word for it.{" "}
                <a
                  className={linkClass}
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the code
                </a>
                .
              </p>
              <p className="mt-6 border-t border-tool-hairline pt-4 text-xs leading-relaxed text-neutral-500">
                An unofficial fan-made tool, not affiliated with or endorsed by
                the developers of WARDOGS.
              </p>
            </div>

            <div className="grid content-start gap-4 sm:grid-cols-2">
              <div className="rounded-[6px] border border-emerald-500/20 bg-emerald-500/[0.03] p-5 sm:p-6">
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  What it does
                </h3>
                <ul className="mt-4 space-y-3">
                  {does.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-snug text-neutral-200"
                    >
                      <Check />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[6px] border border-amber-500/20 bg-amber-500/[0.03] p-5 sm:p-6">
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                  What it never does
                </h3>
                <ul className="mt-4 space-y-3">
                  {never.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-snug text-neutral-200"
                    >
                      <Cross />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Download */}
        <section id="download" className="border-t border-tool-hairline">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
            <Eyebrow>Download</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold uppercase tracking-[0.01em] text-balance text-neutral-100 sm:text-4xl">
              Get the overlay{" "}
              <span className="font-mono text-2xl font-normal normal-case tracking-normal text-neutral-500">
                v{VERSION}
              </span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
              Only need the numbers?{" "}
              <a className={linkClass} href="#calculator">
                The browser calculator
              </a>{" "}
              works without installing anything.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {downloads.map((item) => (
                <div
                  key={item.file}
                  className="flex flex-col rounded-[6px] border border-tool-border bg-tool-base p-6"
                >
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    {item.platform}
                  </h3>
                  <p className="mt-2 truncate font-mono text-sm text-neutral-200">
                    {item.file}
                  </p>
                  <a
                    href={asset(item.file)}
                    className={`mt-5 rounded-[4px] px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                      item.primary
                        ? "bg-emerald-400 text-[#0a0a0a] hover:bg-emerald-300"
                        : "border border-tool-border bg-tool-raised text-neutral-200 hover:bg-neutral-800"
                    }`}
                  >
                    {item.action}
                  </a>
                  <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-xs leading-relaxed text-neutral-500">
              Linux note: WARDOGS currently has no Linux support, so Windows is the primary target. Prefer
              building it yourself?{" "}
              <a
                className={linkClass}
                href={`${REPO}#building-from-source`}
                target="_blank"
                rel="noreferrer"
              >
                The README has the commands
              </a>
              . Older versions are on{" "}
              <a
                className={linkClass}
                href={`${REPO}/releases/latest`}
                target="_blank"
                rel="noreferrer"
              >
                All releases
              </a>
              .
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-tool-hairline">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <span className="font-display text-base font-semibold uppercase tracking-[0.18em] text-neutral-300">
              ArtyDog
            </span>
            <span className="text-sm text-neutral-500">
              Free and open source.
            </span>
            <nav
              aria-label="Footer"
              className="flex w-full gap-6 text-sm sm:ml-auto sm:w-auto"
            >
              <a className={linkClass} href={REPO} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a
                className={linkClass}
                href={`${REPO}/releases/latest`}
                target="_blank"
                rel="noreferrer"
              >
                All releases
              </a>
              <a
                className={linkClass}
                href={`${REPO}/blob/main/LICENSE`}
                target="_blank"
                rel="noreferrer"
              >
                License
              </a>
            </nav>
          </div>
          <p className="mt-6 border-t border-tool-hairline pt-6 font-mono text-[11px] leading-relaxed text-neutral-600">
            Not affiliated with WARDOGS. All trademarks belong to their respective owners.
          </p>
        </div>
      </footer>
    </div>
  );
}
