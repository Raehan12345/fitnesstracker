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
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';
import { Colors } from '../../constants/theme';
import { FoodEntry } from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

export default function FoodScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

  const profile = useAppStore((state) => state.profile);
  const entries = useAppStore((state) => state.foodEntriesToday);
  const addFoodAndRefresh = useAppStore((state) => state.addFoodAndRefresh);
  const deleteFoodAndRefresh = useAppStore((state) => state.deleteFoodAndRefresh);

  const [modalVisible, setModalVisible] = useState(false);

  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.calories += entry.calories;
        acc.protein += entry.protein;
        acc.carbs += entry.carbs;
        acc.fats += entry.fats;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [entries]);

  function resetForm() {
    setFoodName('');
    setMealType('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
  }

  async function handleSave() {
    if (!profile) return;

    if (!foodName.trim()) {
      Alert.alert('Missing food name', 'Please enter a food name.');
      return;
    }

    if (!mealType) {
      Alert.alert('Missing meal type', 'Please select a meal type.');
      return;
    }

    const parsedCalories = Number(calories);
    const parsedProtein = Number(protein);
    const parsedCarbs = Number(carbs);
    const parsedFats = Number(fats);

    if (
      Number.isNaN(parsedCalories) ||
      Number.isNaN(parsedProtein) ||
      Number.isNaN(parsedCarbs) ||
      Number.isNaN(parsedFats)
    ) {
      Alert.alert('Invalid input', 'Please enter valid numbers for all macros.');
      return;
    }

    await addFoodAndRefresh({
      profileId: profile.id,
      entryDate: today,
      mealType,
      foodName: foodName.trim(),
      calories: parsedCalories,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fats: parsedFats,
    });

    Keyboard.dismiss();
    resetForm();
    setModalVisible(false);
  }

  function handleDelete(entryId: number) {
    Alert.alert(
      'Delete food entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFoodAndRefresh(entryId).catch((error) => {
              console.error('Failed to delete food entry:', error);
              Alert.alert('Error', 'Could not delete food entry.');
            });
          },
        },
      ]
    );
  }

  function renderFoodItem({ item }: { item: FoodEntry }) {
    return (
      <View style={styles.entryCard}>
        <Text style={styles.entryTitle}>{item.food_name}</Text>
        <Text style={styles.entrySubtitle}>{item.meal_type}</Text>
        <Text style={styles.entryMacros}>
          {item.calories} kcal | P {item.protein} | C {item.carbs} | F {item.fats}
        </Text>

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
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          ListHeaderComponent={
            <>
              <Text style={styles.title}>Food</Text>
              <Text style={styles.subtitle}>
                {profile ? `${profile.name}'s log for ${today}` : today}
              </Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Today&apos;s Totals</Text>
                <Text style={styles.summaryText}>Calories: {totals.calories.toFixed(0)}</Text>
                <Text style={styles.summaryText}>Protein: {totals.protein.toFixed(1)} g</Text>
                <Text style={styles.summaryText}>Carbs: {totals.carbs.toFixed(1)} g</Text>
                <Text style={styles.summaryText}>Fats: {totals.fats.toFixed(1)} g</Text>
              </View>

              <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.addButtonText}>+ Add Food</Text>
              </Pressable>
            </>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No food logged for today yet.</Text>
          }
          renderItem={renderFoodItem}
        />

        <Modal visible={modalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={styles.modalCard}
                >
                  <Text style={styles.modalTitle}>Add Food Entry</Text>

                  <TextInput
                    placeholder="Food name"
                    placeholderTextColor={theme.textMuted}
                    value={foodName}
                    onChangeText={setFoodName}
                    style={styles.input}
                  />

                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={mealType}
                      onValueChange={(itemValue) => setMealType(itemValue)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      <Picker.Item label="Select meal type..." value="" color={theme.textMuted} />
                      <Picker.Item label="Breakfast" value="Breakfast" color={theme.text} />
                      <Picker.Item label="Lunch" value="Lunch" color={theme.text} />
                      <Picker.Item label="Dinner" value="Dinner" color={theme.text} />
                      <Picker.Item label="Supper" value="Supper" color={theme.text} />
                      <Picker.Item label="Drink" value="Drink" color={theme.text} />
                      <Picker.Item label="Snack" value="Snack" color={theme.text} />
                    </Picker>
                  </View>

                  <TextInput
                    placeholder="Calories"
                    placeholderTextColor={theme.textMuted}
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Protein (g)"
                    placeholderTextColor={theme.textMuted}
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Carbs (g)"
                    placeholderTextColor={theme.textMuted}
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Fats (g)"
                    placeholderTextColor={theme.textMuted}
                    value={fats}
                    onChangeText={setFats}
                    keyboardType="numeric"
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
                          console.error('Failed to save food entry:', error);
                          Alert.alert('Error', 'Could not save food entry.');
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
    marginBottom: 6,
  },
  entrySubtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 10,
    fontWeight: '500',
  },
  entryMacros: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
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