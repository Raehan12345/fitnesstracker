import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Colors } from '../../constants/theme';
import {
  AnalyticsMode,
  AnalyticsPoint,
  calculateRollingAverage,
  DayBreakdown,
  getAnalyticsSeries,
  getDayBreakdown,
  getHeatmapData,
  HeatmapCell,
} from '../../src/db/database';
import { useAppStore } from '../../src/store/useAppStore';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 72;
const CHART_HEIGHT = 240;

type ChartPoint = {
  label: string;
  value: number;
};

type DualBarPoint = {
  label: string;
  leftValue: number;
  rightValue: number;
};

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function DualBarChart({
  title,
  data,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  theme,
  styles,
}: {
  title: string;
  data: DualBarPoint[];
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  theme: typeof Colors.light;
  styles: any;
}) {
  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.emptyText}>No data available.</Text>
      </View>
    );
  }

  const allValues = data.flatMap((item) => [item.leftValue, item.rightValue]);
  const max = Math.max(...allValues, 1);

  const paddingLeft = 36;
  const paddingRight = 12;
  const paddingTop = 18;
  const paddingBottom = 30;

  const innerWidth = CHART_WIDTH - paddingLeft - paddingRight;
  const innerHeight = CHART_HEIGHT - paddingTop - paddingBottom;

  const slotWidth = innerWidth / data.length;
  const barWidth = Math.min(12, slotWidth * 0.22);
  const gap = 4;

  const yGuides = 4;
  const guideValues = Array.from({ length: yGuides + 1 }, (_, i) => {
    const value = max - (i / yGuides) * max;
    const y = paddingTop + (i / yGuides) * innerHeight;
    return { value, y };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: leftColor }]} />
          <Text style={styles.legendText}>{leftLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: rightColor }]} />
          <Text style={styles.legendText}>{rightLabel}</Text>
        </View>
      </View>

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {guideValues.map((guide, index) => (
          <SvgText key={`guide-text-${index}`} />
        ))}

        {guideValues.map((guide, index) => (
          <Line
            key={`guide-line-${index}`}
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
            key={`guide-label-${index}`}
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

        {data.map((item, index) => {
          const centerX = paddingLeft + index * slotWidth + slotWidth / 2;

          const leftHeight = (item.leftValue / max) * innerHeight;
          const rightHeight = (item.rightValue / max) * innerHeight;

          const leftX = centerX - barWidth - gap / 2;
          const rightX = centerX + gap / 2;

          const leftY = paddingTop + innerHeight - leftHeight;
          const rightY = paddingTop + innerHeight - rightHeight;

          return (
            <View key={item.label}>
              <Rect
                x={leftX}
                y={leftY}
                width={barWidth}
                height={leftHeight}
                rx={barWidth / 2}
                fill={leftColor}
              />
              <Rect
                x={rightX}
                y={rightY}
                width={barWidth}
                height={rightHeight}
                rx={barWidth / 2}
                fill={rightColor}
              />
              <SvgText
                x={centerX}
                y={CHART_HEIGHT - 8}
                fontSize="10"
                fill={theme.textMuted}
                textAnchor="middle"
                fontWeight="500"
              >
                {item.label}
              </SvgText>
            </View>
          );
        })}
      </Svg>
    </View>
  );
}

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

function Heatmap({
  data,
  title,
  profileId,
  theme,
  styles,
}: {
  data: HeatmapCell[];
  title: string;
  profileId: number | undefined;
  theme: typeof Colors.light;
  styles: any;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<DayBreakdown | null>(null);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const countsMap = useMemo(() => {
    return new Map(data.map((item) => [item.date, item.count]));
  }, [data]);

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

  async function handleSelectDate(cell: HeatmapCell) {
    setSelectedCell(cell);

    if (!profileId) {
      setSelectedBreakdown(null);
      return;
    }

    try {
      const breakdown = await getDayBreakdown(profileId, cell.date);
      setSelectedBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to load day breakdown:', error);
      setSelectedBreakdown(null);
    }
  }

  if (!activeMonth) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.emptyText}>No data available.</Text>
      </View>
    );
  }

  const rows = buildCalendarCells(activeMonth);

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
          <Text style={styles.selectedDayTitle}>
            {formatReadableDate(selectedCell.date)}
          </Text>

          <Text style={styles.selectedDayText}>
            Food entries: {selectedBreakdown.foodEntryCount}
          </Text>
          <Text style={styles.selectedDayText}>
            Workouts: {selectedBreakdown.workoutCount}
          </Text>
          <Text style={styles.selectedDayText}>
            Body weight logged:{' '}
            {selectedBreakdown.hasBodyWeightEntry
              ? `${selectedBreakdown.bodyWeight?.toFixed(1)} kg`
              : 'No'}
          </Text>
          <Text style={styles.selectedDayText}>
            Calories in: {selectedBreakdown.totalCaloriesIn.toFixed(0)} kcal
          </Text>
          <Text style={styles.selectedDayText}>
            Calories out: {selectedBreakdown.totalCaloriesOut.toFixed(0)} kcal
          </Text>

          {selectedBreakdown.foods.length > 0 ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Foods</Text>
              {selectedBreakdown.foods.map((food) => (
                <View key={food.id} style={styles.detailRow}>
                  <Text style={styles.detailMainText}>
                    {food.mealType} • {food.name}
                  </Text>
                  <Text style={styles.detailSubText}>
                    {food.calories.toFixed(0)} kcal | P {food.protein.toFixed(1)} | C{' '}
                    {food.carbs.toFixed(1)} | F {food.fats.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {selectedBreakdown.workouts.length > 0 ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Workouts</Text>
              {selectedBreakdown.workouts.map((workout) => (
                <View key={workout.id} style={styles.detailRow}>
                  <Text style={styles.detailMainText}>
                    {workout.name}
                    {workout.workoutType ? ` • ${workout.workoutType}` : ''}
                  </Text>
                  <Text style={styles.detailSubText}>
                    {workout.durationMinutes !== null
                      ? `${workout.durationMinutes} min`
                      : 'Duration --'}{' '}
                    | {workout.estimatedCalories.toFixed(0)} kcal burned
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.cardSubtext}>Tap a day to view details.</Text>
      )}
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

  const loadAnalytics = useCallback(async () => {
    if (!profileId) {
      setSeries([]);
      setHeatmapData([]);
      return;
    }

    try {
      const [data, heatmap] = await Promise.all([
        getAnalyticsSeries(profileId, mode),
        getHeatmapData(profileId, 370),
      ]);

      setSeries(data);
      setHeatmapData(heatmap);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, [profileId, mode]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics])
  );

  const totals = useMemo(() => {
    return series.reduce(
      (acc, item) => {
        acc.caloriesIn += item.caloriesIn;
        acc.caloriesOut += item.caloriesOut;
        acc.netCalories += item.netCalories;
        acc.workouts += item.workouts;

        if (item.avgWeight !== null) {
          acc.weightValues.push(item.avgWeight);
        }

        return acc;
      },
      {
        caloriesIn: 0,
        caloriesOut: 0,
        netCalories: 0,
        workouts: 0,
        weightValues: [] as number[],
      }
    );
  }, [series]);

  const averageWeight =
    totals.weightValues.length > 0
      ? totals.weightValues.reduce((sum, value) => sum + value, 0) /
        totals.weightValues.length
      : null;

  const caloriesCompareChart = series.map((item) => ({
    label: item.label,
    leftValue: Math.round(item.caloriesIn),
    rightValue: Math.round(item.caloriesOut),
  }));

  const caloriesInRolling = calculateRollingAverage(
    series.map((item) => item.caloriesIn),
    7
  );

  const weightRolling = calculateRollingAverage(
    series.map((item) => item.avgWeight),
    7
  );

  const netCaloriesLine = series.map((item) => ({
    label: item.label,
    value: Math.round(item.netCalories),
  }));

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
          <Text style={styles.summaryLabel}>Calories In</Text>
          <Text style={styles.summaryValue}>{totals.caloriesIn.toFixed(0)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Calories Out</Text>
          <Text style={styles.summaryValue}>{totals.caloriesOut.toFixed(0)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Calories</Text>
          <Text style={styles.summaryValue}>{totals.netCalories.toFixed(0)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg Weight</Text>
          <Text style={styles.summaryValue}>
            {averageWeight !== null ? averageWeight.toFixed(1) : '--'}
          </Text>
        </View>
      </View>

      <Heatmap
        title="Consistency Heatmap"
        data={heatmapData}
        profileId={profileId}
        theme={theme}
        styles={styles}
      />

      <DualBarChart
        title="Calories In vs Calories Out"
        data={caloriesCompareChart}
        leftLabel="Calories In"
        rightLabel="Calories Out"
        leftColor={theme.text}
        rightColor={theme.textMuted}
        theme={theme}
        styles={styles}
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
        title="Net Calories Trend"
        primary={netCaloriesLine}
        primaryColor={theme.text}
        primaryLabel="Net Calories"
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
});