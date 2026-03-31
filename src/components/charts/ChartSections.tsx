import type { ReactElement } from "react";
import { useState } from "react";

import type { LineChartHover } from "components/charts/LineChart";
import type { ChartSeries } from "components/charts/MetricChartCard";
import MetricChartCard from "components/charts/MetricChartCard";
import CollapsibleSection from "components/CollapsibleSection";
import { RULED_LINE_HEIGHT } from "helpers";

interface ChartSection {
  readonly prefix: string;
  readonly charts: { readonly id: string; readonly series: ChartSeries[] }[];
}

interface ChartSectionsProps {
  readonly sections: ChartSection[];
  readonly hasPoints: boolean;
  readonly isLoading: boolean;
}

export default function ChartSections({ sections, hasPoints, isLoading }: ChartSectionsProps): ReactElement {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hoveredSections, setHoveredSections] = useState<Record<string, LineChartHover | null>>({});

  const onChartHover = (prefix: string, hover: LineChartHover | null) => {
    setHoveredSections((prev) => {
      const current = prev[prefix] ?? null;
      if (!hover && !current) { return prev; }
      if (hover?.step === current?.step) { return prev; }
      return { ...prev, [prefix]: hover };
    });
  };

  return (
    <>
      {sections.map(({ prefix, charts }) => (
        <CollapsibleSection
          key={prefix}
          label={prefix}
          count={charts.length}
          collapsed={collapsedSections[prefix] ?? false}
          onToggle={() => { setCollapsedSections((prev) => ({ ...prev, [prefix]: !(prev[prefix] ?? false) })); }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" style={{ marginBottom: `${String(RULED_LINE_HEIGHT / 2)}rem` }}>
            {charts.map((item) => (
              <MetricChartCard
                key={item.id}
                metric={item.id}
                series={item.series}
                hovered={hoveredSections[prefix] ?? null}
                onHover={(hover) => { onChartHover(prefix, hover); }}
                hasPoints={hasPoints}
                isLoading={isLoading}
              />
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </>
  );
}
