import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';
import { Colors } from '../../constants/theme';
import {
  AllTimeSummary,
  AnalyticsMode,
  AnalyticsPoint,
  calculateRollingAverage,
  DayBreakdown,
  getAllTimeSummary,
  getAnalyticsSeries,
  getDayBreakdown,
  getFoodEntriesByDate,
  getHeatmapData,
  getWorkoutSessionsByDate,
  HeatmapCell,
  QuickAddFood,
} from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 72;
const CHART_HEIGHT = 240;

type ChartPoint = {
  label: string;
  value: number;
};

// helper to format numbers
function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

// helper to get met values for workouts
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

// helper to get intensity options for workouts
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

// multi line chart component
function MultiLineChart({
  title,
  primary,
  secondary,
  primaryColor,
  secondaryColor,
  primaryLabel,
  secondaryLabel,
  targetValue,
  targetLabel,
  targetColor,
  theme,
  styles,
}: {
  title: string;
  primary: (ChartPoint | null)[];
  secondary?: (ChartPoint | null)[];
  primaryColor: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  targetValue?: number | null;
  targetLabel?: string;
  targetColor?: string;
  theme: typeof Colors.light;
  styles: any;
}) {
  const validPrimary = primary.filter((item): item is ChartPoint => item !== null);
  const validSecondary = (secondary ?? []).filter(
    (item): item is ChartPoint => item !== null
  );

  if (validPrimary.length === 0 && validSecondary.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.emptyText}>No data available.</Text>
      </View>
    );
  }

  const baseLabels = primary
    .map((item) => item?.label ?? null)
    .filter((item): item is string => item !== null);

  const allValues = [
    ...validPrimary.map((item) => item.value),
    ...validSecondary.map((item) => item.value),
    ...(targetValue !== null && targetValue !== undefined ? [targetValue] : []),
  ];

  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const paddingLeft = 36;
  const paddingRight = 12;
  const paddingTop = 18;
  const paddingBottom = 30;

  const innerWidth = CHART_WIDTH - paddingLeft - paddingRight;
  const innerHeight = CHART_HEIGHT - paddingTop - paddingBottom;

  function getX(index: number, total: number) {
    if (total <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (total - 1)) * innerWidth;
  }

  function getY(value: number) {
    return paddingTop + ((max - value) / range) * innerHeight;
  }

  const primaryPoints = primary
    .map((item, index) =>
      item
        ? {
            x: getX(index, primary.length),
            y: getY(item.value),
            label: item.label,
            value: item.value,
          }
        : null
    )
    .filter(Boolean) as { x: number; y: number; label: string; value: number }[];

  const secondaryPoints = (secondary ?? [])
    .map((item, index) =>
      item
        ? {
            x: getX(index, (secondary ?? []).length),
            y: getY(item.value),
            label: item.label,
            value: item.value,
          }
        : null
    )
    .filter(Boolean) as { x: number; y: number; label: string; value: number }[];

  const primaryPolyline = primaryPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const secondaryPolyline = secondaryPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const yGuides = 4;
  const guideValues = Array.from({ length: yGuides + 1 }, (_, i) => {
    const value = max - (i / yGuides) * range;
    const y = paddingTop + (i / yGuides) * innerHeight;
    return { value, y };
  });

  const targetY =
    targetValue !== null && targetValue !== undefined ? getY(targetValue) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.legendRow}>
        {primaryLabel ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: primaryColor }]} />
            <Text style={styles.legendText}>{primaryLabel}</Text>
          </View>
        ) : null}

        {secondaryLabel && secondaryColor ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: secondaryColor }]} />
            <Text style={styles.legendText}>{secondaryLabel}</Text>
          </View>
        ) : null}

        {targetValue !== null && targetValue !== undefined && targetLabel && targetColor ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: targetColor }]} />
            <Text style={styles.legendText}>{targetLabel}</Text>
          </View>
        ) : null}
      </View>

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {guideValues.map((guide, index) => (
          <Line
            key={`line-guide-${index}`}
            x1={paddingLeft}
            y1={guide.y}
            x2={CHART_WIDTH - paddingRight}
            y2={guide.y}
            stroke={theme.border}
            strokeWidth="1"
          />
        ))}

        {guideValues.map((guide, index) => (
          <SvgText
            key={`line-guide-label-${index}`}
            x={paddingLeft - 6}
            y={guide.y + 4}
            fontSize="10"
            fill={theme.textMuted}
            textAnchor="end"
            fontWeight="500"
          >
            {formatNumber(guide.value)}
          </SvgText>
        ))}

        {targetY !== null && targetColor ? (
          <>
            <Line
              x1={paddingLeft}
              y1={targetY}
              x2={CHART_WIDTH - paddingRight}
              y2={targetY}
              stroke={targetColor}
              strokeWidth="2"
              strokeDasharray="5,4"
            />
            <SvgText
              x={CHART_WIDTH - paddingRight}
              y={targetY - 6}
              fontSize="10"
              fill={targetColor}
              textAnchor="end"
              fontWeight="700"
            >
              {targetLabel}
            </SvgText>
          </>
        ) : null}

        {primaryPoints.length > 0 ? (
          <Polyline
            points={primaryPolyline}
            fill="none"
            stroke={primaryColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {secondaryPoints.length > 0 && secondaryColor ? (
          <Polyline
            points={secondaryPolyline}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {primaryPoints.map((point, index) => (
          <Circle
            key={`p-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={primaryColor}
          />
        ))}

        {secondaryPoints.map((point, index) => (
          <Circle
            key={`s-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={secondaryColor}
          />
        ))}

        {baseLabels.map((label, index) => (
          <SvgText
            key={`label-${label}-${index}`}
            x={getX(index, baseLabels.length)}
            y={CHART_HEIGHT - 8}
            fontSize="10"
            fill={theme.textMuted}
            textAnchor="middle"
            fontWeight="500"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// heatmap component
function Heatmap({
  data,
  title,
  profileId,
  theme,
  styles,
  onDataChanged,
}: {
  data: HeatmapCell[];
  title: string;
  profileId: number | undefined;
  theme: typeof Colors.light;
  styles: any;
  onDataChanged: () => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<DayBreakdown | null>(null);

  // zustand connections for modals
  const addFoodAndRefresh = useAppStore((state) => state.addFoodAndRefresh);
  const deleteFoodAndRefresh = useAppStore((state) => state.deleteFoodAndRefresh);
  const addWorkoutAndRefresh = useAppStore((state) => state.addWorkoutAndRefresh);
  const deleteWorkoutAndRefresh = useAppStore((state) => state.deleteWorkoutAndRefresh);
  const addBodyMetricAndRefresh = useAppStore((state) => state.addBodyMetricAndRefresh);
  const deleteBodyMetricAndRefresh = useAppStore((state) => state.deleteBodyMetricAndRefresh);
  
  const quickAddFoods = useAppStore((state) => state.quickAddFoods);
  const saveQuickAddFoodAndRefresh = useAppStore((state) => state.saveQuickAddFoodAndRefresh);
  const deleteQuickAddFoodAndRefresh = useAppStore((state) => state.deleteQuickAddFoodAndRefresh);

  const bodyMetrics = useAppStore((state) => state.bodyMetrics);
  const latestWeight = useAppStore((state) => state.latestWeight);

  // modal visibility states
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [quickAddPageVisible, setQuickAddPageVisible] = useState(false);
  const [quickAddFormVisible, setQuickAddFormVisible] = useState(false);

  // food form states
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [editingFoodId, setEditingFoodId] = useState<number | null>(null);

  // quick add form specific states
  const [editingQuickAddId, setEditingQuickAddId] = useState<number | null>(null);

  // workout form states
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [intensity, setIntensity] = useState('');
  const [notes, setNotes] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [reps, setReps] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);

  // weight form states
  const [bodyWeight, setBodyWeight] = useState('');
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const countsMap = useMemo(() => {
    return new Map(data.map((item) => [item.date, item.count]));
  }, [data]);

  const quickAddGroups = useMemo(() => {
    const groups: Record<string, QuickAddFood[]> = {};
    for (const item of quickAddFoods) {
      if (!groups[item.meal_type]) {
        groups[item.meal_type] = [];
      }
      groups[item.meal_type].push(item);
    }
    return groups;
  }, [quickAddFoods]);

  function parseDateKey(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatMonthKey(date: Date) {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  }

  function getMonthTitle(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  function getMondayIndex(date: Date) {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  function formatReadableDate(dateStr: string) {
    return parseDateKey(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  const availableMonths = useMemo(() => {
    const unique = Array.from(
      new Set(data.map((item) => formatMonthKey(parseDateKey(item.date))))
    ).sort();

    return unique;
  }, [data]);

  const activeMonth = useMemo(() => {
    if (selectedMonth && availableMonths.includes(selectedMonth)) {
      return selectedMonth;
    }
    return availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : null;
  }, [selectedMonth, availableMonths]);

  const monthIndex = activeMonth ? availableMonths.indexOf(activeMonth) : -1;

  function buildCalendarCells(monthKey: string) {
    const [year, month] = monthKey.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const leadingEmpty = getMondayIndex(firstDay);
    const totalDays = lastDay.getDate();

    const cells: (
      | {
          date: string;
          dayNumber: number;
          count: number;
          isCurrentMonth: boolean;
        }
      | null
    )[] = [];

    for (let i = 0; i < leadingEmpty; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;

      cells.push({
        date: key,
        dayNumber: day,
        count: countsMap.get(key) ?? 0,
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return Array.from(
      { length: Math.ceil(cells.length / 7) },
      (_, rowIndex) => cells.slice(rowIndex * 7, rowIndex * 7 + 7)
    );
  }

  function getColor(count: number) {
    if (count === 0) return theme.background;
    if (count === 1) return theme.border;
    if (count === 2) return theme.textMuted;
    return theme.text;
  }

  function goPreviousMonth() {
    if (monthIndex > 0) {
      setSelectedMonth(availableMonths[monthIndex - 1]);
      setSelectedCell(null);
      setSelectedBreakdown(null);
    }
  }

  function goNextMonth() {
    if (monthIndex >= 0 && monthIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[monthIndex + 1]);
      setSelectedCell(null);
      setSelectedBreakdown(null);
    }
  }

  async function refreshSelectedDay(dateKey: string) {
    if (!profileId) return;
    try {
      const breakdown = await getDayBreakdown(profileId, dateKey);
      setSelectedBreakdown(breakdown);
    } catch (error) {
      console.error('failed to load day breakdown:', error);
      setSelectedBreakdown(null);
    }
  }

  async function handleSelectDate(cell: HeatmapCell) {
    setSelectedCell(cell);
    await refreshSelectedDay(cell.date);
  }

  // reset helpers
  function resetFoodForm() {
    setEditingFoodId(null);
    setFoodName('');
    setMealType('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
  }

  // modal openers

  const openFoodModal = () => {
    resetFoodForm();
    setFoodModalVisible(true);
  };

  const openWorkoutModal = () => {
    setEditingWorkoutId(null);
    setWorkoutName('');
    setWorkoutType('');
    setDurationMinutes('');
    setIntensity('');
    setNotes('');
    setExerciseName('');
    setWeightKg('');
    setReps('');
    setDistanceKm('');
    setWorkoutModalVisible(true);
  };

  const openWeightModal = () => {
    setEditingWeightId(null);
    setBodyWeight('');
    setWeightModalVisible(true);
  };

  const handleEditFood = async (foodId: number) => {
    if (!profileId || !selectedCell) return;
    const foods = await getFoodEntriesByDate(profileId, selectedCell.date);
    const fullFood = foods.find((f) => f.id === foodId);
    if (fullFood) {
      setEditingFoodId(fullFood.id);
      setFoodName(fullFood.food_name);
      setMealType(fullFood.meal_type);
      setCalories(String(fullFood.calories));
      setProtein(String(fullFood.protein));
      setCarbs(String(fullFood.carbs));
      setFats(String(fullFood.fats));
      setFoodModalVisible(true);
    }
  };

  const handleEditWorkout = async (workoutId: number) => {
    if (!profileId || !selectedCell) return;
    const sessions = await getWorkoutSessionsByDate(profileId, selectedCell.date);
    const fullWorkout = sessions.find((s) => s.id === workoutId);
    if (fullWorkout) {
      setEditingWorkoutId(fullWorkout.id);
      setWorkoutName(fullWorkout.name);
      setWorkoutType(fullWorkout.workout_type || '');
      setDurationMinutes(fullWorkout.duration_minutes ? String(fullWorkout.duration_minutes) : '');
      setIntensity(fullWorkout.intensity || '');
      setNotes(fullWorkout.notes || '');
      setExerciseName(fullWorkout.exercise_name || '');
      setWeightKg(fullWorkout.weight_kg ? String(fullWorkout.weight_kg) : '');
      setReps(fullWorkout.reps ? String(fullWorkout.reps) : '');
      setDistanceKm(fullWorkout.distance_km ? String(fullWorkout.distance_km) : '');
      setWorkoutModalVisible(true);
    }
  };

  const handleEditWeight = (metricId: number, currentWeight: number) => {
    setEditingWeightId(metricId);
    setBodyWeight(String(currentWeight));
    setWeightModalVisible(true);
  };

  // quick add handlers

  function handleOpenQuickAddEditor(item?: QuickAddFood) {
    if (item) {
      setEditingQuickAddId(item.id);
      setFoodName(item.food_name);
      setMealType(item.meal_type);
      setCalories(String(item.calories));
      setProtein(String(item.protein));
      setCarbs(String(item.carbs));
      setFats(String(item.fats));
    } else {
      resetFoodForm();
      setEditingQuickAddId(null);
    }
    setQuickAddFormVisible(true);
  }

  async function handleSaveQuickAdd() {
    if (!profileId) return;

    if (!foodName.trim()) { Alert.alert('Missing food name', 'Please enter a food name.'); return; }
    if (!mealType) { Alert.alert('Missing meal type', 'Please select a meal type.'); return; }

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

    await saveQuickAddFoodAndRefresh(editingQuickAddId, {
      profileId,
      mealType,
      foodName: foodName.trim(),
      calories: parsedCalories,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fats: parsedFats,
    });

    Keyboard.dismiss();
    setQuickAddFormVisible(false);
  }

  function handleDeleteQuickAdd(id: number) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Delete this saved item?');
      if (confirmed) deleteQuickAddFoodAndRefresh(id);
      return;
    }
    Alert.alert('Delete saved item', 'Are you sure you want to delete this template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteQuickAddFoodAndRefresh(id),
      },
    ]);
  }

  function handleSelectQuickAdd(item: QuickAddFood) {
    resetFoodForm();
    setFoodName(item.food_name);
    setMealType(item.meal_type);
    setCalories(String(item.calories));
    setProtein(String(item.protein));
    setCarbs(String(item.carbs));
    setFats(String(item.fats));
    
    setQuickAddPageVisible(false);
    setFoodModalVisible(true);
  }

  // delete functions

  const handleDeleteFood = async (id: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this food entry?');
      if (confirmed) {
        try {
          await deleteFoodAndRefresh(id);
          if (selectedCell) await refreshSelectedDay(selectedCell.date);
          onDataChanged();
        } catch (error) {
          console.error('failed to delete food entry:', error);
          window.alert('Could not delete food entry.');
        }
      }
      return;
    }
    Alert.alert('Delete food entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFoodAndRefresh(id);
            if (selectedCell) await refreshSelectedDay(selectedCell.date);
            onDataChanged();
          } catch (error) {
            console.error('failed to delete food entry:', error);
            Alert.alert('Error', 'Could not delete food entry.');
          }
        },
      },
    ]);
  };

  const handleDeleteWorkout = async (id: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this workout session?');
      if (confirmed) {
        try {
          await deleteWorkoutAndRefresh(id);
          if (selectedCell) await refreshSelectedDay(selectedCell.date);
          onDataChanged();
        } catch (error) {
          console.error('failed to delete workout session:', error);
          window.alert('Could not delete workout session.');
        }
      }
      return;
    }
    Alert.alert('Delete workout session', 'Are you sure you want to delete this workout session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkoutAndRefresh(id);
            if (selectedCell) await refreshSelectedDay(selectedCell.date);
            onDataChanged();
          } catch (error) {
            console.error('failed to delete workout session:', error);
            Alert.alert('Error', 'Could not delete workout session.');
          }
        },
      },
    ]);
  };

  const handleDeleteWeight = async (id: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this weight entry?');
      if (confirmed) {
        try {
          await deleteBodyMetricAndRefresh(id);
          if (selectedCell) await refreshSelectedDay(selectedCell.date);
          onDataChanged();
        } catch (error) {
          console.error('failed to delete weight entry:', error);
          window.alert('Could not delete weight entry.');
        }
      }
      return;
    }
    Alert.alert('Delete weight entry', 'Are you sure you want to delete this weight entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBodyMetricAndRefresh(id);
            if (selectedCell) await refreshSelectedDay(selectedCell.date);
            onDataChanged();
          } catch (error) {
            console.error('failed to delete weight entry:', error);
            Alert.alert('Error', 'Could not delete weight entry.');
          }
        },
      },
    ]);
  };

  // save functions

  const handleSaveFood = async () => {
    if (!profileId || !selectedCell) return;
    if (!foodName.trim()) { Alert.alert('Missing food name', 'Please enter a food name.'); return; }
    if (!mealType) { Alert.alert('Missing meal type', 'Please select a meal type.'); return; }

    const parsedCalories = Number(calories);
    const parsedProtein = Number(protein);
    const parsedCarbs = Number(carbs);
    const parsedFats = Number(fats);

    if (Number.isNaN(parsedCalories) || Number.isNaN(parsedProtein) || Number.isNaN(parsedCarbs) || Number.isNaN(parsedFats)) {
      Alert.alert('Invalid input', 'Please enter valid numbers for all macros.');
      return;
    }

    try {
      if (editingFoodId) await deleteFoodAndRefresh(editingFoodId);
      await addFoodAndRefresh({
        profileId,
        entryDate: selectedCell.date,
        mealType,
        foodName: foodName.trim(),
        calories: parsedCalories,
        protein: parsedProtein,
        carbs: parsedCarbs,
        fats: parsedFats,
      });
      Keyboard.dismiss();
      setFoodModalVisible(false);
      await refreshSelectedDay(selectedCell.date);
      onDataChanged();
    } catch (error) {
      console.error('failed to save food entry:', error);
      Alert.alert('Error', 'Could not save food entry.');
    }
  };

  const estimatedCaloriesWorkout = useMemo(() => {
    const parsedDuration = Number(durationMinutes);
    if (!workoutType || !intensity || latestWeight === null || Number.isNaN(parsedDuration) || parsedDuration <= 0) return 0;
    const met = getMetValue(workoutType, intensity);
    return met * latestWeight * (parsedDuration / 60);
  }, [workoutType, intensity, durationMinutes, latestWeight]);

  const handleSaveWorkout = async () => {
    if (!profileId || !selectedCell) return;
    if (!workoutName.trim()) { Alert.alert('Missing workout name', 'Please enter a workout name.'); return; }
    if (!workoutType) { Alert.alert('Missing workout type', 'Please select a workout type.'); return; }
    if (!intensity) { Alert.alert('Missing intensity', 'Please select an intensity.'); return; }

    const parsedDuration = Number(durationMinutes);
    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      Alert.alert('Invalid duration', 'Please enter a valid duration in minutes.');
      return;
    }

    try {
      if (editingWorkoutId) await deleteWorkoutAndRefresh(editingWorkoutId);

      if (workoutType === 'Strength Training') {
        const parsedWeightKg = Number(weightKg);
        const parsedReps = Number(reps);
        if (!exerciseName.trim()) { Alert.alert('Missing exercise', 'Please enter an exercise name.'); return; }
        if (Number.isNaN(parsedWeightKg) || parsedWeightKg <= 0) { Alert.alert('Invalid weight', 'Please enter a valid lifted weight in kg.'); return; }
        if (Number.isNaN(parsedReps) || parsedReps <= 0) { Alert.alert('Invalid reps', 'Please enter a valid rep count.'); return; }

        await addWorkoutAndRefresh({
          kind: 'strength',
          profileId,
          sessionDate: selectedCell.date,
          name: workoutName.trim(),
          notes: notes.trim(),
          workoutType,
          durationMinutes: parsedDuration,
          intensity,
          bodyWeightKg: latestWeight,
          estimatedCalories: estimatedCaloriesWorkout,
          exerciseName: exerciseName.trim(),
          weightKg: parsedWeightKg,
          reps: parsedReps,
        });
      } else if (workoutType === 'Running') {
        const parsedDistanceKm = Number(distanceKm);
        if (Number.isNaN(parsedDistanceKm) || parsedDistanceKm <= 0) { Alert.alert('Invalid distance', 'Please enter a valid running distance in km.'); return; }

        await addWorkoutAndRefresh({
          kind: 'run',
          profileId,
          sessionDate: selectedCell.date,
          name: workoutName.trim(),
          notes: notes.trim(),
          workoutType,
          durationMinutes: parsedDuration,
          intensity,
          bodyWeightKg: latestWeight,
          estimatedCalories: estimatedCaloriesWorkout,
          distanceKm: parsedDistanceKm,
        });
      } else {
        await addWorkoutAndRefresh({
          kind: 'general',
          profileId,
          sessionDate: selectedCell.date,
          name: workoutName.trim(),
          notes: notes.trim(),
          workoutType,
          durationMinutes: parsedDuration,
          intensity,
          bodyWeightKg: latestWeight,
          estimatedCalories: estimatedCaloriesWorkout,
        });
      }
      Keyboard.dismiss();
      setWorkoutModalVisible(false);
      await refreshSelectedDay(selectedCell.date);
      onDataChanged();
    } catch (error) {
      console.error('failed to save workout session:', error);
      Alert.alert('Error', 'Could not save workout session.');
    }
  };

  const handleSaveWeight = async () => {
    if (!profileId || !selectedCell) return;
    const parsedWeight = Number(bodyWeight);
    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid body weight', 'Please enter a valid body weight in kg.');
      return;
    }

    try {
      if (editingWeightId) await deleteBodyMetricAndRefresh(editingWeightId);
      await addBodyMetricAndRefresh({
        profileId,
        entryDate: selectedCell.date,
        bodyWeight: parsedWeight,
      });
      Keyboard.dismiss();
      setWeightModalVisible(false);
      await refreshSelectedDay(selectedCell.date);
      onDataChanged();
    } catch (error) {
      console.error('failed to save weight entry:', error);
      Alert.alert('Error', 'Could not save weight entry.');
    }
  };

  if (!activeMonth) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.emptyText}>No data available.</Text>
      </View>
    );
  }

  const rows = buildCalendarCells(activeMonth);
  const dayMetric = bodyMetrics.find((m) => m.entry_date === selectedCell?.date);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.monthHeader}>
        <Pressable
          style={[styles.monthNavButton, monthIndex <= 0 && styles.monthNavButtonDisabled]}
          onPress={goPreviousMonth}
          disabled={monthIndex <= 0}
        >
          <Text
            style={[
              styles.monthNavButtonText,
              monthIndex <= 0 && styles.monthNavButtonTextDisabled,
            ]}
          >
            ←
          </Text>
        </Pressable>

        <Text style={styles.monthTitle}>{getMonthTitle(activeMonth)}</Text>

        <Pressable
          style={[
            styles.monthNavButton,
            monthIndex >= availableMonths.length - 1 && styles.monthNavButtonDisabled,
          ]}
          onPress={goNextMonth}
          disabled={monthIndex >= availableMonths.length - 1}
        >
          <Text
            style={[
              styles.monthNavButtonText,
              monthIndex >= availableMonths.length - 1 &&
                styles.monthNavButtonTextDisabled,
            ]}
          >
            →
          </Text>
        </Pressable>
      </View>

      <View style={styles.calendarHeaderRow}>
        {dayLabels.map((label) => (
          <Text key={label} style={styles.calendarHeaderCell}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.calendarWeekRow}>
            {row.map((cell, colIndex) => {
              const isSelected = selectedCell?.date === cell?.date;

              return (
                <Pressable
                  key={`${rowIndex}-${colIndex}`}
                  disabled={!cell}
                  onPress={() => {
                    if (cell) {
                      void handleSelectDate({
                        date: cell.date,
                        count: cell.count,
                      });
                    }
                  }}
                  style={[
                    styles.calendarCell,
                    {
                      backgroundColor: cell ? getColor(cell.count) : 'transparent',
                      borderWidth: cell && isSelected ? 2 : 0,
                      borderColor: cell && isSelected ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  {cell ? (
                    <>
                      <Text
                        style={[
                          styles.calendarDayNumber,
                          {
                            color:
                              cell.count >= 2
                                ? theme.background
                                : theme.text,
                          },
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>
                      {cell.count > 0 ? (
                        <Text
                          style={[
                            styles.calendarCountText,
                            {
                              color:
                                cell.count >= 2
                                  ? theme.background
                                  : theme.textMuted,
                            },
                          ]}
                        >
                          {cell.count}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.heatmapLegendRow}>
        <Text style={styles.heatmapLegendText}>Less</Text>
        <View style={[styles.heatmapLegendCell, { backgroundColor: theme.background }]} />
        <View style={[styles.heatmapLegendCell, { backgroundColor: theme.border }]} />
        <View style={[styles.heatmapLegendCell, { backgroundColor: theme.textMuted }]} />
        <View style={[styles.heatmapLegendCell, { backgroundColor: theme.text }]} />
        <Text style={styles.heatmapLegendText}>More</Text>
      </View>

      {selectedCell && selectedBreakdown ? (
        <View style={styles.selectedDayCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <Text style={[styles.selectedDayTitle, { marginBottom: 0 }]}>
              {formatReadableDate(selectedCell.date)}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionAddButton} onPress={openWeightModal}><Text style={styles.actionAddButtonText}>+ Weight</Text></Pressable>
            <Pressable style={styles.actionAddButton} onPress={openFoodModal}><Text style={styles.actionAddButtonText}>+ Food</Text></Pressable>
            <Pressable style={styles.actionAddButton} onPress={() => setQuickAddPageVisible(true)}><Text style={styles.actionAddButtonText}>+ Quick Add</Text></Pressable>
            <Pressable style={styles.actionAddButton} onPress={openWorkoutModal}><Text style={styles.actionAddButtonText}>+ Workout</Text></Pressable>
          </View>

          <Text style={styles.selectedDayText}>
            Calories in: {selectedBreakdown.totalCaloriesIn.toFixed(0)} kcal
          </Text>
          <Text style={styles.selectedDayText}>
            Calories out: {selectedBreakdown.totalCaloriesOut.toFixed(0)} kcal
          </Text>
          <Text style={styles.selectedDayText}>
            Food entries: {selectedBreakdown.foodEntryCount}
          </Text>
          <Text style={styles.selectedDayText}>
            Workouts: {selectedBreakdown.workoutCount}
          </Text>

          <View style={[styles.detailRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }]}>
            <Text style={[styles.selectedDayText, { marginBottom: 0 }]}>
              Body weight logged:{' '}
              {selectedBreakdown.hasBodyWeightEntry
                ? `${selectedBreakdown.bodyWeight?.toFixed(1)} kg`
                : 'No'}
            </Text>
            {dayMetric && (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={() => handleEditWeight(dayMetric.id, dayMetric.body_weight)}>
                  <Text style={styles.editActionText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteWeight(dayMetric.id)}>
                  <Text style={styles.deleteActionText}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>

          {selectedBreakdown.foods.length > 0 ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Foods</Text>
              {selectedBreakdown.foods.map((food) => (
                <View key={food.id} style={[styles.detailRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.detailMainText}>
                      {food.mealType} • {food.name}
                    </Text>
                    <Text style={styles.detailSubText}>
                      {food.calories.toFixed(0)} kcal | P {food.protein.toFixed(1)} | C{' '}
                      {food.carbs.toFixed(1)} | F {food.fats.toFixed(1)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Pressable onPress={() => handleEditFood(food.id)}>
                      <Text style={styles.editActionText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteFood(food.id)}>
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {selectedBreakdown.workouts.length > 0 ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Workouts</Text>
              {selectedBreakdown.workouts.map((workout) => (
                <View key={workout.id} style={[styles.detailRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.detailMainText}>
                      {workout.name}
                      {workout.workoutType ? ` • ${workout.workoutType}` : ''}
                    </Text>
                    <Text style={styles.detailSubText}>
                      {workout.durationMinutes !== null
                        ? `${workout.durationMinutes} min`
                        : 'Duration -'}{' '}
                      | {workout.estimatedCalories.toFixed(0)} kcal burned
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Pressable onPress={() => handleEditWorkout(workout.id)}>
                      <Text style={styles.editActionText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteWorkout(workout.id)}>
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.cardSubtext}>Tap a day to view details.</Text>
      )}

      {/* food modal */}
      <Modal visible={foodModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingFoodId ? 'Edit Food Entry' : 'Add Food Entry'}</Text>
              <TextInput placeholder="Food name" placeholderTextColor={theme.textMuted} value={foodName} onChangeText={setFoodName} style={styles.input} />
              <View style={styles.pickerContainer}>
                <Picker selectedValue={mealType} onValueChange={(itemValue) => setMealType(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
                  <Picker.Item label="Select meal type..." value="" color={theme.textMuted} />
                  <Picker.Item label="Breakfast" value="Breakfast" color={theme.text} />
                  <Picker.Item label="Lunch" value="Lunch" color={theme.text} />
                  <Picker.Item label="Dinner" value="Dinner" color={theme.text} />
                  <Picker.Item label="Supper" value="Supper" color={theme.text} />
                  <Picker.Item label="Drink" value="Drink" color={theme.text} />
                  <Picker.Item label="Snack" value="Snack" color={theme.text} />
                </Picker>
              </View>
              <TextInput placeholder="Calories" placeholderTextColor={theme.textMuted} value={calories} onChangeText={setCalories} keyboardType="decimal-pad" style={styles.input} />
              <TextInput placeholder="Protein (g)" placeholderTextColor={theme.textMuted} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" style={styles.input} />
              <TextInput placeholder="Carbs (g)" placeholderTextColor={theme.textMuted} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" style={styles.input} />
              <TextInput placeholder="Fats (g)" placeholderTextColor={theme.textMuted} value={fats} onChangeText={setFats} keyboardType="decimal-pad" style={styles.input} />
              <View style={styles.modalActions}>
                <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => { Keyboard.dismiss(); setFoodModalVisible(false); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.saveButton]} onPress={handleSaveFood}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* workout modal */}
      <Modal visible={workoutModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingWorkoutId ? 'Edit Workout Session' : 'Add Workout Session'}</Text>
              <TextInput placeholder="Workout name" placeholderTextColor={theme.textMuted} value={workoutName} onChangeText={setWorkoutName} style={styles.input} />
              <View style={styles.pickerContainer}>
                <Picker selectedValue={workoutType} onValueChange={(itemValue) => { setWorkoutType(itemValue); setIntensity(''); }} style={styles.picker} itemStyle={styles.pickerItem}>
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
              <TextInput placeholder="Duration (minutes)" placeholderTextColor={theme.textMuted} value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="decimal-pad" style={styles.input} />
              {workoutType !== '' ? (
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={intensity} onValueChange={(itemValue) => setIntensity(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
                    <Picker.Item label="Select specification..." value="" color={theme.textMuted} />
                    {getIntensityOptions(workoutType).map((option) => (
                      <Picker.Item key={option} label={option} value={option} color={theme.text} />
                    ))}
                  </Picker>
                </View>
              ) : null}
              {workoutType === 'Strength Training' ? (
                <>
                  <TextInput placeholder="Exercise name" placeholderTextColor={theme.textMuted} value={exerciseName} onChangeText={setExerciseName} style={styles.input} />
                  <TextInput placeholder="Weight lifted (kg)" placeholderTextColor={theme.textMuted} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" style={styles.input} />
                  <TextInput placeholder="Reps" placeholderTextColor={theme.textMuted} value={reps} onChangeText={setReps} keyboardType="numeric" style={styles.input} />
                </>
              ) : null}
              {workoutType === 'Running' ? (
                <TextInput placeholder="Distance (km)" placeholderTextColor={theme.textMuted} value={distanceKm} onChangeText={setDistanceKm} keyboardType="decimal-pad" style={styles.input} />
              ) : null}
              <View style={styles.calorieCard}>
                <Text style={styles.calorieCardLabel}>Estimated calories burned</Text>
                <Text style={styles.calorieCardValue}>{estimatedCaloriesWorkout > 0 ? `${estimatedCaloriesWorkout.toFixed(0)} kcal` : 'N/A'}</Text>
                <Text style={styles.calorieCardHint}>{latestWeight !== null ? `Using latest body weight: ${latestWeight.toFixed(1)} kg` : 'Add a body-weight entry to enable calorie estimates'}</Text>
              </View>
              <TextInput placeholder="Notes (optional)" placeholderTextColor={theme.textMuted} value={notes} onChangeText={setNotes} style={[styles.input, styles.notesInput]} multiline />
              <View style={styles.modalActions}>
                <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => { Keyboard.dismiss(); setWorkoutModalVisible(false); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.saveButton]} onPress={handleSaveWorkout}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* weight modal */}
      <Modal visible={weightModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingWeightId ? 'Edit Weight Entry' : 'Add Weight Entry'}</Text>
              <TextInput placeholder="Body weight (kg)" placeholderTextColor={theme.textMuted} value={bodyWeight} onChangeText={setBodyWeight} keyboardType="decimal-pad" style={styles.input} />
              <View style={styles.modalActions}>
                <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => { Keyboard.dismiss(); setWeightModalVisible(false); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.saveButton]} onPress={handleSaveWeight}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* full screen quick add modal */}
      <Modal visible={quickAddPageVisible} animationType="slide" transparent={false}>
        <View style={styles.quickAddContainer}>
          <View style={styles.quickAddHeader}>
            <Text style={styles.quickAddTitle}>Quick Add</Text>
            <Pressable onPress={() => setQuickAddPageVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.quickAddScroll} contentContainerStyle={styles.quickAddScrollContent} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.createTemplateButton} onPress={() => handleOpenQuickAddEditor()}>
              <Text style={styles.createTemplateButtonText}>+ Create New Template</Text>
            </Pressable>

            {Object.keys(quickAddGroups).length === 0 ? (
              <Text style={styles.emptyText}>No saved items yet. Create a template to easily add frequent meals.</Text>
            ) : (
              Object.keys(quickAddGroups).map((groupType) => (
                <View key={groupType} style={styles.quickAddGroup}>
                  <Text style={styles.quickAddGroupTitle}>{groupType}</Text>
                  {quickAddGroups[groupType].map((item) => (
                    <View key={item.id} style={styles.quickAddCard}>
                      <View style={styles.quickAddCardRow}>
                        <View style={styles.quickAddCardContent}>
                          <Text style={styles.quickAddCardTitle}>{item.food_name}</Text>
                          <Text style={styles.quickAddCardMacros}>
                            {item.calories} kcal | P {item.protein} | C {item.carbs} | F {item.fats}
                          </Text>
                        </View>
                        <Pressable style={styles.quickAddPlusButton} onPress={() => handleSelectQuickAdd(item)}>
                          <Text style={styles.quickAddPlusText}>+</Text>
                        </Pressable>
                      </View>
                      <View style={styles.actionRowCard}>
                        <Pressable style={styles.editButton} onPress={() => handleOpenQuickAddEditor(item)}>
                          <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable style={styles.deleteButton} onPress={() => handleDeleteQuickAdd(item.id)}>
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* quick add template creation modal */}
      <Modal visible={quickAddFormVisible} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} />
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingQuickAddId ? 'Edit Template' : 'Save New Template'}
              </Text>

              <TextInput placeholder="Food name" placeholderTextColor={theme.textMuted} value={foodName} onChangeText={setFoodName} style={styles.input} />

              <View style={styles.pickerContainer}>
                <Picker selectedValue={mealType} onValueChange={(itemValue) => setMealType(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
                  <Picker.Item label="Select meal type..." value="" color={theme.textMuted} />
                  <Picker.Item label="Breakfast" value="Breakfast" color={theme.text} />
                  <Picker.Item label="Lunch" value="Lunch" color={theme.text} />
                  <Picker.Item label="Dinner" value="Dinner" color={theme.text} />
                  <Picker.Item label="Supper" value="Supper" color={theme.text} />
                  <Picker.Item label="Drink" value="Drink" color={theme.text} />
                  <Picker.Item label="Snack" value="Snack" color={theme.text} />
                </Picker>
              </View>

              <TextInput placeholder="Calories" placeholderTextColor={theme.textMuted} value={calories} onChangeText={setCalories} keyboardType="decimal-pad" style={styles.input} />
              <TextInput placeholder="Protein (g)" placeholderTextColor={theme.textMuted} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" style={styles.input} />
              <TextInput placeholder="Carbs (g)" placeholderTextColor={theme.textMuted} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" style={styles.input} />
              <TextInput placeholder="Fats (g)" placeholderTextColor={theme.textMuted} value={fats} onChangeText={setFats} keyboardType="decimal-pad" style={styles.input} />

              <View style={styles.modalActions}>
                <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => { Keyboard.dismiss(); setQuickAddFormVisible(false); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.saveButton]} onPress={handleSaveQuickAdd}>
                  <Text style={styles.saveButtonText}>Save Template</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

  const profileId = useAppStore((state) => state.profile?.id);
  const calorieTarget = useAppStore((state) => state.profile?.calorie_target ?? null);

  const [mode, setMode] = useState<AnalyticsMode>('daily');
  const [series, setSeries] = useState<AnalyticsPoint[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [allTimeSummary, setAllTimeSummary] = useState<AllTimeSummary | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!profileId) {
      setSeries([]);
      setHeatmapData([]);
      setAllTimeSummary(null);
      return;
    }

    try {
      const [data, heatmap, allTime] = await Promise.all([
        getAnalyticsSeries(profileId, mode),
        getHeatmapData(profileId, 370),
        getAllTimeSummary(profileId),
      ]);

      setSeries(data);
      setHeatmapData(heatmap);
      setAllTimeSummary(allTime);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, [profileId, mode]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics])
  );

  // calculate averages based on all time summary data
  const { avgIn, avgOut, avgNet, avgWeight, periodLabel } = useMemo(() => {
    if (!allTimeSummary) {
      return { avgIn: 0, avgOut: 0, avgNet: 0, avgWeight: null, periodLabel: 'Daily' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysElapsed = 1;
    if (allTimeSummary.firstLogDate) {
      const firstDate = new Date(allTimeSummary.firstLogDate);
      firstDate.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(today.getTime() - firstDate.getTime());
      daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    let scale = daysElapsed;
    let label = 'Daily';

    if (mode === 'weekly') {
      scale = daysElapsed / 7;
      label = 'Weekly';
    } else if (mode === 'monthly') {
      scale = daysElapsed / 30.4;
      label = 'Monthly';
    }

    const inScaled = allTimeSummary.totalCaloriesIn / scale;
    const outScaled = allTimeSummary.totalCaloriesOut / scale;
    const netScaled = inScaled - outScaled;

    return {
      avgIn: inScaled,
      avgOut: outScaled,
      avgNet: netScaled,
      avgWeight: allTimeSummary.avgWeight,
      periodLabel: label,
    };
  }, [allTimeSummary, mode]);

  const caloriesInRolling = calculateRollingAverage(
    series.map((item) => item.caloriesIn),
    7
  );

  const weightRolling = calculateRollingAverage(
    series.map((item) => item.avgWeight),
    7
  );

  const caloriesInLine = series.map((item) => ({
    label: item.label,
    value: Math.round(item.caloriesIn),
  }));

  const caloriesInRollingLine = caloriesInRolling.map((value, index) =>
    value !== null
      ? {
          label: series[index].label,
          value: Number(value.toFixed(0)),
        }
      : null
  );

  const workoutLine = series.map((item) => ({
    label: item.label,
    value: item.workouts,
  }));

  const weightLine = series.map((item) =>
    item.avgWeight !== null
      ? {
          label: item.label,
          value: Number(item.avgWeight.toFixed(1)),
        }
      : null
  );

  const weightRollingLine = weightRolling.map((value, index) =>
    value !== null
      ? {
          label: series[index].label,
          value: Number(value.toFixed(1)),
        }
      : null
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Daily, weekly, and monthly trends with deeper insights
      </Text>

      <View style={styles.toggleRow}>
        {(['daily', 'weekly', 'monthly'] as AnalyticsMode[]).map((item) => (
          <Pressable
            key={item}
            style={[
              styles.toggleButton,
              mode === item && styles.toggleButtonActive,
            ]}
            onPress={() => setMode(item)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                mode === item && styles.toggleButtonTextActive,
              ]}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg {periodLabel} In</Text>
          <Text style={styles.summaryValue}>{avgIn.toFixed(0)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg {periodLabel} Out</Text>
          <Text style={styles.summaryValue}>{avgOut.toFixed(0)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg {periodLabel} Net</Text>
          <Text style={styles.summaryValue}>{avgNet.toFixed(0)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg Weight</Text>
          <Text style={styles.summaryValue}>
            {avgWeight !== null ? avgWeight.toFixed(1) : '--'}
          </Text>
        </View>
      </View>

      <Heatmap
        title="Consistency Heatmap"
        data={heatmapData}
        profileId={profileId}
        theme={theme}
        styles={styles}
        onDataChanged={loadAnalytics}
      />

      <MultiLineChart
        title="Calories vs Target"
        primary={caloriesInLine}
        secondary={caloriesInRollingLine}
        primaryColor={theme.text}
        secondaryColor={theme.textMuted}
        primaryLabel="Actual"
        secondaryLabel="7-period Avg"
        targetValue={calorieTarget}
        targetLabel="Target"
        targetColor={theme.danger}
        theme={theme}
        styles={styles}
      />

      <MultiLineChart
        title="Workout Frequency"
        primary={workoutLine}
        primaryColor={theme.text}
        primaryLabel="Workouts"
        theme={theme}
        styles={styles}
      />

      <MultiLineChart
        title="Weight Trend"
        primary={weightLine}
        secondary={weightRollingLine}
        primaryColor={theme.text}
        secondaryColor={theme.textMuted}
        primaryLabel="Actual Weight"
        secondaryLabel="7-period Avg"
        theme={theme}
        styles={styles}
      />
    </ScrollView>
  );
}

const getStyles = (theme: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 100,
    padding: 6,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: theme.text,
  },
  toggleButtonText: {
    color: theme.textMuted,
    fontWeight: '700',
    fontSize: 15,
  },
  toggleButtonTextActive: {
    color: theme.background,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 20,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.textMuted,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: theme.text,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
    color: theme.text,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMuted,
  },
  cardSubtext: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: theme.textMuted,
    textAlign: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 100,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavButtonDisabled: {
    opacity: 0.5,
  },
  monthNavButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  monthNavButtonTextDisabled: {
    color: theme.textMuted,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.text,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calendarHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.textMuted,
  },
  calendarGrid: {
    gap: 6,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  calendarDayNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarCountText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  heatmapLegendCell: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  heatmapLegendText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textMuted,
    marginHorizontal: 8,
  },
  selectedDayCard: {
    marginTop: 20,
    backgroundColor: theme.background,
    borderRadius: 20,
    padding: 20,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: theme.text,
    marginBottom: 12,
  },
  selectedDayText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 6,
  },
  detailSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.surface,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.textMuted,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailMainText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  detailSubText: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionRowCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionAddButton: {
    backgroundColor: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  actionAddButtonText: {
    color: theme.background,
    fontSize: 12,
    fontWeight: '700',
  },
  editActionText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 13,
  },
  deleteActionText: {
    color: theme.danger,
    fontWeight: '700',
    fontSize: 13,
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
  quickAddContainer: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  quickAddHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.surface,
  },
  quickAddTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    color: theme.text,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    color: theme.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  quickAddScroll: {
    flex: 1,
  },
  quickAddScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 60,
  },
  createTemplateButton: {
    backgroundColor: theme.surface,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
  },
  createTemplateButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  quickAddGroup: {
    marginBottom: 32,
  },
  quickAddGroupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  quickAddCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  quickAddCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddCardContent: {
    flex: 1,
    paddingRight: 16,
  },
  quickAddCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 6,
  },
  quickAddCardMacros: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textMuted,
  },
  quickAddPlusButton: {
    backgroundColor: theme.text,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAddPlusText: {
    color: theme.background,
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
  },
});