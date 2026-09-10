import Plot from "react-plotly.js";

interface Metrics {
  communities: string[];
  coverage: number[];
}

export default function Dashboard({ metrics }: { metrics: Metrics }) {
  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="font-bold mb-4">Connectivity Metrics</h2>

      <Plot
        data={[
          {
            x: metrics.communities,
            y: metrics.coverage,
            type: "bar",
          },
        ]}
        layout={{ title: "Coverage by Community" }}
      />
    </div>
  );
}
