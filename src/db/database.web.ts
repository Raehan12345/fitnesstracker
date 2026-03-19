// eslint-disable-next-line import/no-named-as-default
import Dexie from 'dexie';
import type { Table } from 'dexie';

export type Profile = {
  id: number;
  name: string;
  age: number | null;
  sex: string | null;
  height_cm: number | null;
  starting_weight_kg: number | null;
  calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  created_at: string;
};

export type CreateProfileInput = {
  name: string;
  age: number;
  sex: string;
  heightCm: number;
  startingWeightKg: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
};

export type FoodEntry = {
  id: number;
  profile_id: number;
  entry_date: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
};

export type FoodEntryInput = {
  profileId: number;
  entryDate: string;
  mealType: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type QuickAddFood = {
  id: number;
  profile_id: number;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
};

export type QuickAddFoodInput = {
  profileId: number;
  mealType: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type WorkoutSession = {
  id: number;
  profile_id: number;
  session_date: string;
  name: string;
  notes: string | null;
  workout_type: string | null;
  duration_minutes: number | null;
  intensity: string | null;
  body_weight_kg: number | null;
  estimated_calories: number | null;
  created_at: string;

  exercise_name?: string | null;
  weight_kg?: number | null;
  reps?: number | null;

  distance_km?: number | null;
  run_duration_minutes?: number | null;
};

export type WorkoutSessionInput = {
  profileId: number;
  sessionDate: string;
  name: string;
  notes: string;
  workoutType: string;
  durationMinutes: number;
  intensity: string;
  bodyWeightKg: number | null;
  estimatedCalories: number;
};

export type StrengthEntryInput = {
  workoutSessionId: number;
  exerciseName: string;
  weightKg: number;
  reps: number;
};

export type RunEntryInput = {
  workoutSessionId: number;
  distanceKm: number;
  durationMinutes: number;
};

export type BodyMetric = {
  id: number;
  profile_id: number;
  entry_date: string;
  body_weight: number;
  created_at: string;
};

export type BodyMetricInput = {
  profileId: number;
  entryDate: string;
  bodyWeight: number;
};

export type StrengthPb = {
  exerciseName: string;
  weightKg: number;
  reps: number;
  sessionDate: string;
};

export type RunPb = {
  distanceKm: number;
  durationMinutes: number;
  pacePerKm: number;
  sessionDate: string;
};

export type RunPbSummary = {
  longestRun: RunPb | null;
  fastestPace: RunPb | null;
  fastest5k: RunPb | null;
};

export type AnalyticsMode = 'daily' | 'weekly' | 'monthly';

export type AnalyticsPoint = {
  key: string;
  label: string;
  caloriesIn: number;
  caloriesOut: number;
  netCalories: number;
  workouts: number;
  avgWeight: number | null;
};

export type HeatmapCell = {
  date: string;
  count: number;
};

type ProfileRow = Profile;
type FoodEntryRow = FoodEntry;
type QuickAddFoodRow = QuickAddFood;

export type WorkoutSessionRow = {
  id?: number;
  profile_id: number;
  session_date: string;
  name: string;
  notes: string | null;
  workout_type: string | null;
  duration_minutes: number | null;
  intensity: string | null;
  body_weight_kg: number | null;
  estimated_calories: number | null;
  created_at: string;
};

export type StrengthEntryRow = {
  id?: number;
  workout_session_id: number;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  created_at: string;
};

export type RunEntryRow = {
  id?: number;
  workout_session_id: number;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
};

type BodyMetricRow = BodyMetric;

export type BackupPayload = {
  version: 1;
  exported_at: string;
  profiles: Profile[];
  food_entries: FoodEntry[];
  quick_add_foods: QuickAddFood[];
  workout_sessions: WorkoutSessionRow[];
  strength_entries: StrengthEntryRow[];
  run_entries: RunEntryRow[];
  body_metrics: BodyMetric[];
};

export type DayBreakdown = {
  date: string;
  foodEntryCount: number;
  workoutCount: number;
  hasBodyWeightEntry: boolean;
  bodyWeight: number | null;
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  foods: {
    id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    mealType: string;
  }[];
  workouts: {
    id: number;
    name: string;
    workoutType: string | null;
    estimatedCalories: number;
    durationMinutes: number | null;
  }[];
};

class MacroTrackerWebDB extends Dexie {
  profiles!: Table<ProfileRow, number>;
  food_entries!: Table<FoodEntryRow, number>;
  quick_add_foods!: Table<QuickAddFoodRow, number>;
  workout_sessions!: Table<WorkoutSessionRow, number>;
  strength_entries!: Table<StrengthEntryRow, number>;
  run_entries!: Table<RunEntryRow, number>;
  body_metrics!: Table<BodyMetricRow, number>;

  constructor() {
    super('macro_tracker_web');

    this.version(3).stores({
      profiles: '++id, name, created_at',
      food_entries: '++id, profile_id, entry_date, [profile_id+entry_date], meal_type, created_at',
      quick_add_foods: '++id, profile_id, meal_type, created_at',
      workout_sessions: '++id, profile_id, session_date, [profile_id+session_date], workout_type, created_at',
      strength_entries: '++id, workout_session_id, exercise_name, created_at',
      run_entries: '++id, workout_session_id, created_at',
      body_metrics: '++id, profile_id, entry_date, created_at',
    });
  }
}

const db = new MacroTrackerWebDB();

function nowIso() {
  return new Date().toISOString();
}

function parseDateString(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekKey(date: Date) {
  return formatDateKey(getWeekStart(date));
}

function getMonthKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

function getDailyPeriods(days = 7) {
  const periods: { key: string; label: string; start: Date }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    periods.push({ key: formatDateKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, start: d });
  }
  return periods;
}

function getWeeklyPeriods(weeks = 8) {
  const periods: { key: string; label: string; start: Date }[] = [];
  const currentWeekStart = getWeekStart(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - i * 7);
    periods.push({ key: formatDateKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, start: d });
  }
  return periods;
}

function getMonthlyPeriods(months = 6) {
  const periods: { key: string; label: string; start: Date }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({ key: getMonthKey(d), label: d.toLocaleString('en-US', { month: 'short' }), start: d });
  }
  return periods;
}

