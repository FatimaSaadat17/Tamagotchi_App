import standing from './sprites/standing.png';
import walk1 from './sprites/walking/walk_1.png';
import walk2 from './sprites/walking/walk_2.png';
import walk3 from './sprites/walking/walk_3.png';
import walk4 from './sprites/walking/walk_4.png';
import noLeft from './sprites/no/no_left.png';
import noRight from './sprites/no/no_right.png';
import yuck1 from './sprites/yuck/yuck_1.png';
import yuck2 from './sprites/yuck/yuck_2.png';
import cry1 from './sprites/cry/cry_1.png';
import cry2 from './sprites/cry/cry_2.png';
import cry3 from './sprites/cry/cry_3.png';
import cry4 from './sprites/cry/cry_4.png';
import sick1 from './sprites/sick/sick_1.png';
import sick2 from './sprites/sick/sick_2.png';
import sick3 from './sprites/sick/sick_3.png';
import sleep1 from './sprites/sleeping/sleep_1.png';
import sleep2 from './sprites/sleeping/sleep_2.png';

const walkingWidths = [476, 514, 482, 420];
const animations = {
  walk: [walk1, walk2, walk3, walk4],
  no: [noLeft, noRight, noLeft, noRight],
  yuck: [yuck1, yuck2, yuck1, yuck2],
  cry: [cry1, cry2, cry3, cry4],
  sick: [sick1, sick2, sick3, sick2],
  sleep: [sleep1, sleep2, sleep1, sleep2],
};
const description = {
  walk: 'Pochita, the white pixel pet',
  no: 'Pochita shakes his head',
  yuck: 'Pochita makes a face',
  cry: 'Pochita is crying',
  sick: 'Pochita looks sick',
  sleep: 'Pochita is asleep',
};

export default function WalkingPet({ mood = 'walk' }) {
  const walking = mood === 'walk';
  const frameDuration = { sick: 320, sleep: 600 }[mood] ?? 160;
  return <div className={'sprite' + (walking ? ' sprite-patrol' : '')} role="img" aria-label={description[mood]} data-mood={mood}>
    <img className="sprite-idle" src={standing} alt="" />
    <div className={'sprite-frames' + (walking ? ' sprite-walk' : '')} key={mood} aria-hidden="true">
      {animations[mood].map((image, index) => <img className="sprite-frame" key={index} src={image} alt=""
        style={{
          width: walking ? (100 * walkingWidths[index] / 462) + '%' : undefined,
          animationDelay: index === 0 ? '0ms' : (index - 4) * frameDuration + 'ms',
          animationDuration: frameDuration * 4 + 'ms',
        }} />)}
    </div>
  </div>;
}
