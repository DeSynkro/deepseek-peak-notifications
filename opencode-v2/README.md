# opencode-deepseek-peak-notifications (OpenCode V2)

OpenCode V2 TUI sidebar alert for DeepSeek peak and off-peak pricing.

This package is the OpenCode V2 adapter for DeepSeek Peak Notifications. It shows a sidebar card, a countdown to the next pricing change, and a toast when peak starts or ends.

Use this directory with OpenCode V2 only. OpenCode V1 uses [`../opencode`](../opencode/), because the V1 and V2 plugin APIs are not compatible.

## Requirements

- OpenCode 2.x
- Bun, for installing dependencies and running the checks

## Install

From this directory:

```sh
bun install
```

If you previously used the V1 adapter, remove its entry from `~/.config/opencode/tui.json` first. V2 migrates terminal settings to `~/.config/opencode/cli.json`, and the V1 plugin cannot run in V2. If the old entry was migrated, remove it from `cli.json` too.

Then load the plugin in one of two ways.

### Global plugin directory

Link the package into the global plugin directory:

```sh
mkdir -p ~/.config/opencode/plugins
ln -s "$(pwd)" ~/.config/opencode/plugins/deepseek-peak-notifications
```

### Global configuration

Add the absolute package directory to `~/.config/opencode/opencode.json`, preserving any existing `plugins` entries:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "/absolute/path/to/deepseek-peak-notifications/opencode-v2"
  ]
}
```

OpenCode watches plugin configuration and directories and reloads them after a save. Use `/reload` if a reload does not happen on its own.

This package has both a server entrypoint and a TUI entrypoint, so use `opencode.json` or plugin discovery. `cli.json` is for TUI-only packages.

`node_modules` is only needed for `bun run check`. OpenCode supplies the plugin runtime APIs itself.

## Verify

```sh
bun run check
```

This runs the TypeScript check, the unit tests, and a smoke render of the sidebar card.

## Full documentation

See the project README for pricing rules, holiday updates, Zed setup, troubleshooting, and uninstall steps:

<https://github.com/DeSynkro/deepseek-peak-notifications>

## License

MIT. See [LICENSE](LICENSE).
