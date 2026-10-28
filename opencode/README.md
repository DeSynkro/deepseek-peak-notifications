# opencode-deepseek-peak-notifications (OpenCode V1)

OpenCode 1.19 TUI sidebar alert for DeepSeek peak and off-peak pricing.

This package is the OpenCode V1 adapter for DeepSeek Peak Notifications. It shows a sidebar card, a countdown to the next pricing change, and a toast when peak starts or ends.

Use this directory with OpenCode V1 only. OpenCode V2 uses [`../opencode-v2`](../opencode-v2/), because the V1 and V2 plugin APIs are not compatible.

## Install

From this directory:

```sh
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

Restart OpenCode after changing `tui.json`.

## Full documentation

See the project README for pricing rules, holiday updates, Zed setup, troubleshooting, and uninstall steps:

<https://github.com/DeSynkro/deepseek-peak-notifications>

## License

MIT. See [LICENSE](LICENSE).
