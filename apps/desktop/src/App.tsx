import Calculator from "./components/Calculator";
import OverlayControls from "./components/OverlayControls";
import UpdateBanner from "./components/UpdateBanner";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-bold">ArtyDog</h1>

        <UpdateBanner />

        <div className="mt-6">
          <Calculator />
        </div>

        <div className="mt-8">
          <OverlayControls />
        </div>
      </div>
    </div>
  );
}
