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
} from 'react-native';
import { FoodEntry } from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

export default function FoodScreen() {
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
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this entry?');
      if (confirmed) {
        deleteFoodAndRefresh(entryId).catch((error) => {
          console.error('Failed to delete food entry:', error);
          window.alert('Could not delete food entry.');
        });
      }
      return;
    }

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

        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
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
                    placeholderTextColor="#6b7280"
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
                      <Picker.Item label="Select meal type..." value="" color="#6b7280" />
                      <Picker.Item label="Breakfast" value="Breakfast" color="#4b5563" />
                      <Picker.Item label="Lunch" value="Lunch" color="#4b5563" />
                      <Picker.Item label="Dinner" value="Dinner" color="#4b5563" />
                      <Picker.Item label="Supper" value="Supper" color="#4b5563" />
                      <Picker.Item label="Drink" value="Drink" color="#4b5563" />
                      <Picker.Item label="Snack" value="Snack" color="#4b5563" />
                    </Picker>
                  </View>

                  <TextInput
                    placeholder="Calories"
                    placeholderTextColor="#6b7280"
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Protein (g)"
                    placeholderTextColor="#6b7280"
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Carbs (g)"
                    placeholderTextColor="#6b7280"
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Fats (g)"
                    placeholderTextColor="#6b7280"
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
                      <Text style={styles.actionButtonText}>Cancel</Text>
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
    padding: 20,
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
  },
  entrySubtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
    marginBottom: 6,
  },
  entryMacros: {
    fontSize: 14,
    color: '#111827',
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