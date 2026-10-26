import { describe, expect, test } from "bun:test"
import { NoticeScheduler, type Notice } from "./scheduler"

function schedulerAt(initialNow: string, sessions: string[] = ["ses_one"], enabled = true) {
  const notices: Notice[] = []
  const liveSessions = [...sessions]

  const scheduler = new NoticeScheduler({
    initialNow: new Date(initialNow),
    enabled: () => enabled,
    sessions: () => liveSessions,
    send: (notice) => notices.push(notice),
  })

  return { scheduler, notices, liveSessions }
}

describe("NoticeScheduler", () => {
  test("warns 15 minutes before the first peak window", () => {
    const { scheduler, notices } = schedulerAt("2026-01-05T00:44:00Z")

    scheduler.tick(new Date("2026-01-05T00:44:00Z"))
    expect(notices).toHaveLength(0)

    scheduler.tick(new Date("2026-01-05T00:45:00Z"))
    expect(notices).toHaveLength(1)
    expect(notices[0]?.severity).toBe("warning")
    expect(notices[0]?.title).toBe("DeepSeek peak pricing")
    expect(notices[0]?.description).toContain("Peak starts in 15m")
  })

  test("warns again before the second peak window", () => {
    const { scheduler, notices } = schedulerAt("2026-01-05T05:44:00Z")

    scheduler.tick(new Date("2026-01-05T05:45:00Z"))
    expect(notices).toHaveLength(1)
    expect(notices[0]?.description).toContain("Peak starts in 15m")

    scheduler.tick(new Date("2026-01-05T06:00:00Z"))
    expect(notices).toHaveLength(2)
    expect(notices[1]?.description).toContain("Peak pricing has started")
  })

  test("sends the peak start and off-peak start notices", () => {
    const { scheduler, notices } = schedulerAt("2026-01-05T00:44:00Z")

    scheduler.tick(new Date("2026-01-05T00:45:00Z"))
    scheduler.tick(new Date("2026-01-05T01:00:00Z"))
    scheduler.tick(new Date("2026-01-05T04:00:00Z"))
    scheduler.tick(new Date("2026-01-05T05:45:00Z"))
    scheduler.tick(new Date("2026-01-05T06:00:00Z"))

    expect(notices.map((notice) => notice.severity)).toEqual([
      "warning",
      "warning",
      "info",
      "warning",
      "warning",
    ])
    expect(notices[1]?.description).toContain("Peak pricing has started")
    expect(notices[2]?.description).toContain("Off-peak pricing has started")
  })

  test("does not warn before off-peak starts", () => {
    const { scheduler, notices } = schedulerAt("2026-01-05T03:44:00Z")

    scheduler.tick(new Date("2026-01-05T03:45:00Z"))
    expect(notices).toHaveLength(0)

    scheduler.tick(new Date("2026-01-05T04:00:00Z"))
    expect(notices).toHaveLength(1)
    expect(notices[0]?.description).toContain("Off-peak pricing has started")
  })

  test("does not warn on weekends or holidays", () => {
    const weekend = schedulerAt("2026-01-03T00:44:00Z")
    weekend.scheduler.tick(new Date("2026-01-03T00:45:00Z"))
    expect(weekend.notices).toHaveLength(0)

    const holiday = schedulerAt("2026-02-16T00:44:00Z")
    holiday.scheduler.tick(new Date("2026-02-16T00:45:00Z"))
    expect(holiday.notices).toHaveLength(0)
  })

  test("warns once per session and catches a new session inside the window", () => {
    const { scheduler, notices, liveSessions } = schedulerAt("2026-01-05T00:44:00Z", ["ses_a"])

    scheduler.tick(new Date("2026-01-05T00:45:00Z"))
    scheduler.tick(new Date("2026-01-05T00:45:30Z"))
    expect(notices.map((notice) => notice.sessionId)).toEqual(["ses_a"])

    liveSessions.push("ses_b")
    scheduler.tick(new Date("2026-01-05T00:46:00Z"))
    expect(notices.map((notice) => notice.sessionId)).toEqual(["ses_a", "ses_b"])
  })

  test("sends a transition notice to every active session", () => {
    const { scheduler, notices } = schedulerAt("2026-01-05T00:59:00Z", ["ses_a", "ses_b"])

    scheduler.tick(new Date("2026-01-05T01:00:00Z"))
    expect(notices.map((notice) => notice.sessionId)).toEqual(["ses_a", "ses_b"])
  })

  test("does nothing when notices are disabled", () => {
    const { scheduler, notices } = schedulerAt("2026-01-05T00:44:00Z", ["ses_a"], false)

    scheduler.tick(new Date("2026-01-05T00:45:00Z"))
    scheduler.tick(new Date("2026-01-05T01:00:00Z"))
    expect(notices).toHaveLength(0)
  })
})
