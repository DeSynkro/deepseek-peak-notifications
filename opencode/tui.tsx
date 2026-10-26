/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(ctx) {
        const theme = ctx.theme.current

        return (
          <box flexDirection="column">
            <text fg={theme.text}>
              <b>DeepSeek Peak Notifications</b>
            </text>
            <text fg={theme.textMuted}>Loading...</text>
          </box>
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "deepseek-peak-notifications",
  tui,
}

export default plugin
