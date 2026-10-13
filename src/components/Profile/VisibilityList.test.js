import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

test('the visibility list is one radio group, named once', async () => {
  const code = stripComments(await readFile(new URL('./VisibilityList.jsx', import.meta.url), 'utf8'));
  assert.match(code, /<RadioGroup\s+className="visibility-list"\s+aria-label="Who can see your profile\?"/);
  assert.doesNotMatch(code, /<fieldset|<legend/);
  assert.match(code, /const options = privateFirst \? \[\.\.\.OPTIONS\]\.reverse\(\) : OPTIONS;/);
  assert.match(code, /aria-describedby=\{checked \? `\$\{idPrefix\}-\$\{id\}-detail` : undefined\}/);
});

test('a choice that saves on the spot waits for a press, not for arrow keys', async () => {
  // Base UI checks the radio arrow keys land on; on the Privacy page that was
  // a save, so listening to the options published the profile. Verified in
  // headless Chrome: arrows move focus only, Space or a click saves, and the
  // focused option keeps focus through the save (no `disabled` while busy).
  const list = stripComments(await readFile(new URL('./VisibilityList.jsx', import.meta.url), 'utf8'));
  assert.match(list, /onValueChange=\{next => \{ if \(!commitOnPress\) onChange\(next\); \}\}/);
  // Every press reaches the owner, the checked option included: a legacy
  // profile shows Public without having chosen it, and pressing it is the answer.
  assert.match(list, /const press = commitOnPress \? \(\) => onChange\(id\) : undefined;/);
  assert.match(list, /render=\{<button type="button" className="visibility-list-row" onClick=\{press\} \/>\}/);
  const editor = stripComments(await readFile(new URL('./ProfileEditor.jsx', import.meta.url), 'utf8'));
  const privacyList = editor.match(/<VisibilityList[\s\S]*?\/>/)[0];
  assert.match(privacyList, /commitOnPress=\{!visibility\.isNew\}/);
  assert.doesNotMatch(privacyList, /disabled=/);
});
