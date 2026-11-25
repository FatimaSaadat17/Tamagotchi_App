import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-500.css';
import { Calendar, EventEditor } from './Calendar';
import Diary from './Diary';
import Focus from './Focus';
import Plan from './Plan';
import { comparePriority, focusBlock, offsetDate, readData, saveData, sessionsLeft, today, updateHunger } from './model';
import { Avatar } from './ui';
import './style.css';

const tabs = ['Plan', 'Diary', 'Focus', 'Calendar'];
const chatLabels = {
  Focus: 'Your focus companion',
  Diary: 'A little space to reflect',
  Calendar: 'Your calendar companion',
  Plan: 'Need a gentler plan?',
  Editor: 'Plans change. That’s okay.',
};
const newTimer = { seconds: focusBlock * 60, active: false, running: false, taskId: null, title: '' };

function ChatDock({ screen, planning, onPlan, pending, apples }) {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');

  if (planning) return <section className="chat-dock plan-dock" aria-label="Planning companion">
    <Avatar /><div><strong>Your AI planning pal</strong><small>{pending} sessions left · {apples} {apples === 1 ? 'apple' : 'apples'} earned</small></div>
    <button className="yellow" onClick={onPlan}>Plan my day</button>
  </section>;

  function send(event) {
    event.preventDefault();
    if (!message.trim()) return;
    const work = /plan|work|task|study/i.test(message);
    setReply(work ? 'Let’s start with one small task. I’ll keep you company!' : 'Thanks for telling me. I’m right here with you.');
    setMessage('');
  }

  return <section className="chat-dock" aria-label="Demo chat">
    <Avatar /><div className="chat-main">
      <div className="row"><span role="status">{reply || chatLabels[screen]}</span><small title="Local demo responses">AI CHAT</small></div>
      <form className="chat-form" onSubmit={send}><input aria-label="Message your AI pal" placeholder="Message your AI pal…"
        value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} />
        <button className="yellow">Send</button></form>
    </div>
  </section>;
}

function App() {
  const [data, setData] = useState(readData);
  const [screen, setScreen] = useState('Focus');
  const [mode, setMode] = useState('list');
  const [planDate, setPlanDate] = useState(today);
  const [diaryDate, setDiaryDate] = useState(() => Object.keys(data.entries).sort().at(-1) ?? offsetDate(today, -2));
  const [calendarDate, setCalendarDate] = useState(today);
  const [event, setEvent] = useState(null);
  const [pickedTask, setPickedTask] = useState(null);
  const [timer, setTimer] = useState(newTimer);
  const [petMessage, setPetMessage] = useState('Your tasks help me grow!');
  const [reaction, setReaction] = useState(null);
  const focusable = data.tasks.filter((task) => task.date === today && !task.done && sessionsLeft(task) > 0).sort(comparePriority);
  const nextTask = data.tasks.find((task) => task.id === timer.taskId)
    ?? data.tasks.find((task) => task.id === pickedTask && !task.done && sessionsLeft(task) > 0)
    ?? focusable[0];
  const pending = data.tasks.filter((task) => task.date === planDate && !task.done).reduce((sum, task) => sum + sessionsLeft(task), 0);

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    const interval = setInterval(() => setData((current) => {
      const pet = updateHunger(current.pet);
      return pet === current.pet ? current : { ...current, pet };
    }), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!reaction) return;
    const timeout = setTimeout(() => {
      setReaction(reaction.name === 'yuck' ? { name: 'cry' } : null);
    }, reaction.name === 'yuck' ? 640 : 1920);
    return () => clearTimeout(timeout);
  }, [reaction]);

  const { deadline, taskId, running } = timer;
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
        tasks: current.tasks.map((task) => task.id === taskId ? { ...task, sessions: task.sessions + 1 } : task),
      }));
    }, 250);
    return () => clearInterval(interval);
  }, [deadline, taskId, running]);

  function start(task) {
    const minutes = task ? Math.min(focusBlock, task.minutes - task.sessions * focusBlock) : focusBlock;
    const seconds = timer.active ? timer.seconds : minutes * 60;
    setTimer({
      active: true, running: true, seconds, deadline: Date.now() + seconds * 1000,
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
      setData((current) => ({
        ...current, pet: { ...current.pet, health: Math.min(5, current.pet.health + 1) },
      }));
      setPetMessage('I feel rested.');
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
      onStart={start} onPause={() => setTimer((current) => ({ ...current, running: false, seconds: Math.max(1, Math.ceil((current.deadline - Date.now()) / 1000)) }))}
      onViewPlan={() => { setPlanDate(nextTask?.date ?? today); setMode('list'); setScreen('Plan'); }} />}
    {screen === 'Diary' && <Diary date={diaryDate} onDate={setDiaryDate} entries={data.entries} goals={data.goals} onGoal={saveGoal}
      onSave={(key, entry) => setData((current) => ({ ...current, entries: { ...current.entries, [key]: entry } }))} />}
    {screen === 'Calendar' && (event
      ? <EventEditor key={event.id ?? 'new'} event={event} onSave={saveEvent} onCancel={() => setEvent(null)}
        onDelete={(id) => { setData((current) => ({ ...current, events: current.events.filter((item) => item.id !== id) })); setEvent(null); }} />
      : <Calendar date={calendarDate} onDate={setCalendarDate} events={data.events} entries={data.entries} onEdit={openEvent}
        onDiary={(date) => { setDiaryDate(date); setScreen('Diary'); }} />)}
    {screen === 'Plan' && <Plan date={planDate} onDate={setPlanDate} mode={mode} onMode={setMode} tasks={data.tasks} events={data.events}
      rollover={data.rollover} hours={data.hours} plan={data.plans[planDate]} onEvent={openEvent}
      onAdd={(task) => setData((current) => ({ ...current, tasks: [...current.tasks, { ...task, date: planDate }] }))}
      onToggle={(id) => setData((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, done: !item.done } : item) }))}
      onDelete={(id) => setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== id) }))}
      onRollover={() => setData((current) => ({ ...current, rollover: !current.rollover }))}
      onFocus={(task) => { setPickedTask(task.id); setScreen('Focus'); }}
      onHours={(hours) => setData((current) => ({ ...current, hours }))}
      onSave={(plan) => setData((current) => ({ ...current, plans: { ...current.plans, [planDate]: plan } }))} />}
    <ChatDock key={event ? 'Editor' : screen + (screen === 'Plan' ? mode : '')} screen={event ? 'Editor' : screen}
      planning={screen === 'Plan' && mode === 'list'} onPlan={() => setMode('plan')} pending={pending} apples={data.pet.apples} />
  </div></main>;
}

createRoot(document.getElementById('root')).render(<App />);
