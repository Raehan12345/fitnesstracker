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
import { updateProfile } from '../src/db/database';
import { useAppStore } from '../src/store/useAppStore';

// added activity level multiplier
function calculateMacros(weight: number, height: number, age: number, sex: string, goal: string, activityLevel: number) {
  // calculate base metabolic rate using mifflin-st jeor equation
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr += sex === 'Male' ? 5 : -161;

  // apply the user selected activity multiplier
  let calories = bmr * activityLevel;

  // standard adjustments for body composition goals
  if (goal === 'Cut') calories -= 500;
  if (goal === 'Bulk') calories += 300;

  // prioritize high protein to preserve muscle mass
  const protein = weight * 2.2;
  const fat = weight * 0.8;
  const remainingCalories = calories - (protein * 4 + fat * 9);
  
  // prevent negative carbohydrates if calories drop too low
  const carbs = remainingCalories > 0 ? remainingCalories / 4 : 0;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export default function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

  const profile = useAppStore((state) => state.profile);
  const refreshAll = useAppStore((state) => state.refreshAll);

  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [sex, setSex] = useState(profile?.sex ?? '');
  const [height, setHeight] = useState(String(profile?.height_cm ?? ''));
  const [weight, setWeight] = useState(String(profile?.starting_weight_kg ?? ''));

  const [goal, setGoal] = useState('Maintain');
  const [activityMultiplier, setActivityMultiplier] = useState('1.2');

  const [calories, setCalories] = useState(String(profile?.calorie_target ?? ''));
  const [protein, setProtein] = useState(String(profile?.protein_target ?? ''));
  const [carbs, setCarbs] = useState(String(profile?.carbs_target ?? ''));
  const [fat, setFat] = useState(String(profile?.fat_target ?? ''));

  function autoCalculate() {
    const weightNum = Number(weight);
    const heightNum = Number(height);
    const ageNum = Number(age);
    const activityNum = Number(activityMultiplier);

    if (!weightNum || !heightNum || !ageNum || !sex) {
      Alert.alert('Missing Info', 'Please fill in age, sex, height, and weight first.');
      return;
    }

    const macros = calculateMacros(weightNum, heightNum, ageNum, sex, goal, activityNum);

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
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={sex}
            onValueChange={(v) => setSex(v)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="Select Sex" value="" color={theme.textMuted} />
            <Picker.Item label="Male" value="Male" color={theme.text} />
            <Picker.Item label="Female" value="Female" color={theme.text} />
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Height (cm)"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={height}
          onChangeText={setHeight}
        />

        <TextInput
          style={styles.input}
          placeholder="Weight (kg)"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />

        <View style={styles.pickerBox}>
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

        <View style={styles.pickerBox}>
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
          <Text style={styles.calcText}>
            Auto Calculate Macros
          </Text>
        </Pressable>

        <Text style={styles.section}>Macro Targets</Text>

        <TextInput
          style={styles.input}
          placeholder="Calories"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={calories}
          onChangeText={setCalories}
        />

        <TextInput
          style={styles.input}
          placeholder="Protein (g)"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={protein}
          onChangeText={setProtein}
        />

        <TextInput
          style={styles.input}
          placeholder="Carbs (g)"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={carbs}
          onChangeText={setCarbs}
        />

        <TextInput
          style={styles.input}
          placeholder="Fat (g)"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
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

const getStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 24,
    color: theme.text,
  },
  section: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 24,
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
  pickerBox: {
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
  calcText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: theme.text,
    paddingVertical: 16,
    borderRadius: 100,
    marginTop: 24,
    alignItems: 'center',
  },
  saveText: {
    color: theme.background,
    fontWeight: '700',
    fontSize: 16,
  },
});