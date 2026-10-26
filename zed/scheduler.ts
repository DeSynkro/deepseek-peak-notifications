import { formatDuration, formatLocalTime, getPeakState, isPeak, nextPeakStart } from "../opencode/peak"

export type Notice = {
  sessionId: string
  severity: "info" | "warning"
  title: string
  description: string
}

export type NoticeSchedulerOptions = {
  initialNow?: Date
  sessions: () => Iterable<string>
  send: (notice: Notice) => void
  enabled: () => boolean
}

const WARNING_MS = 15 * 60_000

export class NoticeScheduler {
  private lastPeak: boolean
  private readonly warned = new Map<string, number>()

  constructor(private readonly options: NoticeSchedulerOptions) {
    this.lastPeak = isPeak(options.initialNow ?? new Date())
  }

  tick(now: Date = new Date()) {
    if (!this.options.enabled()) return

    const state = getPeakState(now)
    const sessions = [...new Set(this.options.sessions())]

    if (state.peak !== this.lastPeak) {
      if (state.peak) {
        for (const sessionId of sessions) {
          this.options.send({
            sessionId,
            severity: "warning",
            title: "DeepSeek peak pricing",
            description: `Peak pricing has started. Off-peak returns at ${formatLocalTime(state.next)}.`,
          })
        }
        this.warned.clear()
      } else {
        for (const sessionId of sessions) {
          this.options.send({
            sessionId,
            severity: "info",
            title: "DeepSeek off-peak pricing",
            description: `Off-peak pricing has started. Peak returns at ${formatLocalTime(state.next)}.`,
          })
        }
      }

      this.lastPeak = state.peak
    }

    if (state.peak) return

    const nextPeak = nextPeakStart(now)
    const msUntil = nextPeak.getTime() - now.getTime()
    if (msUntil <= 0 || msUntil > WARNING_MS) return

    for (const sessionId of sessions) {
      if (this.warned.get(sessionId) === nextPeak.getTime()) continue

      this.warned.set(sessionId, nextPeak.getTime())
      this.options.send({
        sessionId,
        severity: "warning",
        title: "DeepSeek peak pricing",
        description: `Peak starts in ${formatDuration(msUntil)} (${formatLocalTime(nextPeak)}).`,
      })
    }
  }
}
