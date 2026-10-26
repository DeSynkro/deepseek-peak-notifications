import { afterEach, describe, expect, test } from "bun:test"
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import path from "node:path"
import { createInterface } from "node:readline"

type Message = {
  jsonrpc?: string
  id?: string | number
  method?: string
  result?: any
  params?: any
}

type TestProxy = {
  child: ChildProcessWithoutNullStreams
  lines: Message[]
  send: (message: Message) => void
  waitFor: (predicate: (message: Message) => boolean, timeout?: number) => Promise<Message>
  close: () => Promise<void>
}

const sessions: TestProxy[] = []

function startProxy(args: string[] = []): TestProxy {
  const proxy = path.join(import.meta.dir, "proxy.ts")
  const fake = path.join(import.meta.dir, "test-fixtures", "fake-acp")
  const child = spawn(process.execPath, ["run", proxy, "--opencode", fake, ...args], {
    stdio: ["pipe", "pipe", "pipe"],
  })

  const lines: Message[] = []
  const output = createInterface({ input: child.stdout })
  output.on("line", (line) => {
    try {
      lines.push(JSON.parse(line))
    } catch {
      // Ignore malformed output in tests.
    }
  })
  child.stderr.on("data", () => {})

  const proxySession: TestProxy = {
    child,
    lines,
    send(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`)
    },
    async waitFor(predicate, timeout = 3000) {
      const start = Date.now()

      while (Date.now() - start < timeout) {
        const hit = lines.find(predicate)
        if (hit) return hit
        await Bun.sleep(20)
      }

      throw new Error(`Timed out waiting for proxy output. Lines: ${JSON.stringify(lines)}`)
    },
    async close() {
      if (child.exitCode !== null) return

      child.kill("SIGTERM")
      const start = Date.now()
      while (child.exitCode === null && Date.now() - start < 2000) {
        await Bun.sleep(20)
      }

      if (child.exitCode === null) child.kill("SIGKILL")
    },
  }

  sessions.push(proxySession)
  return proxySession
}

function initializeWithNotices() {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { clientCapabilities: { session: { notices: {} } } },
  }
}

afterEach(async () => {
  while (sessions.length > 0) {
    await sessions.pop()?.close()
  }
})

describe("ACP proxy passthrough", () => {
  test("forwards requests and injects a test notice after a session is added", async () => {
    const proxy = startProxy(["--test-notice"])

    proxy.send(initializeWithNotices())
    await proxy.waitFor((message) => message.id === 1 && message.result !== undefined)

    proxy.send({ jsonrpc: "2.0", id: 2, method: "session/new", params: {} })
    await proxy.waitFor((message) => message.id === 2 && message.result?.sessionId === "ses_fake")

    const notice = await proxy.waitFor(
      (message) =>
        message.method === "session/update" && message.params?.update?.sessionUpdate === "notice",
    )

    expect(notice.params.sessionId).toBe("ses_fake")
    expect(notice.params.update.title).toBe("DeepSeek Peak Notifications")
  })

  test("does not inject notices without the client capability", async () => {
    const proxy = startProxy(["--test-notice"])

    proxy.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
    await proxy.waitFor((message) => message.id === 1 && message.result !== undefined)

    proxy.send({ jsonrpc: "2.0", id: 2, method: "session/new", params: {} })
    await proxy.waitFor((message) => message.id === 2 && message.result?.sessionId === "ses_fake")

    await Bun.sleep(150)
    expect(
      proxy.lines.some(
        (message) => message.method === "session/update" && message.params?.update?.sessionUpdate === "notice",
      ),
    ).toBe(false)
  })

  test("does not inject notices when --no-notices is set", async () => {
    const proxy = startProxy(["--test-notice", "--no-notices"])

    proxy.send(initializeWithNotices())
    await proxy.waitFor((message) => message.id === 1 && message.result !== undefined)

    proxy.send({ jsonrpc: "2.0", id: 2, method: "session/new", params: {} })
    await proxy.waitFor((message) => message.id === 2 && message.result?.sessionId === "ses_fake")

    await Bun.sleep(150)
    expect(
      proxy.lines.some(
        (message) => message.method === "session/update" && message.params?.update?.sessionUpdate === "notice",
      ),
    ).toBe(false)
  })

  test("forwards child notifications and responses", async () => {
    const proxy = startProxy()

    proxy.send(initializeWithNotices())
    await proxy.waitFor((message) => message.id === 1 && message.result !== undefined)

    proxy.send({ jsonrpc: "2.0", id: 2, method: "session/new", params: {} })
    await proxy.waitFor((message) => message.id === 2 && message.result?.sessionId === "ses_fake")

    proxy.send({
      jsonrpc: "2.0",
      id: 3,
      method: "session/prompt",
      params: { sessionId: "ses_fake", prompt: [] },
    })

    const update = await proxy.waitFor(
      (message) =>
        message.method === "session/update" &&
        message.params?.update?.sessionUpdate === "agent_message_chunk",
    )
    expect(update.params.update.content.text).toBe("pong")

    const response = await proxy.waitFor((message) => message.id === 3 && message.result !== undefined)
    expect(response.result.stopReason).toBe("end_turn")
  })
})
