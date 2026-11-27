const { mkdirSync, readFileSync, renameSync, writeFileSync } = require('node:fs');
const { dirname } = require('node:path');

const MINUTE = 60000;
const leads = new Map([['calendar', [15, 30]], ['focus', [5]], ['break', [5]]]);

function createReminderScheduler(file, show) {
  const delivered = readHistory();
  let reminders = [];
  let timer;

  function readHistory() {
    try {
      return new Map(JSON.parse(readFileSync(file, 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('Could not read reminder history:', error.message);
      return new Map();
    }
  }

  function saveHistory() {
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file + '.tmp', JSON.stringify([...delivered]), { mode: 0o600 });
      renameSync(file + '.tmp', file);
    } catch (error) {
      console.warn('Could not save reminder history:', error.message);
    }
  }

  function check() {
    clearTimeout(timer);
    const now = Date.now();
    let next = Infinity;
    let changed = false;
    for (const [key, record] of delivered) {
      if (!Number.isFinite(record?.startsAt) || !Number.isInteger(record.lead)
          || record.startsAt < now - 48 * 60 * MINUTE) {
        delivered.delete(key);
        changed = true;
      }
    }
    for (const reminder of reminders) {
      const { kind, id, date, minute } = reminder;
      const start = new Date(date + 'T00:00:00');
      start.setHours(Math.floor(minute / 60), minute % 60);
      const startsAt = start.getTime();
      if (!(startsAt > now)) continue;
      const offsets = leads.get(kind);
      const due = offsets.find((offset) => startsAt - offset * MINUTE <= now);
      for (const offset of offsets) {
        const at = startsAt - offset * MINUTE;
        if (at > now) next = Math.min(next, at);
      }

      // After sleep or relaunch, deliver only the most recent reminder that is due.
      const key = JSON.stringify([kind, id, date, minute]);
      const previous = delivered.get(key);
      if (due === undefined || (previous && previous.lead <= due)) continue;
      delivered.set(key, { lead: due, startsAt });
      changed = true;
      try {
        show(reminder, start, key + '/' + due);
      } catch (error) {
        console.warn('Could not show Pocket Pet reminder:', error.message);
      }
    }
    if (changed) saveHistory();
    if (Number.isFinite(next)) timer = setTimeout(check, Math.min(MINUTE, next - now));
  }

  function replace(entries) {
    if (!Array.isArray(entries)) return;
    reminders = entries.filter((entry) => entry && leads.has(entry.kind)
      && typeof entry.id === 'string' && entry.id.length <= 120
      && typeof entry.title === 'string' && entry.title.trim() && entry.title.length <= 120
      && typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
      && Number.isInteger(entry.minute) && entry.minute >= 0 && entry.minute < 1440);
    check();
  }

  return { replace, check, stop: () => clearTimeout(timer) };
}

module.exports = { createReminderScheduler };
