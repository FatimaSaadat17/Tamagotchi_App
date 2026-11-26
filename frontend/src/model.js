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
export const defaultFocusMinutes = 25;
export const maxFocusMinutes = 60;
export const timeValue = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const timeLabel = (minutes) => [Math.floor(minutes / 60), minutes % 60]
  .map((part) => String(part).padStart(2, '0')).join(':');
export const focusedMinutes = (task) => task.focusedMinutes ?? Math.min(task.minutes, task.sessions * defaultFocusMinutes);
export const minutesLeft = (task) => Math.max(0, task.minutes - focusedMinutes(task));
export const sessionsLeft = (task, focusMinutes) => Math.ceil(minutesLeft(task) / focusMinutes);
const storageKey = 'tamagotchi-figma-v1';
const hungerInterval = 2 * 60 * 60 * 1000;
const awakeDuration = 4 * 60 * 60 * 1000;
const napDuration = 20 * 60 * 1000;

function updateHunger(pet, now) {
  if (!Number.isFinite(pet.hungerAt)) return { ...pet, hungerAt: now, sick: pet.sick ?? pet.food === 0 };
  const elapsed = Math.floor((now - pet.hungerAt) / hungerInterval);
  if (elapsed < 1 || pet.food === 0) return pet;

  const food = Math.max(0, pet.food - elapsed);
  return {
    ...pet,
    food,
    hungerAt: pet.hungerAt + elapsed * hungerInterval,
    sick: pet.sick || food === 0,
    health: food === 0 ? Math.min(pet.health, 3) : pet.health,
  };
}

export function updatePet(pet, now = Date.now()) {
  const fed = updateHunger(pet, now);
  let napAt = Number.isFinite(fed.napAt) ? fed.napAt : now + awakeDuration;
  let health = fed.health;
  if (now >= napAt + napDuration) {
    const naps = 1 + Math.floor((now - napAt - napDuration) / (awakeDuration + napDuration));
    napAt += naps * (awakeDuration + napDuration);
    if (!fed.sick) health = Math.min(5, health + naps);
  }
  const sleeping = !fed.sick && now >= napAt;
  return napAt === fed.napAt && health === fed.health && sleeping === fed.sleeping
    ? fed : { ...fed, napAt, health, sleeping };
}

export function togglePetRest(pet, now) {
  const current = updatePet(pet, now);
  if (current.sick) return current;
  return { ...current, napAt: current.sleeping ? now + awakeDuration : now, sleeping: !current.sleeping };
}

const seed = {
  focusMinutes: defaultFocusMinutes,
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
    data.pet = updatePet(data.pet);
    if (!Number.isInteger(data.focusMinutes) || data.focusMinutes < 1 || data.focusMinutes > maxFocusMinutes) {
      data.focusMinutes = defaultFocusMinutes;
    }
    if (data.rollover) {
      data.tasks = data.tasks.map((task) => !task.done && task.date < today ? { ...task, date: today, carried: true } : task);
    }
    return data;
  } catch {
    return { ...seed, pet: updatePet(seed.pet) };
  }
}

export function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function comparePriority(a, b) {
  return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
}
