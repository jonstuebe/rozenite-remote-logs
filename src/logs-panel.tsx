import { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRozeniteDevToolsClient } from "@rozenite/plugin-bridge";

const PLUGIN_ID = "remote-logs";

interface PluginEvents {
  "toggle-enabled": undefined;
  "status-update": { enabled: boolean };
  "request-status": undefined;
}

export default function LogsPanel() {
  const client = useRozeniteDevToolsClient<PluginEvents>({
    pluginId: PLUGIN_ID,
  });

  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!client) {
      setConnected(false);
      return;
    }

    setConnected(true);

    // Listen for status updates from React Native
    const subscription = client.onMessage("status-update", (data) => {
      setEnabled(data.enabled);
    });

    // Request current status
    client.send("request-status", undefined);

    return () => {
      subscription.remove();
    };
  }, [client]);

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
          Write console output to a file in your project.
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
    marginBottom: 24,
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
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 180,
    alignItems: "center",
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
