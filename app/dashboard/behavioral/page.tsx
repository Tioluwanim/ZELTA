import PageHeader from "@/components/PageHeader";
import { BehavioralDataProvider } from "@/context/BehavioralSnapshotContext";
import Bayse from "./components/bayse";
import Active from "./components/active";
import Decision from "./components/decision";
import Five from "./components/five";
import Weeks from "./components/weeks";
import Zelta from "./components/zelta";

export default function Page() {
  return (
    <BehavioralDataProvider>
      <div>
        <PageHeader
          title="Patterns"
          description="Part of what your Twin models — how habits and context shape the forecast"
        />

        <Active />
        <Zelta />
        <Decision />
        <Bayse />
        <details className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
            See detailed bias breakdown
          </summary>
          <div className="mt-3 space-y-3">
            <Five />
            <Weeks />
          </div>
        </details>
      </div>
    </BehavioralDataProvider>
  );
}
