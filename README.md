<h1 align="center">DeepSeek Peak Notifications</h1>

<p align="center">
  <strong>A small pricing alert for OpenCode.</strong><br>
  Know when DeepSeek is in peak or off-peak hours without leaving your session.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/OpenCode-1.19%2B%20%7C%202.x-orange.svg" alt="OpenCode 1.19+ and 2.x"></a>
  <a href="https://zed.dev"><img src="https://img.shields.io/badge/Zed-1.25.2%2B-blue.svg" alt="Zed 1.25.2 or newer"></a>
</p>

<p align="center">
  Built by <a href="https://desynkro.com">DeSynkro</a> with assistance from <a href="https://opencode.ai">Opencode</a>.
</p>

DeepSeek Peak Notifications is a small pricing alert with adapters for OpenCode V1, OpenCode V2, and Zed. The OpenCode adapters add a sidebar card, a countdown to the next change, and a toast when peak starts or ends. The Zed adapter uses ACP notices to show the same pricing changes inside the Agent Panel.

## Which setup do I need?

OpenCode V1 and V2 use different plugin APIs. Use the directory that matches your OpenCode version.

| Your setup | Directory | Notes |
| --- | --- | --- |
| OpenCode V1 (1.19.x) | [`opencode/`](opencode/) | V1 TUI plugin, loaded through `tui.json` |
| OpenCode V2 (2.x) | [`opencode-v2/`](opencode-v2/) | V2 plugin, loaded through `opencode.json` or plugin discovery |
| Zed | [`zed/`](zed/) | Optional ACP proxy. Works with OpenCode V1 or V2 |

Do not load `opencode/` in OpenCode V2, or `opencode-v2/` in OpenCode V1. The plugin APIs are not compatible.

## Status

OpenCode V1 and Zed are on the v0.2.1 release. The OpenCode V2 adapter is versioned separately in `opencode-v2/` (v0.3.0).

## Requirements

- **OpenCode V1:** 1.19.x.
- **OpenCode V2:** 2.x.
- **Zed:** 1.25.2 or newer for the optional Zed adapter.
- **Bun:** used to install local dependencies, run the checks, and run the Zed proxy.
- **Runtime:** no account, API key, or network connection is required.

## OpenCode V1

Install the V1 dependencies:

```sh
cd opencode
bun install
```

Register the plugin globally with the V1 CLI:

```sh
opencode plugin --global "$(pwd)"
```

Or edit `~/.config/opencode/tui.json` yourself:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "/absolute/path/to/deepseek-peak-notifications/opencode"
  ]
}
```

This is a TUI plugin, so it is registered in `tui.json`, not `opencode.json`.

Restart OpenCode after changing `tui.json`. The card appears in the sidebar when you are inside a session.

## OpenCode V2

Install the V2 dependencies:

```sh
cd opencode-v2
bun install
```

If you previously used the V1 adapter, remove its entry from `~/.config/opencode/tui.json` first. V2 migrates terminal settings to `~/.config/opencode/cli.json`, and the V1 plugin cannot run in V2. If the old entry was migrated, remove it from `cli.json` too.

Then load the package using either method below.

### Option A: global plugin directory

```sh
mkdir -p ~/.config/opencode/plugins
ln -s /absolute/path/to/deepseek-peak-notifications/opencode-v2 \
  ~/.config/opencode/plugins/deepseek-peak-notifications
```

OpenCode discovers that directory automatically.

### Option B: global configuration

Add the absolute package directory to `~/.config/opencode/opencode.json`, preserving any existing `plugins` entries:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "/absolute/path/to/deepseek-peak-notifications/opencode-v2"
  ]
}
```

### Project-only install

For one project only, use the project plugin directory instead:

```sh
mkdir -p .opencode/plugins
ln -s /absolute/path/to/deepseek-peak-notifications/opencode-v2 \
  .opencode/plugins/deepseek-peak-notifications
```

OpenCode watches plugin configuration and directories and reloads them after a save. Use `/reload` if a reload does not happen on its own.

The V2 package has both a server entrypoint and a TUI entrypoint, so it belongs in `opencode.json` or plugin discovery. `cli.json` is for TUI-only packages.

`node_modules` is only needed for the local checks (`bun run check`). OpenCode supplies the plugin runtime APIs itself.

## Zed

The Zed adapter is a local ACP proxy. It is not a Zed extension, and it does not require the OpenCode TUI plugin. It forwards Zed traffic to `opencode acp` and injects pricing notices into the Agent Panel.

Requirements:

- Zed 1.25.2 or newer, for ACP session notices.
- OpenCode V1 or V2 with the `opencode acp` command available.
- Bun.

Install the proxy dependencies:

```sh
cd zed
bun install
```

Find the paths to Bun and OpenCode:

```sh
which bun
which opencode
```

Change the `OpenCode` agent in `~/.config/zed/settings.json` so it launches the proxy. Keep your existing model options:

