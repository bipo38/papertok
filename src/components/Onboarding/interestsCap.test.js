import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Comments are stripped first (convention of ce139ce): a matcher that reads
// comments would be satisfied by the explanation alone.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('SOURCE: the onboarding refuses to continue, or to finish, over the cap', async () => {
  const code = stripComments(await read('./OnboardingFlow.jsx'));
  assert.match(code, /import \{ USER_PREFERENCES_MAX \} from '\.\.\/\.\.\/utils\/accountOnboarding\.js';/);
  assert.match(code, /const overCap = picked\.size > USER_PREFERENCES_MAX;/);
  assert.match(code, /const canContinue = picked\.size > 0 && !overCap;/, 'Continue is gated');
  // The stepper's "ahead" step follows the same rule as Continue.
  assert.match(code, /const reachable = target < step \|\| \(target === 2 && canContinue\);/);
  assert.match(code, /At most \$\{USER_PREFERENCES_MAX\} categories: drop \$\{picked\.size - USER_PREFERENCES_MAX\}\./, 'the hint says how many to drop');
  // Finish can be the step-1 button too (an account with a profile already),
  // so the cap closes at the function as well as at the button.
  assert.match(code, /const handleFinish = async \(\) => \{\s*if \(overCap \|\| saving\) return;/, 'handleFinish refuses over the cap whatever called it');
  assert.match(code, /disabled=\{saving \|\| overCap \|\| \(step === 1 && !canContinue\)\}\s*onClick=\{handleFinish\}/, 'the finish button is disabled over the cap');
});

test('SOURCE: the settings picker refuses to save over the cap, before the write', async () => {
  const code = stripComments(await read('../Settings/EditInterestsModal.jsx'));
  assert.match(code, /import \{ USER_PREFERENCES_MAX \} from '\.\.\/\.\.\/utils\/accountOnboarding\.js';/);
  const guard = code.match(/if \(selected\.size > USER_PREFERENCES_MAX\) \{[\s\S]*?return;\s*\}/);
  assert.ok(guard, 'the save handler has no cap guard');
  assert.match(guard[0], /At most \$\{USER_PREFERENCES_MAX\} interests: drop \$\{selected\.size - USER_PREFERENCES_MAX\}\./);
  const save = code.indexOf('await updatePreferences(Array.from(selected))');
  assert.ok(save > -1 && code.indexOf('if (selected.size > USER_PREFERENCES_MAX)') < save, 'the guard runs before the write');
});