export async function initDatabase() {
  await db.open();
}

export async function resetDatabase() {
  await Promise.all([
    db.strength_entries.clear(),
    db.run_entries.clear(),
    db.food_entries.clear(),
    db.quick_add_foods.clear(),
    db.body_metrics.clear(),
    db.workout_sessions.clear(),
    db.profiles.clear(),
  ]);
}

export async function getDefaultProfile() {
  const profiles = await db.profiles.orderBy('id').toArray();
  return profiles[0] ?? null;
}

export async function createProfile(input: CreateProfileInput) {
  const id = await db.profiles.add({
    name: input.name,
    age: input.age,
    sex: input.sex,
    height_cm: input.heightCm,
    starting_weight_kg: input.startingWeightKg,
    calorie_target: input.calorieTarget,
    protein_target: input.proteinTarget,
    carbs_target: input.carbsTarget,
    fat_target: input.fatTarget,
    created_at: nowIso(),
  } as ProfileRow);
  return id;
}

export async function updateProfile(profileId: number, input: CreateProfileInput) {
  await db.profiles.update(profileId, {
    name: input.name,
    age: input.age,
    sex: input.sex,
    height_cm: input.heightCm,
    starting_weight_kg: input.startingWeightKg,
    calorie_target: input.calorieTarget,
    protein_target: input.proteinTarget,
    carbs_target: input.carbsTarget,
    fat_target: input.fatTarget,
  });
}

export async function addFoodEntry(input: FoodEntryInput) {
  await db.food_entries.add({
    profile_id: input.profileId,
    entry_date: input.entryDate,
    meal_type: input.mealType,
    food_name: input.foodName,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fats: input.fats,
    created_at: nowIso(),
  } as FoodEntryRow);
}

