import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('macro_tracker.db');
  }
  return db;
}

async function ensureColumnExists(
  database: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const columns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName});`
  );

  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await database.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`
    );
  }
}

export async function initDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calorie_target INTEGER NOT NULL DEFAULT 2000,
      protein_target INTEGER NOT NULL DEFAULT 150,
      carbs_target INTEGER NOT NULL DEFAULT 200,
      fat_target INTEGER NOT NULL DEFAULT 60,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      food_name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fats REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles (id)
    );

    CREATE TABLE IF NOT EXISTS quick_add_foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      food_name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fats REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles (id)
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      session_date TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles (id)
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_session_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id)
    );

    CREATE TABLE IF NOT EXISTS body_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      body_weight REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES profiles (id)
    );

    CREATE TABLE IF NOT EXISTS strength_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_session_id INTEGER NOT NULL UNIQUE,
        exercise_name TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        reps INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id)
    );

    CREATE TABLE IF NOT EXISTS run_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_session_id INTEGER NOT NULL UNIQUE,
        distance_km REAL NOT NULL,
        duration_minutes REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id)
    );
  `);

  await ensureColumnExists(database, 'workout_sessions', 'workout_type', 'TEXT');
  await ensureColumnExists(database, 'workout_sessions', 'duration_minutes', 'INTEGER');
  await ensureColumnExists(database, 'workout_sessions', 'intensity', 'TEXT');
  await ensureColumnExists(database, 'workout_sessions', 'body_weight_kg', 'REAL');
  await ensureColumnExists(database, 'workout_sessions', 'estimated_calories', 'REAL');
  await ensureColumnExists(database, 'profiles', 'age', 'INTEGER');
  await ensureColumnExists(database, 'profiles', 'sex', 'TEXT');
  await ensureColumnExists(database, 'profiles', 'height_cm', 'REAL');
  await ensureColumnExists(database, 'profiles', 'starting_weight_kg', 'REAL');

  console.log('Database initialized');
}

export async function createProfile(input: CreateProfileInput) {
  const database = await getDatabase();

  const result = await database.runAsync(
    `INSERT INTO profiles
      (
        name,
        age,
        sex,
        height_cm,
        starting_weight_kg,
        calorie_target,
        protein_target,
        carbs_target,
        fat_target
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.name,
      input.age,
      input.sex,
      input.heightCm,
      input.startingWeightKg,
      input.calorieTarget,
      input.proteinTarget,
      input.carbsTarget,
      input.fatTarget,
    ]
  );

  return result.lastInsertRowId;
}

export async function resetDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    DELETE FROM strength_entries;
    DELETE FROM run_entries;
    DELETE FROM food_entries;
    DELETE FROM quick_add_foods;
    DELETE FROM body_metrics;
    DELETE FROM workout_sessions;
    DELETE FROM profiles;
  `);

  console.log('Database reset complete');
}

export async function updateProfile(profileId: number, input: CreateProfileInput) {
  const database = await getDatabase();

  await database.runAsync(
    `UPDATE profiles
     SET
       name = ?,
       age = ?,
       sex = ?,
       height_cm = ?,
       starting_weight_kg = ?,
       calorie_target = ?,
       protein_target = ?,
       carbs_target = ?,
       fat_target = ?
     WHERE id = ?;`,
    [
      input.name,
      input.age,
      input.sex,
      input.heightCm,
      input.startingWeightKg,
      input.calorieTarget,
      input.proteinTarget,
      input.carbsTarget,
      input.fatTarget,
      profileId,
    ]
  );
}

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

export async function getDefaultProfile() {
  const database = await getDatabase();

  const profile = await database.getFirstAsync<Profile>(`
    SELECT
      id,
      name,
      age,
      sex,
      height_cm,
      starting_weight_kg,
      calorie_target,
      protein_target,
      carbs_target,
      fat_target,
      created_at
    FROM profiles
    ORDER BY id ASC
    LIMIT 1;
  `);

  return profile;
}

export async function addFoodEntry(input: FoodEntryInput) {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO food_entries
      (profile_id, entry_date, meal_type, food_name, calories, protein, carbs, fats)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.profileId,
      input.entryDate,
      input.mealType,
      input.foodName,
      input.calories,
      input.protein,
      input.carbs,
      input.fats,
    ]
  );
}

export async function getFoodEntriesByDate(profileId: number, entryDate: string) {
  const database = await getDatabase();

  const entries = await database.getAllAsync<FoodEntry>(
    `SELECT *
     FROM food_entries
     WHERE profile_id = ? AND entry_date = ?
     ORDER BY id DESC;`,
    [profileId, entryDate]
  );

  return entries;
}

export async function deleteFoodEntry(id: number) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM food_entries WHERE id = ?;`, [id]);
}

