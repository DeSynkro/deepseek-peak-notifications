import { afterEach, describe, expect, test } from "bun:test"
import { parseArgs } from "./proxy"

const originalOpencode = process.env.DEEPSEEK_PEAK_OPENCODE

afterEach(() => {
  if (originalOpencode === undefined) {
    delete process.env.DEEPSEEK_PEAK_OPENCODE
  } else {
    process.env.DEEPSEEK_PEAK_OPENCODE = originalOpencode
  }
})

describe("parseArgs", () => {
  test("uses safe defaults", () => {
    process.env.DEEPSEEK_PEAK_OPENCODE = "/usr/bin/opencode"

    expect(parseArgs([])).toEqual({
      opencode: "/usr/bin/opencode",
      notices: true,
      testNotice: false,
    })
  })

  test("accepts an explicit opencode path", () => {
    expect(parseArgs(["--opencode", "/opt/opencode"])).toMatchObject({
      opencode: "/opt/opencode",
    })
  })

  test("accepts the notice flags", () => {
    expect(parseArgs(["--no-notices", "--test-notice"])).toMatchObject({
      notices: false,
      testNotice: true,
    })
  })

  test("rejects missing values and unknown arguments", () => {
    expect(() => parseArgs(["--opencode"])).toThrow("--opencode requires a path")
    expect(() => parseArgs(["--unknown"])).toThrow("Unknown argument: --unknown")
  })
})