export async function deleteFoodEntry(id: number) {
  await db.food_entries.delete(id);
}

export async function getFoodEntriesByDate(profileId: number, entryDate: string) {
  const rows = await db.food_entries
    .where('[profile_id+entry_date]')
    .equals([profileId, entryDate] as [number, string])
    .reverse()
    .sortBy('id');
  return rows.reverse();
}

export async function addQuickAddFood(input: QuickAddFoodInput) {
  await db.quick_add_foods.add({
    profile_id: input.profileId,
    meal_type: input.mealType,
    food_name: input.foodName,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fats: input.fats,
    created_at: nowIso(),
  } as QuickAddFoodRow);
}

export async function updateQuickAddFood(id: number, input: QuickAddFoodInput) {
  await db.quick_add_foods.update(id, {
    meal_type: input.mealType,
    food_name: input.foodName,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fats: input.fats,
  });
}

export async function getQuickAddFoods(profileId: number) {
  const rows = await db.quick_add_foods
    .where('profile_id')
    .equals(profileId)
    .toArray();
  
  return rows.sort((a, b) => {
    if (a.meal_type !== b.meal_type) return a.meal_type.localeCompare(b.meal_type);
    return a.food_name.localeCompare(b.food_name);
  });
}

export async function deleteQuickAddFood(id: number) {
  await db.quick_add_foods.delete(id);
}

export async function getFoodSummaryByDate(profileId: number, entryDate: string) {
  const entries = await getFoodEntriesByDate(profileId, entryDate);
  return entries.reduce(
    (acc, entry) => {
      acc.totalCalories += entry.calories;
      acc.totalProtein += entry.protein;
      acc.totalCarbs += entry.carbs;
      acc.totalFats += entry.fats;
      acc.entryCount += 1;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, entryCount: 0 }
  );
}

export async function addWorkoutSession(input: WorkoutSessionInput) {
  const id = await db.workout_sessions.add({
    profile_id: input.profileId,
    session_date: input.sessionDate,
    name: input.name,
    notes: input.notes,
    workout_type: input.workoutType,
    duration_minutes: input.durationMinutes,
    intensity: input.intensity,
    body_weight_kg: input.bodyWeightKg,
    estimated_calories: input.estimatedCalories,
    created_at: nowIso(),
  });
  return id;
}

export async function addStrengthEntry(input: StrengthEntryInput) {
  await db.strength_entries.add({
    workout_session_id: input.workoutSessionId,
    exercise_name: input.exerciseName,
    weight_kg: input.weightKg,
    reps: input.reps,
    created_at: nowIso(),
  });
}

export async function addRunEntry(input: RunEntryInput) {
  await db.run_entries.add({
    workout_session_id: input.workoutSessionId,
    distance_km: input.distanceKm,
    duration_minutes: input.durationMinutes,
    created_at: nowIso(),
  });
}

export async function getWorkoutSessionsByDate(profileId: number, sessionDate: string) {
  const sessions = await db.workout_sessions
    .where('[profile_id+session_date]')
    .equals([profileId, sessionDate] as [number, string])
    .toArray();

  const strengthEntries = await db.strength_entries.toArray();
  const runEntries = await db.run_entries.toArray();

  return sessions
    .map((session) => {
      const strength = strengthEntries.find((entry) => entry.workout_session_id === session.id);
      const run = runEntries.find((entry) => entry.workout_session_id === session.id);

      return {
        ...session,
        exercise_name: strength?.exercise_name ?? null,
        weight_kg: strength?.weight_kg ?? null,
        reps: strength?.reps ?? null,
        distance_km: run?.distance_km ?? null,
        run_duration_minutes: run?.duration_minutes ?? null,
      } as WorkoutSession;
    })
    .sort((a, b) => b.id - a.id);
}

