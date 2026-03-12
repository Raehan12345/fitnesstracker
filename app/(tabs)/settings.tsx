import { router } from 'expo-router';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/useAppStore';
import { exportBackupData, importBackupData } from '../../src/db/database';

export default function SettingsScreen() {
  const profile = useAppStore((state) => state.profile);
  const resetAppData = useAppStore((state) => state.resetAppData);

  async function confirmReset() {
    try {
      await resetAppData();
      router.replace('/setup');
    } catch (error) {
      console.error('Reset failed:', error);
      Alert.alert('Error', 'Could not reset database');
    }
  }

  function handleReset() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'This will delete all app data. Continue?'
      );

      if (confirmed) {
        void confirmReset();
      }

      return;
    }

    Alert.alert('Reset Database', 'This will delete all app data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void confirmReset();
        },
      },
    ]);
  }

  async function handleExport() {
    if (Platform.OS !== 'web') {
      Alert.alert('Unavailable', 'Backup export is currently enabled on web only.');
      return;
    }

    try {
      const backup = await exportBackupData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `macro-tracker-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Could not export backup.');
    }
  }

  async function handleImport() {
    if (Platform.OS !== 'web') {
      Alert.alert('Unavailable', 'Backup import is currently enabled on web only.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        await importBackupData(parsed);
        await useAppStore.getState().initializeAppData();

        Alert.alert('Success', 'Backup imported successfully.');
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Import failed:', error);
        Alert.alert('Error', 'Could not import backup file.');
      }
    };

    input.click();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <Text style={styles.item}>Name: {profile?.name ?? '--'}</Text>
          <Text style={styles.item}>Age: {profile?.age ?? '--'}</Text>
          <Text style={styles.item}>Sex: {profile?.sex ?? '--'}</Text>
          <Text style={styles.item}>Height: {profile?.height_cm ?? '--'} cm</Text>
          <Text style={styles.item}>
            Starting Weight: {profile?.starting_weight_kg ?? '--'} kg
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.primaryButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nutrition Targets</Text>

          <Text style={styles.item}>
            Calories: {profile?.calorie_target ?? '--'} kcal
          </Text>

          <Text style={styles.item}>
            Protein: {profile?.protein_target ?? '--'} g
          </Text>

          <Text style={styles.item}>
            Carbs: {profile?.carbs_target ?? '--'} g
          </Text>

          <Text style={styles.item}>
            Fats: {profile?.fat_target ?? '--'} g
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Backup</Text>

          <Pressable style={styles.primaryButton} onPress={() => void handleExport()}>
            <Text style={styles.primaryButtonText}>Export Backup</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, styles.importButton]}
            onPress={() => void handleImport()}
          >
            <Text style={styles.primaryButtonText}>Import Backup</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Developer</Text>

          <Pressable style={styles.dangerButton} onPress={handleReset}>
            <Text style={styles.dangerButtonText}>Reset Database</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#111827',
  },

  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },

  item: {
    fontSize: 15,
    marginBottom: 6,
    color: '#111827',
  },

  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },

  importButton: {
    marginTop: 10,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  dangerButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  dangerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});