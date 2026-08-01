import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface StatusBarProps {
  connected: boolean;
  onReconnect?: () => void;
}

export default function StatusBar({ connected, onReconnect }: StatusBarProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, connected ? styles.dotConnected : styles.dotDisconnected]} />
      <Text style={styles.text}>{connected ? 'Jarvis Online' : 'Jarvis Offline'}</Text>
      {!connected && onReconnect && (
        <TouchableOpacity onPress={onReconnect}>
          <Text style={styles.reconnect}>Reconnect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotConnected: {
    backgroundColor: '#00ff88',
  },
  dotDisconnected: {
    backgroundColor: '#ff4444',
  },
  text: {
    color: '#c0c0c0',
    fontSize: 13,
    fontWeight: '600',
  },
  reconnect: {
    color: '#00d4ff',
    fontSize: 12,
    marginLeft: 'auto',
  },
});