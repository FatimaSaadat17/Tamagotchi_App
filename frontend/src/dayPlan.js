import { minutesLeft, timeValue } from './model';

export function dayPlanInput(date, tasks, events, hours) {
  return {
    date,
    start: timeValue(hours.start),
    end: timeValue(hours.end),
    tasks: tasks.filter((task) => !task.done && minutesLeft(task) > 0).map((task) => ({
      id: String(task.id),
      title: task.title,
      minutes: minutesLeft(task),
      priority: task.priority.toUpperCase(),
      importance: task.importance.toUpperCase(),
    })),
    events: events.map((event) => ({
      id: String(event.id),
      title: event.title,
      from: timeValue(event.start),
      to: timeValue(event.end),
    })),
  };
}

export async function suggestDayPlan(input, signal) {
  try {
    if (window.pet?.dayPlan) return await window.pet.dayPlan(input);
    const response = await fetch('/api/day-plans/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]),
    });
    return response.ok ? { plan: await response.json() } : { status: response.status };
  } catch {
    return { status: 503 };
  }
}

export function planError(status) {
  if (status === 402) return 'Ollama Cloud needs usage credits before Pochita can plan your day.';
  if (status === 400) return 'Check your Pomodoro length, hours, task estimates, and event times, then try again.';
  if (status === 502) return 'Pochita couldn’t return a valid plan. Check Ollama and try again.';
  return 'Couldn’t reach the planner. Check that the Spring Boot API and Ollama are running, then try again.';
}
