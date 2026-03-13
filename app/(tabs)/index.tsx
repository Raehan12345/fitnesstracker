import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../src/store/useAppStore';

const today = new Date().toISOString().split('T')[0];

function MacroRing({
  label,
  value,
  target,
  color,
  theme,
  styles,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  theme: typeof Colors.light;
  styles: any;
}) {
  const size = 92;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={styles.ringCard}>
      <View style={styles.svgContainer}>
        <Svg width={size} height={size} style={styles.absoluteSvg}>
          <Circle
            stroke={theme.surface}
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
      </View>

      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

function CalorieBar({
  current,
  target,
  theme,
  styles,
}: {
  current: number;
  target: number;
  theme: typeof Colors.light;
  styles: any;
}) {
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const barHeight = 24;

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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => getStyles(theme), [theme]);

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
        <Text style={styles.cardText}>Age: {profile?.age ?? 'N/A'}</Text>
        <Text style={styles.cardText}>Height: {profile?.height_cm ?? 'N/A'} cm</Text>
        <Text style={styles.cardText}>Sex: {profile?.sex ?? 'N/A'}</Text>
        <Text style={styles.cardText}>
          Current Weight: {latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : 'N/A'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Progress</Text>
        
        <CalorieBar 
          current={foodSummary.totalCalories} 
          target={profile?.calorie_target ?? 0} 
          theme={theme}
          styles={styles}
        />

        <View style={styles.ringsRow}>
          <MacroRing
            label="Protein"
            value={foodSummary.totalProtein}
            target={profile?.protein_target ?? 0}
            color={theme.text}
            theme={theme}
            styles={styles}
          />
          <MacroRing
            label="Carbs"
            value={foodSummary.totalCarbs}
            target={profile?.carbs_target ?? 0}
            color={theme.textMuted}
            theme={theme}
            styles={styles}
          />
          <MacroRing
            label="Fats"
            value={foodSummary.totalFats}
            target={profile?.fat_target ?? 0}
            color={theme.tabIconDefault}
            theme={theme}
            styles={styles}
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
            <View key={pb.exerciseName} style={styles.pbItem}>
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
          <View style={styles.pbItem}>
            <Text style={styles.pbLabel}>Longest Run</Text>
            <Text style={styles.pbValue}>{runPbs.longestRun.distanceKm.toFixed(2)} km</Text>
          </View>
        ) : (
          <Text style={styles.cardSubtext}>No running records yet</Text>
        )}

        {runPbs.fastestPace ? (
          <View style={styles.pbItem}>
            <Text style={styles.pbLabel}>Fastest Pace</Text>
            <Text style={styles.pbValue}>{runPbs.fastestPace.pacePerKm.toFixed(2)} min/km</Text>
          </View>
        ) : null}

        {runPbs.fastest5k ? (
          <View style={styles.pbItem}>
            <Text style={styles.pbLabel}>Fastest 5K</Text>
            <Text style={styles.pbValue}>{runPbs.fastest5k.durationMinutes.toFixed(2)} min</Text>
          </View>
        ) : null}
      </View>
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
  date: {
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: 24,
    fontWeight: '500',
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
    color: theme.text,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.text,
  },
  cardSubtext: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  pbItem: {
    marginBottom: 12,
  },
  pbLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  pbValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textMuted,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  ringCard: {
    flex: 1,
    alignItems: 'center',
  },
  svgContainer: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteSvg: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  ringTarget: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textMuted,
  },
  ringLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.textMuted,
  },
  calorieBarContainer: {
    marginBottom: 24,
  },
  calorieBarText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  barBackground: {
    backgroundColor: theme.background,
    borderRadius: 100,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: theme.text,
    borderRadius: 100,
  },
});