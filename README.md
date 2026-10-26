<h1 align="center">DeepSeek Peak Notifications</h1>

<p align="center">
  <strong>A small pricing alert for OpenCode.</strong><br>
  Know when DeepSeek is in peak or off-peak hours without leaving your session.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/OpenCode-1.19-orange.svg" alt="OpenCode 1.19"></a>
  <a href="https://zed.dev"><img src="https://img.shields.io/badge/Zed-1.25.2%2B-blue.svg" alt="Zed 1.25.2 or newer"></a>
</p>

<p align="center">
  Built by <a href="https://desynkro.com">DeSynkro</a> with assistance from <a href="https://opencode.ai">Opencode</a>.
</p>

DeepSeek Peak Notifications is a small OpenCode 1.19 TUI plugin with an optional Zed adapter. The OpenCode plugin adds a sidebar card, a countdown to the next change, and a toast when peak starts or ends. The Zed adapter uses ACP notices to show the same pricing changes inside the Agent Panel.

## Why this exists

DeepSeek pricing follows fixed UTC windows and Chinese public holidays. If you use OpenCode for long sessions, it is easy to lose track of when the price changes. This plugin keeps the answer visible.

## Status

v0.2 is available for OpenCode 1.19 and Zed 1.25.2 or newer.

## Requirements

- **OpenCode:** 1.19.
- **Zed:** 1.25.2 or newer for the optional Zed adapter.
- **Bun:** used to install local dependencies and run the Zed proxy.
- **Runtime:** no account, API key, or network connection is required.

## Quick Start

From the project root, install the plugin dependencies and register the local plugin:

```sh
cd opencode
bun install
cd ..
opencode plugin --global "$(pwd)/opencode"
```

Restart OpenCode after registering the plugin. The card appears in the sidebar when you are inside a session.