```json
"OpenCode": {
  "type": "custom",
  "command": "/home/you/.bun/bin/bun",
  "args": [
    "run",
    "/absolute/path/to/deepseek-peak-notifications/zed/proxy.ts",
    "--opencode",
    "/home/you/.local/bin/opencode"
  ]
}
```

Use the paths printed by `which`, not the examples above.

Start or resume an `OpenCode` thread. Existing OpenCode sessions remain intact because the proxy forwards ACP traffic unchanged.

To verify notice rendering, add `--test-notice` to the proxy args. Remove it after testing.

You can also add a second agent for side-by-side testing. See [zed/README.md](zed/README.md) for the full setup, notices, passthrough mode, and rollback steps.

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
- **Status on open:** reopening a thread shows the current peak or off-peak state.
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

The OpenCode TUI plugins have no options.

The Zed proxy accepts:

- `--opencode <path>`: path to the real OpenCode binary. Defaults to `opencode` from `PATH`.
- `--no-notices`: run as a transparent ACP passthrough.
- `--test-notice`: send one test notice when a session starts.

The 15-minute peak warning is enabled by default in the Zed adapter.

### Updating the holiday calendar

The State Council publishes the next year's Chinese public holiday calendar around November. Add the new ranges to `CN_HOLIDAYS` in both OpenCode adapters if you use both:

- `opencode/peak.ts` for OpenCode V1
- `opencode-v2/peak.ts` for OpenCode V2

```ts
export const CN_HOLIDAYS: HolidayCalendar = {
  2027: [
    ["2027-01-01", "2027-01-03"],
  ],
}
```

Keep the two files in sync. Until a year is added, the plugin treats that year as having no holidays and shows a warning on the card.

## Troubleshooting

### OpenCode V1: the card is not visible

- Make sure you are inside an OpenCode session.
- Make sure the sidebar is visible.
- Restart OpenCode after changing `tui.json`.

### OpenCode V1: the plugin does not load

- Confirm the path in `tui.json` points at the `opencode` directory, not a single file.
- Run `bun install` inside `opencode/`.
- Confirm you are using OpenCode V1, not V2.

### OpenCode V2: the card is not visible

- Make sure you are inside an OpenCode session and the sidebar is visible.
- Run `/reload` after adding the plugin.
- Confirm the package path points at `opencode-v2`, not `opencode`.

### OpenCode V2: the plugin does not load

- Confirm the absolute path in `opencode.json` is the `opencode-v2` directory.
- If you used a symlink, confirm it points at the same directory.
- Check the OpenCode log (`~/.local/share/opencode/log/opencode.log` on Linux) for `plugin=deepseek-peak-notifications`.
- Confirm you are using OpenCode V2, not V1.

### The holiday warning appears

Add the current year to `CN_HOLIDAYS` in `opencode/peak.ts` and `opencode-v2/peak.ts`. The warning is expected when the calendar does not have data for the current year.

### The Zed agent does not start

- Confirm the Bun path from `which bun` exists.
- Run `cd zed && bun install`.
- Check the proxy path and `--opencode` path in `~/.config/zed/settings.json`.
- Check Zed logs for `[deepseek-peak]` messages.

### Zed works but notices do not appear

- Confirm Zed is 1.25.2 or newer.
- Check for `[deepseek-peak] session notices enabled` in Zed logs.
- If the log says `session notices unavailable`, Zed did not advertise the capability and the proxy is running in passthrough mode.

## Development

Both OpenCode adapters and the Zed proxy have no build step. OpenCode transpiles the raw TypeScript and JSX at runtime.

Run the OpenCode V1 checks:

```sh
cd opencode
bun run check
```

Run the OpenCode V2 checks:

```sh
cd opencode-v2
bun run check
```

The V2 check also renders the sidebar card to the terminal as a smoke test.

Run the Zed adapter checks:

```sh
cd zed
bun run check
```

The tests cover peak windows, weekends, Chinese holidays, long holidays, next transitions, daylight saving in New York and Sydney, missing holiday data, ACP forwarding, session tracking, capability gating, the 15-minute warning, transition notices, deduplication, and shutdown flags.

## Uninstall

### OpenCode V1

Remove the plugin path from `~/.config/opencode/tui.json`, then restart OpenCode.

### OpenCode V2

Remove the symlink or the configuration entry:

```sh
rm ~/.config/opencode/plugins/deepseek-peak-notifications
```

Or remove the path from `plugins` in `~/.config/opencode/opencode.json`. Reload OpenCode afterwards. Optionally delete `opencode-v2/node_modules`.

### Zed

Restore the original `OpenCode` command in `~/.config/zed/settings.json`:

```json
"command": "/usr/bin/opencode",
"args": ["acp"]
```

Use the OpenCode path from `which opencode`. You can also restore the backup created during setup:

```text
~/.config/zed/settings.json.pre-deepseek-peak-proxy
```

Restart Zed afterwards.

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
