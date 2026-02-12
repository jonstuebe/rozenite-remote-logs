/**
 * React Native DevTools Plugin Entry Point
 *
 * This plugin intercepts console output and streams it to the host machine
 * via the Rozenite DevTools panel, which writes logs to the filesystem.
 */

import { useEffect, useRef } from "react";
import { useRozeniteDevToolsClient } from "@rozenite/plugin-bridge";

const PLUGIN_ID = "remote-logs";
const DEFAULT_FILE_PATH = "./logs/app.log";

interface PluginEvents {
  "toggle-enabled": undefined;
  "status-update": { enabled: boolean; filePath: string };
  "request-status": undefined;
  "log-entry": { message: string; level: string; timestamp: string };
  "set-config": { filePath: string };
}

type ConsoleMethod = "log" | "warn" | "error" | "info" | "debug";

interface UseRemoteLogsOptions {
  filePath?: string;
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

// Global state
let isEnabled = false;
let currentFilePath: string = DEFAULT_FILE_PATH;
let currentClient: ReturnType<typeof useRozeniteDevToolsClient<PluginEvents>> | null = null;

function sendLogEntry(level: string, message: string) {
  if (!isEnabled || !currentClient) return;

  currentClient.send("log-entry", {
    message,
    level,
    timestamp: new Date().toISOString(),
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

      // Send to DevTools panel if enabled
      if (isEnabled && currentClient) {
        const message = serializeArgs(args);
        sendLogEntry(method, message);
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
  filePath = DEFAULT_FILE_PATH,
  autoEnable = false,
}: UseRemoteLogsOptions = {}) {
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

    // Store client reference for log sending
    currentClient = client;

    // Send config to panel
    client.send("set-config", { filePath: currentFilePath });

    // Send current status when panel requests it
    const statusSubscription = client.onMessage("request-status", () => {
      client.send("status-update", { enabled: isEnabled, filePath: currentFilePath });
    });

    // Handle toggle from panel
    const toggleSubscription = client.onMessage("toggle-enabled", () => {
      isEnabled = !isEnabled;
      client.send("status-update", { enabled: isEnabled, filePath: currentFilePath });
    });

    // Send initial status
    client.send("status-update", { enabled: isEnabled, filePath: currentFilePath });

    return () => {
      statusSubscription.remove();
      toggleSubscription.remove();
      currentClient = null;
    };
  }, [client, filePath]);
}
