export type RoleId =
  | "product-manager"
  | "engineer"
  | "qa"
  | "designer"
  | "marketer"
  | "finance"
  | "chief-of-staff";

export type Employee = {
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
  machine?: string;
};

const BASE = "/api/v1/channels/ceo";

export type AuthStatus = {
  ok: boolean;
  signedIn: boolean;
  source: string;
  loginHint?: string;
  playground?: string;
};

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Bad JSON from ${res.url}: ${text.slice(0, 120)}`);
    }
  }
  if (!res.ok) {
    const err =
      data && typeof data === "object" && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(err || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  return readJson<AuthStatus>(await fetch(`${BASE}/auth`));
}

export async function fetchRoster(): Promise<Employee[]> {
  const data = await readJson<{ ok: boolean; employees?: Employee[] }>(
    await fetch(`${BASE}/roster`),
  );
  return data.employees ?? [];
}

export async function updateRoleBrief(
  role: RoleId,
  fn: string,
  title?: string,
): Promise<Employee> {
  const data = await readJson<{ ok: boolean; employee: Employee }>(
    await fetch(`${BASE}/role-brief`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, function: fn, title }),
    }),
  );
  return data.employee;
}

export async function fetchDeliverables(): Promise<Deliverable[]> {
  const data = await readJson<{
    ok: boolean;
    deliverables?: Deliverable[];
  }>(await fetch(`${BASE}/deliverables`));
  return data.deliverables ?? [];
}

export async function postObjective(objective: string): Promise<{
  continuationToken?: string;
}> {
  const data = await readJson<{
    ok: boolean;
    continuationToken?: string;
  }>(
    await fetch(`${BASE}/objective`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ objective }),
    }),
  );
  return data;
}
