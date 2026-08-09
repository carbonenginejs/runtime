import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

// Source: trinity/trinity/TriMath.cpp (ConvertProjectionCoordToWorldPickRay, :1070)
// Source: trinity/trinity/TriDevice.cpp (TriDevice::ScreenToProjection, :?)
//
// The CPU half of picking: turning a screen pixel into a world-space ray. What
// that ray HITS needs an engine - Carbon resolves it by rendering a picking
// pass and reading pixels back - but the ray itself is plain matrix math and is
// what every pick, and PickInfinity on its own, starts from.
const PROJECTION_TO_VIEW = mat4.create();
const VIEW_TO_WORLD = mat4.create();
const RAY_START = vec3.create();
const RAY_END = vec3.create();
const RAY_DIRECTION = vec3.create();
const RESULT = {
  start: RAY_START,
  direction: RAY_DIRECTION
};

/**
 * Carbon TriDevice::ScreenToProjection: a pixel to projection coordinates in
 * [-1, 1], with y flipped.
 *
 * The division is by `width - 1`, not `width`, because D3D maps pixel CENTRES
 * to view space - so across four pixels, pixel 3 maps to 1 and pixel 0 to -1.
 * An implementation that mapped pixel EDGES would divide by width and land
 * somewhere else; Carbon's comment calls this out explicitly.
 *
 * @param {Number} x - screen x, in pixels
 * @param {Number} y - screen y, in pixels
 * @param {Object} [viewport] - { x, y, width, height }
 * @returns {{x: Number, y: Number}} projection coordinates
 */
function screenToProjection(x, y, viewport = null) {
  const originX = viewport?.x ?? 0;
  const originY = viewport?.y ?? 0;
  const width = viewport?.width ?? 1;
  const height = viewport?.height ?? 1;
  const localX = x - originX;
  const localY = y - originY;
  return {
    x: 2 * localX / (width - 1) - 1,
    y: -(2 * localY / (height - 1) - 1)
  };
}

/**
 * Carbon ConvertProjectionCoordToWorldPickRay (TriMath.cpp:1070-1101): the
 * world-space ray through a projection-space point.
 *
 * Both points are UNPROJECTED - transformed through the inverse projection and
 * then the inverse view, dividing by w - and the direction is the normalized
 * difference between them. The far point sits at projection depth 0.5 rather
 * than 1, which is far enough to give a stable direction without touching the
 * precision at the far plane.
 *
 * The returned record is REUSED between calls, because this sits on an input
 * path that may run per mouse move; copy out of it before calling again.
 *
 * @param {Number} x - projection-space x, in [-1, 1]
 * @param {Number} y - projection-space y, in [-1, 1]
 * @param {Float32Array} projection - the projection matrix
 * @param {Float32Array} view - the view matrix
 * @returns {{start: Float32Array, direction: Float32Array}|null} null when
 *   either matrix is singular, matching Carbon's false return
 */
function convertProjectionCoordToWorldPickRay(x, y, projection, view) {
  if (!mat4.invert(PROJECTION_TO_VIEW, projection) || !mat4.invert(VIEW_TO_WORLD, view)) {
    return null;
  }
  vec3.set(RAY_START, x, y, 0);
  vec3.transformMat4(RAY_START, RAY_START, PROJECTION_TO_VIEW);
  vec3.transformMat4(RAY_START, RAY_START, VIEW_TO_WORLD);
  vec3.set(RAY_END, x, y, 0.5);
  vec3.transformMat4(RAY_END, RAY_END, PROJECTION_TO_VIEW);
  vec3.transformMat4(RAY_END, RAY_END, VIEW_TO_WORLD);
  vec3.subtract(RAY_DIRECTION, RAY_END, RAY_START);
  vec3.normalize(RAY_DIRECTION, RAY_DIRECTION);
  return RESULT;
}

export { convertProjectionCoordToWorldPickRay, screenToProjection };
//# sourceMappingURL=pickRay.js.map
