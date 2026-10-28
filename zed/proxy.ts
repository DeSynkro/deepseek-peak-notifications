import { spawn } from "node:child_process"
import { createInterface, type Interface } from "node:readline"
import { toNoticeMessage } from "./notice"
import { NoticeScheduler, type Notice } from "./scheduler"
import { AcpTracker, parseMessage } from "./tracker"

export type ProxyOptions = {
  opencode: string
  notices: boolean
  testNotice: boolean
}

export function parseArgs(args: string[]): ProxyOptions {
  const options: ProxyOptions = {
    opencode: process.env.DEEPSEEK_PEAK_OPENCODE ?? "opencode",
    notices: true,
    testNotice: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--opencode") {
      const value = args[++i]
      if (!value) throw new Error("--opencode requires a path")
      options.opencode = value
      continue
    }

    if (arg === "--no-notices") {
      options.notices = false
      continue
    }

    if (arg === "--test-notice") {
      options.testNotice = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function writeLine(target: NodeJS.WritableStream, line: string, source: Interface) {
  if (target.write(`${line}\n`)) return

  source.pause()
  target.once("drain", () => source.resume())
}

function writeNotice(notice: Notice) {
  process.stdout.write(`${JSON.stringify(toNoticeMessage(notice))}\n`)
}

export function main() {
  let options: ProxyOptions

  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`[deepseek-peak] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  const child = spawn(options.opencode, ["acp"], {
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  })

  if (!child.stdin || !child.stdout || !child.stderr) {
    console.error("[deepseek-peak] failed to open child process streams")
    process.exit(1)
  }

  const childStdin = child.stdin
  const childStdout = child.stdout
  const childStderr = child.stderr

  childStderr.pipe(process.stderr)

  console.error(`[deepseek-peak] starting ACP proxy for ${options.opencode}`)
  if (!options.notices) console.error("[deepseek-peak] notices disabled by --no-notices")
  if (options.testNotice) console.error("[deepseek-peak] test notice enabled")

  let scheduler: NoticeScheduler | undefined

  const tracker = new AcpTracker((sessionId) => {
    if (!tracker.noticesSupported) return

    if (options.notices && options.testNotice) {
      writeNotice({
        sessionId,
        severity: "info",
        title: "DeepSeek Peak Notifications",
        description: "Test notice from the Zed proxy.",
      })
      return
    }

    const notified = scheduler?.tick() ?? new Set<string>()
    if (!notified.has(sessionId)) scheduler?.status(sessionId)
  })

  scheduler = new NoticeScheduler({
    sessions: () => tracker.sessionIds,
    send: writeNotice,
    enabled: () => options.notices && tracker.noticesSupported,
  })

  const timer = setInterval(() => scheduler?.tick(), 30_000)

  const client = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  })

  const agent = createInterface({
    input: childStdout,
    crlfDelay: Infinity,
  })

  let stopping = false

  const stop = (signal: NodeJS.Signals) => {
    if (stopping) return
    stopping = true
    child.kill(signal)

    const kill = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL")
    }, 5000)
    kill.unref()
  }

  client.on("line", (line) => {
    if (!line.trim()) return
    writeLine(childStdin, line, client)

    const message = parseMessage(line)
    if (!message) return

    tracker.handleClient(message)
    if (message.method === "initialize") {
      console.error(
        tracker.noticesSupported
          ? "[deepseek-peak] session notices enabled"
          : "[deepseek-peak] session notices unavailable, running in passthrough mode",
      )
    }
  })

  agent.on("line", (line) => {
    if (!line.trim()) return
    writeLine(process.stdout, line, agent)

    const message = parseMessage(line)
    if (message) tracker.handleAgent(message)
  })

  child.on("error", (error) => {
    console.error(`[deepseek-peak] failed to start ${options.opencode}: ${error.message}`)
    process.exit(1)
  })

  child.on("exit", (code, signal) => {
    clearInterval(timer)
    client.close()
    agent.close()
    console.error(`[deepseek-peak] opencode acp exited (code=${code ?? "none"}, signal=${signal ?? "none"})`)
    process.exit(code ?? (signal ? 1 : 0))
  })

  process.stdin.on("end", () => {
    childStdin.end()
    const kill = setTimeout(() => stop("SIGTERM"), 5000)
    kill.unref()
  })

  process.stdout.on("error", (error) => {
    console.error(`[deepseek-peak] stdout error: ${error.message}`)
    stop("SIGTERM")
  })

  childStdin.on("error", (error) => {
    console.error(`[deepseek-peak] child stdin error: ${error.message}`)
    stop("SIGTERM")
  })

  process.on("SIGINT", () => stop("SIGINT"))
  process.on("SIGTERM", () => stop("SIGTERM"))
}

if (import.meta.main) main()
