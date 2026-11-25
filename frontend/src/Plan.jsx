import { useState } from 'react';
import { comparePriority, dateLabel, focusBlock, importance, makeSchedule, newId, offsetDate, priorities, sessionsLeft, timeLabel } from './model';
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

function TaskRow({ task, onToggle, onDelete, onFocus }) {
  return <div className={'paper task-row ' + (task.done ? 'done' : '')}>
    <input type="checkbox" checked={task.done} aria-label={'Mark ' + task.title + ' complete'} onChange={() => onToggle(task.id)} />
    <div><strong>{task.title}</strong><small>{task.minutes}m · {task.importance}{task.done ? ' · Completed' : task.carried ? ' · From an earlier day' : ''}</small></div>
    <div className="task-reward"><span className={'tag ' + task.priority.toLowerCase()}>{task.priority === 'Medium' ? 'Med' : task.priority}</span>
      <Apples count={task.done ? Math.max(1, task.sessions) : sessionsLeft(task)} /></div>
    <details className="task-menu"><summary aria-label={'Actions for ' + task.title}>…</summary>
      <div>{!task.done && <button onClick={() => onFocus(task)}>Focus on task</button>}<button onClick={() => onDelete(task.id)}>Delete task</button></div>
    </details>
  </div>;
}

function Checklist({ tasks, events, onAdd, onToggle, onDelete, onFocus, onEvent, rollover, onRollover }) {
  const [sort, setSort] = useState('priority');
  const [carriedOnly, setCarriedOnly] = useState(false);
  const open = tasks.filter((task) => !task.done).sort(sort === 'priority' ? comparePriority : (a, b) => a.minutes - b.minutes);
  const carried = open.filter((task) => task.carried);
  const shown = carriedOnly ? carried : open;
  const row = (task) => <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onFocus={onFocus} />;

  return <>
    <TaskForm onAdd={onAdd} />
    <div className="row section-label plan-label"><h2>TODAY’S TASKS</h2><small className="reward"><Apples count={1} /> = up to {focusBlock}m focus</small>
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

function DayPlan({ tasks, events, hours, onHours, onEvent, plan, onSave }) {
  const [shortFirst, setShortFirst] = useState(plan?.shortFirst ?? false);
  const [editingHours, setEditingHours] = useState(false);
  const [saved, setSaved] = useState(Boolean(plan));
  const { rows, unscheduled } = makeSchedule(tasks, events, hours, shortFirst);
  const pending = tasks.filter((task) => !task.done);
  const sessions = pending.reduce((total, task) => total + sessionsLeft(task), 0);

  return <>
    <div className="callout schedule-intro"><Avatar /><div><strong>Your day, gently sorted.</strong>
      <p>Important tasks first, around fixed events.<br />Each focus session earns an apple for your pet.</p>
      <small>1 apple = up to {focusBlock}m · Last session can be shorter</small></div></div>
    <div className="row section-label schedule-label"><h2>TODAY · {hours.start}–{hours.end}</h2>
      <button className="text-button" aria-expanded={editingHours} onClick={() => setEditingHours(!editingHours)}>Edit hours ›</button></div>
    {editingHours && <HoursEditor hours={hours} onSave={(next) => { onHours(next); setSaved(false); }} onClose={() => setEditingHours(false)} />}
    <div className="schedule-list">
      {rows.map((row) => <div className={'paper schedule-row ' + row.type} key={row.id}>
        <time>{timeLabel(row.from)}–{timeLabel(row.to)}</time>
        <div><strong>{row.title}</strong><small>{
          row.type === 'event' ? 'Calendar event · Fixed time' : row.type === 'break' ? 'A little break, just for you'
            : row.done ? 'Completed · ' + row.sessions + ' pet apple earned' : row.priority + ' priority · ' + row.importance
        }</small></div>
        {row.type === 'task' && <Apples count={row.done ? row.sessions : sessionsLeft(row)} />}
        {row.type === 'event' && <button className="text-button" onClick={() => onEvent(row)}>View in Calendar</button>}
        {row.type === 'break' && <small>15m</small>}
      </div>)}
      {!rows.length && <p className="paper empty">Add tasks or an event to plan this day.</p>}
    </div>
    <div className="schedule-summary" role="status"><p>{pending.length} open items · {sessions} sessions left{saved ? ' · Plan saved' : ''}</p>
      <small>{unscheduled ? unscheduled + ' tasks did not fit within your hours.' : 'Calendar times stay fixed.'}</small></div>
    <div className="segmented"><button onClick={() => { setShortFirst(!shortFirst); setSaved(false); }}>Regenerate</button>
      <button className="yellow" onClick={() => { onSave({ shortFirst }); setSaved(true); }}>Use this plan</button></div>
  </>;
}

export default function Plan({ date, onDate, mode, onMode, tasks, events, ...actions }) {
  const daily = tasks.filter((item) => item.date === date);
  const calendar = events.filter((item) => item.date === date);
  return <Panel title="My plan" action={<span>{mode === 'plan' ? 'AI DRAFT' : daily.filter((item) => item.done).length + ' / ' + (daily.length + calendar.length) + ' done'}</span>}>
    <DateNav label={dateLabel(date)} previous={() => onDate(offsetDate(date, -1))} next={() => onDate(offsetDate(date, 1))} />
    <div className="segmented">{[['list', 'To-do list'], ['plan', 'Day plan']].map(([key, name]) =>
      <button key={key} aria-pressed={key === mode} onClick={() => onMode(key)}>{name}</button>)}</div>
    {mode === 'list' ? <Checklist key={date} tasks={daily} events={calendar} {...actions} />
      : <DayPlan key={date} tasks={daily} events={calendar} {...actions} />}
  </Panel>;
}
