import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CommandCardProps {
  label: string;
  icon: string;
  onPress: () => void;
}

export default function CommandCard({ label, icon, onPress }: CommandCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 72,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    color: '#c0c0c0',
    fontSize: 11,
    textAlign: 'center',
  },
});