import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-500.css';
import { Calendar, EventEditor } from './Calendar';
import Diary from './Diary';
import Focus from './Focus';
import Plan from './Plan';
import { comparePriority, focusedMinutes, minutesLeft, offsetDate, readData, saveData, sessionsLeft, today, togglePetRest, updatePet } from './model';
import { Avatar } from './ui';
import { usePochitaChat } from './usePochitaChat';
import './style.css';

const tabs = ['Plan', 'Diary', 'Focus', 'Calendar'];
const chatLabels = {
  Focus: 'Your focus companion',
  Diary: 'A little space to reflect',
  Calendar: 'Your calendar companion',
  Plan: 'Need a gentler plan?',
  Editor: 'Plans change. That’s okay.',
};
const newTimer = { active: false, running: false, taskId: null, title: '' };

function ChatDock({ screen, planning, onPlan, onPlanPreference, pending, apples, chat }) {
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (planning) return <section className="chat-dock plan-dock" aria-label="Planning companion">
    <Avatar /><div><strong>Your AI planning pal</strong><small>{pending} sessions left · {apples} {apples === 1 ? 'apple' : 'apples'} earned</small></div>
    <button className="yellow" onClick={onPlan}>Plan my day</button>
  </section>;

  async function send(event) {
    event.preventDefault();
    if (!message.trim()) return;
    if (onPlanPreference) {
      onPlanPreference(message.trim());
      setNotice('Preference added to your day plan.');
      setMessage('');
      return;
    }
    if (await chat.send(message.trim())) setMessage('');
  }

  const busy = !onPlanPreference && (chat.loading || chat.pending);
  const latest = chat.messages.at(-1)?.content;
  const reply = onPlanPreference ? notice : chat.pending ? 'Pochita is thinking…' : chat.loading ? 'Loading chat…' : latest;
  const error = !onPlanPreference && chat.error;
  return <section className="chat-dock" aria-label={onPlanPreference ? 'Planning preferences' : 'Chat with Pochita'}>
    <Avatar /><div className="chat-main">
      <div className="row">
        <span role={error ? 'alert' : 'status'}>{error || (!showHistory && reply) || chatLabels[screen]}</span>
        {!onPlanPreference && chat.messages.length > 0
          ? <button type="button" className="text-button chat-history-toggle" aria-expanded={showHistory}
            onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Hide chat' : 'Chat history'}</button>
          : <small>{onPlanPreference ? 'AI PLANNER' : 'AI CHAT'}</small>}
      </div>
      {!onPlanPreference && showHistory && <>
        <ol className="chat-history" aria-label="Conversation">
          {chat.messages.map((item) => <li key={item.id}><strong>{item.role === 'USER' ? 'You' : 'Pochita'}</strong> {item.content}</li>)}
        </ol>
        {busy && <small role="status">{reply}</small>}
      </>}
      <form className="chat-form" onSubmit={send}><input aria-label={onPlanPreference ? 'Day plan preference' : 'Message your AI pal'}
        placeholder={onPlanPreference ? 'Suggest a change to your plan…' : 'Message your AI pal…'}
        value={message} maxLength={500} readOnly={busy} onChange={(event) => setMessage(event.target.value)} />
        <button className="yellow" disabled={busy || !message.trim()}>Send</button></form>
    </div>
  </section>;
}

