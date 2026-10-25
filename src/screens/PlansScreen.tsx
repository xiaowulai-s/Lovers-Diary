import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '../components/AppButton';
import { Card, SectionHeader } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { MonthCalendar } from '../components/MonthCalendar';
import { PageHeader } from '../components/PageHeader';
import { Screen } from '../components/Screen';
import { TodoFormSheet } from '../features/plans/TodoFormSheet';
import type { TodoItem } from '../features/plans/types';
import {
  getTodoErrorMessage,
  useTodoItems,
  useToggleTodo,
} from '../features/plans/useTodos';
import {
  isTodoOverdue,
  sortCompletedTodos,
  sortPendingTodos,
  todoDueLabel,
} from '../features/plans/utils';
import { parseDateOnly } from '../features/anniversaries/utils';
import { formatDayLabel, startOfMonth, toDateKey } from '../lib/date';
import { colors, fonts, radius, shadows, spacing, text } from '../theme';

type PlanView = 'todo' | 'calendar';

const PLAN_VIEWS: readonly { key: PlanView; label: string }[] = [
  { key: 'todo', label: '待办' },
  { key: 'calendar', label: '日历' },
];

type TodoRowProps = {
  todo: TodoItem;
  today: Date;
  toggling: boolean;
  onToggle: () => void;
  onPress: () => void;
};