export async function addQuickAddFood(input: QuickAddFoodInput) {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO quick_add_foods
      (profile_id, meal_type, food_name, calories, protein, carbs, fats)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      input.profileId,
      input.mealType,
      input.foodName,
      input.calories,
      input.protein,
      input.carbs,
      input.fats,
    ]
  );
}

export async function updateQuickAddFood(id: number, input: QuickAddFoodInput) {
  const database = await getDatabase();

  await database.runAsync(
    `UPDATE quick_add_foods
     SET meal_type = ?, food_name = ?, calories = ?, protein = ?, carbs = ?, fats = ?
     WHERE id = ?;`,
    [
      input.mealType,
      input.foodName,
      input.calories,
      input.protein,
      input.carbs,
      input.fats,
      id,
    ]
  );
}

export async function getQuickAddFoods(profileId: number) {
  const database = await getDatabase();

  const entries = await database.getAllAsync<QuickAddFood>(
    `SELECT *
     FROM quick_add_foods
     WHERE profile_id = ?
     ORDER BY meal_type ASC, food_name ASC;`,
    [profileId]
  );

  return entries;
}

export async function deleteQuickAddFood(id: number) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM quick_add_foods WHERE id = ?;`, [id]);
}

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

export async function addWorkoutSession(input: WorkoutSessionInput) {
  const database = await getDatabase();

  const result = await database.runAsync(
    `INSERT INTO workout_sessions
      (
        profile_id,
        session_date,
        name,
        notes,
        workout_type,
        duration_minutes,
        intensity,
        body_weight_kg,
        estimated_calories
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.profileId,
      input.sessionDate,
      input.name,
      input.notes,
      input.workoutType,
      input.durationMinutes,
      input.intensity,
      input.bodyWeightKg,
      input.estimatedCalories,
    ]
  );

  return result.lastInsertRowId;
}

export async function getWorkoutSessionsByDate(profileId: number, sessionDate: string) {
  const database = await getDatabase();

  const sessions = await database.getAllAsync<WorkoutSession>(
    `SELECT
      ws.*,
      se.exercise_name,
      se.weight_kg,
      se.reps,
      re.distance_km,
      re.duration_minutes AS run_duration_minutes
     FROM workout_sessions ws
     LEFT JOIN strength_entries se
       ON se.workout_session_id = ws.id
     LEFT JOIN run_entries re
       ON re.workout_session_id = ws.id
     WHERE ws.profile_id = ? AND ws.session_date = ?
     ORDER BY ws.id DESC;`,
    [profileId, sessionDate]
  );

  return sessions;
}

export async function deleteWorkoutSession(id: number) {
  const database = await getDatabase();

  await database.runAsync(`DELETE FROM strength_entries WHERE workout_session_id = ?;`, [id]);
  await database.runAsync(`DELETE FROM run_entries WHERE workout_session_id = ?;`, [id]);
  await database.runAsync(`DELETE FROM workout_sessions WHERE id = ?;`, [id]);
}

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

export async function addBodyMetric(input: BodyMetricInput) {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO body_metrics
      (profile_id, entry_date, body_weight)
     VALUES (?, ?, ?);`,
    [input.profileId, input.entryDate, input.bodyWeight]
  );
}

export async function getBodyMetrics(profileId: number) {
  const database = await getDatabase();

  const metrics = await database.getAllAsync<BodyMetric>(
    `SELECT *
     FROM body_metrics
     WHERE profile_id = ?
     ORDER BY entry_date DESC, id DESC;`,
    [profileId]
  );

  return metrics;
}

export async function deleteBodyMetric(id: number) {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM body_metrics WHERE id = ?;`, [id]);
}

