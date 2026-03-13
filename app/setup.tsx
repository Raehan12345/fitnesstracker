import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
  useColorScheme,
} from 'react-native';
import { Colors } from '../constants/theme';
import { createProfile } from '../src/db/database';

function calculateMacros(weight: number, height: number, age: number, sex: string, goal: string, activityLevel: number) {
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr += sex === 'Male' ? 5 : -161;

  let calories = bmr * activityLevel;

  if (goal === 'Cut') calories -= 500;
  if (goal === 'Bulk') calories += 300;

  const protein = weight * 2.2;
  const fat = weight * 0.8;
  const remainingCalories = calories - (protein * 4 + fat * 9);
  
  const carbs = remainingCalories > 0 ? remainingCalories / 4 : 0;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export default function SetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [startingWeightKg, setStartingWeightKg] = useState('');
  
  const [goal, setGoal] = useState('Maintain');
  const [activityMultiplier, setActivityMultiplier] = useState('1.2');

  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [carbsTarget, setCarbsTarget] = useState('');
  const [fatTarget, setFatTarget] = useState('');

  function autoCalculate() {
    const weightNum = Number(startingWeightKg);
    const heightNum = Number(heightCm);
    const ageNum = Number(age);
    const activityNum = Number(activityMultiplier);

    if (!weightNum || !heightNum || !ageNum || !sex) {
      Alert.alert('Missing Info', 'Please fill in age, sex, height, and weight first.');
      return;
    }

    const macros = calculateMacros(weightNum, heightNum, ageNum, sex, goal, activityNum);

    setCalorieTarget(String(macros.calories));
    setProteinTarget(String(macros.protein));
    setCarbsTarget(String(macros.carbs));
    setFatTarget(String(macros.fat));
  }

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
        <Text style={styles.subtitle}>Let us personalize your tracker</Text>

        <TextInput
          placeholder="Name"
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Age"
          placeholderTextColor={theme.textMuted}
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
            <Picker.Item label="Select sex..." value="" color={theme.textMuted} />
            <Picker.Item label="Male" value="Male" color={theme.text} />
            <Picker.Item label="Female" value="Female" color={theme.text} />
            <Picker.Item label="Other" value="Other" color={theme.text} />
          </Picker>
        </View>

        <TextInput
          placeholder="Height (cm)"
          placeholderTextColor={theme.textMuted}
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <TextInput
          placeholder="Starting weight (kg)"
          placeholderTextColor={theme.textMuted}
          value={startingWeightKg}
          onChangeText={setStartingWeightKg}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Lifestyle and Goals</Text>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={goal}
            onValueChange={(v) => setGoal(v)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="Maintain" value="Maintain" color={theme.text} />
            <Picker.Item label="Cut" value="Cut" color={theme.text} />
            <Picker.Item label="Bulk" value="Bulk" color={theme.text} />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={activityMultiplier}
            onValueChange={(v) => setActivityMultiplier(v)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="Sedentary (No Exercise)" value="1.2" color={theme.text} />
            <Picker.Item label="Lightly Active (1-3 days/week)" value="1.375" color={theme.text} />
            <Picker.Item label="Moderately Active (3-5 days/week)" value="1.55" color={theme.text} />
            <Picker.Item label="Very Active (6-7 days/week)" value="1.725" color={theme.text} />
            <Picker.Item label="Extra Active (Physical Job)" value="1.9" color={theme.text} />
          </Picker>
        </View>

        <Pressable style={styles.calcButton} onPress={autoCalculate}>
          <Text style={styles.calcButtonText}>
            Auto Calculate Macros
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Macro Targets</Text>

        <TextInput
          placeholder="Calorie target"
          placeholderTextColor={theme.textMuted}
          value={calorieTarget}
          onChangeText={setCalorieTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Protein target (g)"
          placeholderTextColor={theme.textMuted}
          value={proteinTarget}
          onChangeText={setProteinTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Carbs target (g)"
          placeholderTextColor={theme.textMuted}
          value={carbsTarget}
          onChangeText={setCarbsTarget}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          placeholder="Fat target (g)"
          placeholderTextColor={theme.textMuted}
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
          <Text style={styles.saveButtonText}>Complete Setup</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    color: theme.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: 32,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 16,
    color: theme.text,
  },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: theme.text,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    color: theme.text,
    backgroundColor: theme.surface,
  },
  calcButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.border,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    marginBottom: 8,
  },
  calcButtonText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: theme.text,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: theme.background,
    fontSize: 16,
    fontWeight: '700',
  },
});