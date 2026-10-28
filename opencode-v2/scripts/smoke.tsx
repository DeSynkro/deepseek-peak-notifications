/** @jsxImportSource @opentui/solid */

// Development smoke check: renders the sidebar card with a stand-in theme and
// prints it to stdout. Run with `bun run smoke`.

import { RGBA } from "@opentui/core"
import { PluginContextProvider } from "@opencode/plugin/tui"
import { testRender } from "@opentui/solid"
import plugin from "../tui"

const claims: Array<{ render: (input: { sessionID: string }) => unknown }> = []

plugin.setup({
  ui: {
    slot: (claim: (typeof claims)[number]) => {
      claims.push(claim)
      return () => {}
    },
  },
} as never)

const color = RGBA.fromInts(255, 255, 255, 255)
const feedback = { base: color, muted: color }
const context = {
  theme: {
    text: {
      base: color,
      muted: color,
      feedback: { error: feedback, warning: feedback, success: feedback, info: feedback },
    },
  },
  ui: { toast: { show: () => {} } },
}

const view = await testRender(
  () => (
    <PluginContextProvider value={context as never}>
      {claims[0]!.render({ sessionID: "ses_smoke" }) as never}
    </PluginContextProvider>
  ),
  { width: 44, height: 6 },
)

await view.renderOnce()
process.stdout.write(view.captureCharFrame())
await view.dispose()
