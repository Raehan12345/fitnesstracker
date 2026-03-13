import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { exportBackupData, importBackupData } from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

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

          <Text style={styles.item}>Name: {profile?.name ?? 'N/A'}</Text>
          <Text style={styles.item}>Age: {profile?.age ?? 'N/A'}</Text>
          <Text style={styles.item}>Sex: {profile?.sex ?? 'N/A'}</Text>
          <Text style={styles.item}>Height: {profile?.height_cm ?? 'N/A'} cm</Text>
          <Text style={styles.item}>
            Starting Weight: {profile?.starting_weight_kg ?? 'N/A'} kg
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
            Calories: {profile?.calorie_target ?? 'N/A'} kcal
          </Text>

          <Text style={styles.item}>
            Protein: {profile?.protein_target ?? 'N/A'} g
          </Text>

          <Text style={styles.item}>
            Carbs: {profile?.carbs_target ?? 'N/A'} g
          </Text>

          <Text style={styles.item}>
            Fats: {profile?.fat_target ?? 'N/A'} g
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
            <Text style={styles.importButtonText}>Import Backup</Text>
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

const getStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 24,
    color: theme.text,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
    color: theme.text,
  },
  item: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.text,
  },
  primaryButton: {
    backgroundColor: theme.text,
    paddingVertical: 16,
    borderRadius: 100,
    marginTop: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.background,
    fontWeight: '700',
    fontSize: 16,
  },
  importButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.border,
    marginTop: 12,
  },
  importButtonText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.danger,
    paddingVertical: 16,
    borderRadius: 100,
    marginTop: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: theme.danger,
    fontWeight: '700',
    fontSize: 16,
  },
});