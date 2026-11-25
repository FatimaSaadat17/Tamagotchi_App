import { focusBlock, sessionsLeft } from './model';
import { apple, Apples, art, broom, face, Icon, Segments } from './ui';

const careActions = [
  { label: 'Play', pieces: [['Controller', '25% 10%']] },
  { label: 'Feed', pieces: apple },
  { label: 'Clean', pieces: broom },
  { label: 'Rest', pieces: [['PixelCrescent', '10%']] },
];

export default function Focus({ pet, task, timer, message, onCare, onStart, onPause, onViewPlan }) {
  const seconds = timer.seconds;
  const clock = [Math.floor(seconds / 60), seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');

  return <section className="focus" aria-label="Focus room">
    <div className="scene">
      <div className="scene-room"><img src={art('BgBasketBall')} alt="" /></div>
      <img className="scene-tv" src={art('TvOutline')} alt="" />
      <div className="pet-status">
        <div><Icon pieces={[[ 'Frame', '0' ]]} /><Segments label="Health" count={5} filled={pet.health} /></div>
        <div className="green"><Icon pieces={apple} /><Segments label="Fullness" count={5} filled={pet.food} /></div>
        <div><Icon pieces={face} /><Segments label="Happiness" count={5} filled={pet.happiness} /></div>
      </div>
      <p className="pet-message" role="status">{message}</p>
      <img className="sprite" src={art('Standing1')} alt="A white pixel pet" />
      <div className="care">{careActions.map(({ label, pieces }) =>
        <button key={label} className={label === 'Play' ? 'yellow' : ''} aria-label={label} title={label} onClick={() => onCare(label)}>
          <Icon pieces={pieces} />
        </button>
      )}</div>
    </div>
    <div className="focus-progress">
      <div className="row"><span>FOCUS · {timer.title || 'DRAFT'}</span><span aria-label="Focus time remaining">{clock}</span></div>
      <Segments label="Focus minutes remaining" count={focusBlock} filled={Math.ceil(seconds / 60)} />
    </div>
    <div className="next-task">
      <div className="next-task-details">
        <div className="row"><small>NEXT FROM TO-DO</small><button className="text-button" onClick={onViewPlan}>View to-do ›</button></div>
        <strong>{task?.title || 'Free focus session'}</strong>
        {task && <div className="row reward"><Apples count={sessionsLeft(task)} />
          <small>{task.sessions}/{Math.ceil(task.minutes / focusBlock)} sessions done</small></div>}
      </div>
      <div className="focus-actions">
        <span className="reward"><Apples count={1} /> {pet.apples} earned</span>
        <button className="yellow" onClick={timer.running ? onPause : () => onStart(task)}>
          {timer.running ? 'Pause focus' : timer.active ? 'Resume focus' : 'Start ' + focusBlock + 'm focus'}
        </button>
        <small>Finish a session → Feed your pet</small>
      </div>
    </div>
  </section>;
}
