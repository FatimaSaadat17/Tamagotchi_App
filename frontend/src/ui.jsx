import { useState } from 'react';
import { maxFocusMinutes } from './model';

const artwork = import.meta.glob('./assets/*', { eager: true, import: 'default', query: '?url' });

function parseFocusMinutes(text) {
  const minutes = Number(text);
  return /^[0-9]+$/.test(text) && minutes >= 1 && minutes <= maxFocusMinutes ? minutes : null;
}

export function useFocusDuration(value, onChange) {
  const [draft, setDraft] = useState(null);
  const text = draft ?? String(value);
  const minutes = parseFocusMinutes(text);
  return {
    text, minutes, setDraft,
    commit() {
      if (minutes !== null) {
        if (minutes !== value) onChange(minutes);
        setDraft(null);
      }
    },
  };
}

export function FocusDurationInput({ id, field, disabled }) {
  const invalid = field.minutes === null;
  return <div className="duration-entry">
    <div className="duration-readout">
      <input id={id} type="text" inputMode="numeric" autoComplete="off"
        aria-label="Focus session duration in minutes" aria-invalid={invalid}
        aria-describedby={invalid ? id + '-error' : undefined} value={field.text} disabled={disabled}
        onFocus={(event) => event.currentTarget.select()} onBlur={field.commit}
        onChange={(event) => field.setDraft(event.target.value)} />
      <span aria-hidden="true">min</span>
    </div>
    {invalid && <small id={id + '-error'} role="status">Enter a whole number from 1 to {maxFocusMinutes}.</small>}
  </div>;
}

export function art(name) {
  const format = ['MainBg', 'Standing1', 'TvOutline', 'BgBasketBall'].includes(name) ? 'png' : 'svg';
  return artwork['./assets/' + name + '.' + format];
}

export function Icon({ pieces, className = '' }) {
  return <span className={'icon ' + className} aria-hidden="true">
    {pieces.map(([name, position]) => <span key={name} style={{ inset: position }}><img src={art(name)} alt="" /></span>)}
  </span>;
}

export const apple = [['Stem', '15% 45% 60%'], ['Leaf', '10% 15% 70% 55%'], ['Apple', '30% 10% 10%']];
export const face = [['Face', '12%'], ['Eyes', '29% 29% 55%'], ['Smile', '55% 26% 24%']];
export const broom = [['Handle', '9.37% 9.38% 40.63% 40.62%'], ['Bristles', '46.88% 40.63% 9.37% 9.37%'], ['Binding', '46.88% 40.63% 28.12% 34.37%']];
const egg = [
  ['EggShell', '2.68% 4.17%'], ['LcdScreen', '29.46% 16.67% 27.68%'],
  ['PixelGhost', '38.39% 28.12% 35.71%'], ['LeftButton', '77.68% 64.58% 11.61% 22.92%'],
  ['MiddleButton', '79.46% 43.75% 9.82%'], ['RightButton', '77.68% 22.92% 11.61% 64.58%'],
];

export function Avatar() {
  return <Icon pieces={egg} className="avatar" />;
}

export function Apples({ count }) {
  return <span className="apples" aria-label={count + (count === 1 ? ' apple' : ' apples')}>
    {Array.from({ length: Math.min(count, 4) }, (_, index) => <Icon pieces={apple} key={index} />)}
    {count > 4 && <small>×{count}</small>}
  </span>;
}

export function Panel({ title, action, children }) {
  return <section className="panel"><header className="panel-heading"><h1>{title}</h1>{action}</header>
    <div className="panel-content">{children}</div></section>;
}

export function DateNav({ label, previous, next }) {
  return <div className="date-nav">
    <button type="button" onClick={previous} aria-label="Previous date">‹</button>
    <strong>{label}</strong>
    <button type="button" onClick={next} aria-label="Next date">›</button>
  </div>;
}

export function Segments({ count, filled, label }) {
  return <div className="segments" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={count}
    aria-valuenow={filled} style={{ '--segment-count': count }}>
    {Array.from({ length: count }, (_, index) => <i key={index} data-filled={index < filled} />)}
  </div>;
}
