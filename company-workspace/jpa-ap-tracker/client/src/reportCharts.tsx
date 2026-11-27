import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { formatMoney } from './format';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = {
  primary: '#1d4ed8',
  ok: '#047857',
  warn: '#b45309',
  danger: '#b91c1c',
  muted: '#6b7280',
  slate: '#475569',
  indigo: '#4338ca',
  teal: '#0f766e',
  rose: '#be123c',
};

const PALETTE = [
  COLORS.primary,
  COLORS.ok,
  COLORS.warn,
  COLORS.indigo,
  COLORS.teal,
  COLORS.rose,
  COLORS.slate,
  COLORS.danger,
  COLORS.muted,
];

const moneyAxisTicks = {
  callback: (value: string | number) => formatMoney(Number(value)),
};

export function AmountBarChart({
  labels,
  values,
  colors,
  horizontal = false,
  emptyMessage = 'No data to chart.',
}: {
  labels: string[];
  values: number[];
  colors?: string[];
  horizontal?: boolean;
  emptyMessage?: string;
}) {
  if (!values.some((v) => v > 0)) return <p className="muted">{emptyMessage}</p>;

  const data: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors ?? labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 0,
        borderRadius: 4,
        maxBarThickness: 36,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatMoney(Number(ctx.raw)),
        },
      },
    },
    scales: {
      x: horizontal
        ? { ticks: moneyAxisTicks, grid: { color: '#eef1f4' } }
        : { grid: { display: false } },
      y: horizontal
        ? { grid: { display: false } }
        : { ticks: moneyAxisTicks, grid: { color: '#eef1f4' } },
    },
  };

  return (
    <div className="report-chart">
      <Bar data={data} options={options} />
    </div>
  );
}

export function AmountDoughnutChart({
  labels,
  values,
  colors,
  emptyMessage = 'No data to chart.',
}: {
  labels: string[];
  values: number[];
  colors?: string[];
  emptyMessage?: string;
}) {
  if (!values.some((v) => v > 0)) return <p className="muted">{emptyMessage}</p>;

  const data: ChartData<'doughnut'> = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors ?? labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${formatMoney(Number(ctx.raw))}`,
        },
      },
    },
  };

  return (
    <div className="report-chart report-chart-doughnut">
      <Doughnut data={data} options={options} />
    </div>
  );
}

export const CHART_COLORS = {
  aging: [COLORS.ok, COLORS.primary, COLORS.warn, COLORS.rose, COLORS.danger],
  timing: [COLORS.ok, COLORS.primary, COLORS.danger],
};
