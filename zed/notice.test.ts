import { expect, test } from "bun:test"
import { toNoticeMessage } from "./notice"

test("builds an ACP session notice", () => {
  expect(
    toNoticeMessage({
      sessionId: "ses_test",
      severity: "warning",
      title: "DeepSeek peak pricing",
      description: "Peak starts in 15m.",
    }),
  ).toEqual({
    jsonrpc: "2.0",
    method: "session/update",
    params: {
      sessionId: "ses_test",
      update: {
        sessionUpdate: "notice",
        severity: "warning",
        title: "DeepSeek peak pricing",
        description: "Peak starts in 15m.",
      },
    },
  })
})
