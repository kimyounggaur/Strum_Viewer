// Ad-hoc verification of the multi-bar rhythm math in src/lib/rhythm.ts.
// Transpiles the TS on the fly (type-only imports are stripped) and asserts.
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = await readFile(path.join(root, 'src', 'lib', 'rhythm.ts'), 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tmp = path.join(__dirname, '.rhythm.test.mjs');
await writeFile(tmp, js, 'utf8');
const R = await import('file://' + tmp.replace(/\\/g, '/'));
await rm(tmp, { force: true });

let pass = 0;
let fail = 0;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
function check(name, actual, expected, eps) {
  const ok = eps != null ? approx(actual, expected, eps) : actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${JSON.stringify(actual)}${ok ? '' : ' expected ' + JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

// 2-bar 3/4 waltz, eighth grid (matches three-four_ex01 shape)
const twoBar = {
  timeSignature: [3, 4], pulseNote: 'quarter', beatsPerBar: 3, subdivision: 2, bars: 2,
  feelTiming: 'straight', imageLeftPad: 0.2, imageRightPad: 0.88,
  strokes: [{ step: 0, dir: 'down' }, { step: 6, dir: 'down' }, { step: 10, dir: 'up' }],
};
const bpm = 90; // beat = 0.6667s
check('2bar loopBeats', R.loopBeats(twoBar), 6);
check('2bar loopDuration@90', R.loopDuration(twoBar, bpm), 6 * (60 / 90), 1e-6);
check('2bar cellsInLoop', R.cellsInLoop(twoBar), 12);
check('2bar stepToTime(step6)=bar2 downbeat', R.stepToTime(6, twoBar, bpm), 3 * (60 / 90), 1e-6);
check('2bar strokeXNorm(step10)', R.strokeXNorm({ step: 10 }, twoBar), 0.2 + (0.88 - 0.2) * (10 / 11), 1e-6);
check('2bar formatBeatLabels.length', R.formatBeatLabels(twoBar).length, 12);
check('2bar labels reset per measure', R.formatBeatLabels(twoBar).filter((l) => l === '1').length, 2);

// 1-bar triplet 3/4 (matches three-four_ex10 fix)
const triplet = {
  timeSignature: [3, 4], pulseNote: 'quarter', beatsPerBar: 3, subdivision: 3, bars: 1,
  feelTiming: 'triplet', imageLeftPad: 0.17, imageRightPad: 0.9, strokes: [],
};
check('triplet loopBeats', R.loopBeats(triplet), 3);
check('triplet cellsInLoop', R.cellsInLoop(triplet), 9);
check('triplet loopDuration@90', R.loopDuration(triplet, bpm), 3 * (60 / 90), 1e-6);

// 1-bar 4/4 sixteenth regression (bars omitted -> defaults to 1, must match legacy)
const oneBar = {
  timeSignature: [4, 4], pulseNote: 'quarter', beatsPerBar: 4, subdivision: 4,
  feelTiming: 'straight', strokes: [],
};
check('1bar default barCount', R.barCount(oneBar), 1);
check('1bar loopBeats==beatsPerBar', R.loopBeats(oneBar), 4);
check('1bar loopDuration==barDuration', R.loopDuration(oneBar, bpm), R.barDuration(oneBar, bpm), 1e-9);
check('1bar cellsInLoop==cellsInBar', R.cellsInLoop(oneBar), R.cellsInBar(oneBar));

// Swing timing unaffected across bars (4/4 shuffle, subdiv 2)
const swing = {
  timeSignature: [4, 4], pulseNote: 'quarter', beatsPerBar: 4, subdivision: 2, bars: 1,
  feelTiming: 'swing', swing: 0.65, strokes: [],
};
check('swing offbeat step1 late', R.stepToTime(1, swing, bpm), (60 / 90) * 0.65, 1e-6);
check('swing onbeat step2 (beat2)', R.stepToTime(2, swing, bpm), 60 / 90, 1e-6);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