If you prefer to edit the config yourself, add the absolute path to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "/absolute/path/to/deepseek-peak-notifications/opencode"
  ]
}
```

TUI plugins are loaded from `tui.json`, not `opencode.jsonc`.

### Zed

Install the proxy dependencies:

```sh
cd zed
bun install
```

Change the `OpenCode` agent in `~/.config/zed/settings.json` so it launches the proxy. Keep your existing model options:

```json
"OpenCode": {
  "type": "custom",
  "command": "/usr/bin/bun",
  "args": [
    "run",
    "/absolute/path/to/deepseek-peak-notifications/zed/proxy.ts",
    "--opencode",
    "/usr/bin/opencode"
  ]
}
```

Start or resume an `OpenCode` thread. Existing OpenCode sessions remain intact because the proxy forwards ACP traffic unchanged.

You can also add a second agent for side-by-side testing. See [zed/README.md](zed/README.md) for the full setup, notices, passthrough mode, and rollback steps.

To verify notice rendering, add `--test-notice` to the proxy args. Remove it after testing.

See [zed/README.md](zed/README.md) for the full Zed setup, notices, passthrough mode, and rollback steps.

## What it shows

```text
DeepSeek Peak Notifications
PEAK x2
Off-peak in 2h 14m
flip at 17:00 AEDT
```

- **PEAK x2** appears during DeepSeek peak hours.
- **OFF-PEAK -50%** appears during off-peak hours.
- The countdown updates every 30 seconds.
- The flip time uses your local timezone, including daylight saving.
- A warning appears when the current year has no Chinese holiday data.

## Features

- **Always visible:** a small card in the OpenCode sidebar.
- **Live countdown:** shows how long until the next pricing change.
- **Local time:** uses the system timezone and updates through daylight saving.
- **Transition toast:** shows a short toast when peak starts or ends.
- **Zed notices:** optional ACP notices in the Zed Agent Panel.
- **Peak warning:** the Zed adapter warns 15 minutes before each peak window.
- **No background daemon:** the Zed proxy runs only while an OpenCode thread is active.
- **Holiday aware:** Chinese public holidays are treated as off-peak.
- **No network:** pricing and holiday data are local.
- **No credentials:** reads nothing from your OpenCode setup.
- **No stored data:** keeps no state and writes no files.

## How it works

DeepSeek peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday through Friday, excluding Chinese public holidays. Every other time is off-peak at half price.

The plugin checks the UTC clock, finds the next phase change, and formats the result in your local time. Since the pricing windows are UTC, daylight saving only changes the displayed local time. It does not change whether the current time is peak.

Source: <https://api-docs.deepseek.com/quick_start/pricing/>

## Configuration

The OpenCode TUI plugin has no options.

The Zed proxy accepts:

- `--opencode <path>`: path to the real OpenCode binary. Defaults to `opencode` from `PATH`.
- `--no-notices`: run as a transparent ACP passthrough.
- `--test-notice`: send one test notice when a session starts.

The 15-minute peak warning is enabled by default in the Zed adapter.

### Updating the holiday calendar

The State Council publishes the next year's Chinese public holiday calendar around November. Add the new ranges to `CN_HOLIDAYS` in `opencode/peak.ts`:

```ts
export const CN_HOLIDAYS: HolidayCalendar = {
  2027: [
    ["2027-01-01", "2027-01-03"],
  ],
}
```

Until a year is added, the plugin treats that year as having no holidays and shows a warning on the card.

## Troubleshooting

### The card is not visible

- Make sure you are inside an OpenCode session.
- Make sure the sidebar is visible.
- Restart OpenCode after changing `tui.json`.

### The plugin does not load

- Confirm the path in `tui.json` points at the `opencode` directory, not a single file.
- Run `bun install` inside `opencode/`.
- Check the TUI plugin list for a load error.

### The holiday warning appears

Add the current year to `CN_HOLIDAYS` in `opencode/peak.ts`. The warning is expected when the calendar does not have data for the current year.

### The Zed agent does not start

- Confirm `/usr/bin/bun` exists.
- Run `cd zed && bun install`.
- Check the proxy path and `--opencode` path in `~/.config/zed/settings.json`.
- Check Zed logs for `[deepseek-peak]` messages.

### Zed works but notices do not appear

- Confirm Zed is 1.25.2 or newer.
- Check for `[deepseek-peak] session notices enabled` in Zed logs.
- If the log says `session notices unavailable`, Zed did not advertise the capability and the proxy is running in passthrough mode.

## Development

The plugin has no build step. OpenCode transpiles the raw TypeScript and JSX at runtime.

Run the checks from `opencode/`:

```sh
bun run check
```

Run only the unit tests:

```sh
bun test
```

The tests cover peak windows, weekends, Chinese holidays, long holidays, next transitions, daylight saving in New York and Sydney, and missing holiday data.

Run the Zed adapter checks from `zed/`:

```sh
bun run check
```

The Zed tests cover ACP forwarding, session tracking, capability gating, the 15-minute warning, transition notices, deduplication, and shutdown flags.

## Uninstall

Remove the OpenCode plugin path from `~/.config/opencode/tui.json`, then restart OpenCode.

For Zed, restore the original `OpenCode` command in `~/.config/zed/settings.json`:

```json
"command": "/usr/bin/opencode",
"args": ["acp"]
```

You can also restore the backup created during setup. Restart Zed afterwards.

There is no automatic uninstall script. Both config files can contain comments, so manual removal is safer than a naive text edit.

## Support

If you find this useful, you can support me on [Ko-fi](https://ko-fi.com/desynkro). You can find more of my work at [desynkro.com](https://desynkro.com).

## License

MIT. See [LICENSE](LICENSE).

## Credits

- Built by [DeSynkro](https://desynkro.com)
- Assisted by [Opencode](https://opencode.ai)
- Pricing source: [DeepSeek API docs](https://api-docs.deepseek.com/quick_start/pricing/)
- Thanks to the OpenCode community for the plugin API and examples
