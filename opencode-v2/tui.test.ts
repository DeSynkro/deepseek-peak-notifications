import { describe, expect, test } from "bun:test"
import plugin from "./tui"

describe("tui plugin", () => {
  test("uses the package id", () => {
    expect(plugin.id).toBe("deepseek-peak-notifications")
  })

  test("appends the alert to the sidebar", () => {
    const claims: Array<Record<string, unknown>> = []

    plugin.setup({
      ui: {
        slot: (claim: Record<string, unknown>) => {
          claims.push(claim)
          return () => {}
        },
      },
    } as never)

    expect(claims).toHaveLength(1)
    expect(claims[0]?.append).toBe("sidebar.content")
    expect(typeof claims[0]?.render).toBe("function")
  })
})
