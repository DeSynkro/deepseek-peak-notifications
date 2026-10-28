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
- sends current pricing status when a thread starts or resumes
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

Change the `OpenCode` agent in `~/.config/zed/settings.json` so it launches the proxy:

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

Keep your existing model options. Start or resume an `OpenCode` thread.

For side-by-side testing, you can add a separate agent such as `OpenCode Peak` that uses the same command. Leave the main `OpenCode` agent on its original command until the proxy is verified.

## Process lifecycle

The proxy is not a daemon. Zed starts it when an OpenCode thread starts and stops it when the thread closes or Zed exits. The proxy starts one `opencode acp` child, which is the same agent process Zed used before.

It does not add a systemd service, cron job, login item, or global install. While running, it keeps only session IDs and a 30 second timer in memory.

Files added:

- `zed/` source, tests, and `node_modules` for development
- `~/.config/zed/settings.json.pre-deepseek-peak-proxy` settings backup
- the normal OpenCode session data for conversations

No separate log file or state directory is created by the proxy. Its diagnostics go to Zed logs through stderr.

## Test the notice

Add `--test-notice` to the end of the proxy args:

```json
"--opencode",
"/usr/bin/opencode",
"--test-notice"
```

A new session receives a test notice immediately. Remove `--test-notice` after confirming that Zed renders it.

## Notices

When a thread starts or resumes:

- Off-peak: `Currently OFF-PEAK (50% off). Peak starts at 14:00 GMT+8.`
- Peak: `Currently PEAK (2x). Off-peak returns at 18:00 GMT+8.`
- Inside the warning window: `Currently OFF-PEAK (50% off). Peak starts in 12m at 14:00 GMT+8.`

During an active thread:

- 15 minutes before peak: `Currently OFF-PEAK (50% off). Peak starts in 15m at 14:00 GMT+8.`
- Peak start: `Peak pricing has started. Off-peak returns at 18:00 GMT+8.`
- Off-peak start: `Off-peak pricing has started. Peak returns at 14:00 GMT+8.`

The 15-minute warning is only sent before peak. Off-peak gets its start notice, not a warning.

Zed treats these as live notices, not a permanent status badge. The status notice appears when a thread starts or resumes, so it remains useful after reopening Zed.

## Passthrough mode

Add `--no-notices` to disable injection:

```json
"--opencode",
"/usr/bin/opencode",
"--no-notices"
```

The proxy then behaves like a transparent ACP forwarder.

## Rollback

Nothing in OpenCode changes. Existing sessions remain in OpenCode.

To remove the proxy from Zed, restore the original command:

```json
"command": "/usr/bin/opencode",
"args": ["acp"]
```

Then restart Zed. You can also restore the settings backup:

```text
~/.config/zed/settings.json.pre-deepseek-peak-proxy
```

Optionally delete the `zed` directory and its `node_modules`.

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