export async function deleteWorkoutSession(id: number) {
  const strengthRows = await db.strength_entries.where('workout_session_id').equals(id).toArray();
  const runRows = await db.run_entries.where('workout_session_id').equals(id).toArray();

  await Promise.all([
    ...strengthRows.map((row) => db.strength_entries.delete(row.id!)),
    ...runRows.map((row) => db.run_entries.delete(row.id!)),
    db.workout_sessions.delete(id),
  ]);
}

export async function getWorkoutSummaryByDate(profileId: number, sessionDate: string) {
  const sessions = await db.workout_sessions
    .where('[profile_id+session_date]')
    .equals([profileId, sessionDate] as [number, string])
    .toArray();

  return {
    workoutCount: sessions.length,
    totalCaloriesBurned: sessions.reduce((sum, row) => sum + (row.estimated_calories ?? 0), 0),
  };
}

export async function addBodyMetric(input: BodyMetricInput) {
  await db.body_metrics.add({
    profile_id: input.profileId,
    entry_date: input.entryDate,
    body_weight: input.bodyWeight,
    created_at: nowIso(),
  } as BodyMetricRow);
}

export async function getBodyMetrics(profileId: number) {
  const rows = await db.body_metrics.where('profile_id').equals(profileId).toArray();
  return rows.sort((a, b) => {
    if (a.entry_date === b.entry_date) return b.id - a.id;
    return a.entry_date < b.entry_date ? 1 : -1;
  });
}

export async function deleteBodyMetric(id: number) {
  await db.body_metrics.delete(id);
}

export async function getLatestBodyWeight(profileId: number) {
  const rows = await getBodyMetrics(profileId);
  return rows.length > 0 ? rows[0].body_weight : null;
}

export async function getStrengthPbs(profileId: number) {
  const sessions = await db.workout_sessions.where('profile_id').equals(profileId).toArray();
  const strengthRows = await db.strength_entries.toArray();

  const joined = strengthRows
    .map((row) => {
      const session = sessions.find((s) => s.id === row.workout_session_id);
      if (!session) return null;

      return {
        exerciseName: row.exercise_name,
        weightKg: row.weight_kg,
        reps: row.reps,
        sessionDate: session.session_date,
      } as StrengthPb;
    })
    .filter((row): row is StrengthPb => row !== null)
    .sort((a, b) => {
      if (a.exerciseName !== b.exerciseName) return a.exerciseName.localeCompare(b.exerciseName);
      if (a.weightKg !== b.weightKg) return b.weightKg - a.weightKg;
      if (a.reps !== b.reps) return b.reps - a.reps;
      return a.sessionDate < b.sessionDate ? 1 : -1;
    });

  const map = new Map<string, StrengthPb>();
  for (const row of joined) {
    if (!map.has(row.exerciseName)) {
      map.set(row.exerciseName, row);
    }
  }

  return Array.from(map.values());
}

export async function getRunPbs(profileId: number): Promise<RunPbSummary> {
  const sessions = await db.workout_sessions.where('profile_id').equals(profileId).toArray();
  const runRows = await db.run_entries.toArray();

  const mapped = runRows
    .map((row) => {
      const session = sessions.find((s) => s.id === row.workout_session_id);
      if (!session) return null;
      if (row.distance_km <= 0 || row.duration_minutes <= 0) return null;

      return {
        distanceKm: row.distance_km,
        durationMinutes: row.duration_minutes,
        pacePerKm: row.duration_minutes / row.distance_km,
        sessionDate: session.session_date,
      } as RunPb;
    })
    .filter((row): row is RunPb => row !== null);

  if (mapped.length === 0) {
    return { longestRun: null, fastestPace: null, fastest5k: null };
  }

  const longestRun = mapped.reduce(
    (best, current) => (!best || current.distanceKm > best.distanceKm ? current : best),
    null as RunPb | null
  );

  const fastestPace = mapped.reduce(
    (best, current) => (!best || current.pacePerKm < best.pacePerKm ? current : best),
    null as RunPb | null
  );

  const fiveKs = mapped.filter((run) => run.distanceKm >= 4.95 && run.distanceKm <= 5.05);

  const fastest5k = fiveKs.reduce(
    (best, current) => !best || current.durationMinutes < best.durationMinutes ? current : best,
    null as RunPb | null
  );

  return { longestRun, fastestPace, fastest5k };
}

