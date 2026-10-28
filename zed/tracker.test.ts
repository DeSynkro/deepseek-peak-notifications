import { describe, expect, test } from "bun:test"
import { AcpTracker, parseMessage } from "./tracker"

describe("parseMessage", () => {
  test("parses a JSON object", () => {
    expect(parseMessage('{"jsonrpc":"2.0","id":1}')).toEqual({ jsonrpc: "2.0", id: 1 })
  })

  test("ignores invalid JSON and non-objects", () => {
    expect(parseMessage("not json")).toBeUndefined()
    expect(parseMessage("[]")).toBeUndefined()
    expect(parseMessage("null")).toBeUndefined()
  })
})

describe("AcpTracker", () => {
  test("reads the session notices capability", () => {
    const tracker = new AcpTracker()
    tracker.handleClient({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { clientCapabilities: { session: { notices: {} } } },
    })

    expect(tracker.noticesSupported).toBe(true)
  })

  test("treats missing or null notices capability as unsupported", () => {
    const missing = new AcpTracker()
    missing.handleClient({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
    expect(missing.noticesSupported).toBe(false)

    const empty = new AcpTracker()
    empty.handleClient({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { clientCapabilities: { session: { notices: null } } },
    })
    expect(empty.noticesSupported).toBe(false)
  })

  test("adds a session from a session/new response", () => {
    const tracker = new AcpTracker()
    tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/new", params: {} })
    tracker.handleAgent({ jsonrpc: "2.0", id: 1, result: { sessionId: "ses_new" } })

    expect([...tracker.sessionIds]).toEqual(["ses_new"])
  })

  test("adds a session from load, resume, and prompt requests", () => {
    const tracker = new AcpTracker()
    tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/load", params: { sessionId: "ses_load" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 2, method: "session/resume", params: { sessionId: "ses_resume" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 3, method: "session/prompt", params: { sessionId: "ses_prompt" } })

    expect([...tracker.sessionIds].sort()).toEqual(["ses_load", "ses_prompt", "ses_resume"])
  })

  test("adds a session from a session update", () => {
    const tracker = new AcpTracker()
    tracker.handleAgent({
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionId: "ses_update", update: { sessionUpdate: "notice" } },
    })

    expect([...tracker.sessionIds]).toEqual(["ses_update"])
  })

  test("removes a session on close or delete", () => {
    const tracker = new AcpTracker()
    tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/load", params: { sessionId: "ses_close" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 2, method: "session/close", params: { sessionId: "ses_close" } })
    expect([...tracker.sessionIds]).toEqual([])

    tracker.handleClient({ jsonrpc: "2.0", id: 3, method: "session/load", params: { sessionId: "ses_delete" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 4, method: "session/delete", params: { sessionId: "ses_delete" } })
    expect([...tracker.sessionIds]).toEqual([])
  })

  test("reports a newly added session only once", () => {
    const added: string[] = []
    const tracker = new AcpTracker((sessionId) => added.push(sessionId))

    tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/load", params: { sessionId: "ses_once" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 2, method: "session/prompt", params: { sessionId: "ses_once" } })

    expect(added).toEqual(["ses_once"])
  })

  test("ignores malformed params", () => {
    const tracker = new AcpTracker()

    expect(() => {
      tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/load", params: null })
      tracker.handleAgent({ jsonrpc: "2.0", id: 1, result: null })
      tracker.handleAgent({ jsonrpc: "2.0", method: "session/update", params: {} })
    }).not.toThrow()
  })
})

describe("session reopen notifications", () => {
  test("notifies on load and resume even when the session is already tracked", () => {
    const opened: string[] = []
    const tracker = new AcpTracker((sessionId) => opened.push(sessionId))

    tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/load", params: { sessionId: "ses_reopen" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 2, method: "session/load", params: { sessionId: "ses_reopen" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 3, method: "session/resume", params: { sessionId: "ses_reopen" } })

    expect(opened).toEqual(["ses_reopen", "ses_reopen", "ses_reopen"])
  })

  test("does not notify on a prompt for an already tracked session", () => {
    const opened: string[] = []
    const tracker = new AcpTracker((sessionId) => opened.push(sessionId))

    tracker.handleClient({ jsonrpc: "2.0", id: 1, method: "session/load", params: { sessionId: "ses_prompt" } })
    tracker.handleClient({ jsonrpc: "2.0", id: 2, method: "session/prompt", params: { sessionId: "ses_prompt" } })

    expect(opened).toEqual(["ses_prompt"])
  })
})
