import { squareSource } from './profileImage.js';

/*
 * The crop dialog's geometry. The image is drawn centred in a square viewport
 * of `viewSize` CSS pixels, at scale 1 just covering it (its short side equals
 * the viewport), then zoomed by `scale` and moved by `offsetX`/`offsetY`
 * (CSS pixels, positive = right/down). The circle is inscribed in the
 * viewport, so the crop is the whole viewport, mapped back to source pixels.
 */

function coverSize({ viewSize, naturalWidth, naturalHeight, scale }) {
  const side = Math.min(naturalWidth, naturalHeight);
  return {
    width: (viewSize * naturalWidth * scale) / side,
    height: (viewSize * naturalHeight * scale) / side,
  };
}

/** Keeps the offsets inside the range where the image still covers the viewport. */
export function clampOffset({ viewSize, naturalWidth, naturalHeight, scale, offsetX, offsetY }) {
  const { width, height } = coverSize({ viewSize, naturalWidth, naturalHeight, scale });
  const maxX = Math.max(0, (width - viewSize) / 2);
  const maxY = Math.max(0, (height - viewSize) / 2);
  return {
    offsetX: Math.min(Math.max(offsetX, -maxX), maxX),
    offsetY: Math.min(Math.max(offsetY, -maxY), maxY),
  };
}

/** The viewport's square in source pixels, as `prepareProfileImage`'s `crop`. */
export function cropFromView({ viewSize, naturalWidth, naturalHeight, scale, offsetX, offsetY }) {
  const side = Math.min(naturalWidth, naturalHeight);
  const pixelsPerSource = (viewSize * scale) / side;
  const size = side / scale;
  return squareSource(naturalWidth, naturalHeight, {
    x: (naturalWidth - size) / 2 - offsetX / pixelsPerSource,
    y: (naturalHeight - size) / 2 - offsetY / pixelsPerSource,
    size,
  });
}
