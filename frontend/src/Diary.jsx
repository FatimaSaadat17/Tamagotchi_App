import { useState } from 'react';
import { dateLabel, emptyEntry, moods, offsetDate } from './model';
import { DateNav, Panel, Segments } from './ui';

function EntryForm({ entry, onSave }) {
  const [draft, setDraft] = useState(entry);
  const [saved, setSaved] = useState(false);
  const [titleError, setTitleError] = useState(false);
  function change(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setSaved(false);
    if (field === 'title') setTitleError(false);
  }

  function submit(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setTitleError(true);
      event.currentTarget.elements.title.focus();
      return;
    }
    onSave({ ...draft, title });
    setDraft({ ...draft, title });
    setSaved(true);
  }

  return <form onSubmit={submit}>
    <div className="row section-label"><h2>TODAY’S MOOD</h2><small>A little check-in with yourself</small></div>
    <div className="moods">{moods.map((mood) =>
      <button type="button" aria-pressed={draft.mood === mood} key={mood} onClick={() => change('mood', mood)}>
        {draft.mood === mood ? '✓ ' : ''}{mood}
      </button>)}</div>
    <div className="paper entry-form">
      <h2>DAILY ENTRY</h2>
      <input name="title" aria-label="Entry title" aria-required="true" aria-invalid={titleError}
        aria-describedby={titleError ? 'diary-title-error' : undefined}
        placeholder="The little things" value={draft.title} maxLength={120} onChange={(e) => change('title', e.target.value)} />
      {titleError && <small id="diary-title-error" role="alert">Give this entry a title before saving.</small>}
      <textarea aria-label="Daily entry" required rows="3" value={draft.body} onChange={(e) => change('body', e.target.value)} />
      <div className="row"><small role="status">{saved ? 'Entry saved.' : 'Keep writing…'}</small><button className="yellow">Save entry</button></div>
    </div>
  </form>;
}

function Goal({ goal, onSave }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <form className="paper goal-edit" onSubmit={(event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = fields.get('title').trim();
    if (!title) return;
    const target = Number(fields.get('target'));
    onSave({ ...goal, title, progress: Math.min(target, Number(fields.get('progress'))), target });
    setEditing(false);
  }}>
    <label>Goal<input name="title" required defaultValue={goal.title} maxLength={120} /></label>
    <label>Progress<input name="progress" type="number" min="0" required defaultValue={goal.progress} /></label>
    <label>Target<input name="target" type="number" min="1" required defaultValue={goal.target} /></label>
    <div className="row"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="yellow">Save</button></div>
  </form>;

  return <div className="paper goal">
    <div><h3>{goal.period}</h3><small>{goal.progress} / {goal.target}</small></div>
    <div><strong>{goal.title}</strong><Segments label={goal.title + ' progress'} count={20} filled={Math.round(20 * goal.progress / goal.target)} /></div>
    <button className="text-button" onClick={() => setEditing(true)}>Edit</button>
  </div>;
}

export default function Diary({ date, onDate, entries, goals, onSave, onGoal }) {
  const [history, setHistory] = useState(false);
  return <Panel title="My diary" action={<button className="yellow" aria-expanded={history} onClick={() => setHistory(!history)}>
    {history ? 'Close entries' : 'Older entries ›'}</button>}>
    <DateNav label={dateLabel(date)} previous={() => onDate(offsetDate(date, -1))} next={() => onDate(offsetDate(date, 1))} />
    {history && <div className="paper history">{Object.keys(entries).sort().reverse().map((key) =>
      <button key={key} onClick={() => { onDate(key); setHistory(false); }}>{dateLabel(key)} · {entries[key].title || 'Untitled'}</button>)}</div>}
    <EntryForm key={date} entry={entries[date] ?? emptyEntry} onSave={(entry) => onSave(date, entry)} />
    <div className="row section-label goals-label"><h2>MY GOALS</h2><small>Small steps count.</small></div>
    {goals.map((goal) => <Goal key={goal.id} goal={goal} onSave={onGoal} />)}
  </Panel>;
}
