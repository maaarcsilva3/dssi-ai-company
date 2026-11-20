/** Shared company roster and deliverable storage helpers. */

export const ROLE_IDS = [
  "product-manager",
  "engineer",
  "qa",
  "designer",
  "marketer",
  "finance",
  "chief-of-staff",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type RoleBrief = {
  role: RoleId;
  title: string;
  function: string;
};

export type Deliverable = {
  id: string;
  role: RoleId | "coo";
  title: string;
  kind: string;
  body: string;
  createdAt: string;
  sessionId: string;
  /** Hostname of the machine that logged this (for cross-machine history). */
  machine?: string;
};

export const DEFAULT_ROSTER: RoleBrief[] = [
  {
    role: "product-manager",
    title: "Product Manager",
    function:
      "Turn CEO objectives into specs, priorities, scope cuts, and acceptance criteria. Own the problem statement and success metrics.",
  },
  {
    role: "engineer",
    title: "Engineer",
    function:
      "Produce implementation plans, architecture choices, and technical delivery notes. Prefer concrete steps, interfaces, and risks.",
  },
  {
    role: "qa",
    title: "QA",
    function:
      "Write test plans, quality gates, edge cases, and release risks. Challenge assumptions before work ships.",
  },
  {
    role: "designer",
    title: "Designer",
    function:
      "Define UX flows, information architecture, UI structure, and design briefs. Keep first-viewport brand rules tight.",
  },
  {
    role: "marketer",
    title: "Marketer",
    function:
      "Own positioning, launch copy, channel plan, and campaign outline. Tie messaging to the product promise.",
  },
  {
    role: "finance",
    title: "Finance",
    function:
      "Model budget, pricing assumptions, unit economics, and spend risk. Flag when the plan is financially thin.",
  },
  {
    role: "chief-of-staff",
    title: "Chief of Staff",
    function:
      "Capture, organize, verify, and surface organizational knowledge for the CEO and all AI employees. Own six duties: Conversation Recorder (important exchanges), Meeting Secretary (notes, action items, decisions), Knowledge Manager (two-layer raw evidence plus curated facts under company-workspace/knowledge/), Decision Tracker (decisions, reasoning, outcomes), Executive Assistant (tasks, deadlines, follow-ups), Intelligence Analyst (patterns, risks, opportunities, unresolved issues). Curated records always cite immutable raw sources; queue unverified items for CEO and PM review; never treat a summary as the only source of truth. Consumers: all AI employees by default.",
  },
];

export const ROSTER_KEY = "company:roster";
export const DELIVERABLES_KEY = "company:deliverables";

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}

export function normalizeRoster(raw: unknown): RoleBrief[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_ROSTER.map((r) => ({ ...r }));
  }
  const byRole = new Map<RoleId, RoleBrief>();
  for (const item of DEFAULT_ROSTER) {
    byRole.set(item.role, { ...item });
  }
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      typeof (item as { role: unknown }).role === "string" &&
      isRoleId((item as { role: string }).role)
    ) {
      const role = (item as { role: RoleId }).role;
      const base = byRole.get(role)!;
      const title =
        typeof (item as { title?: unknown }).title === "string"
          ? (item as { title: string }).title
          : base.title;
      const fn =
        typeof (item as { function?: unknown }).function === "string"
          ? (item as { function: string }).function
          : base.function;
      byRole.set(role, { role, title, function: fn });
    }
  }
  return ROLE_IDS.map((role) => byRole.get(role)!);
}

export function normalizeDeliverables(raw: unknown): Deliverable[] {
  if (!Array.isArray(raw)) return [];
  const out: Deliverable[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const d = item as Partial<Deliverable>;
    if (
      typeof d.id !== "string" ||
      typeof d.title !== "string" ||
      typeof d.kind !== "string" ||
      typeof d.body !== "string" ||
      typeof d.createdAt !== "string" ||
      typeof d.sessionId !== "string"
    ) {
      continue;
    }
    const role = d.role;
    if (role !== "coo" && (typeof role !== "string" || !isRoleId(role))) {
      continue;
    }
    out.push({
      id: d.id,
      role: role as Deliverable["role"],
      title: d.title,
      kind: d.kind,
      body: d.body,
      createdAt: d.createdAt,
      sessionId: d.sessionId,
      machine:
        typeof (d as { machine?: unknown }).machine === "string"
          ? (d as { machine: string }).machine
          : undefined,
    });
  }
  return out;
}
