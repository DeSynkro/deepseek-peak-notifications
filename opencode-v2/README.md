# opencode-deepseek-peak-notifications (OpenCode V2)

OpenCode V2 TUI sidebar alert for DeepSeek peak and off-peak pricing.

This package is the OpenCode V2 adapter for DeepSeek Peak Notifications. It shows a sidebar card, a countdown to the next pricing change, and a toast when peak starts or ends.

## Requirements

- OpenCode 2
- Bun, for installing dependencies and running the checks

## Install

From this directory:

```sh
bun install
```

Then load the plugin in one of two ways.

### Global plugin directory

Link the package into the global plugin directory:

```sh
mkdir -p ~/.config/opencode/plugins
ln -s "$(pwd)" ~/.config/opencode/plugins/deepseek-peak-notifications
```

### Global configuration

Add the absolute package directory to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "/absolute/path/to/deepseek-peak-notifications/opencode-v2"
  ]
}
```

OpenCode watches plugin configuration and reloads it after a save. Use `/reload` if a reload does not happen on its own.

## Verify

```sh
bun run check
```

This runs the TypeScript check, the unit tests, and a smoke render of the sidebar card.

## Full documentation

See the project README for the pricing rules, holiday updates, and troubleshooting:

<https://github.com/DeSynkro/deepseek-peak-notifications>

## License

MIT. See [LICENSE](LICENSE).
