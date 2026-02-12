/**
 * React Native DevTools Plugin Entry Point
 *
 * This plugin intercepts console output and writes it to a file when enabled.
 */

import { useEffect, useRef } from "react";
import { useRozeniteDevToolsClient } from "@rozenite/plugin-bridge";
import * as FileSystem from "expo-file-system";

const PLUGIN_ID = "remote-logs";

interface PluginEvents {
  "toggle-enabled": undefined;
  "status-update": { enabled: boolean };
  "request-status": undefined;
}

type ConsoleMethod = "log" | "warn" | "error" | "info" | "debug";

interface UseRemoteLogsOptions {
  filePath: string;
  autoEnable?: boolean;
}

// Store original console methods
const originalConsole: Record<ConsoleMethod, (...args: unknown[]) => void> = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Global state for enabled status
let isEnabled = false;
let currentFilePath: string | null = null;

// Queue for file writes to avoid race conditions
let writeQueue: Promise<void> = Promise.resolve();

async function appendToFile(message: string) {
  if (!currentFilePath || !isEnabled) return;

  writeQueue = writeQueue.then(async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(currentFilePath!);
      const content = message + "\n";

      if (fileInfo.exists) {
        // Read existing content and append
        const existingContent = await FileSystem.readAsStringAsync(
          currentFilePath!
        );
        await FileSystem.writeAsStringAsync(
          currentFilePath!,
          existingContent + content
        );
      } else {
        // Create new file
        await FileSystem.writeAsStringAsync(currentFilePath!, content);
      }
    } catch (err) {
      // Use original console to avoid infinite loop
      originalConsole.error("[remote-logs] Failed to write to file:", err);
    }
  });
}

function serializeArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg === undefined) return "undefined";
      if (arg === null) return "null";
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");
}

function patchConsole() {
  const methods: ConsoleMethod[] = ["log", "warn", "error", "info", "debug"];

  methods.forEach((method) => {
    console[method] = (...args: unknown[]) => {
      // Always call original
      originalConsole[method].apply(console, args);

      // Write to file if enabled
      if (isEnabled && currentFilePath) {
        const message = serializeArgs(args);
        appendToFile(message);
      }
    };
  });
}

function restoreConsole() {
  const methods: ConsoleMethod[] = ["log", "warn", "error", "info", "debug"];
  methods.forEach((method) => {
    console[method] = originalConsole[method];
  });
}

export function useRemoteLogs({
  filePath,
  autoEnable = false,
}: UseRemoteLogsOptions) {
  const client = useRozeniteDevToolsClient<PluginEvents>({
    pluginId: PLUGIN_ID,
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    // Set file path
    currentFilePath = filePath;

    // Initialize enabled state from autoEnable (only on first mount)
    if (!initializedRef.current) {
      isEnabled = autoEnable;
      initializedRef.current = true;
    }

    // Patch console methods
    patchConsole();

    return () => {
      restoreConsole();
    };
  }, [filePath, autoEnable]);

  useEffect(() => {
    if (!client) return;

    // Send current status when panel requests it
    const statusSubscription = client.onMessage("request-status", () => {
      client.send("status-update", { enabled: isEnabled });
    });

    // Handle toggle from panel
    const toggleSubscription = client.onMessage("toggle-enabled", () => {
      isEnabled = !isEnabled;
      client.send("status-update", { enabled: isEnabled });
    });

    // Send initial status
    client.send("status-update", { enabled: isEnabled });

    return () => {
      statusSubscription.remove();
      toggleSubscription.remove();
    };
  }, [client]);
}