export async function getAnalyticsSeries(profileId: number, mode: AnalyticsMode): Promise<AnalyticsPoint[]> {
  const periods = mode === 'daily' ? getDailyPeriods(7) : mode === 'weekly' ? getWeeklyPeriods(8) : getMonthlyPeriods(6);

  const foodRows = await db.food_entries.where('profile_id').equals(profileId).toArray();
  const workoutRows = await db.workout_sessions.where('profile_id').equals(profileId).toArray();
  const weightRows = await db.body_metrics.where('profile_id').equals(profileId).toArray();

  const map = new Map<string, AnalyticsPoint>();
  for (const period of periods) {
    map.set(period.key, { key: period.key, label: period.label, caloriesIn: 0, caloriesOut: 0, netCalories: 0, workouts: 0, avgWeight: null });
  }

  function resolveKey(dateStr: string) {
    const date = parseDateString(dateStr);
    if (mode === 'daily') return formatDateKey(date);
    if (mode === 'weekly') return getWeekKey(date);
    return getMonthKey(date);
  }

  for (const row of foodRows) {
    const key = resolveKey(row.entry_date);
    const point = map.get(key);
    if (point) point.caloriesIn += row.calories ?? 0;
  }

  for (const row of workoutRows) {
    const key = resolveKey(row.session_date);
    const point = map.get(key);
    if (point) {
      point.caloriesOut += row.estimated_calories ?? 0;
      point.workouts += 1;
    }
  }

  const weightBuckets = new Map<string, number[]>();
  for (const row of weightRows) {
    const key = resolveKey(row.entry_date);
    if (!weightBuckets.has(key)) weightBuckets.set(key, []);
    weightBuckets.get(key)!.push(row.body_weight);
  }

  for (const [key, weights] of weightBuckets.entries()) {
    const point = map.get(key);
    if (point && weights.length > 0) {
      point.avgWeight = weights.reduce((sum, value) => sum + value, 0) / weights.length;
    }
  }

  return Array.from(map.values()).map((point) => ({
    ...point,
    netCalories: point.caloriesIn - point.caloriesOut,
  }));
}

export function calculateRollingAverage(values: (number | null)[], windowSize = 7) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1).filter((value): value is number => value !== null);
    if (slice.length === 0) return null;
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

