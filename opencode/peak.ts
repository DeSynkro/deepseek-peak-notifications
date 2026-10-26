export type HolidayCalendar = Record<number, ReadonlyArray<readonly [string, string]>>

export type PeakState = {
  peak: boolean
  next: Date
  nextLabel: "peak" | "off-peak"
  holidayDataMissing: boolean
}

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

const PEAK_WINDOWS_UTC: ReadonlyArray<readonly [number, number]> = [
  [1, 4],
  [6, 10],
]

const TRANSITION_MINUTES_UTC: ReadonlyArray<number> = [60, 240, 360, 600]
const MAX_TRANSITION_DAYS = 31

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

export function nextTransition(from: Date, calendar: HolidayCalendar = CN_HOLIDAYS): Date {
  const peak = isPeak(from, calendar)
  const dayStart = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())

  for (let day = 0; day < MAX_TRANSITION_DAYS; day++) {
    for (const minute of TRANSITION_MINUTES_UTC) {
      const candidate = new Date(dayStart + day * DAY_MS + minute * MINUTE_MS)
      if (candidate.getTime() <= from.getTime()) continue
      if (isPeak(candidate, calendar) !== peak) return candidate
    }
  }

  throw new Error("Could not find a DeepSeek pricing transition within 31 days")
}

export function getPeakState(date: Date, calendar: HolidayCalendar = CN_HOLIDAYS): PeakState {
  const peak = isPeak(date, calendar)
  const next = nextTransition(date, calendar)

  return {
    peak,
    next,
    nextLabel: isPeak(next, calendar) ? "peak" : "off-peak",
    holidayDataMissing: !hasHolidayData(date.getUTCFullYear(), calendar),
  }
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / MINUTE_MS))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`
}

export function formatLocalTime(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
    timeZoneName: "short",
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00"
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00"
  const zone = parts.find((part) => part.type === "timeZoneName")?.value

  return zone ? `${hour}:${minute} ${zone}` : `${hour}:${minute}`
}

export function didPhaseChange(previousPeak: boolean, currentPeak: boolean): boolean {
  return previousPeak !== currentPeak
}
