import { cursorPlugin } from "@grok/agent-sdk/extensions";

/**
 * Cursor Team Kit — deslop, control-ui/cli, CI/shipping helpers.
 * Required companion for pstack (poteto-mode references these skills).
 * Vendored under plugins/cursor-team-kit; contributions are cursor-team-kit__*.
 */
export default cursorPlugin({
  path: "plugins/cursor-team-kit",
});
