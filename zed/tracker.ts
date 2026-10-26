export type JsonRpcMessage = {
  jsonrpc?: string
  id?: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseMessage(line: string): JsonRpcMessage | undefined {
  try {
    const value = JSON.parse(line)
    return isRecord(value) ? value : undefined
  } catch {
    return undefined
  }
}

function sessionIdFrom(params: unknown): string | undefined {
  if (!isRecord(params)) return
  return typeof params.sessionId === "string" ? params.sessionId : undefined
}

function resultSessionId(result: unknown): string | undefined {
  if (!isRecord(result)) return
  return typeof result.sessionId === "string" ? result.sessionId : undefined
}

function noticesSupported(params: unknown): boolean {
  if (!isRecord(params)) return false

  const capabilities = params.clientCapabilities
  if (!isRecord(capabilities)) return false

  const session = capabilities.session
  if (!isRecord(session)) return false

  return isRecord(session.notices)
}

export class AcpTracker {
  noticesSupported = false

  private readonly sessions = new Set<string>()
  private readonly clientRequests = new Map<string | number, string>()

  constructor(private readonly onSessionAdded?: (sessionId: string) => void) {}

  get sessionIds(): ReadonlySet<string> {
    return this.sessions
  }

  handleClient(message: JsonRpcMessage) {
    if (message.method === "initialize") {
      this.noticesSupported = noticesSupported(message.params)
    }

    if (typeof message.method === "string" && message.id !== undefined) {
      this.clientRequests.set(message.id, message.method)
    }

    const sessionId = sessionIdFrom(message.params)
    if (!sessionId || !message.method?.startsWith("session/")) return

    if (message.method === "session/close" || message.method === "session/delete") {
      this.sessions.delete(sessionId)
      return
    }

    this.addSession(sessionId)
  }

  handleAgent(message: JsonRpcMessage) {
    if (message.id !== undefined && message.method === undefined) {
      const method = this.clientRequests.get(message.id)
      if (method !== undefined) {
        this.clientRequests.delete(message.id)
        const sessionId = resultSessionId(message.result)
        if (sessionId) this.addSession(sessionId)
      }
    }

    if (message.method !== "session/update") return

    const sessionId = sessionIdFrom(message.params)
    if (sessionId) this.addSession(sessionId)
  }

  private addSession(sessionId: string) {
    if (this.sessions.has(sessionId)) return
    this.sessions.add(sessionId)
    this.onSessionAdded?.(sessionId)
  }
}
