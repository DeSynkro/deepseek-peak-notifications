import { describe, expect, test } from "bun:test"
import {
  didPhaseChange,
  formatDuration,
  formatLocalTime,
  getPeakState,
  hasHolidayData,
  isPeak,
  nextTransition,
} from "./peak"

describe("hasHolidayData", () => {
  test("returns true for a year with a calendar", () => {
    expect(hasHolidayData(2026)).toBe(true)
  })

  test("returns false for a year without a calendar", () => {
    expect(hasHolidayData(2027)).toBe(false)
  })
})

describe("isPeak", () => {
  test("returns true inside both weekday peak windows", () => {
    expect(isPeak(new Date("2026-01-05T02:00:00Z"))).toBe(true)
    expect(isPeak(new Date("2026-01-05T07:00:00Z"))).toBe(true)
  })

  test("uses exact UTC window boundaries", () => {
    const day = "2026-01-05"

    expect(isPeak(new Date(`${day}T00:59:00Z`))).toBe(false)
    expect(isPeak(new Date(`${day}T01:00:00Z`))).toBe(true)
    expect(isPeak(new Date(`${day}T03:59:00Z`))).toBe(true)
    expect(isPeak(new Date(`${day}T04:00:00Z`))).toBe(false)
    expect(isPeak(new Date(`${day}T05:59:00Z`))).toBe(false)
    expect(isPeak(new Date(`${day}T06:00:00Z`))).toBe(true)
    expect(isPeak(new Date(`${day}T09:59:00Z`))).toBe(true)
    expect(isPeak(new Date(`${day}T10:00:00Z`))).toBe(false)
  })

  test("returns false on weekends", () => {
    expect(isPeak(new Date("2026-01-03T02:00:00Z"))).toBe(false)
    expect(isPeak(new Date("2026-01-04T07:00:00Z"))).toBe(false)
  })

  test("returns false during Chinese public holidays", () => {
    expect(isPeak(new Date("2026-01-01T02:00:00Z"))).toBe(false)
    expect(isPeak(new Date("2026-02-16T07:00:00Z"))).toBe(false)
    expect(isPeak(new Date("2026-02-23T02:00:00Z"))).toBe(false)
    expect(isPeak(new Date("2026-04-06T07:00:00Z"))).toBe(false)
  })

  test("returns to peak on the first weekday after a holiday", () => {
    expect(isPeak(new Date("2026-02-24T02:00:00Z"))).toBe(true)
    expect(isPeak(new Date("2026-04-07T02:00:00Z"))).toBe(true)
  })
})

describe("nextTransition", () => {
  test("finds the next boundary inside a peak window", () => {
    expect(nextTransition(new Date("2026-01-05T01:00:00Z")).toISOString()).toBe("2026-01-05T04:00:00.000Z")
    expect(nextTransition(new Date("2026-01-05T06:00:00Z")).toISOString()).toBe("2026-01-05T10:00:00.000Z")
  })

  test("finds the next peak window from off-peak", () => {
    expect(nextTransition(new Date("2026-01-05T04:00:00Z")).toISOString()).toBe("2026-01-05T06:00:00.000Z")
    expect(nextTransition(new Date("2026-01-05T10:00:00Z")).toISOString()).toBe("2026-01-06T01:00:00.000Z")
    expect(nextTransition(new Date("2026-01-05T00:00:00Z")).toISOString()).toBe("2026-01-05T01:00:00.000Z")
  })

  test("skips the weekend", () => {
    expect(nextTransition(new Date("2026-01-09T10:00:00Z")).toISOString()).toBe("2026-01-12T01:00:00.000Z")
  })

  test("skips the Spring Festival holiday", () => {
    expect(nextTransition(new Date("2026-02-13T10:00:00Z")).toISOString()).toBe("2026-02-24T01:00:00.000Z")
  })
})

describe("getPeakState", () => {
  test("reports the current phase and the next phase", () => {
    const peak = getPeakState(new Date("2026-01-05T02:00:00Z"))
    expect(peak.peak).toBe(true)
    expect(peak.next.toISOString()).toBe("2026-01-05T04:00:00.000Z")
    expect(peak.nextLabel).toBe("off-peak")
    expect(peak.holidayDataMissing).toBe(false)

    const offPeak = getPeakState(new Date("2026-01-05T12:00:00Z"))
    expect(offPeak.peak).toBe(false)
    expect(offPeak.next.toISOString()).toBe("2026-01-06T01:00:00.000Z")
    expect(offPeak.nextLabel).toBe("peak")
    expect(offPeak.holidayDataMissing).toBe(false)
  })
})

describe("formatDuration", () => {
  test("formats hours and minutes", () => {
    expect(formatDuration(2 * 3_600_000 + 14 * 60_000)).toBe("2h 14m")
    expect(formatDuration(3_600_000)).toBe("1h 00m")
    expect(formatDuration(14 * 60_000)).toBe("14m")
  })

  test("rounds up partial minutes and clamps negatives", () => {
    expect(formatDuration(14 * 60_000 + 30_000)).toBe("15m")
    expect(formatDuration(-1)).toBe("0m")
    expect(formatDuration(0)).toBe("0m")
  })
})

describe("formatLocalTime", () => {
  test("applies the New York daylight saving change", () => {
    const before = formatLocalTime(new Date("2026-03-08T06:59:00Z"), "America/New_York")
    const after = formatLocalTime(new Date("2026-03-08T07:00:00Z"), "America/New_York")

    expect(before).toContain("01:59")
    expect(after).toContain("03:00")
    expect(before).toMatch(/GMT-5|EST/)
    expect(after).toMatch(/GMT-4|EDT/)
  })

  test("applies the Sydney daylight saving change", () => {
    const before = formatLocalTime(new Date("2026-10-03T15:59:00Z"), "Australia/Sydney")
    const after = formatLocalTime(new Date("2026-10-03T16:00:00Z"), "Australia/Sydney")

    expect(before).toContain("01:59")
    expect(after).toContain("03:00")
    expect(before).toMatch(/GMT\+10|AEST/)
    expect(after).toMatch(/GMT\+11|AEDT/)
  })
})

describe("didPhaseChange", () => {
  test("reports only actual phase changes", () => {
    expect(didPhaseChange(false, false)).toBe(false)
    expect(didPhaseChange(true, true)).toBe(false)
    expect(didPhaseChange(false, true)).toBe(true)
    expect(didPhaseChange(true, false)).toBe(true)
  })
})

describe("missing holiday data", () => {
  test("marks a year without a calendar", () => {
    const state = getPeakState(new Date("2027-01-04T02:00:00Z"))

    expect(state.holidayDataMissing).toBe(true)
    expect(state.peak).toBe(true)
  })
})
