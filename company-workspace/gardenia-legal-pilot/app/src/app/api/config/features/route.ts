import { getFeatures } from "@/lib/config/features";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(getFeatures());
}