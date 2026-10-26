export type HolidayCalendar = Record<number, ReadonlyArray<readonly [string, string]>>

const PEAK_WINDOWS_UTC: ReadonlyArray<readonly [number, number]> = [
  [1, 4],
  [6, 10],
]

// Chinese public holiday rest days, inclusive. The State Council publishes the
// next year's calendar around November, so add the new ranges when they appear.
export const CN_HOLIDAYS: HolidayCalendar = {
  2026: [
    ["2026-01-01", "2026-01-03"],
    ["2026-02-15", "2026-02-23"],
    ["2026-04-04", "2026-04-06"],
    ["2026-05-01", "2026-05-05"],
    ["2026-06-19", "2026-06-21"],
    ["2026-09-25", "2026-09-27"],
    ["2026-10-01", "2026-10-07"],
  ],
}

function utcDateKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

function isHoliday(date: Date, calendar: HolidayCalendar): boolean {
  const ranges = calendar[date.getUTCFullYear()]
  if (!ranges) return false

  const key = utcDateKey(date)
  return ranges.some(([from, to]) => key >= from && key <= to)
}

export function hasHolidayData(year: number, calendar: HolidayCalendar = CN_HOLIDAYS): boolean {
  return calendar[year] !== undefined
}

export function isPeak(date: Date, calendar: HolidayCalendar = CN_HOLIDAYS): boolean {
  const weekday = date.getUTCDay()
  if (weekday === 0 || weekday === 6) return false
  if (isHoliday(date, calendar)) return false

  const hour = date.getUTCHours() + date.getUTCMinutes() / 60
  return PEAK_WINDOWS_UTC.some(([from, to]) => hour >= from && hour < to)
}