function App() {
  const chat = usePochitaChat();
  const [data, setData] = useState(readData);
  const [screen, setScreen] = useState('Focus');
  const [mode, setMode] = useState('list');
  const [planDate, setPlanDate] = useState(today);
  const [planPreferences, setPlanPreferences] = useState({});
  const [diaryDate, setDiaryDate] = useState(() => Object.keys(data.entries).sort().at(-1) ?? offsetDate(today, -2));
  const [calendarDate, setCalendarDate] = useState(today);
  const [event, setEvent] = useState(null);
  const [pickedTask, setPickedTask] = useState(null);
  const [timer, setTimer] = useState(newTimer);
  const [petMessage, setPetMessage] = useState('Your tasks help me grow!');
  const [reaction, setReaction] = useState(null);
  const focusMinutes = data.focusMinutes;
  const setFocusMinutes = (minutes) => setData((current) => ({ ...current, focusMinutes: minutes }));
  const focusable = data.tasks.filter((task) => task.date === today && !task.done && minutesLeft(task) > 0).sort(comparePriority);
  const nextTask = data.tasks.find((task) => task.id === timer.taskId)
    ?? data.tasks.find((task) => task.id === pickedTask && !task.done && minutesLeft(task) > 0)
    ?? focusable[0];
  const pending = data.tasks.filter((task) => task.date === planDate && !task.done)
    .reduce((sum, task) => sum + sessionsLeft(task, focusMinutes), 0);

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    const interval = setInterval(() => setData((current) => {
      const pet = updatePet(current.pet);
      return pet === current.pet ? current : { ...current, pet };
    }), 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!reaction) return;
    const timeout = setTimeout(() => {
      setReaction(reaction.name === 'yuck' ? { name: 'cry' } : null);
    }, reaction.name === 'yuck' ? 640 : 1920);
    return () => clearTimeout(timeout);
  }, [reaction]);

  const { deadline, taskId, running, durationMinutes } = timer;
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (seconds > 0) {
        setTimer((current) => current.seconds === seconds ? current : { ...current, seconds });
        return;
      }
      clearInterval(interval);
      setTimer(newTimer);
      setPetMessage('Focus complete! You earned an apple.');
      setData((current) => ({
        ...current,
        pet: { ...current.pet, apples: current.pet.apples + 1 },
        tasks: current.tasks.map((task) => task.id === taskId
          ? { ...task, sessions: task.sessions + 1, focusedMinutes: focusedMinutes(task) + durationMinutes } : task),
      }));
    }, 250);
    return () => clearInterval(interval);
  }, [deadline, taskId, running, durationMinutes]);

  function start(task, duration) {
    const minutes = timer.active ? timer.durationMinutes : duration;
    const seconds = timer.active ? timer.seconds : minutes * 60;
    setTimer({
      active: true, running: true, durationMinutes: minutes, seconds, deadline: Date.now() + seconds * 1000,
      taskId: timer.active ? timer.taskId : task?.id,
      title: timer.active ? timer.title : task?.title,
    });
  }

  function care(action) {
    if (action === 'Feed' && data.pet.food === 5) {
      setPetMessage('No! I’m full.');
      setReaction({ name: 'no' });
      return;
    }
    if (action === 'Feed' && !data.pet.apples) {
      setPetMessage('Finish a focus session to earn an apple.');
      return;
    }
    if (action === 'Inject') {
      setData((current) => current.pet.sick
        ? { ...current, pet: { ...current.pet, sick: false, health: 5 } }
        : current);
      setPetMessage('It’s over now, Pochita.');
      setReaction({ name: 'yuck' });
      return;
    }
    setReaction(null);
    if (action === 'Feed') {
      const hungerAt = Date.now();
      setData((current) => ({
        ...current, pet: { ...current.pet, food: current.pet.food + 1, apples: current.pet.apples - 1, hungerAt },
      }));
      setPetMessage('Yum! Thank you for the apple.');
    } else if (data.pet.sick) {
      setPetMessage('I still feel sick. I need my medicine.');
    } else {
      const now = Date.now();
      setData((current) => ({ ...current, pet: togglePetRest(current.pet, now) }));
      setPetMessage('Pochita is ready to play.');
    }
  }

  function rewardGame() {
    setData((current) => ({
      ...current, pet: { ...current.pet, happiness: Math.min(5, current.pet.happiness + 1) },
    }));
    setPetMessage('That was fun! Let’s play again sometime.');
  }

  function openEvent(item) {
    setCalendarDate(item.date);
    setScreen('Calendar');
    setEvent(item);
  }

  function saveEvent(item) {
    setData((current) => ({ ...current, events: [...current.events.filter((entry) => entry.id !== item.id), item] }));
    setCalendarDate(item.date);
    setEvent(null);
  }

  function saveGoal(goal) {
    setData((current) => ({ ...current, goals: current.goals.map((item) => item.id === goal.id ? goal : item) }));
  }

  return <main className="app"><div className="layout">
    <nav aria-label="Main navigation">{tabs.map((tab) => <button key={tab} aria-pressed={screen === tab}
      onClick={() => { setScreen(tab); setEvent(null); }}>{tab}</button>)}</nav>
    {data.pet.sick && <div className="sickness-alert row" role="alert">
      <span>Pochita is sick and needs an injection.</span>
      {screen !== 'Focus' && <button className="yellow" onClick={() => { setScreen('Focus'); setEvent(null); }}>Go to Focus</button>}
    </div>}
    {screen === 'Focus' && <Focus pet={data.pet} task={nextTask} timer={timer} message={petMessage} reaction={reaction?.name} onCare={care} onGameWin={rewardGame}
      focusMinutes={focusMinutes}
      onFocusMinutes={setFocusMinutes}
      onStart={start} onPause={() => setTimer((current) => ({ ...current, running: false, seconds: Math.max(1, Math.ceil((current.deadline - Date.now()) / 1000)) }))}
      onViewPlan={() => { setPlanDate(nextTask?.date ?? today); setMode('list'); setScreen('Plan'); }} />}
    {screen === 'Diary' && <Diary date={diaryDate} onDate={setDiaryDate} entries={data.entries} goals={data.goals} onGoal={saveGoal}
      onSave={(key, entry) => setData((current) => ({ ...current, entries: { ...current.entries, [key]: entry } }))} />}
    {screen === 'Calendar' && (event
      ? <EventEditor key={event.id ?? 'new'} event={event} onSave={saveEvent} onCancel={() => setEvent(null)}
        onDelete={(id) => { setData((current) => ({ ...current, events: current.events.filter((item) => item.id !== id) })); setEvent(null); }} />
      : <Calendar date={calendarDate} onDate={setCalendarDate} events={data.events} entries={data.entries} onEdit={openEvent}
        onDiary={(date) => { setDiaryDate(date); setScreen('Diary'); }} />)}
    {screen === 'Plan' && <Plan date={planDate} onDate={setPlanDate} mode={mode} onMode={setMode} tasks={data.tasks} events={data.events} focusMinutes={focusMinutes}
      onFocusMinutes={setFocusMinutes}
      rollover={data.rollover} hours={data.hours} plan={data.plans[planDate]} onEvent={openEvent}
      preference={planPreferences[planDate] ?? data.plans[planDate]?.preference ?? ''}
      onAdd={(task) => setData((current) => ({ ...current, tasks: [...current.tasks, { ...task, date: planDate }] }))}
      onToggle={(id) => setData((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, done: !item.done } : item) }))}
      onDelete={(id) => setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== id) }))}
      onRollover={() => setData((current) => ({ ...current, rollover: !current.rollover }))}
      onFocus={(task) => { setPickedTask(task.id); setScreen('Focus'); }}
      onHours={(hours) => setData((current) => ({ ...current, hours }))}
      onSave={(plan) => setData((current) => ({ ...current, plans: { ...current.plans, [planDate]: plan } }))} />}
    <ChatDock key={event ? 'Editor' : screen + (screen === 'Plan' ? mode : '')} screen={event ? 'Editor' : screen}
      planning={screen === 'Plan' && mode === 'list'} onPlan={() => setMode('plan')} pending={pending} apples={data.pet.apples} chat={chat}
      onPlanPreference={screen === 'Plan' && mode === 'plan'
        ? (text) => setPlanPreferences((current) => ({ ...current, [planDate]: text })) : undefined} />
  </div></main>;
}

createRoot(document.getElementById('root')).render(<App />);
