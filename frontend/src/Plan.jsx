import { useEffect, useState } from 'react';
import { dayPlanInput, planError, suggestDayPlan } from './dayPlan';
import { comparePriority, dateLabel, importance, newId, offsetDate, priorities, sessionsLeft, timeLabel } from './model';
import { Apples, Avatar, DateNav, Panel } from './ui';

function TaskForm({ onAdd }) {
  return <form className="paper task-form" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = fields.get('title').trim();
    if (!title) return;
    onAdd({ id: newId(), title, priority: fields.get('priority'), importance: fields.get('importance'), minutes: Number(fields.get('minutes')), sessions: 0, done: false });
    form.elements.title.value = '';
  }}>
    <input name="title" aria-label="New task" placeholder="What do you need to do?" maxLength={120} required />
    <div className="task-fields">
      <select name="priority" aria-label="Task priority">{priorities.map((option) => <option key={option} value={option}>Priority: {option}</option>)}</select>
      <select name="importance" aria-label="Task importance">{importance.map((option) => <option key={option}>{option}</option>)}</select>
      <select name="minutes" aria-label="Focus estimate" defaultValue="30">{[15, 20, 25, 30, 45, 60, 90, 120].map((option) => <option key={option} value={option}>{option}m</option>)}</select>
      <button className="yellow">+ Add</button>
    </div>
  </form>;
}

function TaskRow({ task, focusMinutes, onToggle, onDelete, onFocus }) {
  return <div className={'paper task-row ' + (task.done ? 'done' : '')}>
    <input type="checkbox" checked={task.done} aria-label={'Mark ' + task.title + ' complete'} onChange={() => onToggle(task.id)} />
    <div><strong>{task.title}</strong><small>{task.minutes}m · {task.importance}{task.done ? ' · Completed' : task.carried ? ' · From an earlier day' : ''}</small></div>
    <div className="task-reward"><span className={'tag ' + task.priority.toLowerCase()}>{task.priority === 'Medium' ? 'Med' : task.priority}</span>
      <Apples count={task.done ? Math.max(1, task.sessions) : sessionsLeft(task, focusMinutes)} /></div>
    <details className="task-menu"><summary aria-label={'Actions for ' + task.title}>…</summary>
      <div>{!task.done && <button onClick={() => onFocus(task)}>Focus on task</button>}<button onClick={() => onDelete(task.id)}>Delete task</button></div>
    </details>
  </div>;
}

function Checklist({ tasks, events, focusMinutes, onAdd, onToggle, onDelete, onFocus, onEvent, rollover, onRollover }) {
  const [sort, setSort] = useState('priority');
  const [carriedOnly, setCarriedOnly] = useState(false);
  const open = tasks.filter((task) => !task.done).sort(sort === 'priority' ? comparePriority : (a, b) => a.minutes - b.minutes);
  const carried = open.filter((task) => task.carried);
  const shown = carriedOnly ? carried : open;
  const row = (task) => <TaskRow key={task.id} task={task} focusMinutes={focusMinutes} onToggle={onToggle} onDelete={onDelete} onFocus={onFocus} />;

  return <>
    <TaskForm onAdd={onAdd} />
    <div className="row section-label plan-label"><h2>TODAY’S TASKS</h2><small className="reward"><Apples count={1} /> = up to {focusMinutes}m focus</small>
      <select className="plain-select" aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="priority">Priority</option><option value="minutes">Duration</option>
      </select>
    </div>
    {carried.length > 0 && <div className="row carried"><span>{carried.length} {carried.length === 1 ? 'task carried' : 'tasks carried'} from earlier</span>
      <button className="text-button" aria-pressed={carriedOnly} onClick={() => setCarriedOnly(!carriedOnly)}>{carriedOnly ? 'Show all' : 'View ›'}</button></div>}
    <div className="task-list">
      {shown.filter((task) => task.importance === 'Important').map(row)}
      {!carriedOnly && events.map((event) => <div className="paper task-row event-task" key={event.id}>
        <span className="event-marker" aria-hidden="true" /><div><strong>{event.title}</strong><small>{event.start}–{event.end} · Calendar event</small></div>
        <button className="green-button" onClick={() => onEvent(event)}>View in Calendar</button>
      </div>)}
      {shown.filter((task) => task.importance !== 'Important').map(row)}
      {!carriedOnly && tasks.filter((task) => task.done).map(row)}
      {!tasks.length && !events.length && <p className="paper empty">Nothing planned for this day.</p>}
    </div>
    <div className="rollover"><div className="reward">AUTO ROLLOVER <button aria-pressed={rollover} onClick={onRollover}>{rollover ? 'ON' : 'OFF'}</button></div>
      <small>Open tasks → tomorrow. Calendar events keep their time.</small></div>
  </>;
}

function HoursEditor({ hours, onSave, onClose }) {
  const [error, setError] = useState('');
  return <form className="paper hours-editor" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const start = data.get('start');
    const end = data.get('end');
    if (start >= end) { setError('End time must be after start time.'); return; }
    onSave({ start, end });
    onClose();
  }}>
    <label>Start<input required type="time" name="start" defaultValue={hours.start} /></label>
    <label>End<input required type="time" name="end" defaultValue={hours.end} /></label>
    <button type="button" onClick={onClose}>Cancel</button><button className="yellow">Save</button>
    {error && <small role="alert">{error}</small>}
  </form>;
}

