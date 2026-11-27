import { dateKey, minutesLeft, timeValue } from './model';

export function upcomingReminders(events, plans, tasks) {
  const today = dateKey(new Date());
  const calendar = events.filter((event) => event.date >= today
    && typeof event.start === 'string' && typeof event.end === 'string').map((event) => ({
    kind: 'calendar', id: String(event.id), title: event.title, date: event.date,
    minute: timeValue(event.start), end: timeValue(event.end),
  }));
  const openTasks = new Map(tasks.filter((task) => !task.done && minutesLeft(task) > 0)
    .map((task) => [String(task.id), task]));
  const result = calendar.map(({ end, ...event }) => event);

  for (const [date, plan] of Object.entries(plans)) {
    if (date < today) continue;
    for (const block of plan.draft?.blocks ?? []) {
      if (block.type !== 'TASK' && block.type !== 'BREAK') continue;
      if (calendar.some((event) => event.date === date && event.minute < block.to && block.from < event.end)) continue;
      const task = openTasks.get(block.itemId);
      if (block.type === 'TASK' && task?.date !== date) continue;
      result.push({
        kind: block.type === 'TASK' ? 'focus' : 'break',
        id: block.itemId ?? '', title: task?.title ?? 'Take a breather', date, minute: block.from,
      });
    }
  }
  return result;
}
