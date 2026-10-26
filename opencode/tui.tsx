/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiSlotContext } from "@opencode-ai/plugin/tui"
import { createSignal, onCleanup } from "solid-js"
import { didPhaseChange, formatDuration, formatLocalTime, getPeakState, isPeak } from "./peak"

function PeakAlert(props: { api: TuiPluginApi; ctx: TuiSlotContext }) {
  const initial = new Date()
  const [now, setNow] = createSignal(initial)
  let previousPeak = isPeak(initial)

  const timer = setInterval(() => {
    const current = new Date()
    const peak = isPeak(current)

    if (didPhaseChange(previousPeak, peak)) {
      props.api.ui.toast({
        variant: peak ? "warning" : "success",
        title: "DeepSeek Peak Notifications",
        message: peak ? "Peak pricing has started." : "Off-peak pricing has started.",
        duration: 4000,
      })
    }

    previousPeak = peak
    setNow(current)
  }, 30_000)

  onCleanup(() => clearInterval(timer))

  const view = () => {
    const current = now()
    const status = getPeakState(current)
    const theme = props.ctx.theme.current

    return {
      status,
      color: status.peak ? theme.warning : theme.success,
      label: status.peak ? "PEAK x2" : "OFF-PEAK -50%",
      nextLabel: status.nextLabel === "peak" ? "Peak" : "Off-peak",
      countdown: formatDuration(status.next.getTime() - current.getTime()),
      flipTime: formatLocalTime(status.next),
      missing: status.holidayDataMissing,
      text: theme.text,
      muted: theme.textMuted,
      warning: theme.warning,
    }
  }

  return (
    <box flexDirection="column">
      <text fg={view().text}>
        <b>DeepSeek Peak Notifications</b>
      </text>
      <text fg={view().color}>{view().label}</text>
      <text fg={view().muted}>
        {view().nextLabel} in {view().countdown}
      </text>
      <text fg={view().muted}>flip at {view().flipTime}</text>
      {view().missing && <text fg={view().warning}>No CN holiday data for this year</text>}
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(ctx) {
        return <PeakAlert api={api} ctx={ctx} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "deepseek-peak-notifications",
  tui,
}

export default plugin