function TodoRow({ todo, today, toggling, onToggle, onPress }: TodoRowProps) {
  const overdue = isTodoOverdue(todo, today);
  const doneDate = todo.due_on ? parseDateOnly(todo.due_on) : null;
  const dueText = todo.is_done
    ? doneDate
      ? `已完成 · ${doneDate.getMonth() + 1} 月 ${doneDate.getDate()} 日`
      : '已完成'
    : todoDueLabel(todo, today);

  return (
    <View style={[styles.todoCard, todo.is_done && styles.todoCardDone]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.is_done }}
        accessibilityLabel={`${todo.is_done ? '恢复' : '完成'}计划：${todo.title}`}
        disabled={toggling}
        hitSlop={8}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.checkbox,
          todo.is_done && styles.checkboxDone,
          pressed && styles.pressed,
        ]}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={todo.is_done ? colors.surface : colors.sage} />
        ) : todo.is_done ? (
          <Feather name="check" size={13} color={colors.surface} />
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`编辑计划：${todo.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.todoMain, pressed && styles.pressed]}
      >
        <View style={styles.todoCopy}>
          <Text
            numberOfLines={2}
            style={[styles.todoTitle, todo.is_done && styles.todoTitleDone]}
          >
            {todo.title}
          </Text>
          <Text
            style={[
              styles.todoDue,
              overdue && styles.todoDueOverdue,
              todo.is_done && styles.todoDueDone,
            ]}
          >
            {dueText}
          </Text>
          {todo.note ? (
            <Text numberOfLines={1} style={styles.todoNote}>
              {todo.note}
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={15} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

export function PlansScreen() {
  const [view, setView] = useState<PlanView>('todo');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formState, setFormState] = useState<{
    todo: TodoItem | null;
    defaultDate: Date | null;
  } | null>(null);

  const todosQuery = useTodoItems();
  const toggleMutation = useToggleTodo();

  const todos = todosQuery.data ?? [];
  const today = new Date();
  const pending = sortPendingTodos(todos.filter((todo) => !todo.is_done));
  const completed = sortCompletedTodos(todos.filter((todo) => todo.is_done));
  const togglingId = toggleMutation.isPending
    ? (toggleMutation.variables?.todo.id ?? null)
    : null;

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const markedDays = Array.from(
    new Set(
      todos
        .filter(
          (todo) =>
            !todo.is_done && todo.due_on !== null && todo.due_on.startsWith(monthKey),
        )
        .map((todo) => Number(todo.due_on?.slice(8, 10)))
        .filter((day) => Number.isInteger(day) && day > 0),
    ),
  );

  const selectedKey = toDateKey(selectedDate);
  const dayTodos = todos.filter((todo) => todo.due_on === selectedKey);
  const sortedDayTodos = [
    ...sortPendingTodos(dayTodos.filter((todo) => !todo.is_done)),
    ...sortCompletedTodos(dayTodos.filter((todo) => todo.is_done)),
  ];

  const openCreate = (defaultDate: Date | null = null) => {
    setFormState({ todo: null, defaultDate });
  };

  const handleSaved = (todo: TodoItem) => {
    if (view === 'calendar' && todo.due_on) {
      const date = parseDateOnly(todo.due_on);
      if (date) {
        setMonth(startOfMonth(date));
        setSelectedDate(date);
      }
    }
    setFormState(null);
  };

  const handleToggle = async (todo: TodoItem) => {
    try {
      await toggleMutation.mutateAsync({ todo, done: !todo.is_done });
    } catch (toggleError) {
      Alert.alert('状态没有更新', getTodoErrorMessage(toggleError, 'toggle'));
    }
  };

  const handleTogglePress = (todo: TodoItem) => {
    void handleToggle(todo);
  };

  const renderQueryState = () => {
    if (todosQuery.isLoading) {
      return (
        <Card style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>正在翻开计划</Text>
        </Card>
      );
    }

    if (todosQuery.isError) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="cloud-off"
            title="计划没有加载出来"
            description="检查网络后再试一次，已经写下的计划都还在。"
          />
          <AppButton
            label="重新加载"
            variant="secondary"
            onPress={() => {
              void todosQuery.refetch();
            }}
          />
        </Card>
      );
    }

    return null;
  };

  const renderTodoView = () => {
    const queryState = renderQueryState();
    if (queryState) {
      return queryState;
    }

    if (pending.length === 0 && completed.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            icon="check-circle"
            title="还没有计划"
            description="下一次想一起去的店、想看的电影、想走的路，都可以先放在这里。"
            tone="sage"
          />
          <AppButton label="写下第一个计划" onPress={() => openCreate()} />
        </Card>
      );
    }

    return (
      <>
        {pending.length > 0 ? (
          <>
            <SectionHeader title="待完成" note={`${pending.length} 件`} />
            <View style={styles.todoList}>
              {pending.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  today={today}
                  toggling={togglingId === todo.id}
                  onToggle={() => handleTogglePress(todo)}
                  onPress={() => setFormState({ todo, defaultDate: null })}
                />
              ))}
            </View>
          </>
        ) : (
          <Card tone="soft" style={styles.doneAllCard}>
            <Feather name="check-circle" size={16} color={colors.sage} />
            <Text style={styles.doneAllText}>现在的事情都完成了。</Text>
          </Card>
        )}

        {completed.length > 0 ? (
          <>
            <SectionHeader title="已完成" note={`${completed.length} 件`} />
            <View style={styles.todoList}>
              {completed.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  today={today}
                  toggling={togglingId === todo.id}
                  onToggle={() => handleTogglePress(todo)}
                  onPress={() => setFormState({ todo, defaultDate: null })}
                />
              ))}
            </View>
          </>
        ) : null}
      </>
    );
  };

  const renderCalendarView = () => (
    <>
      <Card style={styles.calendarCard}>
        <MonthCalendar
          month={month}
          selectedDate={selectedDate}
          markedDays={markedDays}
          onMonthChange={(nextMonth) => {
            setMonth(nextMonth);
            setSelectedDate(nextMonth);
          }}
          onSelectDate={setSelectedDate}
        />
      </Card>

      <SectionHeader
        title={formatDayLabel(selectedDate)}
        note={`${sortedDayTodos.length} 件`}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="添加当天计划"
            hitSlop={8}
            onPress={() => openCreate(selectedDate)}
            style={({ pressed }) => [styles.smallAddButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={14} color={colors.accentDeep} />
          </Pressable>
        }
      />

      {renderQueryState() ??
        (sortedDayTodos.length === 0 ? (
          <Card style={styles.stateCard}>
            <EmptyState
              icon="calendar"
              title="这一天没有安排"
              description="给平常的一天留一点期待，也算认真生活。"
            />
            <AppButton label="给这天加一件事" onPress={() => openCreate(selectedDate)} />
          </Card>
        ) : (
          <View style={styles.todoList}>
            {sortedDayTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                today={today}
                toggling={togglingId === todo.id}
                onToggle={() => handleTogglePress(todo)}
                onPress={() => setFormState({ todo, defaultDate: selectedDate })}
              />
            ))}
          </View>
        ))}
    </>
  );

  return (
    <Screen>
      <PageHeader
        kicker="OUR PLANS"
        title="计划"
        subtitle="把想一起做的事，一件一件划掉。"
        accessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="新增计划"
            hitSlop={8}
            onPress={() => openCreate(view === 'calendar' ? selectedDate : null)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={18} color={colors.surface} />
          </Pressable>
        }
      />

      <View style={styles.segmented}>
        {PLAN_VIEWS.map((item) => {
          const isActive = view === item.key;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setView(item.key)}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, styles.summaryDotOpen]} />
          <Text style={styles.summaryText}>{pending.length} 件待完成</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, styles.summaryDotDone]} />
          <Text style={styles.summaryText}>{completed.length} 件已完成</Text>
        </View>
      </View>

      {view === 'todo' ? renderTodoView() : renderCalendarView()}

      {formState ? (
        <TodoFormSheet
          initial={formState.todo}
          defaultDate={formState.defaultDate}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDeep,
  },
  pressed: {
    opacity: 0.7,
  },
  smallAddButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.canvasDeep,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  segmentLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  segmentLabelActive: {
    fontFamily: fonts.medium,
    color: colors.ink,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxs,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  summaryDotOpen: {
    backgroundColor: colors.gold,
  },
  summaryDotDone: {
    backgroundColor: colors.sage,
  },
  summaryText: {
    ...text.caption,
  },
  todoList: {
    gap: spacing.xs,
  },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  todoCardDone: {
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  todoMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  todoCopy: {
    flex: 1,
    gap: 2,
  },
  todoTitle: {
    ...text.label,
    fontSize: 14,
    lineHeight: 20,
  },
  todoTitleDone: {
    color: colors.inkMuted,
    textDecorationLine: 'line-through',
  },
  todoDue: {
    ...text.caption,
    fontSize: 10.5,
    color: colors.inkSoft,
  },
  todoDueOverdue: {
    color: colors.danger,
  },
  todoDueDone: {
    color: colors.inkMuted,
  },
  todoNote: {
    ...text.caption,
    fontSize: 10.5,
    color: colors.inkMuted,
  },
  doneAllCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  doneAllText: {
    ...text.body,
    fontSize: 12.5,
    color: colors.sage,
  },
  stateCard: {
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  stateText: {
    ...text.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  calendarCard: {
    padding: spacing.md,
    marginTop: spacing.xs,
  },
});
