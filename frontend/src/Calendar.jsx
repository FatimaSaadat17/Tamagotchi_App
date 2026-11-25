import { useState } from 'react';
import { dateKey, dateLabel, formatDate, fromKey, importance, newId, priorities, today } from './model';
import { DateNav, Panel } from './ui';

export function Calendar({ date, onDate, events, entries, onDiary, onEdit }) {
  const day = fromKey(date);
  const month = day.getMonth();
  const year = day.getFullYear();
  const offset = new Date(year, month, 1).getDay();
  const count = Math.ceil((new Date(year, month + 1, 0).getDate() + offset) / 7) * 7;
  const daysWithEvents = new Set(events.map((event) => event.date));
  const daily = events.filter((event) => event.date === date).sort((a, b) => a.start.localeCompare(b.start));
  const entry = entries[date];

  return <Panel title="My calendar" action={<button className="yellow" onClick={() => onDate(today)}>Today</button>}>
    <DateNav label={formatDate(date, { month: 'long', year: 'numeric' })}
      previous={() => onDate(dateKey(new Date(year, month - 1, 1)))} next={() => onDate(dateKey(new Date(year, month + 1, 1)))} />
    <div className="calendar-grid">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => <h3 key={name}>{name}</h3>)}
      {Array.from({ length: count }, (_, index) => {
        const cell = new Date(year, month, index - offset + 1);
        const key = dateKey(cell);
        const hasDiary = Boolean(entries[key]);
        const hasEvent = daysWithEvents.has(key);
        return <button key={key} className={cell.getMonth() !== month ? 'outside' : ''} aria-pressed={date === key}
          aria-label={dateLabel(key) + (hasDiary ? ', diary entry' : '') + (hasEvent ? ', calendar event' : '')} onClick={() => onDate(key)}>
          <span>{cell.getDate()}</span>
          {key === today && <small>TODAY</small>}
          <span className="markers">{hasDiary && <i />}{hasEvent && <i className="green-dot" />}</span>
        </button>;
      })}
    </div>
    <div className="row legend"><span>■ Diary entry</span><span>■ Event / goal</span><small>Select a day to look back</small></div>
    <div className="row agenda-heading"><h2>{formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</h2>
      <button className="yellow" onClick={() => onEdit({ date, title: '', start: '09:00', end: '09:30', priority: 'Medium', importance: 'Important', notes: '' })}>+ Add event</button></div>
    <div className="agenda">
      {daily.map((event) => <div className="paper agenda-row event" key={event.id}>
        <time>{event.start}</time><div><strong>{event.title}</strong><small>Calendar event · {event.start}–{event.end}</small></div>
        <button className="text-button" onClick={() => onEdit(event)}>Edit ›</button>
      </div>)}
      <div className="paper agenda-row"><span>Diary</span><div><strong>{entry?.title || (entry ? 'Untitled entry' : 'Write today’s entry')}</strong>
        <small>{entry ? (entry.mood || 'Saved entry') : 'No entry yet · A little check-in'}</small></div>
        <button className="text-button" onClick={() => onDiary(date)}>{entry ? 'Read ›' : 'Write ›'}</button></div>
    </div>
  </Panel>;
}

export function EventEditor({ event, onSave, onDelete, onCancel }) {
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submit(e) {
    e.preventDefault();
    const draft = Object.fromEntries(new FormData(e.currentTarget));
    draft.title = draft.title.trim();
    if (!draft.title) { setError('Enter an event name.'); return; }
    if (draft.end <= draft.start) { setError('End time must be after start time.'); return; }
    onSave({ ...draft, id: event.id ?? newId() });
  }

  return <Panel title={event.id ? 'Edit calendar event' : 'New calendar event'}>
    <button className="text-button back" onClick={onCancel}>‹ Back to Calendar</button>
    <div className="callout editor-note"><p>Calendar event · Also shown in Plan</p><small>Edit here. Plan reflects your calendar changes.</small></div>
    <form className="event-form" onSubmit={submit} onChange={() => setError('')}>
      <label>EVENT NAME<input name="title" required maxLength={120} defaultValue={event.title} /></label>
      <label>DATE<input name="date" type="date" required defaultValue={event.date} /></label>
      <div>
        <div className="field-grid">
          <label>START TIME<input name="start" type="time" required defaultValue={event.start} /></label>
          <label>END TIME<input name="end" type="time" required defaultValue={event.end} /></label>
        </div>
        <small className="field-note">Uses your calendar’s local time zone.</small>
      </div>
      <div className="field-grid">
        <label>PRIORITY<select name="priority" defaultValue={event.priority}>{priorities.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label>IMPORTANCE<select name="importance" defaultValue={event.importance}>{importance.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
      <label>NOTES<textarea name="notes" rows="2" maxLength={1000} defaultValue={event.notes} /></label>
      {error && <p role="alert">{error}</p>}
      {event.id && <small>{confirmDelete ? 'Confirm deletion to remove this event.' : 'Deleting removes this event from your calendar and to-do list.'}</small>}
      <div className="editor-actions">
        {event.id && <button type="button" className="danger" onClick={() => confirmDelete ? onDelete(event.id) : setConfirmDelete(true)}>
          {confirmDelete ? 'Confirm delete' : 'Delete event'}</button>}
        <button type="button" onClick={onCancel}>Cancel</button><button className="yellow">Save changes</button>
      </div>
    </form>
  </Panel>;
}