export async function getLatestBodyWeight(profileId: number) {
  const database = await getDatabase();

  const latest = await database.getFirstAsync<{ body_weight: number }>(
    `SELECT body_weight
     FROM body_metrics
     WHERE profile_id = ?
     ORDER BY entry_date DESC, id DESC
     LIMIT 1;`,
    [profileId]
  );

  return latest?.body_weight ?? null;
}

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

export async function addStrengthEntry(input: StrengthEntryInput) {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO strength_entries
      (workout_session_id, exercise_name, weight_kg, reps)
     VALUES (?, ?, ?, ?);`,
    [input.workoutSessionId, input.exerciseName, input.weightKg, input.reps]
  );
}

export async function addRunEntry(input: RunEntryInput) {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO run_entries
      (workout_session_id, distance_km, duration_minutes)
     VALUES (?, ?, ?);`,
    [input.workoutSessionId, input.distanceKm, input.durationMinutes]
  );
}

export async function getStrengthPbs(profileId: number) {
  const database = await getDatabase();

  const rows = await database.getAllAsync<{
    exercise_name: string;
    weight_kg: number;
    reps: number;
    session_date: string;
  }>(
    `SELECT
      se.exercise_name,
      se.weight_kg,
      se.reps,
      ws.session_date
     FROM strength_entries se
     INNER JOIN workout_sessions ws
       ON ws.id = se.workout_session_id
     WHERE ws.profile_id = ?
     ORDER BY se.exercise_name ASC, se.weight_kg DESC, se.reps DESC, ws.session_date DESC;`,
    [profileId]
  );

  const map = new Map<string, StrengthPb>();

  for (const row of rows) {
    if (!map.has(row.exercise_name)) {
      map.set(row.exercise_name, {
        exerciseName: row.exercise_name,
        weightKg: row.weight_kg,
        reps: row.reps,
        sessionDate: row.session_date,
      });
    }
  }

  return Array.from(map.values());
}

export async function getRunPbs(profileId: number): Promise<RunPbSummary> {
  const database = await getDatabase();

  const rows = await database.getAllAsync<{
    distance_km: number;
    duration_minutes: number;
    session_date: string;
  }>(
    `SELECT
      re.distance_km,
      re.duration_minutes,
      ws.session_date
     FROM run_entries re
     INNER JOIN workout_sessions ws
       ON ws.id = re.workout_session_id
     WHERE ws.profile_id = ?
     ORDER BY ws.session_date DESC;`,
    [profileId]
  );

  if (rows.length === 0) {
    return { longestRun: null, fastestPace: null, fastest5k: null };
  }

  const mapped: RunPb[] = rows
    .filter((row) => row.distance_km > 0 && row.duration_minutes > 0)
    .map((row) => ({
      distanceKm: row.distance_km,
      durationMinutes: row.duration_minutes,
      pacePerKm: row.duration_minutes / row.distance_km,
      sessionDate: row.session_date,
    }));

  const longestRun = mapped.reduce((best, current) =>
    !best || current.distanceKm > best.distanceKm ? current : best
  , null as RunPb | null);

  const fastestPace = mapped.reduce((best, current) =>
    !best || current.pacePerKm < best.pacePerKm ? current : best
  , null as RunPb | null);

  const fiveKs = mapped.filter((run) => run.distanceKm >= 4.95 && run.distanceKm <= 5.05);

  const fastest5k = fiveKs.reduce((best, current) =>
    !best || current.durationMinutes < best.durationMinutes ? current : best
  , null as RunPb | null);

  return { longestRun, fastestPace, fastest5k };
}

export async function getFoodSummaryByDate(profileId: number, entryDate: string) {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{
    totalCalories: number | null;
    totalProtein: number | null;
    totalCarbs: number | null;
    totalFats: number | null;
    entryCount: number | null;
  }>(
    `SELECT
      SUM(calories) AS totalCalories,
      SUM(protein) AS totalProtein,
      SUM(carbs) AS totalCarbs,
      SUM(fats) AS totalFats,
      COUNT(*) AS entryCount
     FROM food_entries
     WHERE profile_id = ? AND entry_date = ?;`,
    [profileId, entryDate]
  );

  return {
    totalCalories: result?.totalCalories ?? 0,
    totalProtein: result?.totalProtein ?? 0,
    totalCarbs: result?.totalCarbs ?? 0,
    totalFats: result?.totalFats ?? 0,
    entryCount: result?.entryCount ?? 0,
  };
}

