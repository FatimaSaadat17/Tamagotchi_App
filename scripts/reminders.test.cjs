const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createReminderScheduler } = require('../desktop/reminders.cjs');

const date = '2026-11-27';
const meeting = { kind: 'calendar', id: 'meeting', title: 'Meeting', date, minute: 600 };

function harness(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'pocket-reminders-test-'));
  const file = path.join(directory, 'history.json');
  let scheduler;
  let now;
  const seen = [];
  t.mock.method(Date, 'now', () => now);
  t.after(() => {
    scheduler?.stop();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    seen,
    at(hour, minute) { now = new Date(2026, 10, 27, hour, minute).getTime(); },
    restart(entries) {
      scheduler?.stop();
      scheduler = createReminderScheduler(file, (event) => seen.push(event.title));
      scheduler.replace(entries);
    },
    replace(entries) { scheduler.replace(entries); },
    check() { scheduler.check(); },
  };
}

test('calendar notifies 30 and 15 minutes ahead without repeating on restart', (t) => {
  const clock = harness(t);
  clock.at(9, 29);
  clock.restart([meeting]);
  assert.deepEqual(clock.seen, []);
  clock.at(9, 30);
  clock.check();
  clock.restart([meeting]);
  assert.deepEqual(clock.seen, ['Meeting']);
  clock.at(9, 45);
  clock.check();
  clock.restart([meeting]);
  assert.deepEqual(clock.seen, ['Meeting', 'Meeting']);
});

test('after waking, deliver the most recent due alert and skip past events', (t) => {
  const clock = harness(t);
  clock.at(9, 20);
  clock.restart([meeting]);
  clock.at(9, 50);
  clock.check();
  assert.deepEqual(clock.seen, ['Meeting']);
  clock.at(10, 1);
  clock.restart([meeting]);
  assert.deepEqual(clock.seen, ['Meeting']);
});

test('saved work and breaks alert five minutes ahead and reflect edits', (t) => {
  const clock = harness(t);
  const focus = { ...meeting, kind: 'focus', id: 'focus', title: 'Write', minute: 610 };
  const breakBlock = { ...meeting, kind: 'break', id: '', title: 'Break', minute: 635 };
  clock.at(9, 55);
  clock.restart([focus, breakBlock]);
  clock.at(10, 5);
  clock.check();
  assert.deepEqual(clock.seen, ['Write']);
  clock.replace([{ ...breakBlock, minute: 640 }]);
  clock.at(10, 30);
  clock.check();
  assert.deepEqual(clock.seen, ['Write']);
  clock.at(10, 35);
  clock.check();
  assert.deepEqual(clock.seen, ['Write', 'Break']);
});
