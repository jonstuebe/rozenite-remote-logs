# rozenite-remote-logs

A [Rozenite](https://rozenite.dev) DevTools plugin for React Native that streams console output to a file on your development machine.

## Features

- Intercepts all console methods (`log`, `warn`, `error`, `info`, `debug`)
- Writes logs directly to your host machine's filesystem (not the device)
- Toggle logging on/off from the Rozenite DevTools panel
- Auto-enable option for immediate logging on mount
- Configurable file path with sensible default

## Installation

```bash
npm install rozenite-remote-logs
# or
yarn add rozenite-remote-logs
# or
bun add rozenite-remote-logs
```

### Peer Dependencies

This plugin requires the following peer dependencies:

```bash
npm install react react-native
```

## Usage

Add the `useRemoteLogs` hook to your app's root component:

```tsx
import { useRemoteLogs } from "rozenite-remote-logs";

function App() {
  useRemoteLogs();

  return (
    // Your app content
  );
}
```

By default, logs are written to `./logs/app.log` in your project directory.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filePath` | `string` | `./logs/app.log` | Path where logs will be written on host machine |
| `autoEnable` | `boolean` | `false` | Automatically start logging on mount |

### Custom File Path Example

```tsx
useRemoteLogs({
  filePath: "./logs/debug.log",
  autoEnable: true, // Start logging immediately
});
```

## DevTools Panel

Once installed, the **Remote Logs** panel appears in Rozenite DevTools. From there you can:

- See the current logging status (enabled/disabled)
- View the current log file path
- See the number of logs written in the current session
- Toggle logging on or off with a single click

## How It Works

1. The hook patches the global `console` methods to intercept output
2. When enabled, each console call is serialized and sent to the DevTools panel via the Rozenite plugin bridge
3. The DevTools panel (running on your development machine) writes the logs to the filesystem
4. Original console behavior is preserved—logs still appear in your terminal/debugger

```
React Native App                    DevTools Panel (Host Machine)
      │                                       │
      │  console.log("Hello")                 │
      │         │                             │
      │         ▼                             │
      │  [Intercept & Serialize]              │
      │         │                             │
      │         └──── Plugin Bridge ──────────▶ [Write to ./logs/app.log]
      │                                       │
      ▼                                       ▼
  Terminal output                    File on your machine
```

## Viewing Logs

Since logs are written directly to your development machine, you can view them with any standard tool:

```bash
# Watch logs in real-time
tail -f ./logs/app.log

# View all logs
cat ./logs/app.log

# Clear logs
rm ./logs/app.log
```

## License

MIT
