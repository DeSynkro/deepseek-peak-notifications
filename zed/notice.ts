import type { Notice } from "./scheduler"

export type NoticeMessage = {
  jsonrpc: "2.0"
  method: "session/update"
  params: {
    sessionId: string
    update: {
      sessionUpdate: "notice"
      severity: "info" | "warning"
      title: string
      description: string
    }
  }
}

export function toNoticeMessage(notice: Notice): NoticeMessage {
  return {
    jsonrpc: "2.0",
    method: "session/update",
    params: {
      sessionId: notice.sessionId,
      update: {
        sessionUpdate: "notice",
        severity: notice.severity,
        title: notice.title,
        description: notice.description,
      },
    },
  }
}