function DayPlan({ tasks, events, hours, focusMinutes, onHours, onEvent, savedPlan, signature, onSave }) {
  const [initialDraft] = useState(savedPlan);
  const [draft, setDraft] = useState(initialDraft);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [editingHours, setEditingHours] = useState(false);
  const input = JSON.parse(signature);
  const canPlan = input.tasks.length > 0 || input.events.length > 0;
  const [loading, setLoading] = useState(!initialDraft && canPlan);
  const pending = tasks.filter((task) => !task.done && sessionsLeft(task, focusMinutes) > 0);
  const sessions = pending.reduce((total, task) => total + sessionsLeft(task, focusMinutes), 0);
  const saved = Boolean(draft && draft === savedPlan);

  useEffect(() => {
    const request = JSON.parse(signature);
    if ((!request.tasks.length && !request.events.length) || (attempt === 0 && initialDraft)) return;

    const controller = new AbortController();
    suggestDayPlan(request, controller.signal).then(({ plan, status }) => {
      if (controller.signal.aborted) return;
      if (plan) setDraft(plan);
      else setError(planError(status));
      setLoading(false);
    });
    return () => controller.abort();
  }, [signature, attempt, initialDraft]);

  function regenerate() {
    setError('');
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  const rows = draft?.blocks.map((block, index) => {
    const item = block.type === 'TASK' ? tasks.find((task) => String(task.id) === block.itemId)
      : block.type === 'EVENT' ? events.find((event) => String(event.id) === block.itemId) : null;
    return {
      ...item, from: block.from, to: block.to, type: block.type.toLowerCase(),
      key: block.type + '-' + index, title: item?.title ?? 'Take a breather',
    };
  }) ?? [];
  const unscheduled = draft?.unscheduledTaskIds ?? [];
  const unscheduledNames = pending.filter((task) => unscheduled.includes(String(task.id))).map((task) => task.title);
  const highlights = draft?.highlights ?? (draft?.summary ? [draft.summary] : []);

  return <>
    <div className="callout schedule-intro"><Avatar /><div><strong>Your day, gently sorted.</strong>
      {highlights.length > 0 ? <ul className="schedule-highlights">{highlights.map((highlight, index) =>
        <li key={index}>{highlight}</li>)}</ul> : <p>Pochita plans your tasks around your fixed events.</p>}
      <small>1 apple per session · Up to {focusMinutes}m</small></div></div>
    <div className="row section-label schedule-label"><h2>TODAY · {hours.start}–{hours.end}</h2>
      <button className="text-button" aria-expanded={editingHours} onClick={() => setEditingHours(!editingHours)}>Edit hours ›</button></div>
    {editingHours && <HoursEditor hours={hours} onSave={onHours} onClose={() => setEditingHours(false)} />}
    {loading && <p className="paper empty" role="status">Pochita is planning your day…</p>}
    {error && <p className="paper empty" role="alert">{error}</p>}
    <div className="schedule-list">
      {rows.map((row) => <div className={'paper schedule-row ' + row.type} key={row.key}>
        <time>{timeLabel(row.from)}–{timeLabel(row.to)}</time>
        <div><strong>{row.title}</strong><small>{
          row.type === 'event' ? 'Calendar event · Fixed time' : row.type === 'break' ? 'A little break, just for you'
            : row.priority + ' priority · ' + row.importance
        }</small></div>
        {row.type === 'task' && <Apples count={sessionsLeft(row, focusMinutes)} />}
        {row.type === 'event' && <button className="text-button" onClick={() => onEvent(row)}>View in Calendar</button>}
        {row.type === 'break' && <small>{row.to - row.from}m</small>}
      </div>)}
      {!canPlan && <p className="paper empty">Add an open task or an event to plan this day.</p>}
    </div>
    <div className="schedule-summary" role="status"><p>{pending.length} open items · {sessions} sessions left{saved ? ' · Plan saved' : ''}</p>
      {draft && <small>{unscheduledNames.length ? 'Unscheduled: ' + unscheduledNames.join(', ') : 'Calendar times stay fixed.'}</small>}</div>
    <div className="segmented"><button disabled={loading || !canPlan} onClick={regenerate}>Regenerate</button>
      <button className="yellow" disabled={loading || !draft || saved}
        onClick={() => onSave({ signature, draft, preference: input.preference })}>Use this plan</button></div>
  </>;
}

export default function Plan({ date, onDate, mode, onMode, tasks, events, plan, preference, ...actions }) {
  const daily = tasks.filter((item) => item.date === date);
  const calendar = events.filter((item) => item.date === date);
  const signature = mode === 'plan' ? JSON.stringify(dayPlanInput(date, daily, calendar, actions.hours, preference)) : '';
  return <Panel title="My plan" action={<span>{mode === 'plan' ? 'AI DRAFT' : daily.filter((item) => item.done).length + ' / ' + (daily.length + calendar.length) + ' done'}</span>}>
    <DateNav label={dateLabel(date)} previous={() => onDate(offsetDate(date, -1))} next={() => onDate(offsetDate(date, 1))} />
    <div className="segmented">{[['list', 'To-do list'], ['plan', 'Day plan']].map(([key, name]) =>
      <button key={key} aria-pressed={key === mode} onClick={() => onMode(key)}>{name}</button>)}</div>
    {mode === 'list' ? <Checklist key={date} tasks={daily} events={calendar} {...actions} />
      : <DayPlan key={signature} tasks={daily} events={calendar} signature={signature}
        savedPlan={plan?.signature === signature ? plan.draft : null} {...actions} />}
  </Panel>;
}
