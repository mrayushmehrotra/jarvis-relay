import { SafeAreaView, StyleSheet, View } from 'react-native';
import HomeScreen from '@/screens/HomeScreen';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <HomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
});