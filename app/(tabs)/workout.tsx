import { Picker } from '@react-native-picker/picker';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { WorkoutSession } from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

function getMetValue(workoutType: string, intensity: string) {
  const metMap: Record<string, Record<string, number>> = {
    Walking: { Light: 2.5, Moderate: 3.5, Hard: 4.5 },
    Running: { Light: 6, Moderate: 8, Hard: 10 },
    Cycling: { Light: 4, Moderate: 6, Hard: 8 },
    'Strength Training': { Light: 3.5, Moderate: 5, Hard: 6 },
    HIIT: { Light: 6, Moderate: 8, Hard: 10 },
    Sports: { Light: 4, Moderate: 6, Hard: 8 },
    Other: { Light: 3, Moderate: 5, Hard: 7 },
  };

  return metMap[workoutType]?.[intensity] ?? 0;
}

export default function WorkoutScreen() {
  const profile = useAppStore((state) => state.profile);
  const latestWeight = useAppStore((state) => state.latestWeight);
  const sessions = useAppStore((state) => state.workoutSessionsToday);
  const addWorkoutAndRefresh = useAppStore((state) => state.addWorkoutAndRefresh);
  const deleteWorkoutAndRefresh = useAppStore((state) => state.deleteWorkoutAndRefresh);

  const [modalVisible, setModalVisible] = useState(false);

  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [intensity, setIntensity] = useState('');
  const [notes, setNotes] = useState('');

  const [exerciseName, setExerciseName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [reps, setReps] = useState('');

  const [distanceKm, setDistanceKm] = useState('');

  function resetForm() {
    setWorkoutName('');
    setWorkoutType('');
    setDurationMinutes('');
    setIntensity('');
    setNotes('');
    setExerciseName('');
    setWeightKg('');
    setReps('');
    setDistanceKm('');
  }

  const estimatedCalories = useMemo(() => {
    const parsedDuration = Number(durationMinutes);

    if (
      !workoutType ||
      !intensity ||
      latestWeight === null ||
      Number.isNaN(parsedDuration) ||
      parsedDuration <= 0
    ) {
      return 0;
    }

    const met = getMetValue(workoutType, intensity);
    return met * latestWeight * (parsedDuration / 60);
  }, [workoutType, intensity, durationMinutes, latestWeight]);

  async function handleSave() {
    if (!profile) return;

    if (!workoutName.trim()) {
      Alert.alert('Missing workout name', 'Please enter a workout name.');
      return;
    }

    if (!workoutType) {
      Alert.alert('Missing workout type', 'Please select a workout type.');
      return;
    }

    if (!intensity) {
      Alert.alert('Missing intensity', 'Please select an intensity.');
      return;
    }

    const parsedDuration = Number(durationMinutes);

    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      Alert.alert('Invalid duration', 'Please enter a valid duration in minutes.');
      return;
    }

    if (workoutType === 'Strength Training') {
      const parsedWeightKg = Number(weightKg);
      const parsedReps = Number(reps);

      if (!exerciseName.trim()) {
        Alert.alert('Missing exercise', 'Please enter an exercise name.');
        return;
      }

      if (Number.isNaN(parsedWeightKg) || parsedWeightKg <= 0) {
        Alert.alert('Invalid weight', 'Please enter a valid lifted weight in kg.');
        return;
      }

      if (Number.isNaN(parsedReps) || parsedReps <= 0) {
        Alert.alert('Invalid reps', 'Please enter a valid rep count.');
        return;
      }

      await addWorkoutAndRefresh({
        kind: 'strength',
        profileId: profile.id,
        sessionDate: today,
        name: workoutName.trim(),
        notes: notes.trim(),
        workoutType,
        durationMinutes: parsedDuration,
        intensity,
        bodyWeightKg: latestWeight,
        estimatedCalories,
        exerciseName: exerciseName.trim(),
        weightKg: parsedWeightKg,
        reps: parsedReps,
      });
    } else if (workoutType === 'Running') {
      const parsedDistanceKm = Number(distanceKm);

      if (Number.isNaN(parsedDistanceKm) || parsedDistanceKm <= 0) {
        Alert.alert('Invalid distance', 'Please enter a valid running distance in km.');
        return;
      }

      await addWorkoutAndRefresh({
        kind: 'run',
        profileId: profile.id,
        sessionDate: today,
        name: workoutName.trim(),
        notes: notes.trim(),
        workoutType,
        durationMinutes: parsedDuration,
        intensity,
        bodyWeightKg: latestWeight,
        estimatedCalories,
        distanceKm: parsedDistanceKm,
      });
    } else {
      await addWorkoutAndRefresh({
        kind: 'general',
        profileId: profile.id,
        sessionDate: today,
        name: workoutName.trim(),
        notes: notes.trim(),
        workoutType,
        durationMinutes: parsedDuration,
        intensity,
        bodyWeightKg: latestWeight,
        estimatedCalories,
      });
    }

    Keyboard.dismiss();
    resetForm();
    setModalVisible(false);
  }

  function handleDelete(sessionId: number) {
    Alert.alert(
      'Delete workout session',
      'Are you sure you want to delete this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkoutAndRefresh(sessionId).catch((error) => {
              console.error('Failed to delete workout session:', error);
              Alert.alert('Error', 'Could not delete workout session.');
            });
          },
        },
      ]
    );
  }

  function renderWorkout({ item }: { item: WorkoutSession }) {
    return (
      <View style={styles.entryCard}>
        <Text style={styles.entryTitle}>{item.name}</Text>

        {item.workout_type ? (
          <Text style={styles.entryDetail}>Type: {item.workout_type}</Text>
        ) : null}

        {item.duration_minutes ? (
          <Text style={styles.entryDetail}>Duration: {item.duration_minutes} min</Text>
        ) : null}

        {item.intensity ? (
          <Text style={styles.entryDetail}>Intensity: {item.intensity}</Text>
        ) : null}

        {item.exercise_name ? (
          <Text style={styles.entryDetail}>Exercise: {item.exercise_name}</Text>
        ) : null}

        {item.weight_kg && item.reps ? (
          <Text style={styles.entryDetail}>
            Best set: {item.weight_kg} kg × {item.reps}
          </Text>
        ) : null}

        {item.distance_km ? (
          <Text style={styles.entryDetail}>Distance: {item.distance_km} km</Text>
        ) : null}

        {item.estimated_calories ? (
          <Text style={styles.entryCalories}>
            Estimated calories burned: {item.estimated_calories.toFixed(0)} kcal
          </Text>
        ) : null}

        {item.notes ? <Text style={styles.entryNotes}>{item.notes}</Text> : null}

        <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Workout</Text>
        <Text style={styles.subtitle}>
          {profile ? `${profile.name}'s workouts for ${today}` : today}
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
          <Text style={styles.summaryText}>Workout sessions: {sessions.length}</Text>
          <Text style={styles.summaryText}>
            Latest body weight: {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : '--'}
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add Workout</Text>
        </Pressable>

        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderWorkout}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={styles.emptyText}>No workouts logged for today yet.</Text>
          }
        />

        <Modal visible={modalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.modalWrapper}
                >
                  <View style={styles.modalCard}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.modalTitle}>Add Workout Session</Text>

                      <TextInput
                        placeholder="Workout name"
                        placeholderTextColor="#6b7280"
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        style={styles.input}
                      />

                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={workoutType}
                          onValueChange={(itemValue) => setWorkoutType(itemValue)}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          <Picker.Item label="Select workout type..." value="" color="#6b7280" />
                          <Picker.Item label="Walking" value="Walking" color="#4b5563" />
                          <Picker.Item label="Running" value="Running" color="#4b5563" />
                          <Picker.Item label="Cycling" value="Cycling" color="#4b5563" />
                          <Picker.Item
                            label="Strength Training"
                            value="Strength Training"
                            color="#4b5563"
                          />
                          <Picker.Item label="HIIT" value="HIIT" color="#4b5563" />
                          <Picker.Item label="Sports" value="Sports" color="#4b5563" />
                          <Picker.Item label="Other" value="Other" color="#4b5563" />
                        </Picker>
                      </View>

                      <TextInput
                        placeholder="Duration (minutes)"
                        placeholderTextColor="#6b7280"
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                        keyboardType="numeric"
                        style={styles.input}
                      />

                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={intensity}
                          onValueChange={(itemValue) => setIntensity(itemValue)}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          <Picker.Item label="Select intensity..." value="" color="#6b7280" />
                          <Picker.Item label="Light" value="Light" color="#4b5563" />
                          <Picker.Item label="Moderate" value="Moderate" color="#4b5563" />
                          <Picker.Item label="Hard" value="Hard" color="#4b5563" />
                        </Picker>
                      </View>

                      {workoutType === 'Strength Training' ? (
                        <>
                          <TextInput
                            placeholder="Exercise name"
                            placeholderTextColor="#6b7280"
                            value={exerciseName}
                            onChangeText={setExerciseName}
                            style={styles.input}
                          />

                          <TextInput
                            placeholder="Weight lifted (kg)"
                            placeholderTextColor="#6b7280"
                            value={weightKg}
                            onChangeText={setWeightKg}
                            keyboardType="numeric"
                            style={styles.input}
                          />

                          <TextInput
                            placeholder="Reps"
                            placeholderTextColor="#6b7280"
                            value={reps}
                            onChangeText={setReps}
                            keyboardType="numeric"
                            style={styles.input}
                          />
                        </>
                      ) : null}

                      {workoutType === 'Running' ? (
                        <TextInput
                          placeholder="Distance (km)"
                          placeholderTextColor="#6b7280"
                          value={distanceKm}
                          onChangeText={setDistanceKm}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      ) : null}

                      <View style={styles.calorieCard}>
                        <Text style={styles.calorieCardLabel}>Estimated calories burned</Text>
                        <Text style={styles.calorieCardValue}>
                          {estimatedCalories > 0 ? `${estimatedCalories.toFixed(0)} kcal` : '--'}
                        </Text>
                        <Text style={styles.calorieCardHint}>
                          {latestWeight !== null
                            ? `Using latest body weight: ${latestWeight.toFixed(1)} kg`
                            : 'Add a body-weight entry in Progress to enable calorie estimates'}
                        </Text>
                      </View>

                      <TextInput
                        placeholder="Notes (optional)"
                        placeholderTextColor="#6b7280"
                        value={notes}
                        onChangeText={setNotes}
                        style={[styles.input, styles.notesInput]}
                        multiline
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
                              console.error('Failed to save workout session:', error);
                              Alert.alert('Error', 'Could not save workout session.');
                            });
                          }}
                        >
                          <Text style={styles.actionButtonText}>Save</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
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
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 40,
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
  entryDetail: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  entryCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 4,
    marginBottom: 6,
  },
  entryNotes: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
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
  modalWrapper: {
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    color: '#4b5563',
    backgroundColor: '#fff',
  },
  pickerItem: {
    color: '#4b5563',
    backgroundColor: '#fff',
  },
  calorieCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  calorieCardLabel: {
    fontSize: 13,
    color: '#1d4ed8',
    marginBottom: 4,
  },
  calorieCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  calorieCardHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#4b5563',
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
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