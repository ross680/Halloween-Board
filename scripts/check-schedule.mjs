// Confirms the seasonal windows. Run: node scripts/check-schedule.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { console, Date, Number, String, RegExp };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'settings.js'), 'utf8'), sandbox, { filename: 'settings.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'schedule.js'), 'utf8'), sandbox, { filename: 'schedule.js' });

const schedule = sandbox.BOARD_SCHEDULE;
const failures = [];

function on(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return schedule.resolve({ year, month, day });
}

function expect(iso, theme, mix) {
  const got = on(iso);
  if (got.theme !== theme || !!got.mixBoiler !== !!mix) {
    failures.push(iso + ' expected ' + theme + ' mix=' + mix + ' got ' + got.theme + ' mix=' + got.mixBoiler);
  }
}

if (schedule.weekday(2024, 1, 1) !== 1) failures.push('2024-01-01 should be Monday');
if (schedule.weekday(2026, 11, schedule.thanksgivingDay(2026)) !== 4) {
  failures.push('Thanksgiving should be a Thursday');
}

expect('2026-10-01', 'halloween', false);
expect('2026-10-26', 'halloween', false);
expect('2026-11-01', 'halloween', false);
expect('2026-11-02', 'boiler', false);

const tg = schedule.thanksgivingDay(2026);
const sun = tg - schedule.weekday(2026, 11, tg);
expect('2026-11-' + String(sun).padStart(2, '0'), 'thanksgiving', true);
expect('2026-11-' + String(tg).padStart(2, '0'), 'thanksgiving', true);
expect('2026-11-' + String(sun + 6).padStart(2, '0'), 'thanksgiving', true);
expect('2026-11-' + String(sun - 1).padStart(2, '0'), 'boiler', false);
expect('2026-11-' + String(sun + 7).padStart(2, '0'), 'boiler', false);

expect('2026-12-01', 'christmas', true);
expect('2026-12-25', 'christmas', true);
expect('2026-12-30', 'christmas', true);
expect('2026-12-31', 'newyear', true);
expect('2027-01-01', 'newyear', true);
expect('2027-01-07', 'newyear', true);
expect('2027-01-08', 'boiler', false);
expect('2026-02-06', 'boiler', false);
expect('2026-02-07', 'valentines', true);
expect('2026-02-14', 'valentines', true);
expect('2026-02-15', 'boiler', false);
expect('2026-03-09', 'boiler', false);
expect('2026-03-17', 'stpatricks', true);
expect('2026-03-18', 'boiler', false);
expect('2026-03-31', 'boiler', false);
expect('2026-04-01', 'shop', false);
expect('2026-06-27', 'shop', false);
expect('2026-06-28', 'july4', false);
expect('2026-07-04', 'july4', false);
expect('2026-07-05', 'july4', false);
expect('2026-07-06', 'shop', false);
expect('2026-08-15', 'shop', false);

const forced = schedule.describe('christmas', { year: 2026, month: 8, day: 1 });
if (!forced || forced.theme !== 'christmas' || forced.mixBoiler) {
  failures.push('forced christmas in August should not mix boiler slides');
}
const winter = schedule.describe('christmas', { year: 2026, month: 12, day: 20 });
if (!winter || !winter.mixBoiler) failures.push('christmas in December should mix boiler slides');
const spooky = schedule.describe('halloween', { year: 2026, month: 10, day: 26 });
if (!spooky || spooky.mixBoiler) failures.push('halloween should never mix boiler slides');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Season windows look right. Thanksgiving 2026 is November ' + tg + '.');
