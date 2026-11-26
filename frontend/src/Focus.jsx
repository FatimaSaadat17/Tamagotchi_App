import { useEffect, useRef, useState } from 'react';
import { sessionsLeft } from './model';
import { apple, Apples, art, face, FocusDurationInput, Icon, Segments, useFocusDuration } from './ui';
import DirectionGame from './DirectionGame';
import WalkingPet from './WalkingPet';

const careActions = [
  { label: 'Play', pieces: [['Controller', '25% 10%']] },
  { label: 'Feed', pieces: apple },
  { label: 'Inject', symbol: '💉' },
  { label: 'Rest', pieces: [['PixelCrescent', '10%']] },
];
export default function Focus({ pet, task, timer, message, reaction, focusMinutes, onFocusMinutes, onCare, onGameWin, onStart, onPause, onViewPlan }) {
  const [playing, setPlaying] = useState(false);
  const focusDuration = useFocusDuration(focusMinutes, onFocusMinutes);
  const playButton = useRef(null);
  const restoreFocus = useRef(false);
  const requestedMinutes = focusDuration.minutes ?? focusMinutes;
  const duration = timer.active ? timer.durationMinutes : requestedMinutes;
  const seconds = timer.active ? timer.seconds : duration * 60;
  const clock = [Math.floor(seconds / 60), seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');

  useEffect(() => {
    if (!playing && restoreFocus.current) {
      playButton.current.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [playing]);

  return <section className="focus" aria-label="Focus room">
    <div className="scene">
      <div className="scene-room"><img src={art('BgBasketBall')} alt="" /></div>
      <img className="scene-tv" src={art('TvOutline')} alt="" />
      <div className="pet-status">
        <div><Icon pieces={[[ 'Frame', '0' ]]} /><Segments label="Health" count={5} filled={pet.health} /></div>
        <div className="green"><Icon pieces={apple} /><Segments label="Fullness" count={5} filled={pet.food} /></div>
        <div><Icon pieces={face} /><Segments label="Happiness" count={5} filled={pet.happiness} /></div>
      </div>
      {playing ? <DirectionGame onClose={() => { restoreFocus.current = true; setPlaying(false); }} onWin={onGameWin} /> : <>
        <p className="pet-message" role="status">{reaction === 'yuck' ? 'Yuck!' : reaction === 'cry' ? 'Waaah!'
          : pet.sleeping ? 'Pochita is napping…' : message}</p>
        <WalkingPet mood={reaction || (pet.sick ? 'sick' : pet.sleeping ? 'sleep' : 'walk')} />
        <div className="care">{careActions.map(({ label, pieces, symbol }) =>
          <button key={label} ref={label === 'Play' ? playButton : undefined} className={label === 'Play' ? 'yellow' : ''}
            aria-label={label === 'Rest' && pet.sleeping ? 'Wake' : label} title={label === 'Rest' && pet.sleeping ? 'Wake' : label}
            disabled={pet.sleeping && label !== 'Rest'}
            onClick={() => label === 'Play' ? setPlaying(true) : onCare(label)}>
            {symbol ? <span className="care-symbol" aria-hidden="true">{symbol}</span> : <Icon pieces={pieces} />}
          </button>
        )}</div>
      </>}
    </div>
    <div className="focus-progress">
      <div className="focus-duration">
        {timer.active ? <><span className="focus-timer-title">{timer.title || 'Pomodoro'}</span>
          <span className="focus-clock" aria-label="Focus time remaining">{clock}</span></> : <>
          <label htmlFor="focus-duration">Pomodoro</label>
          <FocusDurationInput id="focus-duration" field={focusDuration} />
        </>}
      </div>
      <Segments label="Focus minutes remaining" count={duration} filled={Math.ceil(seconds / 60)} />
    </div>
    <div className="next-task">
      <div className="next-task-details">
        <div className="row"><small>NEXT FROM TO-DO</small><button className="text-button" onClick={onViewPlan}>View to-do ›</button></div>
        <strong>{task?.title || 'Free focus session'}</strong>
        {task && <div className="row reward"><Apples count={sessionsLeft(task, requestedMinutes)} />
          <small>{task.sessions}/{task.sessions + sessionsLeft(task, requestedMinutes)} sessions done</small></div>}
      </div>
      <div className="focus-actions">
        <span className="reward"><Apples count={1} /> {pet.apples} earned</span>
        <button className="yellow" disabled={!timer.active && focusDuration.minutes === null}
          onClick={timer.running ? onPause : () => {
            if (!timer.active) focusDuration.commit();
            onStart(task, duration);
          }}>
          {timer.running ? 'Pause focus' : timer.active ? 'Resume focus' : 'Start ' + requestedMinutes + 'm focus'}
        </button>
        <small>Finish a session → Feed your pet</small>
      </div>
    </div>
  </section>;
}
