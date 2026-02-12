# rozenite-remote-logs

A [Rozenite](https://rozenite.dev) DevTools plugin for React Native that streams console output to a file.

## Features

- Intercepts all console methods (`log`, `warn`, `error`, `info`, `debug`)
- Writes logs to a file on the device filesystem
- Toggle logging on/off from the Rozenite DevTools panel
- Queue-based file writing to prevent race conditions
- Auto-enable option for immediate logging on mount

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
npm install react react-native expo-file-system
```

## Usage

Add the `useRemoteLogs` hook to your app's root component:

```tsx
import { useRemoteLogs } from "rozenite-remote-logs";
import * as FileSystem from "expo-file-system";

function App() {
  useRemoteLogs({
    filePath: `${FileSystem.documentDirectory}app-logs.txt`,
  });

  return (
    // Your app content
  );
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filePath` | `string` | **required** | Path where logs will be written |
| `autoEnable` | `boolean` | `false` | Automatically start logging on mount |

### Auto-Enable Example

```tsx
useRemoteLogs({
  filePath: `${FileSystem.documentDirectory}debug.log`,
  autoEnable: true, // Start logging immediately
});
```

## DevTools Panel

Once installed, the **Remote Logs** panel appears in Rozenite DevTools. From there you can:

- See the current logging status (enabled/disabled)
- Toggle logging on or off with a single click

## How It Works

1. The hook patches the global `console` methods to intercept output
2. When enabled, each console call is serialized and appended to the specified file
3. The DevTools panel communicates with your app via the Rozenite plugin bridge
4. Original console behavior is preserved—logs still appear in your terminal/debugger

## Retrieving Logs

Logs are written to the file path you specify. Common ways to retrieve them:

**Using Expo CLI:**
```bash
# List files in the document directory
npx expo run:ios --device

# Or use adb for Android
adb pull /data/data/com.yourapp/files/app-logs.txt ./logs.txt
```

**Programmatically:**
```tsx
import * as FileSystem from "expo-file-system";

const logs = await FileSystem.readAsStringAsync(
  `${FileSystem.documentDirectory}app-logs.txt`
);
console.log(logs);
```

## License

MIT
