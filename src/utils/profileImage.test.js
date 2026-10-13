import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProfilePhoto,
  squareSource,
  validateProfileImageMetadata,
} from './profileImage.js';

test('accepts ordinary profile image metadata', () => {
  assert.doesNotThrow(() => validateProfileImageMetadata({
    type: 'image/jpeg',
    size: 250_000,
  }));
});

test('rejects oversized and non-image profile files', () => {
  assert.throws(
    () => validateProfileImageMetadata({ type: 'application/pdf', size: 20_000 }),
    /PNG, JPEG o WebP/,
  );
  assert.throws(
    () => validateProfileImageMetadata({ type: 'image/svg+xml', size: 20_000 }),
    /PNG, JPEG o WebP/,
  );
  assert.throws(
    () => validateProfileImageMetadata({ type: 'image/png', size: 9 * 1024 * 1024 }),
    /8 MB/,
  );
});

test('only keeps bounded embedded profile images', () => {
  const photo = `data:image/webp;base64,${'a'.repeat(120)}`;
  assert.equal(normalizeProfilePhoto(photo), photo);
  assert.equal(normalizeProfilePhoto('https://tracking.example/avatar.png'), null);
  assert.equal(normalizeProfilePhoto(`data:image/png;base64,${'a'.repeat(300_000)}`), null);
});

test('without a crop the centred square of the image is drawn', () => {
  assert.deepEqual(squareSource(1200, 800), { x: 200, y: 0, size: 800 });
  assert.deepEqual(squareSource(600, 900), { x: 0, y: 150, size: 600 });
});

test('a crop is kept when it fits and clamped inside the image when it does not', () => {
  assert.deepEqual(squareSource(1200, 800, { x: 100, y: 50, size: 400 }), { x: 100, y: 50, size: 400 });
  // Past the right and bottom edges: pulled back so the square ends on them.
  assert.deepEqual(squareSource(1200, 800, { x: 1000, y: 700, size: 400 }), { x: 800, y: 400, size: 400 });
  // Before the left and top edges.
  assert.deepEqual(squareSource(1200, 800, { x: -30, y: -1, size: 400 }), { x: 0, y: 0, size: 400 });
  // Larger than the short side: shrunk to it.
  assert.deepEqual(squareSource(1200, 800, { x: 500, y: 0, size: 2000 }), { x: 400, y: 0, size: 800 });
});
