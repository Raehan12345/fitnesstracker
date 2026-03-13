import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

function MacroRing({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const size = 92;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // calculating progress against target
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={styles.ringCard}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#e5e7eb"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{value.toFixed(0)}</Text>
        <Text style={styles.ringTarget}>/ {target.toFixed(0)}</Text>
      </View>

      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

// standalone calorie bar component
function CalorieBar({ current, target }: { current: number; target: number }) {
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const barHeight = 20;

  return (
    <View style={styles.calorieBarContainer}>
      <Text style={styles.calorieBarText}>
        Calories: {current.toFixed(0)} / {target.toFixed(0)} kcal
      </Text>
      <View style={[styles.barBackground, { height: barHeight }]}>
        <View
          style={[
            styles.barFill,
            { height: barHeight, width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const profile = useAppStore((state) => state.profile);
  const latestWeight = useAppStore((state) => state.latestWeight);
  const foodSummary = useAppStore((state) => state.foodSummary);
  const workoutSummary = useAppStore((state) => state.workoutSummary);
  const strengthPbs = useAppStore((state) => state.strengthPbs);
  const runPbs = useAppStore((state) => state.runPbs);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome {profile?.name ?? ''}</Text>
      <Text style={styles.date}>{today}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.cardText}>Age: {profile?.age ?? 'not set'}</Text>
        <Text style={styles.cardText}>Height: {profile?.height_cm ?? 'not set'} cm</Text>
        <Text style={styles.cardText}>Sex: {profile?.sex ?? 'not set'}</Text>
        <Text style={styles.cardText}>
          Current Weight: {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : 'not set'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Progress</Text>
        
        <CalorieBar 
          current={foodSummary.totalCalories} 
          target={profile?.calorie_target ?? 0} 
        />

        <View style={styles.ringsRow}>
          <MacroRing
            label="Protein"
            value={foodSummary.totalProtein}
            target={profile?.protein_target ?? 0}
            color="#2563eb"
          />
          <MacroRing
            label="Carbs"
            value={foodSummary.totalCarbs}
            target={profile?.carbs_target ?? 0}
            color="#16a34a"
          />
          <MacroRing
            label="Fats"
            value={foodSummary.totalFats}
            target={profile?.fat_target ?? 0}
            color="#f59e0b"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today&apos;s Workout</Text>
        <Text style={styles.cardText}>Workouts logged: {workoutSummary.workoutCount}</Text>
        <Text style={styles.cardText}>
          Calories burned: {workoutSummary.totalCaloriesBurned.toFixed(0)} kcal
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Strength Personal Bests</Text>
        {strengthPbs.length === 0 ? (
          <Text style={styles.cardSubtext}>No strength records yet</Text>
        ) : (
          strengthPbs.slice(0, 3).map((pb) => (
            <View key={pb.exerciseName}>
              <Text style={styles.pbLabel}>{pb.exerciseName}</Text>
              <Text style={styles.pbValue}>
                {pb.weightKg} kg × {pb.reps}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Running Personal Bests</Text>

        {runPbs.longestRun ? (
          <Text style={styles.cardText}>
            Longest Run: {runPbs.longestRun.distanceKm.toFixed(2)} km
          </Text>
        ) : (
          <Text style={styles.cardSubtext}>No running records yet</Text>
        )}

        {runPbs.fastestPace ? (
          <Text style={styles.cardText}>
            Fastest Pace: {runPbs.fastestPace.pacePerKm.toFixed(2)} min/km
          </Text>
        ) : null}

        {runPbs.fastest5k ? (
          <Text style={styles.cardText}>
            Fastest 5K: {runPbs.fastest5k.durationMinutes.toFixed(2)} min
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    marginBottom: 6,
    color: '#111827',
  },
  cardSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  pbLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  pbValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 8,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ringCard: {
    flex: 1,
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 28,
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  ringTarget: {
    fontSize: 11,
    color: '#6b7280',
  },
  ringLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  calorieBarContainer: {
    marginBottom: 20,
  },
  calorieBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  barBackground: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
  },
});