import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/** Source without its comments, so a mention in prose cannot satisfy a check. */
async function stripped(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const jsx = await stripped('./AvatarPicker.jsx');
const css = await stripped('./AvatarPicker.css');

test('the avatar is a native button named for what pressing it does', () => {
  const button = jsx.match(/<button\s[\s\S]*?className="avatar-picker-button"[\s\S]*?>/);
  assert.ok(button, 'expected the avatar to be a <button>');
  assert.match(button[0], /type="button"/);
  assert.match(button[0], /aria-label=\{value \? copy\.change : copy\.choose\}/);
  assert.match(jsx, /choose:\s*'Choose a photo'/);
  assert.match(jsx, /change:\s*'Change photo'/);
});

test('the avatar target never shrinks below 44 px', () => {
  const rule = css.match(/\.avatar-picker-button\s*\{[^}]*\}/);
  assert.ok(rule);
  assert.match(rule[0], /width:\s*max\(44px,/);
  assert.match(rule[0], /height:\s*max\(44px,/);
});

test('the hidden file input accepts exactly the types the preparer accepts', () => {
  assert.match(jsx, /const ACCEPT = 'image\/png,image\/jpeg,image\/webp';/);
  const input = jsx.match(/<input\s[\s\S]*?\/>/);
  assert.ok(input);
  assert.match(input[0], /type="file"/);
  assert.match(input[0], /accept=\{ACCEPT\}/);
  assert.match(input[0], /tabIndex=\{-1\}/);
});

test('a file is validated before the crop dialog opens', () => {
  const takeFile = jsx.match(/const takeFile = [\s\S]*?\n {2}\};/);
  assert.ok(takeFile);
  assert.ok(
    takeFile[0].indexOf('validateProfileImageMetadata(file)') < takeFile[0].indexOf('openEditor(file)'),
    'validation must run before the editor opens',
  );
});

test('both presets are prepared from the same crop', () => {
  assert.match(jsx, /const crop = cropFromView\(/);
  assert.match(
    jsx,
    /prepareProfileImage\(editing\.file, \{ crop \}\),\s*prepareProfileImage\(editing\.file, \{ \.\.\.PUBLIC_AVATAR_PRESET, crop \}\),/,
  );
  assert.match(jsx, /onChange\?\.\(\{ account, public: publicPhoto, file: editing\.file \}\)/);
  assert.match(jsx, /const sourceFile = value\?\.file instanceof File \? value\.file : null;/, 'Adjust reopens the file carried in the value, so a remount keeps it');
  assert.doesNotMatch(jsx, /setSourceFile/);
});

test('the crop dialog is the shared Dialog, not a hand-rolled overlay', () => {
  assert.match(jsx, /from '\.\.\/ui\/dialog\.jsx'/);
  assert.match(jsx, /<Dialog\s[\s\S]*?<DialogContent/);
  assert.match(jsx, /<DialogTitle>\{copy\.title\}<\/DialogTitle>/);
  assert.match(jsx, /from '\.\.\/ui\/slider\.jsx'/);
  assert.doesNotMatch(jsx, /createPortal|position:\s*'fixed'/);
  assert.doesNotMatch(css, /position:\s*fixed/);
});

test('the object URL is released only after the exit animation', () => {
  assert.match(jsx, /onOpenChangeComplete=\{\(next\) => \{ if \(!next\) setEditing\(null\); \}\}/);
  assert.match(jsx, /URL\.revokeObjectURL\(editingUrl\)/);
});

test('reduced motion removes the viewport transition', () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/);
  assert.ok(block);
  assert.match(block[0], /\.avatar-crop-image\s*\{\s*transition:\s*none;/);
});

test('the styles stay on tokens: no hex colours or pixel radii', () => {
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /border-radius:\s*\d/);
});
