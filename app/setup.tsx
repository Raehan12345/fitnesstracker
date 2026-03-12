import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createProfile } from '../src/db/database';

export default function SetupScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [startingWeightKg, setStartingWeightKg] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [carbsTarget, setCarbsTarget] = useState('');
  const [fatTarget, setFatTarget] = useState('');

  async function handleSave() {
    const parsedAge = Number(age);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(startingWeightKg);
    const parsedCalories = Number(calorieTarget);
    const parsedProtein = Number(proteinTarget);
    const parsedCarbs = Number(carbsTarget);
    const parsedFat = Number(fatTarget);

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }

    if (!sex) {
      Alert.alert('Missing sex', 'Please select your sex.');
      return;
    }

    if (Number.isNaN(parsedAge) || parsedAge <= 0) {
      Alert.alert('Invalid age', 'Please enter a valid age.');
      return;
    }

    if (Number.isNaN(parsedHeight) || parsedHeight <= 0) {
      Alert.alert('Invalid height', 'Please enter a valid height.');
      return;
    }

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid starting weight', 'Please enter a valid starting weight.');
      return;
    }

    if (Number.isNaN(parsedCalories) || parsedCalories <= 0) {
      Alert.alert('Invalid calorie target', 'Please enter a valid calorie target.');
      return;
    }

    if (Number.isNaN(parsedProtein) || parsedProtein <= 0) {
      Alert.alert('Invalid protein target', 'Please enter a valid protein target.');
      return;
    }

    if (Number.isNaN(parsedCarbs) || parsedCarbs <= 0) {
      Alert.alert('Invalid carbs target', 'Please enter a valid carbs target.');
      return;
    }

    if (Number.isNaN(parsedFat) || parsedFat <= 0) {
      Alert.alert('Invalid fat target', 'Please enter a valid fat target.');
      return;
    }

    await createProfile({
      name: name.trim(),
      age: parsedAge,
      sex,
      heightCm: parsedHeight,
      startingWeightKg: parsedWeight,
      calorieTarget: parsedCalories,
      proteinTarget: parsedProtein,
      carbsTarget: parsedCarbs,
      fatTarget: parsedFat,
    });

    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Set Up Profile</Text>
        <Text style={styles.subtitle}>Let&apos;s personalize your tracker</Text>

        <TextInput
          placeholder="Name"
          placeholderTextColor="#6b7280"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Age"
          placeholderTextColor="#6b7280"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={sex}
            onValueChange={(itemValue) => setSex(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="Select sex..." value="" color="#6b7280" />
            <Picker.Item label="Male" value="Male" color="#4b5563" />
            <Picker.Item label="Female" value="Female" color="#4b5563" />
            <Picker.Item label="Other" value="Other" color="#4b5563" />
          </Picker>
        </View>

        <TextInput
          placeholder="Height (cm)"
          placeholderTextColor="#6b7280"
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Starting weight (kg)"
          placeholderTextColor="#6b7280"
          value={startingWeightKg}
          onChangeText={setStartingWeightKg}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Calorie target"
          placeholderTextColor="#6b7280"
          value={calorieTarget}
          onChangeText={setCalorieTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Protein target (g)"
          placeholderTextColor="#6b7280"
          value={proteinTarget}
          onChangeText={setProteinTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Carbs target (g)"
          placeholderTextColor="#6b7280"
          value={carbsTarget}
          onChangeText={setCarbsTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Fat target (g)"
          placeholderTextColor="#6b7280"
          value={fatTarget}
          onChangeText={setFatTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <Pressable style={styles.saveButton} onPress={() => {
          handleSave().catch((error) => {
            console.error('Failed to create profile:', error);
            Alert.alert('Error', 'Could not create profile.');
          });
        }}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
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
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});