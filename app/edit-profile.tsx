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

import { updateProfile } from '../src/db/database';
import { useAppStore } from '../src/store/useAppStore';

function calculateMacros(weight: number, goal: string) {

  let calories = weight * 33;

  if (goal === 'Cut') calories -= 400;
  if (goal === 'Bulk') calories += 300;

  const protein = weight * 2;
  const fat = weight * 0.8;

  const remainingCalories =
    calories - (protein * 4 + fat * 9);

  const carbs = remainingCalories / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export default function EditProfileScreen() {

  const profile = useAppStore((state) => state.profile);
  const refreshAll = useAppStore((state) => state.refreshAll);

  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [sex, setSex] = useState(profile?.sex ?? '');
  const [height, setHeight] = useState(String(profile?.height_cm ?? ''));
  const [weight, setWeight] = useState(String(profile?.starting_weight_kg ?? ''));

  const [goal, setGoal] = useState('Maintain');

  const [calories, setCalories] = useState(String(profile?.calorie_target ?? ''));
  const [protein, setProtein] = useState(String(profile?.protein_target ?? ''));
  const [carbs, setCarbs] = useState(String(profile?.carbs_target ?? ''));
  const [fat, setFat] = useState(String(profile?.fat_target ?? ''));

  function autoCalculate() {

    const weightNum = Number(weight);

    if (!weightNum) {
      Alert.alert('Enter body weight first');
      return;
    }

    const macros = calculateMacros(weightNum, goal);

    setCalories(String(macros.calories));
    setProtein(String(macros.protein));
    setCarbs(String(macros.carbs));
    setFat(String(macros.fat));
  }

  async function handleSave() {

    if (!profile) return;

    await updateProfile(profile.id, {
      name,
      age: Number(age),
      sex,
      heightCm: Number(height),
      startingWeightKg: Number(weight),
      calorieTarget: Number(calories),
      proteinTarget: Number(protein),
      carbsTarget: Number(carbs),
      fatTarget: Number(fat),
    });

    await refreshAll();

    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >

        <Text style={styles.title}>Edit Profile</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={'#d1d5db'}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={sex}
            onValueChange={(v) => setSex(v)}
          >
            <Picker.Item label="Sex" value="" color='#acadad' />
            <Picker.Item label="Male" value="Male" color='#282a2d' />
            <Picker.Item label="Female" value="Female" color='#282a2d' />
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Height (cm)"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
        />

        <TextInput
          style={styles.input}
          placeholder="Weight (kg)"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={goal}
            onValueChange={(v) => setGoal(v)}
          >
            <Picker.Item label="Maintain" value="Maintain" color='#282a2d'/>
            <Picker.Item label="Cut" value="Cut" color='#282a2d' />
            <Picker.Item label="Bulk" value="Bulk" color='#282a2d' />
          </Picker>
        </View>

        <Pressable style={styles.calcButton} onPress={autoCalculate}>
          <Text style={styles.calcText}>
            Auto Calculate Macros
          </Text>
        </Pressable>

        <Text style={styles.section}>Macro Targets</Text>

        <TextInput
          style={styles.input}
          placeholder="Calories"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={calories}
          onChangeText={setCalories}
        />

        <TextInput
          style={styles.input}
          placeholder="Protein (g)"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={protein}
          onChangeText={setProtein}
        />

        <TextInput
          style={styles.input}
          placeholder="Carbs (g)"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={carbs}
          onChangeText={setCarbs}
        />

        <TextInput
          style={styles.input}
          placeholder="Fat (g)"
          placeholderTextColor={'#d1d5db'}
          keyboardType="numeric"
          value={fat}
          onChangeText={setFat}
        />

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save Profile</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#ffffff'
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
    color: '#111827',
  },

  section: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    color: '#111827'
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#111827'
  },

  pickerBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#ffffff'
  },

  calcButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  calcText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  saveButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },

  saveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },

});