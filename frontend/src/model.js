export function dateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-');
}

export const fromKey = (key) => new Date(key + 'T12:00:00');
export const today = dateKey(new Date());
export const formatDate = (key, options) => fromKey(key).toLocaleDateString('en-GB', options);
export const dateLabel = (key) => formatDate(key, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function offsetDate(key, days) {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export const priorities = ['High', 'Medium', 'Low'];
export const importance = ['Important', 'Routine'];
export const moods = ['Low', 'Meh', 'Okay', 'Good', 'Great'];
export const emptyEntry = { mood: '', title: '', body: '' };
export const newId = () => crypto.randomUUID();
export const focusBlock = 25;
export const timeValue = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const timeLabel = (minutes) => [Math.floor(minutes / 60), minutes % 60]
  .map((part) => String(part).padStart(2, '0')).join(':');
export const sessionsLeft = (task) => Math.max(0, Math.ceil(task.minutes / focusBlock) - task.sessions);
const storageKey = 'tamagotchi-figma-v1';

const seed = {
  pet: { health: 5, food: 3, happiness: 4, apples: 1 },
  tasks: [
    { id: 'draft', date: today, title: 'Finish project draft', priority: 'High', importance: 'Important', minutes: 60, sessions: 0, done: false, carried: true },
    { id: 'biology', date: today, title: 'Study for biology', priority: 'High', importance: 'Important', minutes: 45, sessions: 0, done: false },
    { id: 'groceries', date: today, title: 'Buy groceries', priority: 'Medium', importance: 'Routine', minutes: 30, sessions: 0, done: false },
    { id: 'read', date: today, title: 'Read 10 pages', priority: 'Low', importance: 'Routine', minutes: 20, sessions: 1, done: true },
  ],
  events: [
    { id: 'check-in', date: today, title: 'Team check-in', start: '10:00', end: '10:30', priority: 'Medium', importance: 'Important', notes: 'Share draft progress and next steps.' },
  ],
  entries: {
    [offsetDate(today, -2)]: { mood: 'Good', title: 'The little things', body: 'Today I made time for a slow walk.\nFresh air, a warm drink, and a little less rushing. Small things count.' },
  },
  goals: [
    { id: 'week', period: 'This week', title: 'Take 5 mindful walks', progress: 4, target: 5 },
    { id: 'month', period: 'This month', title: 'Read 2 good books', progress: 1, target: 2 },
    { id: 'year', period: 'This year', title: 'Read 24 books', progress: 18, target: 24 },
  ],
  hours: { start: '08:00', end: '18:00' },
  rollover: true,
  plans: {},
};

export function readData() {
  try {
    const data = { ...seed, ...JSON.parse(localStorage.getItem(storageKey)) };
    if (data.rollover) {
      data.tasks = data.tasks.map((task) => !task.done && task.date < today ? { ...task, date: today, carried: true } : task);
    }
    return data;
  } catch {
    return seed;
  }
}

export function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function comparePriority(a, b) {
  return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
}

export function makeSchedule(tasks, events, hours, shortFirst) {
  const start = timeValue(hours.start);
  const end = timeValue(hours.end);
  const fixed = events.map((event) => ({
    ...event, type: 'event', from: timeValue(event.start), to: timeValue(event.end),
  }));
  const ordered = [...tasks].sort((a, b) => Number(b.done) - Number(a.done)
    || importance.indexOf(a.importance) - importance.indexOf(b.importance)
    || comparePriority(a, b) || (shortFirst ? a.minutes - b.minutes : b.minutes - a.minutes));

  const scheduled = [...fixed];
  for (const task of ordered) {
    let from = start;
    const length = task.done ? task.minutes : Math.max(1, task.minutes - task.sessions * focusBlock);
    for (const item of [...scheduled].sort((a, b) => a.from - b.from)) {
      if (item.to <= from) continue;
      if (from + length <= item.from) break;
      from = item.to + (item.type === 'task' && !item.done ? 15 : 0);
    }
    if (from + length <= end) scheduled.push({ ...task, from, to: from + length, type: 'task' });
  }

  const rows = scheduled.sort((a, b) => a.from - b.from);
  const withBreaks = rows.flatMap((row, index) => {
    const next = rows[index + 1];
    if (!next || (row.type === 'task' && row.done) || next.from - row.to < 15) return [row];
    return [row, { id: 'break-' + row.id, title: 'Take a breather', type: 'break', from: row.to, to: row.to + 15 }];
  });
  return { rows: withBreaks, unscheduled: tasks.length - scheduled.filter((row) => row.type === 'task').length };
}
