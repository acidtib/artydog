import Calculator from "./components/Calculator";
import OverlayControls from "./components/OverlayControls";
import UpdateBanner from "./components/UpdateBanner";
import { useCalcState } from "./lib/useCalcState";

export default function App() {
  const { calc, updateCalc, error } = useCalcState();

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-bold">ArtyDog</h1>

        <UpdateBanner />

        <div className="mt-6">
          <Calculator calc={calc} onChange={updateCalc} />
          {error !== null && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8">
          <OverlayControls />
        </div>
      </div>
    </div>
  );
}
