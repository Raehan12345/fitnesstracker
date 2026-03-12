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
} from 'react-native';
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
};

function ProgressHeader({
  profileName,
  latestWeight,
  metricsCount,
  strengthPbs,
  runPbs,
  onAddWeight,
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
              {pb.weightKg} kg × {pb.reps}
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
  const profile = useAppStore((state) => state.profile);
  const latestWeight = useAppStore((state) => state.latestWeight);
  const bodyMetrics = useAppStore((state) => state.bodyMetrics);
  const strengthPbs = useAppStore((state) => state.strengthPbs);
  const runPbs = useAppStore((state) => state.runPbs);
  const addBodyMetricAndRefresh = useAppStore((state) => state.addBodyMetricAndRefresh);
  const deleteBodyMetricAndRefresh = useAppStore((state) => state.deleteBodyMetricAndRefresh);

  const [modalVisible, setModalVisible] = useState(false);
  const [bodyWeight, setBodyWeight] = useState('');
  const [entryDate, setEntryDate] = useState(today);

  function resetForm() {
    setBodyWeight('');
    setEntryDate(today);
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
              console.error('Failed to delete weight entry:', error);
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

        <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
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
              onAddWeight={() => setModalVisible(true)}
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
                  <Text style={styles.modalTitle}>Add Weight Entry</Text>

                  <TextInput
                    placeholder="Body weight (kg)"
                    placeholderTextColor="#6b7280"
                    value={bodyWeight}
                    onChangeText={setBodyWeight}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Date (YYYY-MM-DD)"
                    placeholderTextColor="#6b7280"
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
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={() => {
                        handleSave().catch((error) => {
                          console.error('Failed to save weight entry:', error);
                          Alert.alert('Error', 'Could not save weight entry.');
                        });
                      }}
                    >
                      <Text style={styles.actionButtonText}>Save</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  summaryText: {
    fontSize: 15,
    marginBottom: 4,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 6,
  },
  emptyText: {
    color: '#4b5563',
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  entryDate: {
    fontSize: 14,
    color: '#4b5563',
  },
  pbCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pbTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  pbValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  pbDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  deleteButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9ca3af',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});