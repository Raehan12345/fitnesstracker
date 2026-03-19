import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/theme';
import { RunPbSummary, StrengthPb } from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

function formatRunTime(totalMinutes: number) {
  const totalSeconds = Math.round(totalMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPace(pacePerKm: number) {
  return `${formatRunTime(pacePerKm)} / km`;
}

type HeaderProps = {
  profileName: string;
  latestWeight: number | null;
  metricsCount: number;
  strengthPbs: StrengthPb[];
  runPbs: RunPbSummary;
  onAddWeight: () => void;
  styles: any;
};

function ProgressHeader({
  profileName,
  latestWeight,
  metricsCount,
  strengthPbs,
  runPbs,
  onAddWeight,
  styles,
}: HeaderProps) {
  return (
    <View>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>
        {profileName ? `${profileName}'s progress` : 'Progress'}
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Current Summary</Text>
        <Text style={styles.summaryText}>
          Latest body weight: {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : '--'}
        </Text>
        <Text style={styles.summaryText}>Weight entries: {metricsCount}</Text>
        <Text style={styles.summaryText}>Strength PBs tracked: {strengthPbs.length}</Text>
      </View>

      <Pressable style={styles.addButton} onPress={onAddWeight}>
        <Text style={styles.addButtonText}>+ Add Weight Entry</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Strength Personal Bests</Text>

      {strengthPbs.length === 0 ? (
        <Text style={styles.emptyText}>No strength records yet.</Text>
      ) : (
        strengthPbs.map((pb) => (
          <View style={styles.pbCard} key={pb.exerciseName}>
            <Text style={styles.pbTitle}>{pb.exerciseName}</Text>
            <Text style={styles.pbValue}>
              {pb.weightKg} kg x {pb.reps}
            </Text>
            <Text style={styles.pbDate}>{pb.sessionDate}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Running Personal Bests</Text>

      {runPbs.longestRun || runPbs.fastestPace || runPbs.fastest5k ? (
        <>
          {runPbs.longestRun ? (
            <View style={styles.pbCard}>
              <Text style={styles.pbTitle}>Longest Run</Text>
              <Text style={styles.pbValue}>{runPbs.longestRun.distanceKm.toFixed(2)} km</Text>
              <Text style={styles.pbDate}>{runPbs.longestRun.sessionDate}</Text>
            </View>
          ) : null}

          {runPbs.fastestPace ? (
            <View style={styles.pbCard}>
              <Text style={styles.pbTitle}>Fastest Pace</Text>
              <Text style={styles.pbValue}>
                {formatPace(runPbs.fastestPace.pacePerKm)}
              </Text>
              <Text style={styles.pbDate}>{runPbs.fastestPace.sessionDate}</Text>
            </View>
          ) : null}

          {runPbs.fastest5k ? (
            <View style={styles.pbCard}>
              <Text style={styles.pbTitle}>Fastest 5K</Text>
              <Text style={styles.pbValue}>
                {formatRunTime(runPbs.fastest5k.durationMinutes)}
              </Text>
              <Text style={styles.pbDate}>{runPbs.fastest5k.sessionDate}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.emptyText}>No running records yet.</Text>
      )}

      <Text style={styles.sectionTitle}>Body Weight History</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

  const profile = useAppStore((state) => state.profile);
  const latestWeight = useAppStore((state) => state.latestWeight);
  const bodyMetrics = useAppStore((state) => state.bodyMetrics);
  const strengthPbs = useAppStore((state) => state.strengthPbs);
  const runPbs = useAppStore((state) => state.runPbs);
  const addBodyMetricAndRefresh = useAppStore((state) => state.addBodyMetricAndRefresh);
  const deleteBodyMetricAndRefresh = useAppStore((state) => state.deleteBodyMetricAndRefresh);

  const [modalVisible, setModalVisible] = useState(false);
  
  // form states
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const [entryDate, setEntryDate] = useState(today);

  function resetForm() {
    setEditingWeightId(null);
    setBodyWeight('');
    setEntryDate(today);
  }

  function handleEdit(item: (typeof bodyMetrics)[number]) {
    setEditingWeightId(item.id);
    setBodyWeight(String(item.body_weight));
    setEntryDate(item.entry_date);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!profile) return;

    const parsedWeight = Number(bodyWeight);

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid body weight', 'Please enter a valid body weight in kg.');
      return;
    }

    if (!entryDate.trim()) {
      Alert.alert('Missing date', 'Please enter a date.');
      return;
    }

    // delete old entry if we are editing
    if (editingWeightId) {
      await deleteBodyMetricAndRefresh(editingWeightId);
    }

    await addBodyMetricAndRefresh({
      profileId: profile.id,
      entryDate: entryDate.trim(),
      bodyWeight: parsedWeight,
    });

    Keyboard.dismiss();
    resetForm();
    setModalVisible(false);
  }

  function handleDelete(metricId: number) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this weight entry?');
      if (confirmed) {
        deleteBodyMetricAndRefresh(metricId).catch((error) => {
          console.error('failed to delete weight entry:', error);
          window.alert('Could not delete weight entry.');
        });
      }
      return;
    }

    Alert.alert(
      'Delete weight entry',
      'Are you sure you want to delete this weight entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBodyMetricAndRefresh(metricId).catch((error) => {
              console.error('failed to delete weight entry:', error);
              Alert.alert('Error', 'Could not delete weight entry.');
            });
          },
        },
      ]
    );
  }
  
  const metricsCount = useMemo(() => bodyMetrics.length, [bodyMetrics]);

  function renderWeightItem({ item }: { item: (typeof bodyMetrics)[number] }) {
    return (
      <View style={styles.entryCard}>
        <Text style={styles.entryTitle}>{item.body_weight.toFixed(1)} kg</Text>
        <Text style={styles.entryDate}>{item.entry_date}</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <FlatList
          data={bodyMetrics}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderWeightItem}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ProgressHeader
              profileName={profile?.name ?? ''}
              latestWeight={latestWeight}
              metricsCount={metricsCount}
              strengthPbs={strengthPbs}
              runPbs={runPbs}
              onAddWeight={() => {
                resetForm();
                setModalVisible(true);
              }}
              styles={styles}
            />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No body weight entries yet.</Text>}
        />

        <Modal visible={modalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.modalCard}
                >
                  <Text style={styles.modalTitle}>
                    {editingWeightId ? 'Edit Weight Entry' : 'Add Weight Entry'}
                  </Text>

                  <TextInput
                    placeholder="Body weight (kg)"
                    placeholderTextColor={theme.textMuted}
                    value={bodyWeight}
                    onChangeText={setBodyWeight}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Date (YYYY-MM-DD)"
                    placeholderTextColor={theme.textMuted}
                    value={entryDate}
                    onChangeText={setEntryDate}
                    style={styles.input}
                  />

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => {
                        Keyboard.dismiss();
                        resetForm();
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={() => {
                        handleSave().catch((error) => {
                          console.error('failed to save weight entry:', error);
                          Alert.alert('Error', 'Could not save weight entry.');
                        });
                      }}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </Pressable>
                  </View>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const getStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
    color: theme.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: 24,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    color: theme.textMuted,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.text,
  },
  addButton: {
    backgroundColor: theme.text,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  addButtonText: {
    color: theme.background,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.text,
    marginBottom: 16,
    marginTop: 8,
  },
  emptyText: {
    color: theme.textMuted,
    marginBottom: 24,
    fontSize: 15,
    fontWeight: '500',
  },
  entryCard: {
    backgroundColor: theme.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.text,
    marginBottom: 6,
  },
  entryDate: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '500',
  },
  pbCard: {
    backgroundColor: theme.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pbTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 6,
  },
  pbValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 6,
  },
  pbDate: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editButton: {
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  editButtonText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  deleteButtonText: {
    color: theme.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.background,
    padding: 24,
    paddingTop: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 24,
    color: theme.text,
  },
  input: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.border,
  },
  cancelButtonText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: theme.text,
  },
  saveButtonText: {
    color: theme.background,
    fontWeight: '700',
    fontSize: 16,
  },
});