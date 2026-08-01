import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useJarvisSocket } from '@/hooks/useJarvisSocket';
import StatusBar from '@/components/StatusBar';
import ChatBubble from '@/components/ChatBubble';
import CommandCard from '@/components/CommandCard';

const COMMANDS = [
  { id: 'status', label: 'Status', icon: '📊', command: 'status' },
  { id: 'uptime', label: 'Uptime', icon: '⏱️', command: 'uptime' },
  { id: 'apps', label: 'Apps', icon: '📱', command: 'apps' },
  { id: 'files', label: 'Files', icon: '📁', command: 'files' },
  { id: 'news', label: 'News', icon: '📰', command: 'news' },
  { id: 'weather', label: 'Weather', icon: '🌤️', command: 'weather' },
];

const RECONNECT_URL = 'ws://localhost:8080';
const SECRET_KEY = 'your-secret-key-here';

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [customMessages, setCustomMessages] = useState<{ type: string; payload: any; timestamp: number }[]>([]);

  const { connected, sendMessage, messages, reconnect } = useJarvisSocket({
    url: RECONNECT_URL,
    secret: SECRET_KEY,
    onMessage: (msg: { type: string; payload: any; timestamp: number }) => {
      setCustomMessages((prev) => [...prev.slice(-99), msg]);
    },
  });

  const allMessages = [...messages, ...customMessages];

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage('command', { text });
    setInput('');
  };

  const handleCommand = (command: string) => {
    sendMessage('command', { text: command });
  };

  const renderMessage = ({ item }: { item: { type: string; payload: any; timestamp: number } }) => (
    <ChatBubble message={item} />
  );

  return (
    <View style={styles.container}>
      <StatusBar connected={connected} onReconnect={reconnect} />

      <FlatList
        data={allMessages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {connected ? 'Ready — send a command or pick one below' : 'Connecting...'}
          </Text>
        }
      />

      <View style={styles.commandsRow}>
        {COMMANDS.map((cmd) => (
          <CommandCard key={cmd.id} label={cmd.label} icon={cmd.icon} onPress={() => handleCommand(cmd.command)} />
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a command..."
          placeholderTextColor="#666"
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} onPress={handleSend} disabled={!input.trim()}>
          <Text style={styles.sendButtonText}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
    fontFamily: 'System',
  },
  commandsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e0e0e0',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    color: '#0a0a0f',
    fontSize: 16,
    fontWeight: 'bold',
  },
});