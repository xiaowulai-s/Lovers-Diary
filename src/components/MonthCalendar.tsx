import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addMonths, formatMonthLabel, isSameDay, monthCells, WEEKDAY_LABELS } from '../lib/date';
import { colors, radius, spacing, text } from '../theme';

type MonthCalendarProps = {
  month: Date;
  selectedDate: Date;
  markedDays?: readonly number[];
  onMonthChange: (nextMonth: Date) => void;
  onSelectDate: (date: Date) => void;
};

export function MonthCalendar({
  month,
  selectedDate,
  markedDays = [],
  onMonthChange,
  onSelectDate,
}: MonthCalendarProps) {
  const cells = useMemo(() => monthCells(month), [month]);
  const today = new Date();

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="上个月"
            hitSlop={6}
            onPress={() => onMonthChange(addMonths(month, -1))}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Feather name="chevron-left" size={17} color={colors.inkSoft} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="下个月"
            hitSlop={6}
            onPress={() => onMonthChange(addMonths(month, 1))}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Feather name="chevron-right" size={17} color={colors.inkSoft} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }

          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const isMarked = markedDays.includes(day);

          return (
            <Pressable
              key={`day-${day}`}
              accessibilityRole="button"
              accessibilityLabel={`${month.getMonth() + 1} 月 ${day} 日`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDate(date)}
              style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.dayBadge,
                  isToday && !isSelected && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
              {isMarked ? (
                <View style={[styles.mark, isSelected && styles.markSelected]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthLabel: {
    ...text.section,
    fontSize: 19,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvasDeep,
  },
  pressed: {
    opacity: 0.6,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
  },
  weekLabel: {
    width: '14.2857%',
    textAlign: 'center',
    ...text.caption,
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  daySelected: {
    backgroundColor: colors.accentDeep,
  },
  dayText: {
    fontFamily: text.body.fontFamily,
    fontSize: 13.5,
    color: colors.inkSoft,
  },
  dayTextToday: {
    color: colors.accentDeep,
  },
  dayTextSelected: {
    color: colors.surface,
  },
  mark: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  markSelected: {
    backgroundColor: colors.surface,
  },
});
