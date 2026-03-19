import { create } from 'zustand';
import {
  addBodyMetric,
  addFoodEntry,
  addQuickAddFood,
  addRunEntry,
  addStrengthEntry,
  addWorkoutSession,
  BodyMetric,
  deleteBodyMetric,
  deleteFoodEntry,
  deleteQuickAddFood,
  deleteWorkoutSession,
  FoodEntry,
  getBodyMetrics,
  getDefaultProfile,
  getFoodEntriesByDate,
  getFoodSummaryByDate,
  getLatestBodyWeight,
  getQuickAddFoods,
  getRunPbs,
  getStrengthPbs,
  getWorkoutSessionsByDate,
  getWorkoutSummaryByDate,
  Profile,
  QuickAddFood,
  QuickAddFoodInput,
  resetDatabase,
  RunPbSummary,
  StrengthPb,
  updateQuickAddFood,
  WorkoutSession,
} from '../db/database';

const today = new Date().toISOString().split('T')[0];

type FoodSummary = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  entryCount: number;
};

type WorkoutSummary = {
  workoutCount: number;
  totalCaloriesBurned: number;
};

type AddFoodInput = {
  profileId: number;
  entryDate: string;
  mealType: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type AddWorkoutBaseInput = {
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

type AddStrengthWorkoutInput = AddWorkoutBaseInput & {
  kind: 'strength';
  exerciseName: string;
  weightKg: number;
  reps: number;
};

type AddRunWorkoutInput = AddWorkoutBaseInput & {
  kind: 'run';
  distanceKm: number;
};

type AddGeneralWorkoutInput = AddWorkoutBaseInput & {
  kind: 'general';
};

type AddWorkoutInput =
  | AddStrengthWorkoutInput
  | AddRunWorkoutInput
  | AddGeneralWorkoutInput;

type AddBodyMetricInput = {
  profileId: number;
  entryDate: string;
  bodyWeight: number;
};

type AppStore = {
  profile: Profile | null;
  latestWeight: number | null;

  foodSummary: FoodSummary;
  workoutSummary: WorkoutSummary;

  foodEntriesToday: FoodEntry[];
  quickAddFoods: QuickAddFood[];
  workoutSessionsToday: WorkoutSession[];
  bodyMetrics: BodyMetric[];

  strengthPbs: StrengthPb[];
  runPbs: RunPbSummary;

  isLoading: boolean;
  hasInitialized: boolean;

  resetAppData: () => Promise<void>;

  initializeAppData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshFood: () => Promise<void>;
  refreshQuickAdd: () => Promise<void>;
  refreshWorkout: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  refreshHomeSummary: () => Promise<void>;

  addFoodAndRefresh: (input: AddFoodInput) => Promise<void>;
  deleteFoodAndRefresh: (id: number) => Promise<void>;

  saveQuickAddFoodAndRefresh: (id: number | null, input: QuickAddFoodInput) => Promise<void>;
  deleteQuickAddFoodAndRefresh: (id: number) => Promise<void>;

  addWorkoutAndRefresh: (input: AddWorkoutInput) => Promise<void>;
  deleteWorkoutAndRefresh: (id: number) => Promise<void>;

  addBodyMetricAndRefresh: (input: AddBodyMetricInput) => Promise<void>;
  deleteBodyMetricAndRefresh: (id: number) => Promise<void>;
};

export const useAppStore = create<AppStore>((set, get) => ({
  profile: null,
  latestWeight: null,

  foodSummary: {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
    entryCount: 0,
  },

  workoutSummary: {
    workoutCount: 0,
    totalCaloriesBurned: 0,
  },

  foodEntriesToday: [],
  quickAddFoods: [],
  workoutSessionsToday: [],
  bodyMetrics: [],

  strengthPbs: [],
  runPbs: {
    longestRun: null,
    fastestPace: null,
    fastest5k: null,
  },

  isLoading: false,
  hasInitialized: false,

  initializeAppData: async () => {
    set({ isLoading: true });

    try {
      const profile = await getDefaultProfile();

      if (!profile) {
        set({
          profile: null,
          latestWeight: null,
          foodEntriesToday: [],
          quickAddFoods: [],
          workoutSessionsToday: [],
          bodyMetrics: [],
          strengthPbs: [],
          runPbs: {
            longestRun: null,
            fastestPace: null,
            fastest5k: null,
          },
          hasInitialized: true,
        });
        return;
      }

      const [
        latestWeight,
        foodSummary,
        workoutSummary,
        foodEntriesToday,
        quickAddFoods,
        workoutSessionsToday,
        bodyMetrics,
        strengthPbs,
        runPbs,
      ] = await Promise.all([
        getLatestBodyWeight(profile.id),
        getFoodSummaryByDate(profile.id, today),
        getWorkoutSummaryByDate(profile.id, today),
        getFoodEntriesByDate(profile.id, today),
        getQuickAddFoods(profile.id),
        getWorkoutSessionsByDate(profile.id, today),
        getBodyMetrics(profile.id),
        getStrengthPbs(profile.id),
        getRunPbs(profile.id),
      ]);

      set({
        profile,
        latestWeight,
        foodSummary,
        workoutSummary,
        foodEntriesToday,
        quickAddFoods,
        workoutSessionsToday,
        bodyMetrics,
        strengthPbs,
        runPbs,
        hasInitialized: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshAll: async () => {
    await get().initializeAppData();
  },

  refreshFood: async () => {
    const { profile } = get();
    if (!profile) return;

    const [foodSummary, foodEntriesToday] = await Promise.all([
      getFoodSummaryByDate(profile.id, today),
      getFoodEntriesByDate(profile.id, today),
    ]);

    set({
      foodSummary,
      foodEntriesToday,
    });
  },

  refreshQuickAdd: async () => {
    const { profile } = get();
    if (!profile) return;

    const quickAddFoods = await getQuickAddFoods(profile.id);
    set({ quickAddFoods });
  },

  refreshWorkout: async () => {
    const { profile } = get();
    if (!profile) return;

    const [workoutSummary, workoutSessionsToday, latestWeight] = await Promise.all([
      getWorkoutSummaryByDate(profile.id, today),
      getWorkoutSessionsByDate(profile.id, today),
      getLatestBodyWeight(profile.id),
    ]);

    set({
      workoutSummary,
      workoutSessionsToday,
      latestWeight,
    });
  },

  refreshProgress: async () => {
    const { profile } = get();
    if (!profile) return;

    const [bodyMetrics, latestWeight, strengthPbs, runPbs] = await Promise.all([
      getBodyMetrics(profile.id),
      getLatestBodyWeight(profile.id),
      getStrengthPbs(profile.id),
      getRunPbs(profile.id),
    ]);

    set({
      bodyMetrics,
      latestWeight,
      strengthPbs,
      runPbs,
    });
  },

  refreshHomeSummary: async () => {
    const { profile } = get();
    if (!profile) return;

    const [
      foodSummary,
      workoutSummary,
      latestWeight,
      strengthPbs,
      runPbs,
    ] = await Promise.all([
      getFoodSummaryByDate(profile.id, today),
      getWorkoutSummaryByDate(profile.id, today),
      getLatestBodyWeight(profile.id),
      getStrengthPbs(profile.id),
      getRunPbs(profile.id),
    ]);

    set({
      foodSummary,
      workoutSummary,
      latestWeight,
      strengthPbs,
      runPbs,
    });
  },

  addFoodAndRefresh: async (input) => {
    await addFoodEntry(input);

    await Promise.all([
      get().refreshFood(),
      get().refreshHomeSummary(),
    ]);
  },

  deleteFoodAndRefresh: async (id) => {
    await deleteFoodEntry(id);

    await Promise.all([
      get().refreshFood(),
      get().refreshHomeSummary(),
    ]);
  },

  saveQuickAddFoodAndRefresh: async (id, input) => {
    if (id) {
      await updateQuickAddFood(id, input);
    } else {
      await addQuickAddFood(input);
    }
    await get().refreshQuickAdd();
  },

  deleteQuickAddFoodAndRefresh: async (id) => {
    await deleteQuickAddFood(id);
    await get().refreshQuickAdd();
  },

  addWorkoutAndRefresh: async (input) => {
    const sessionId = await addWorkoutSession({
      profileId: input.profileId,
      sessionDate: input.sessionDate,
      name: input.name,
      notes: input.notes,
      workoutType: input.workoutType,
      durationMinutes: input.durationMinutes,
      intensity: input.intensity,
      bodyWeightKg: input.bodyWeightKg,
      estimatedCalories: input.estimatedCalories,
    });

    if (input.kind === 'strength') {
      await addStrengthEntry({
        workoutSessionId: sessionId,
        exerciseName: input.exerciseName,
        weightKg: input.weightKg,
        reps: input.reps,
      });
    }

    if (input.kind === 'run') {
      await addRunEntry({
        workoutSessionId: sessionId,
        distanceKm: input.distanceKm,
        durationMinutes: input.durationMinutes,
      });
    }

    await Promise.all([
      get().refreshWorkout(),
      get().refreshProgress(),
      get().refreshHomeSummary(),
    ]);
  },

  deleteWorkoutAndRefresh: async (id) => {
    await deleteWorkoutSession(id);

    await Promise.all([
      get().refreshWorkout(),
      get().refreshProgress(),
      get().refreshHomeSummary(),
    ]);
  },

  addBodyMetricAndRefresh: async (input) => {
    await addBodyMetric(input);

    await Promise.all([
      get().refreshProgress(),
      get().refreshWorkout(),
      get().refreshHomeSummary(),
    ]);
  },

  deleteBodyMetricAndRefresh: async (id) => {
    await deleteBodyMetric(id);

    await Promise.all([
      get().refreshProgress(),
      get().refreshWorkout(),
      get().refreshHomeSummary(),
    ]);
  },

  resetAppData: async () => {
    console.log('resetAppData called');
    await resetDatabase();
    console.log('database cleared');

    set({
      profile: null,
      latestWeight: null,
      foodSummary: {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        entryCount: 0,
      },
      workoutSummary: {
        workoutCount: 0,
        totalCaloriesBurned: 0,
      },
      foodEntriesToday: [],
      quickAddFoods: [],
      workoutSessionsToday: [],
      bodyMetrics: [],
      strengthPbs: [],
      runPbs: {
        longestRun: null,
        fastestPace: null,
        fastest5k: null,
      },
      hasInitialized: true,
      isLoading: false,
    });
  },
}));