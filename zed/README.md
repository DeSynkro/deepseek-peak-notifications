# DeepSeek Peak Notifications for Zed

A local ACP proxy that forwards Zed traffic to `opencode acp` and injects DeepSeek pricing notices into the Agent Panel.

This is not a Zed extension. Zed cannot add custom sidebar or status-bar UI, so the proxy uses ACP session notices instead.

## Requirements

- Zed 1.25.2 or newer, for ACP session notices.
- OpenCode 1.19.
- Bun, used to run the proxy.

The proxy is local only. It is not published to npm.

## How it works

```text
Zed Agent Panel
      |
      | ACP
      v
DeepSeek Peak proxy
      |
      | ACP
      v
opencode acp
```

The proxy:

- forwards ACP messages in both directions
- tracks active session IDs
- checks Zed's `session.notices` capability
- sends a warning 15 minutes before peak
- sends a notice when peak starts
- sends a notice when off-peak starts
- logs only to stderr

If Zed does not support notices, the proxy still works as a passthrough.

## Install

```sh
cd zed
bun install
```

Add a second agent to `~/.config/zed/settings.json`. Leave your existing `OpenCode` agent untouched:

```json
"agent_servers": {
  "OpenCode": {
    "type": "custom",
    "command": "/usr/bin/opencode",
    "args": ["acp"]
  },
  "OpenCode Peak": {
    "type": "custom",
    "command": "/usr/bin/bun",
    "args": [
      "run",
      "/home/desynkro/Projects/Code/deepseek-peak-notifications/zed/proxy.ts",
      "--opencode",
      "/usr/bin/opencode"
    ]
  }
}
```

Start a new thread with `OpenCode Peak`.

## Test the notice

Add `--test-notice` to the end of the proxy args:

```json
"--opencode",
"/usr/bin/opencode",
"--test-notice"
```

A new session receives a test notice immediately. Remove `--test-notice` after confirming that Zed renders it.

## Notices

- 15 minutes before peak: `Peak starts in 15m.`
- Peak start: `Peak pricing has started.`
- Off-peak start: `Off-peak pricing has started.`

The 15-minute warning is only sent before peak. Off-peak gets its start notice, not a warning.

## Passthrough mode

Add `--no-notices` to disable injection:

```json
"--opencode",
"/usr/bin/opencode",
"--no-notices"
```

The proxy then behaves like a transparent ACP forwarder.

## Rollback

Use the original `OpenCode` agent at any time. Nothing in OpenCode changes.

To remove the proxy completely:

1. Remove the `OpenCode Peak` block from `~/.config/zed/settings.json`.
2. Restart Zed.
3. Optionally delete the `zed` directory and its `node_modules`.

A backup of the Zed settings from setup can be stored as:

```text
~/.config/zed/settings.json.pre-deepseek-peak-proxy
```

## Troubleshooting

### The agent does not start

- Confirm `/usr/bin/bun` exists.
- Run `cd zed && bun install`.
- Check the proxy path in the Zed settings.
- Check Zed's logs for `[deepseek-peak]` messages.

### The agent works but notices do not appear

- Confirm Zed is 1.25.2 or newer.
- Check for `[deepseek-peak] session notices enabled` in Zed's logs.
- If the log says `session notices unavailable`, Zed did not advertise the capability and only passthrough is active.

### Everything fails

Switch back to the original `OpenCode` agent, or restore `~/.config/zed/settings.json.pre-deepseek-peak-proxy`.

## Development

```sh
cd zed
bun run check
```

The tests cover argument parsing, ACP forwarding, session tracking, capability gating, transition notices, the 15-minute warning, and notice deduplication.
