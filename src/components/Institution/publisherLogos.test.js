import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

// The module imports SVGs through Vite, so node reads its source instead.
const source = readFileSync(new URL('./publisherLogos.js', import.meta.url), 'utf8');
const assetsDir = new URL('../../assets/publishers/', import.meta.url);
const imports = [...source.matchAll(/^import (\w+) from '\.\.\/\.\.\/assets\/publishers\/([\w-]+)\.svg';$/gm)];
const files = readdirSync(assetsDir).filter(name => name.endsWith('.svg'));

test('every mapped logo is a bundled file named after its platform id', () => {
  assert.ok(imports.length > 0);
  for (const [, name, file] of imports) {
    assert.equal(name, file);
    assert.ok(existsSync(new URL(`${file}.svg`, assetsDir)), `${file}.svg is missing`);
  }
});

test('every bundled logo has a provenance row in the README', () => {
  const readme = readFileSync(new URL('README.md', assetsDir), 'utf8');
  for (const file of files) assert.ok(readme.includes(`\`${file}\``), `${file} is not in the README`);
});

test('no bundled logo can run script or load another resource', () => {
  for (const file of files) {
    const svg = readFileSync(new URL(file, assetsDir), 'utf8');
    for (const pattern of [/<script/i, /<image/i, /<foreignObject/i, /href="http/i, /@import/i, /url\(\s*['"]?http/i]) {
      assert.doesNotMatch(svg, pattern, `${file} matches ${pattern}`);
    }
  }
});
