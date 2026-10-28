/** @jsxImportSource @opentui/solid */

import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { createMemo, createSignal, onCleanup } from "solid-js"
import { didPhaseChange, formatDuration, formatLocalTime, getPeakState, isPeak } from "./peak"

function PeakAlert() {
  const context = usePlugin()
  const initial = new Date()
  const [now, setNow] = createSignal(initial)
  let previousPeak = isPeak(initial)

  const timer = setInterval(() => {
    const current = new Date()
    const peak = isPeak(current)

    if (didPhaseChange(previousPeak, peak)) {
      context.ui.toast.show({
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

  const view = createMemo(() => {
    const current = now()
    const status = getPeakState(current)
    const theme = context.theme
    const feedback = theme.text.feedback[status.peak ? "warning" : "success"]

    return {
      color: feedback.base,
      label: status.peak ? "PEAK x2" : "OFF-PEAK -50%",
      nextLabel: status.nextLabel === "peak" ? "Peak" : "Off-peak",
      countdown: formatDuration(status.next.getTime() - current.getTime()),
      flipTime: formatLocalTime(status.next),
      missing: status.holidayDataMissing,
      text: theme.text.base,
      muted: theme.text.muted,
      warning: theme.text.feedback.warning.base,
    }
  })

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

export default Plugin.define({
  id: "deepseek-peak-notifications",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: () => <PeakAlert />,
    })
  },
})