export async function getHeatmapData(profileId: number, days = 90): Promise<HeatmapCell[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const foodRows = await db.food_entries.where('profile_id').equals(profileId).toArray();
  const workoutRows = await db.workout_sessions.where('profile_id').equals(profileId).toArray();
  const bodyRows = await db.body_metrics.where('profile_id').equals(profileId).toArray();

  const counts = new Map<string, number>();

  function addCount(dateStr: string, amount = 1) {
    counts.set(dateStr, (counts.get(dateStr) ?? 0) + amount);
  }

  for (const row of foodRows) {
    if (row.entry_date >= formatDateKey(start)) addCount(row.entry_date);
  }

  for (const row of workoutRows) {
    if (row.session_date >= formatDateKey(start)) addCount(row.session_date);
  }

  for (const row of bodyRows) {
    if (row.entry_date >= formatDateKey(start)) addCount(row.entry_date);
  }

  const result: HeatmapCell[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = formatDateKey(d);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return result;
}

export async function exportBackupData(): Promise<BackupPayload> {
  const [profiles, food_entries, quick_add_foods, workout_sessions, strength_entries, run_entries, body_metrics] = await Promise.all([
    db.profiles.toArray(),
    db.food_entries.toArray(),
    db.quick_add_foods.toArray(),
    db.workout_sessions.toArray(),
    db.strength_entries.toArray(),
    db.run_entries.toArray(),
    db.body_metrics.toArray(),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    profiles,
    food_entries,
    quick_add_foods,
    workout_sessions,
    strength_entries,
    run_entries,
    body_metrics,
  };
}

export async function importBackupData(payload: BackupPayload) {
  if (!payload || payload.version !== 1) {
    throw new Error('Invalid backup file.');
  }

  await resetDatabase();

  if (payload.profiles.length > 0) await db.profiles.bulkAdd(payload.profiles);
  if (payload.food_entries.length > 0) await db.food_entries.bulkAdd(payload.food_entries);
  if (payload.quick_add_foods?.length > 0) await db.quick_add_foods.bulkAdd(payload.quick_add_foods);
  if (payload.workout_sessions.length > 0) await db.workout_sessions.bulkAdd(payload.workout_sessions);
  if (payload.strength_entries.length > 0) await db.strength_entries.bulkAdd(payload.strength_entries);
  if (payload.run_entries.length > 0) await db.run_entries.bulkAdd(payload.run_entries);
  if (payload.body_metrics.length > 0) await db.body_metrics.bulkAdd(payload.body_metrics);
}

export async function getDayBreakdown(profileId: number, date: string): Promise<DayBreakdown> {
  const [foodRows, workoutRows, bodyRows] = await Promise.all([
    db.food_entries.where('[profile_id+entry_date]').equals([profileId, date] as [number, string]).toArray(),
    db.workout_sessions.where('[profile_id+session_date]').equals([profileId, date] as [number, string]).toArray(),
    db.body_metrics.where('profile_id').equals(profileId).filter((row) => row.entry_date === date).toArray(),
  ]);

  const latestBodyMetric = bodyRows.length > 0 ? [...bodyRows].sort((a, b) => b.id - a.id)[0] : null;

  return {
    date,
    foodEntryCount: foodRows.length,
    workoutCount: workoutRows.length,
    hasBodyWeightEntry: bodyRows.length > 0,
    bodyWeight: latestBodyMetric ? latestBodyMetric.body_weight : null,
    totalCaloriesIn: foodRows.reduce((sum, row) => sum + row.calories, 0),
    totalCaloriesOut: workoutRows.reduce((sum, row) => sum + (row.estimated_calories ?? 0), 0),
    foods: foodRows.slice().sort((a, b) => b.id - a.id).map((row) => ({
      id: row.id, name: row.food_name, calories: row.calories, protein: row.protein, carbs: row.carbs, fats: row.fats, mealType: row.meal_type,
    })),
    workouts: workoutRows.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).map((row) => ({
      id: row.id!, name: row.name, workoutType: row.workout_type, estimatedCalories: row.estimated_calories ?? 0, durationMinutes: row.duration_minutes,
    })),
  };
}

export type AllTimeSummary = {
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  avgWeight: number | null;
  firstLogDate: string | null;
};

export async function getAllTimeSummary(profileId: number): Promise<AllTimeSummary> {
  const foodRows = await db.food_entries.where('profile_id').equals(profileId).toArray();
  const workoutRows = await db.workout_sessions.where('profile_id').equals(profileId).toArray();
  const weightRows = await db.body_metrics.where('profile_id').equals(profileId).toArray();

  const totalCaloriesIn = foodRows.reduce((sum, r) => sum + (r.calories ?? 0), 0);
  const totalCaloriesOut = workoutRows.reduce((sum, r) => sum + (r.estimated_calories ?? 0), 0);
  const avgWeight = weightRows.length > 0 ? weightRows.reduce((sum, r) => sum + r.body_weight, 0) / weightRows.length : null;

  const dates = [
    ...foodRows.map((r) => r.entry_date),
    ...workoutRows.map((r) => r.session_date),
    ...weightRows.map((r) => r.entry_date),
  ].filter(Boolean).sort();

  const firstLogDate = dates.length > 0 ? dates[0] : null;

  return {
    totalCaloriesIn,
    totalCaloriesOut,
    avgWeight,
    firstLogDate,
  };
}