/** Scripted demo context — fictional regional distributor warehouse snapshot */
export const demoContext = {
  organization: 'Northline Supply Co. (demo)',
  asOf: 'November 2025',
  sources: [
    { name: 'Operations app (DSSI-built)', status: 'synced', records: '142k events' },
    { name: 'ERP orders & invoices', status: 'synced', records: '38k rows' },
    { name: 'Warehouse WMS', status: 'synced', records: '12k SKUs' },
    { name: 'Carrier tracking feed', status: 'synced', records: '6.1k shipments' },
  ],
  datasets: [
    { table: 'fact_shipments', grain: 'shipment line', refreshed: '2h ago' },
    { table: 'fact_orders', grain: 'order line', refreshed: '4h ago' },
    { table: 'dim_customers', grain: 'customer', refreshed: 'daily' },
    { table: 'dim_products', grain: 'SKU', refreshed: 'daily' },
    { table: 'ops_exceptions', grain: 'exception event', refreshed: '15m ago' },
  ],
} as const;

export const suggestedPrompts = [
  'Which customers had the most late shipments last month?',
  'What is our fill rate for warehouse B?',
  'Show open exceptions over $5k impact.',
  'How did average days-to-ship trend in Q3?',
] as const;

type ScriptedAnswer = {
  id: string;
  keywords: string[];
  answer: string;
};

const scriptedAnswers: ScriptedAnswer[] = [
  {
    id: 'late-shipments',
    keywords: ['late', 'shipment', 'customer', 'last month', 'delay'],
    answer:
      'In October, the top accounts by late shipment lines were: **Apex Industrial** (47 late lines, 18% of their volume), **Riverbend Medical** (31), and **Coastal HVAC** (28). Most delays tied to **warehouse B pick backlog** and **carrier handoff after 4pm**. I can break this down by SKU family if you want.',
  },
  {
    id: 'fill-rate-b',
    keywords: ['fill rate', 'warehouse b', 'warehouse', 'fill'],
    answer:
      '**Warehouse B** fill rate (lines shipped complete on first attempt) was **91.2%** last 30 days, down from 93.8% the prior month. The biggest drag is **fasteners & hardware** (86.4%) due to cycle-count variance on aisle F12–F18.',
  },
  {
    id: 'exceptions',
    keywords: ['exception', 'open', '$5', '5k', 'impact'],
    answer:
      'There are **9 open ops exceptions** with estimated impact above **$5,000**: 4 are **duplicate invoice** mismatches, 3 are **short-ship** disputes awaiting customer reply, 2 are **freight charge** variances. Oldest is **12 days** (order ORD-88412). Want the owner list?',
  },
  {
    id: 'days-to-ship',
    keywords: ['days to ship', 'trend', 'q3', 'average', 'ship'],
    answer:
      'Average **order-to-ship days** in Q3: **Jul 2.8**, **Aug 3.1**, **Sep 2.6** (warehouse-weighted). The August spike matches the **WMS outage window (Aug 9–12)**; excluding that week, August would be **2.7**.',
  },
  {
    id: 'revenue',
    keywords: ['revenue', 'sales', 'top product'],
    answer:
      'Trailing 90-day **net product revenue** (excludes freight): top SKU families are **Pumps & motors** ($1.42M), **Electrical** ($1.18M), **HVAC controls** ($0.96M). This is from `fact_orders` joined to `dim_products`.',
  },
  {
    id: 'inventory',
    keywords: ['stock', 'inventory', 'out of stock', 'oos'],
    answer:
      '**38 SKUs** are below safety stock today; **11** are on customer backorder. Highest revenue-at-risk SKU is **PN-4402** (industrial pump seal kit) — **$42k** open order value waiting on replenishment ETA **Nov 28**.',
  },
];

const fallbackAnswer =
  'I only answer from the **connected demo datasets** (shipments, orders, customers, products, ops exceptions). Try one of the suggested prompts, or ask about late shipments, fill rate, exceptions, inventory, or days-to-ship trends.';

export function matchDemoAnswer(question: string): string {
  const q = question.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!q) return fallbackAnswer;

  let best: ScriptedAnswer | null = null;
  let bestScore = 0;

  for (const entry of scriptedAnswers) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.includes(' ') ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) return best.answer;
  return fallbackAnswer;
}

/** Simple markdown-like bold to HTML for demo display */
export function formatDemoReply(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface px-1 py-0.5 text-xs text-ink">$1</code>');
}