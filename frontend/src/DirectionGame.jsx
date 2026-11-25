import { useEffect, useRef, useState } from 'react';
import standing from './sprites/standing.png';
import left from './sprites/no/no_left.png';
import right from './sprites/no/no_right.png';

const rounds = 5;
const winningScore = 3;
const sprites = { Left: left, Right: right };

export default function DirectionGame({ onClose, onWin }) {
  const game = useRef(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const finished = round === rounds && result !== null;

  useEffect(() => {
    game.current.focus({ preventScroll: true });
  }, [result]);

  function guess(direction) {
    if (result) return;
    const facing = Math.random() < 0.5 ? 'Left' : 'Right';
    const correct = direction === facing;
    const nextScore = score + Number(correct);
    setResult({ facing, correct });
    setScore(nextScore);
    if (round === rounds && nextScore >= winningScore) onWin();
  }

  function advance() {
    setRound(finished ? 1 : round + 1);
    if (finished) setScore(0);
    setResult(null);
  }

  function handleKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Enter' && result && event.target === game.current) {
      event.preventDefault();
      if (!event.repeat) advance();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (event.repeat) return;
    if (result) advance();
    else guess(event.key === 'ArrowLeft' ? 'Left' : 'Right');
  }

  return <section ref={game} tabIndex={-1} className="direction-game" aria-label="Pochita’s Turn" onKeyDown={handleKey}>
    <header className="pet-message direction-heading row">
      <span>Round {round}/{rounds}</span><span>Score {score}/{rounds}</span>
      <button type="button" aria-label="Close game" title="Close game (Esc)" onClick={onClose}>×</button>
    </header>
    <img className="sprite direction-sprite" src={result ? sprites[result.facing] : standing}
      alt={result ? 'Pochita faces ' + result.facing.toLowerCase() : 'Pochita looks ahead'} />
    <div className="direction-controls">
      <p className="direction-result" role="status">{finished
        ? (score >= winningScore ? 'You won! +1 happiness' : 'Nice try!')
        : result ? (result.correct ? 'You got it!' : 'Pochita turned ' + result.facing.toLowerCase() + '.')
          : 'Guess with the arrow keys'}</p>
      {result ? <button type="button" className="yellow direction-next" onClick={advance}>
        {finished ? 'Play again' : 'Next round'} <span aria-hidden="true">→</span>
      </button> : <div className="direction-buttons">
        <button type="button" className="yellow" aria-label="Guess left" onClick={() => guess('Left')}>←</button>
        <button type="button" className="yellow" aria-label="Guess right" onClick={() => guess('Right')}>→</button>
      </div>}
    </div>
  </section>;
}
