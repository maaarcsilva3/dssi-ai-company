export type ExpiryBucket = "Active" | "NearExpiry" | "Expired" | "Unknown";

export function computeExpiryBucket(endDate: string | null | undefined): ExpiryBucket {
  if (!endDate) return "Unknown";
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return "Unknown";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  if (endDay < today) return "Expired";
  const in90 = new Date(today);
  in90.setDate(in90.getDate() + 90);
  if (endDay <= in90) return "NearExpiry";
  return "Active";
}

export function daysRemaining(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryFlags(matter: {
  contractType: string;
  effectivityEnd: string | null | undefined;
  expiryBucket: string | null | undefined;
  assigneeUserId: string | null | undefined;
}): string[] {
  const flags: string[] = [];
  if (!matter.effectivityEnd) {
    flags.push("missing_expiry");
    if (matter.contractType.toLowerCase().includes("lease")) {
      flags.push("lease_missing_end_date");
    }
  }
  if (matter.expiryBucket === "NearExpiry" && !matter.assigneeUserId) {
    flags.push("near_expiry_no_owner");
  }
  return flags;
}