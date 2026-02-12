import { useEffect, useState, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRozeniteDevToolsClient } from "@rozenite/plugin-bridge";
import * as fs from "fs";
import * as path from "path";

const PLUGIN_ID = "remote-logs";

interface PluginEvents {
  "toggle-enabled": undefined;
  "status-update": { enabled: boolean; filePath: string };
  "request-status": undefined;
  "log-entry": { message: string; level: string; timestamp: string };
  "set-config": { filePath: string };
}

function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function appendToLogFile(filePath: string, entry: { message: string; level: string; timestamp: string }) {
  try {
    ensureDirectoryExists(filePath);
    const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\n`;
    fs.appendFileSync(filePath, logLine);
  } catch (err) {
    console.error("[remote-logs] Failed to write to file:", err);
  }
}

export default function LogsPanel() {
  const client = useRozeniteDevToolsClient<PluginEvents>({
    pluginId: PLUGIN_ID,
  });

  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [filePath, setFilePath] = useState<string>("./logs/app.log");
  const [logCount, setLogCount] = useState(0);

  const handleLogEntry = useCallback((data: { message: string; level: string; timestamp: string }) => {
    appendToLogFile(filePath, data);
    setLogCount((prev) => prev + 1);
  }, [filePath]);

  useEffect(() => {
    if (!client) {
      setConnected(false);
      return;
    }

    setConnected(true);

    // Listen for status updates from React Native
    const statusSubscription = client.onMessage("status-update", (data) => {
      setEnabled(data.enabled);
      if (data.filePath) {
        setFilePath(data.filePath);
      }
    });

    // Listen for config updates
    const configSubscription = client.onMessage("set-config", (data) => {
      setFilePath(data.filePath);
    });

    // Listen for log entries
    const logSubscription = client.onMessage("log-entry", handleLogEntry);

    // Request current status
    client.send("request-status", undefined);

    return () => {
      statusSubscription.remove();
      configSubscription.remove();
      logSubscription.remove();
    };
  }, [client, handleLogEntry]);

  const handleToggle = () => {
    if (client) {
      client.send("toggle-enabled", undefined);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Remote Logs</Text>
        <Text style={styles.description}>
          Stream console output to a file on your machine.
        </Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View
            style={[
              styles.statusIndicator,
              enabled ? styles.statusEnabled : styles.statusDisabled,
            ]}
          />
          <Text style={styles.statusText}>
            {enabled ? "Enabled" : "Disabled"}
          </Text>
        </View>

        <View style={styles.filePathContainer}>
          <Text style={styles.filePathLabel}>Log file:</Text>
          <Text style={styles.filePath}>{filePath}</Text>
        </View>

        {enabled && (
          <Text style={styles.logCount}>
            {logCount} log{logCount !== 1 ? "s" : ""} written
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            enabled ? styles.buttonDisable : styles.buttonEnable,
            pressed && styles.buttonPressed,
            !connected && styles.buttonDisabledState,
          ]}
          onPress={handleToggle}
          disabled={!connected}
        >
          <Text style={styles.buttonText}>
            {enabled ? "Disable Logging" : "Enable Logging"}
          </Text>
        </Pressable>

        {!connected && (
          <Text style={styles.connectionStatus}>
            Waiting for React Native connection...
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    color: "#333",
    marginRight: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusEnabled: {
    backgroundColor: "#22c55e",
  },
  statusDisabled: {
    backgroundColor: "#ef4444",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  filePathContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filePathLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  filePath: {
    fontSize: 14,
    color: "#333",
    fontFamily: "monospace",
  },
  logCount: {
    fontSize: 12,
    color: "#22c55e",
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 180,
    alignItems: "center",
    marginTop: 16,
  },
  buttonEnable: {
    backgroundColor: "#22c55e",
  },
  buttonDisable: {
    backgroundColor: "#ef4444",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabledState: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  connectionStatus: {
    marginTop: 16,
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});
