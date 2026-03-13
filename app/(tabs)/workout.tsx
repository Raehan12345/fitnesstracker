import { Picker } from '@react-native-picker/picker';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/theme';
import { WorkoutSession } from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

// helper function to format seconds into hh:mm:ss or mm:ss
function formatTimerDisplay(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getMetValue(workoutType: string, intensity: string) {
  const metMap: Record<string, Record<string, number>> = {
    Walking: { 'Stroll (< 4 km/h)': 2.5, 'Brisk (4-5.5 km/h)': 3.5, 'Power Walk (> 5.5 km/h)': 4.5 },
    Running: { 'Jog (> 6:00/km)': 7.0, 'Paced (5:00-6:00/km)': 9.0, 'Fast (< 5:00/km)': 11.0 },
    Cycling: { 'Casual (< 16 km/h)': 4.0, 'Moderate (16-20 km/h)': 6.0, 'Vigorous (> 20 km/h)': 8.0 },
    'Strength Training': { 'Powerlifting (Long Rests)': 3.5, 'Hypertrophy (Standard)': 5.0, 'Circuit (Short Rests)': 6.5 },
    HIIT: { 'Work:Rest 1:2': 6.0, 'Work:Rest 1:1': 8.0, 'Work:Rest 2:1 (Tabata)': 10.0 },
    Sports: { 'Recreational (Lots of stops)': 5.0, 'Competitive (Continuous)': 8.0 },
    Other: { 'Low Exertion': 3.0, 'Moderate Exertion': 5.0, 'High Exertion': 7.0 },
  };

  return metMap[workoutType]?.[intensity] ?? 0;
}

function getIntensityOptions(workoutType: string) {
  switch (workoutType) {
    case 'Walking':
      return ['Stroll (< 4 km/h)', 'Brisk (4-5.5 km/h)', 'Power Walk (> 5.5 km/h)'];
    case 'Running':
      return ['Jog (> 6:00/km)', 'Paced (5:00-6:00/km)', 'Fast (< 5:00/km)'];
    case 'Cycling':
      return ['Casual (< 16 km/h)', 'Moderate (16-20 km/h)', 'Vigorous (> 20 km/h)'];
    case 'Strength Training':
      return ['Powerlifting (Long Rests)', 'Hypertrophy (Standard)', 'Circuit (Short Rests)'];
    case 'HIIT':
      return ['Work:Rest 1:2', 'Work:Rest 1:1', 'Work:Rest 2:1 (Tabata)'];
    case 'Sports':
      return ['Recreational (Lots of stops)', 'Competitive (Continuous)'];
    default:
      return ['Low Exertion', 'Moderate Exertion', 'High Exertion'];
  }
}

export default function WorkoutScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

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

  // timer state variables
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  // dynamically inferring the correct return type of setinterval
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // timer control functions
  function startTimer() {
    setIsTimerRunning(true);
  }

  function pauseTimer() {
    setIsTimerRunning(false);
  }

  function resetTimer() {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  }

  function endTimer() {
    setIsTimerRunning(false);
    const totalMinutes = (timerSeconds / 60).toFixed(2);
    
    // auto populate the duration and open modal
    setDurationMinutes(String(totalMinutes));
    setTimerSeconds(0);
    setModalVisible(true);
  }

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

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
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this workout session?');
      if (confirmed) {
        deleteWorkoutAndRefresh(sessionId).catch((error) => {
          console.error('Failed to delete workout session:', error);
          window.alert('Could not delete workout session.');
        });
      }
      return;
    }

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
          ListHeaderComponent={
            <>
              <Text style={styles.title}>Workout</Text>
              <Text style={styles.subtitle}>
                {profile ? `${profile.name}'s workouts for ${today}` : today}
              </Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
                <Text style={styles.summaryText}>Workout sessions: {sessions.length}</Text>
                <Text style={styles.summaryText}>
                  Latest body weight: {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : 'N/A'}
                </Text>
              </View>

              <View style={styles.timerCard}>
                <Text style={styles.timerDisplay}>{formatTimerDisplay(timerSeconds)}</Text>
                
                <View style={styles.timerControls}>
                  {!isTimerRunning && timerSeconds === 0 && (
                    <Pressable style={[styles.timerButton, styles.startButton]} onPress={startTimer}>
                      <Text style={styles.timerButtonTextPrimary}>Start Timer</Text>
                    </Pressable>
                  )}

                  {isTimerRunning && (
                    <>
                      <Pressable style={[styles.timerButton, styles.pauseButton]} onPress={pauseTimer}>
                        <Text style={styles.timerButtonTextSecondary}>Pause</Text>
                      </Pressable>
                      <Pressable style={[styles.timerButton, styles.endButton]} onPress={endTimer}>
                        <Text style={styles.timerButtonTextDanger}>End Workout</Text>
                      </Pressable>
                    </>
                  )}

                  {!isTimerRunning && timerSeconds > 0 && (
                    <>
                      <Pressable style={[styles.timerButton, styles.resumeButton]} onPress={startTimer}>
                        <Text style={styles.timerButtonTextPrimary}>Resume</Text>
                      </Pressable>
                      <Pressable style={[styles.timerButton, styles.endButton]} onPress={endTimer}>
                        <Text style={styles.timerButtonTextDanger}>End Workout</Text>
                      </Pressable>
                      <Pressable style={[styles.timerButton, styles.resetButton]} onPress={resetTimer}>
                        <Text style={styles.timerButtonTextSecondary}>Reset</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>

              <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.addButtonText}>+ Add Workout Manually</Text>
              </Pressable>
            </>
          }
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
                        placeholderTextColor={theme.textMuted}
                        value={workoutName}
                        onChangeText={setWorkoutName}
                        style={styles.input}
                      />

                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={workoutType}
                          onValueChange={(itemValue) => {
                            setWorkoutType(itemValue);
                            // clear intensity when type changes to prevent mismatch
                            setIntensity('');
                          }}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          <Picker.Item label="Select workout type..." value="" color={theme.textMuted} />
                          <Picker.Item label="Walking" value="Walking" color={theme.text} />
                          <Picker.Item label="Running" value="Running" color={theme.text} />
                          <Picker.Item label="Cycling" value="Cycling" color={theme.text} />
                          <Picker.Item label="Strength Training" value="Strength Training" color={theme.text} />
                          <Picker.Item label="HIIT" value="HIIT" color={theme.text} />
                          <Picker.Item label="Sports" value="Sports" color={theme.text} />
                          <Picker.Item label="Other" value="Other" color={theme.text} />
                        </Picker>
                      </View>

                      <TextInput
                        placeholder="Duration (minutes)"
                        placeholderTextColor={theme.textMuted}
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                        keyboardType="decimal-pad"
                        style={styles.input}
                      />

                      {workoutType !== '' ? (
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={intensity}
                            onValueChange={(itemValue) => setIntensity(itemValue)}
                            style={styles.picker}
                            itemStyle={styles.pickerItem}
                          >
                            <Picker.Item label="Select specification..." value="" color={theme.textMuted} />
                            {getIntensityOptions(workoutType).map((option) => (
                              <Picker.Item key={option} label={option} value={option} color={theme.text} />
                            ))}
                          </Picker>
                        </View>
                      ) : null}

                      {workoutType === 'Strength Training' ? (
                        <>
                          <TextInput
                            placeholder="Exercise name"
                            placeholderTextColor={theme.textMuted}
                            value={exerciseName}
                            onChangeText={setExerciseName}
                            style={styles.input}
                          />

                          <TextInput
                            placeholder="Weight lifted (kg)"
                            placeholderTextColor={theme.textMuted}
                            value={weightKg}
                            onChangeText={setWeightKg}
                            keyboardType="decimal-pad"
                            style={styles.input}
                          />

                          <TextInput
                            placeholder="Reps"
                            placeholderTextColor={theme.textMuted}
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
                          placeholderTextColor={theme.textMuted}
                          value={distanceKm}
                          onChangeText={setDistanceKm}
                          keyboardType="decimal-pad"
                          style={styles.input}
                        />
                      ) : null}

                      <View style={styles.calorieCard}>
                        <Text style={styles.calorieCardLabel}>Estimated calories burned</Text>
                        <Text style={styles.calorieCardValue}>
                          {estimatedCalories > 0 ? `${estimatedCalories.toFixed(0)} kcal` : 'N/A'}
                        </Text>
                        <Text style={styles.calorieCardHint}>
                          {latestWeight !== null
                            ? `Using latest body weight: ${latestWeight.toFixed(1)} kg`
                            : 'Add a body-weight entry in Progress to enable calorie estimates'}
                        </Text>
                      </View>

                      <TextInput
                        placeholder="Notes (optional)"
                        placeholderTextColor={theme.textMuted}
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
                          <Text style={styles.cancelButtonText}>Cancel</Text>
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
                          <Text style={styles.saveButtonText}>Save</Text>
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

// dynamically generated styles to overhaul spatial dynamics and layout
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
    marginBottom: 24,
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
  timerCard: {
    backgroundColor: theme.surface,
    borderRadius: 32,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
    color: theme.text,
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  timerButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 100,
    alignItems: 'center',
    flex: 1,
  },
  timerButtonTextPrimary: {
    color: theme.background,
    fontWeight: '700',
    fontSize: 15,
  },
  timerButtonTextSecondary: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 15,
  },
  timerButtonTextDanger: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  startButton: {
    backgroundColor: theme.text,
  },
  pauseButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.border,
  },
  resumeButton: {
    backgroundColor: theme.text,
  },
  endButton: {
    backgroundColor: theme.danger,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.border,
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
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
    marginBottom: 8,
  },
  entryDetail: {
    fontSize: 15,
    color: theme.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  entryCalories: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
    marginTop: 6,
    marginBottom: 8,
  },
  entryNotes: {
    fontSize: 15,
    color: theme.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  deleteButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
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
  modalWrapper: {
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
  pickerContainer: {
    borderWidth: 0,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },
  picker: {
    color: theme.text,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    color: theme.text,
    backgroundColor: theme.surface,
  },
  calorieCard: {
    backgroundColor: theme.text,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  calorieCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.background,
    marginBottom: 8,
    opacity: 0.8,
  },
  calorieCardValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: theme.background,
  },
  calorieCardHint: {
    marginTop: 8,
    fontSize: 12,
    color: theme.background,
    opacity: 0.6,
    textAlign: 'center',
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
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