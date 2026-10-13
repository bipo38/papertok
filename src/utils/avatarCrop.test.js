import test from 'node:test';
import assert from 'node:assert/strict';
import { clampOffset, cropFromView } from './avatarCrop.js';

// A 1200 × 800 landscape photo in a 320 px viewport: at scale 1 its short
// side fills the viewport, so one CSS pixel is 2.5 source pixels.
const photo = { viewSize: 320, naturalWidth: 1200, naturalHeight: 800 };

test('centred at scale 1 the crop is the centred square', () => {
  assert.deepEqual(
    cropFromView({ ...photo, scale: 1, offsetX: 0, offsetY: 0 }),
    { x: 200, y: 0, size: 800 },
  );
});

test('at scale 2 an offset moves the crop the other way, in source pixels', () => {
  // 0.8 CSS px per source px: dragging the image 40 px right and 20 px up
  // shows 50 source px further left and 25 further down.
  assert.deepEqual(
    cropFromView({ ...photo, scale: 2, offsetX: 40, offsetY: -20 }),
    { x: 350, y: 225, size: 400 },
  );
});

test('an offset past an edge is clamped to the image', () => {
  assert.deepEqual(
    cropFromView({ ...photo, scale: 1, offsetX: 1000, offsetY: 0 }),
    { x: 0, y: 0, size: 800 },
  );
  assert.deepEqual(
    cropFromView({ ...photo, scale: 1, offsetX: -1000, offsetY: 0 }),
    { x: 400, y: 0, size: 800 },
  );
});

test('the view offset stops where the image would uncover the circle', () => {
  // At scale 1 the photo is 480 × 320: 80 px of slack sideways, none vertically.
  assert.deepEqual(
    clampOffset({ ...photo, scale: 1, offsetX: 500, offsetY: 30 }),
    { offsetX: 80, offsetY: 0 },
  );
  // At scale 2 it is 960 × 640.
  assert.deepEqual(
    clampOffset({ ...photo, scale: 2, offsetX: -500, offsetY: 100 }),
    { offsetX: -320, offsetY: 100 },
  );
});