export async function getWorkoutSummaryByDate(profileId: number, sessionDate: string) {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{
    workoutCount: number | null;
    totalCaloriesBurned: number | null;
  }>(
    `SELECT
      COUNT(*) AS workoutCount,
      SUM(estimated_calories) AS totalCaloriesBurned
     FROM workout_sessions
     WHERE profile_id = ? AND session_date = ?;`,
    [profileId, sessionDate]
  );

  return {
    workoutCount: result?.workoutCount ?? 0,
    totalCaloriesBurned: result?.totalCaloriesBurned ?? 0,
  };
}

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

export async function getAnalyticsSeries(profileId: number, mode: AnalyticsMode): Promise<AnalyticsPoint[]> {
  const database = await getDatabase();
  const periods = mode === 'daily' ? getDailyPeriods(7) : mode === 'weekly' ? getWeeklyPeriods(8) : getMonthlyPeriods(6);
  const startDate = formatDateKey(periods[0].start);

  const [foodRows, workoutRows, weightRows] = await Promise.all([
    database.getAllAsync<{ entry_date: string; calories: number; }>(
      `SELECT entry_date, calories FROM food_entries WHERE profile_id = ? AND entry_date >= ?;`, [profileId, startDate]
    ),
    database.getAllAsync<{ session_date: string; estimated_calories: number | null; id: number; }>(
      `SELECT id, session_date, estimated_calories FROM workout_sessions WHERE profile_id = ? AND session_date >= ?;`, [profileId, startDate]
    ),
    database.getAllAsync<{ entry_date: string; body_weight: number; }>(
      `SELECT entry_date, body_weight FROM body_metrics WHERE profile_id = ? AND entry_date >= ?;`, [profileId, startDate]
    ),
  ]);

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

export type HeatmapCell = {
  date: string;
  count: number;
};

export type BackupPayload = {
  version: 1;
  exported_at: string;
  profiles: any[];
  food_entries: any[];
  quick_add_foods: any[];
  workout_sessions: any[];
  strength_entries: any[];
  run_entries: any[];
  body_metrics: any[];
};

export async function getHeatmapData(_profileId: number, _days = 90): Promise<HeatmapCell[]> {
  return [];
}

export async function exportBackupData(): Promise<BackupPayload> {
  throw new Error('Backup export is currently only implemented for web.');
}

export async function importBackupData(_payload: BackupPayload) {
  throw new Error('Backup import is currently only implemented for web.');
}

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

export async function getDayBreakdown(_profileId: number, date: string): Promise<DayBreakdown> {
  return {
    date,
    foodEntryCount: 0,
    workoutCount: 0,
    hasBodyWeightEntry: false,
    bodyWeight: null,
    totalCaloriesIn: 0,
    totalCaloriesOut: 0,
    foods: [],
    workouts: [],
  };
}

export type AllTimeSummary = {
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  avgWeight: number | null;
  firstLogDate: string | null;
};

export async function getAllTimeSummary(profileId: number): Promise<AllTimeSummary> {
  const database = await getDatabase();

  const [foodRes, workoutRes, weightRes, firstDateRes] = await Promise.all([
    database.getFirstAsync<{ total: number | null }>(`SELECT SUM(calories) as total FROM food_entries WHERE profile_id = ?;`, [profileId]),
    database.getFirstAsync<{ total: number | null }>(`SELECT SUM(estimated_calories) as total FROM workout_sessions WHERE profile_id = ?;`, [profileId]),
    database.getFirstAsync<{ avg: number | null }>(`SELECT AVG(body_weight) as avg FROM body_metrics WHERE profile_id = ?;`, [profileId]),
    database.getFirstAsync<{ firstDate: string | null }>(`
      SELECT MIN(date) as firstDate FROM (
        SELECT entry_date AS date FROM food_entries WHERE profile_id = ?
        UNION
        SELECT session_date AS date FROM workout_sessions WHERE profile_id = ?
        UNION
        SELECT entry_date AS date FROM body_metrics WHERE profile_id = ?
      );
    `, [profileId, profileId, profileId])
  ]);

  return {
    totalCaloriesIn: foodRes?.total ?? 0,
    totalCaloriesOut: workoutRes?.total ?? 0,
    avgWeight: weightRes?.avg ?? null,
    firstLogDate: firstDateRes?.firstDate ?? null,
  };
}