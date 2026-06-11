import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { init, use, type ECharts, type EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

import { ChartData } from "../../core/models";

type ChartMode = "line" | "bar" | "pie";

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: "ccap-chart-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel min-w-0 overflow-hidden p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="section-title min-w-0 truncate">{{ title }}</h2>
        <span *ngIf="caption" class="text-xs font-semibold uppercase tracking-wide text-ccap-steel">{{ caption }}</span>
      </div>
      <div #chart class="chart-host" [style.height.px]="height"></div>
    </section>
  `
})
export class ChartCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) title = "";
  @Input() caption = "";
  @Input() data: ChartData | null = null;
  @Input() mode: ChartMode = "bar";
  @Input() height = 320;

  @ViewChild("chart", { static: true }) chartRef!: ElementRef<HTMLDivElement>;

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.chart = init(this.chartRef.nativeElement);
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(this.chartRef.nativeElement);
    this.render();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private render(): void {
    if (!this.chart || !this.data) {
      return;
    }
    const palette = ["#2E7D32", "#2563EB", "#F59E0B", "#8B5CF6", "#0F9F9A", "#D64545", "#EC4899", "#64748B"];
    const labels = this.data.labels;
    const denseLabels = this.hasDenseLabels(labels);
    const hasLegend = this.data.series.length > 1;
    const option: EChartsCoreOption =
      this.mode === "pie"
        ? {
            color: palette,
            tooltip: {
              trigger: "item",
              confine: true,
              transitionDuration: 0,
              extraCssText: this.tooltipCss(),
              formatter: (params: unknown) => this.itemTooltipFormatter(params)
            },
            legend: {
              type: "scroll",
              bottom: 0,
              textStyle: { color: "#5F6B63", fontSize: 11 },
              pageIconColor: "#2563EB",
              pageTextStyle: { color: "#5F6B63" }
            },
            series: [
              {
                type: "pie",
                center: ["48%", "45%"],
                radius: ["38%", "66%"],
                avoidLabelOverlap: true,
                label: {
                  color: "#334155",
                  fontSize: 11,
                  lineHeight: 14,
                  overflow: "truncate",
                  width: 96,
                  formatter: (params: unknown) => this.shortLabel(String((params as { name?: unknown }).name ?? ""), 18)
                },
                labelLine: { length: 12, length2: 8 },
                data: labels.map((label, index) => ({
                  name: label,
                  value: this.data?.series[0]?.data[index] ?? 0
                }))
              }
            ]
          }
        : {
            color: palette,
            tooltip: {
              trigger: "axis",
              confine: true,
              transitionDuration: 0,
              axisPointer: {
                type: "line",
                label: { show: false },
                lineStyle: { color: "#94A3B8", type: "dashed" }
              },
              extraCssText: this.tooltipCss(),
              formatter: (params: unknown) => this.axisTooltipFormatter(params)
            },
            grid: {
              left: 66,
              right: 22,
              top: hasLegend ? 46 : 28,
              bottom: denseLabels ? 86 : 48,
              containLabel: true
            },
            legend: hasLegend
              ? {
                  top: 0,
                  right: 0,
                  itemWidth: 16,
                  itemHeight: 10,
                  textStyle: { color: "#5F6B63", fontSize: 11 }
                }
              : undefined,
            xAxis: {
              type: "category",
              data: labels,
              axisTick: { alignWithLabel: true },
              axisLabel: {
                color: "#5F6B63",
                fontSize: 11,
                hideOverlap: true,
                interval: 0,
                lineHeight: 14,
                margin: 12,
                overflow: "truncate",
                rotate: denseLabels ? 34 : 0,
                width: denseLabels ? 78 : 110,
                formatter: (value: string) => (denseLabels ? this.shortLabel(value, 14) : value)
              }
            },
            yAxis: {
              type: "value",
              axisLabel: {
                color: "#5F6B63",
                fontSize: 11,
                formatter: (value: number) => this.formatAxisNumber(value)
              },
              splitLine: { lineStyle: { color: "#E5E7EB" } }
            },
            series: this.data.series.map((series, index) => {
              const color = this.seriesColor(series.name, index);
              return this.mode === "line" || this.shouldRenderAsLine(series.name)
                ? {
                    name: this.translateSeriesName(series.name),
                    type: "line",
                    smooth: true,
                    symbol: "circle",
                    symbolSize: 6,
                    itemStyle: { color },
                    lineStyle: this.shouldRenderAsLine(series.name) && this.mode === "bar"
                      ? { color, type: "dashed", width: 2 }
                      : { color, width: 2.5 },
                    areaStyle: this.data!.series.length === 1 ? { color, opacity: 0.08 } : undefined,
                    data: series.data
                  }
                : {
                    name: this.translateSeriesName(series.name),
                    type: "bar",
                    data: series.data,
                    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
                    barMaxWidth: 28,
                    barCategoryGap: "35%"
                  };
            })
          };
    this.chart.setOption(option, true);
  }

  private translateSeriesName(name: string): string {
    const labels: Record<string, string> = {
      "Normal Growth": "Pertumbuhan Penduduk",
      "Injected Growth": "Suntikan Penduduk",
      "Average ECC": "Purata ECC",
      "Average PCC": "Purata PCC",
      "Average RCC": "Purata RCC",
      "Total ECC": "Jumlah ECC",
      "Current ECC": "ECC Semasa",
      "Optimum ECC": "ECC Optimum",
      "Injected Population": "Suntikan Penduduk",
      "Area (Ha)": "Luas (ha)",
      "Luas (ha)": "Luas (ha)"
    };
    return labels[name] ?? name;
  }

  private hasDenseLabels(labels: string[]): boolean {
    if (labels.length <= 5) {
      return false;
    }
    const allYears = labels.every((label) => /^\d{4}$/.test(label));
    const longestLabel = Math.max(...labels.map((label) => label.length), 0);
    return !allYears && (labels.length > 6 || longestLabel > 10);
  }

  private shortLabel(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > maxLength ? `${normalized.slice(0, Math.max(1, maxLength - 1))}…` : normalized;
  }

  private formatAxisNumber(value: number): string {
    const absolute = Math.abs(value);
    if (absolute >= 1000000) {
      return new Intl.NumberFormat("ms-MY", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    }
    return new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 0 }).format(value);
  }

  private shouldRenderAsLine(name: string): boolean {
    const translated = this.translateSeriesName(name).toLowerCase();
    return translated.includes("optimum");
  }

  private seriesColor(name: string, index: number): string {
    const seriesName = this.translateSeriesName(name).toLowerCase();
    const value = this.data?.series.length === 1 ? `${seriesName} ${this.title.toLowerCase()}` : seriesName;
    if (seriesName.includes("optimum")) {
      return "#16A34A";
    }
    if (seriesName.includes("pcc")) {
      return "#4F46E5";
    }
    if (seriesName.includes("rcc")) {
      return "#0F9F9A";
    }
    if (seriesName.includes("ecc semasa") || seriesName.includes("current ecc")) {
      return "#F59E0B";
    }
    if (seriesName.includes("ecc")) {
      return "#E11D48";
    }
    if (seriesName.includes("suntikan") || seriesName.includes("injected")) {
      return "#2563EB";
    }
    if (value.includes("pembangunan")) {
      return "#D97706";
    }
    if (value.includes("guna tanah") || value.includes("luas")) {
      return "#0F9F9A";
    }
    if (value.includes("penduduk") || value.includes("growth") || value.includes("pertumbuhan")) {
      return "#2E7D32";
    }
    return ["#2E7D32", "#2563EB", "#F59E0B", "#8B5CF6", "#0F9F9A", "#D64545"][index % 6];
  }

  private tooltipCss(): string {
    return [
      "max-width:220px",
      "white-space:normal",
      "border:1px solid #E5E7EB",
      "border-radius:8px",
      "box-shadow:0 10px 24px rgba(15,23,42,0.14)",
      "color:#173B2F",
      "font-size:12px",
      "line-height:1.35",
      "z-index:20"
    ].join(";");
  }

  private axisTooltipFormatter(params: unknown): string {
    const items = Array.isArray(params) ? params : [params];
    const first = items[0] as { axisValueLabel?: string; name?: string } | undefined;
    const title = this.escapeHtml(String(first?.axisValueLabel ?? first?.name ?? ""));
    const rows = items
      .map((item) => {
        const point = item as { marker?: string; seriesName?: string; value?: number | string | null };
        const name = this.escapeHtml(String(point.seriesName ?? ""));
        const value = this.escapeHtml(this.formatTooltipValue(point.value));
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px">${point.marker ?? ""}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${name}</span><b>${value}</b></div>`;
      })
      .join("");
    return `<div><div style="font-weight:800;margin-bottom:4px">${title}</div>${rows}</div>`;
  }

  private itemTooltipFormatter(params: unknown): string {
    const item = params as { marker?: string; name?: string; value?: number | string | null; percent?: number };
    const name = this.escapeHtml(String(item.name ?? ""));
    const value = this.escapeHtml(this.formatTooltipValue(item.value));
    const percent = typeof item.percent === "number" ? ` (${item.percent.toFixed(1)}%)` : "";
    return `<div style="font-weight:800;margin-bottom:4px">${name}</div><div>${item.marker ?? ""}<b>${value}${percent}</b></div>`;
  }

  private formatTooltipValue(value: number | string | null | undefined): string {
    if (typeof value === "number") {
      return new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 2 }).format(value);
    }
    return String(value ?? "-");
  }

  private escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }
}
