import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { defineChannel, GET, POST } from "@grok/agent-sdk/channels";
import * as z from "zod/v4";

const credentialsPath = path.join(
  homedir(),
  ".config",
  "agent-serve",
  "credentials.json",
);

/**
 * Do not call `agent-sdk whoami` here: on Windows it can hang or abort after
 * printing success, which freezes the dashboard auth gate.
 */
function cursorCredentialPresent(): { signedIn: boolean; source: string } {
  if (process.env.CURSOR_API_KEY) {
    return { signedIn: true, source: "CURSOR_API_KEY" };
  }
  if (process.env.CURSOR_API_KEY_FILE) {
    return { signedIn: true, source: "CURSOR_API_KEY_FILE" };
  }
  if (process.env.CURSOR_SERVICE_ACCOUNT_KEY) {
    return { signedIn: true, source: "CURSOR_SERVICE_ACCOUNT_KEY" };
  }

  if (!existsSync(credentialsPath)) {
    return { signedIn: false, source: "none" };
  }

  try {
    const raw = readFileSync(credentialsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (Object.keys(parsed as object).length > 0 ||
        typeof (parsed as { apiKey?: unknown }).apiKey === "string" ||
        typeof (parsed as { token?: unknown }).token === "string")
    ) {
      return { signedIn: true, source: "agent-sdk login" };
    }
  } catch {
    /* unreadable / empty */
  }

  // File exists from a successful login even if JSON shape is unexpected
  return { signedIn: true, source: "agent-sdk login" };
}

/**
 * CEO dashboard API.
 * Local serve returns handler responses; hosted Cursor always returns 202 for POST.
 */
export default defineChannel({
  routes: [
    GET("/auth", {
      description: "Check whether Cursor credentials are available for model turns",
      querySchema: z.object({}),
      handler: async () => {
        const auth = cursorCredentialPresent();
        return Response.json({
          ok: true,
          ...auth,
          loginHint:
            "From ai-company run: npm run login   then   npm run serve",
          playground: "http://127.0.0.1:3000/playground",
        });
      },
    }),

    GET("/roster", {
      description: "Return the current employee roster",
      querySchema: z.object({}),
      handler: async (_req, { callTool }) => {
        const outcome = await callTool("list_roster", {});
        if (outcome.isError) {
          return Response.json(
            { ok: false, error: outcome.result },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, ...((outcome.result as object) ?? {}) });
      },
    }),

    POST("/role-brief", {
      description: "Update one role function brief",
      bodySchema: z.object({
        role: z.enum([
          "product-manager",
          "engineer",
          "qa",
          "designer",
          "marketer",
          "finance",
        ]),
        function: z.string().min(1),
        title: z.string().min(1).optional(),
      }),
      handler: async (_req, { callTool, body }) => {
        const outcome = await callTool("set_role_brief", body);
        if (outcome.isError) {
          return Response.json(
            { ok: false, error: outcome.result },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, ...((outcome.result as object) ?? {}) });
      },
    }),

    GET("/deliverables", {
      description: "List logged company deliverables",
      querySchema: z.object({
        currentSessionOnly: z
          .enum(["true", "false"])
          .optional()
          .describe("When true, only the active session (ignored for global list)"),
      }),
      handler: async (_req, { callTool, query }) => {
        const outcome = await callTool("list_deliverables", {
          currentSessionOnly: query.currentSessionOnly === "true",
        });
        if (outcome.isError) {
          return Response.json(
            { ok: false, error: outcome.result },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, ...((outcome.result as object) ?? {}) });
      },
    }),

    POST("/objective", {
      description: "Post a CEO objective and start a company work session",
      bodySchema: z.object({
        objective: z.string().min(1),
        continuationToken: z.string().min(1).optional(),
      }),
      handler: async (_req, { send, waitUntil, body }) => {
        const token = body.continuationToken ?? `ceo:${Date.now().toString(36)}`;
        const message = [
          "CEO objective:",
          body.objective,
          "",
          "Follow company operating rhythm.",
          "If anything critical is missing, ask clarifying questions and STOP —",
          "do not delegate or execute until the CEO answers.",
          "After answers: delegate to the right employees, log deliverables,",
          "and return a CEO report.",
        ].join("\n");

        waitUntil(
          (async () => {
            const session = await send(message, {
              continuationToken: token,
              title: "CEO objective",
            });
            return session;
          })(),
        );

        // Local serve can return this body; hosted deployments still get 202.
        return Response.json(
          {
            ok: true,
            accepted: true,
            continuationToken: token,
            hint: "Poll GET /v1/channels/ceo/deliverables and check the playground session.",
          },
          { status: 202 },
        );
      },
    }),
  ],
});
