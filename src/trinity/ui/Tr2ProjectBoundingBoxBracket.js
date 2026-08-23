// Source: trinity/trinity/Tr2ProjectBoundingBoxBracket.h
// Source: trinity/trinity/Tr2ProjectBoundingBoxBracket.cpp
// Source: trinity/trinity/Tr2ProjectBoundingBoxBracket_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; projection is portable CPU work.
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


const CLIP_EPSILON = 1e-5;
const CLIP_LEFT = 1 << 0;
const CLIP_RIGHT = 1 << 1;
const CLIP_BOTTOM = 1 << 2;
const CLIP_TOP = 1 << 3;
const CLIP_NEAR = 1 << 4;
const CLIP_FAR = 1 << 5;
const EDGES = Object.freeze([
  [ 0, 1 ], [ 1, 3 ], [ 3, 2 ], [ 2, 0 ],
  [ 7, 6 ], [ 6, 4 ], [ 4, 5 ], [ 5, 7 ],
  [ 0, 7 ], [ 1, 6 ], [ 2, 5 ], [ 3, 4 ]
]);
const boundsMin = new Float32Array(3);
const boundsMax = new Float32Array(3);
const center = new Float32Array(3);
const viewProjection = mat4.create();
const clipCorners = Array.from({ length: 8 }, () => new Float32Array(4));
const projectablePoints = Array.from({ length: 20 }, () => new Float32Array(4));
const outcodes = new Uint32Array(8);
const projected = new Float32Array(3);
const projectedBounds = {
  x: 0,
  y: 0,
  z: 0,
  width: 0,
  height: 0,
  extendsOffscreen: false,
  coversViewport: false
};


function transformPointToClip(out, point, matrix)
{
  const x = point[0];
  const y = point[1];
  const z = point[2];
  out[0] = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
  out[1] = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
  out[2] = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];
  out[3] = x * matrix[3] + y * matrix[7] + z * matrix[11] + matrix[15];
  return out;
}


function clipOutcode(point)
{
  let code = 0;
  if (point[0] + point[3] < 0) code |= CLIP_LEFT;
  if (point[3] - point[0] < 0) code |= CLIP_RIGHT;
  if (point[1] + point[3] < 0) code |= CLIP_BOTTOM;
  if (point[3] - point[1] < 0) code |= CLIP_TOP;
  if (point[2] < 0) code |= CLIP_NEAR;
  if (point[3] - point[2] < 0) code |= CLIP_FAR;
  return code;
}


function canPerspectiveDivide(point)
{
  return Math.abs(point[3]) > CLIP_EPSILON;
}


function addNearPlaneIntersection(a, b, index)
{
  const denominator = a[2] - b[2];
  if (Math.abs(denominator) <= CLIP_EPSILON) return index;

  const t = a[2] / denominator;
  const point = projectablePoints[index];
  for (let lane = 0; lane < 4; lane++)
  {
    point[lane] = a[lane] + (b[lane] - a[lane]) * t;
  }
  return canPerspectiveDivide(point) ? index + 1 : index;
}


function projectClipPoint(point, viewport, out)
{
  if (!canPerspectiveDivide(point)) return false;
  const reciprocalW = 1 / point[3];
  out[0] = viewport.x + (1 + point[0] * reciprocalW) * 0.5 * viewport.width;
  out[1] = viewport.y + (1 - point[1] * reciprocalW) * 0.5 * viewport.height;
  out[2] = viewport.minZ + point[2] * reciprocalW * (viewport.maxZ - viewport.minZ);
  return true;
}


function setCorners(min, max)
{
  setCorner(0, min[0], min[1], min[2]);
  setCorner(1, min[0], min[1], max[2]);
  setCorner(2, max[0], min[1], min[2]);
  setCorner(3, max[0], min[1], max[2]);
  setCorner(4, max[0], max[1], max[2]);
  setCorner(5, max[0], max[1], min[2]);
  setCorner(6, min[0], max[1], max[2]);
  setCorner(7, min[0], max[1], min[2]);
}


function setCorner(index, x, y, z)
{
  const corner = clipCorners[index];
  corner[0] = x;
  corner[1] = y;
  corner[2] = z;
  corner[3] = 1;
}


function projectBoundingBoxToViewport(min, max, matrix, viewport, out)
{
  setCorners(min, max);
  let combinedOutcode = 0xffffffff;
  for (let index = 0; index < clipCorners.length; index++)
  {
    transformPointToClip(clipCorners[index], clipCorners[index], matrix);
    outcodes[index] = clipOutcode(clipCorners[index]);
    combinedOutcode &= outcodes[index];
  }
  if (combinedOutcode !== 0) return false;

  let pointCount = 0;
  for (let index = 0; index < clipCorners.length; index++)
  {
    if (!(outcodes[index] & CLIP_NEAR) && canPerspectiveDivide(clipCorners[index]))
    {
      projectablePoints[pointCount++].set(clipCorners[index]);
    }
  }
  for (const [ start, end ] of EDGES)
  {
    if ((outcodes[start] ^ outcodes[end]) & CLIP_NEAR)
    {
      pointCount = addNearPlaneIntersection(clipCorners[start], clipCorners[end], pointCount);
    }
  }
  if (!pointCount) return false;

  let hasProjectedPoint = false;
  let minX = 0;
  let minY = 0;
  let minZ = 0;
  let maxX = 0;
  let maxY = 0;
  for (let index = 0; index < pointCount; index++)
  {
    if (!projectClipPoint(projectablePoints[index], viewport, projected)) continue;
    if (!hasProjectedPoint)
    {
      minX = maxX = projected[0];
      minY = maxY = projected[1];
      minZ = projected[2];
      hasProjectedPoint = true;
    }
    else
    {
      minX = Math.min(minX, projected[0]);
      maxX = Math.max(maxX, projected[0]);
      minY = Math.min(minY, projected[1]);
      maxY = Math.max(maxY, projected[1]);
      minZ = Math.min(minZ, projected[2]);
    }
  }
  if (!hasProjectedPoint) return false;

  const viewportRight = viewport.x + viewport.width;
  const viewportBottom = viewport.y + viewport.height;
  out.x = minX;
  out.y = minY;
  out.z = minZ;
  out.width = maxX - minX;
  out.height = maxY - minY;
  out.extendsOffscreen = minX < viewport.x || minY < viewport.y || maxX > viewportRight || maxY > viewportBottom;
  out.coversViewport = minX <= viewport.x && minY <= viewport.y && maxX >= viewportRight && maxY >= viewportBottom;
  return true;
}


function boundingBoxContainsPoint(min, max, point)
{
  return point[0] >= min[0] && point[0] <= max[0] &&
    point[1] >= min[1] && point[1] <= max[1] &&
    point[2] >= min[2] && point[2] <= max[2];
}


function clampProjectedSize(size, minSize, maxSize)
{
  if (minSize > 0 && size < minSize) return minSize;
  if (maxSize > 0 && size > maxSize) return maxSize;
  return size;
}


/** Projects an owned world-space bounding box into a Sprite2D bracket. */
@type.define({ className: "Tr2ProjectBoundingBoxBracket", family: "trinityCore" })
export class Tr2ProjectBoundingBoxBracket extends CjsModel
{
  /**
   * Updates the projection using the active render context threaded by
   * TriCurveSet. Carbon reads the same state from Tr2Renderer globals.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer view, projection and viewport globals are supplied by the active Tr2RenderContext.")
  UpdateValue(_time, renderContext)
  {
    if (!renderContext)
    {
      throw new TypeError("Tr2ProjectBoundingBoxBracket.UpdateValue requires the active Tr2RenderContext");
    }
    if (!this.object || !this.object.IsBoundingBoxReady() || !this.object.GetWorldBoundingBox(boundsMin, boundsMax))
    {
      this.SetEmptyProjection();
      return;
    }

    center[0] = (boundsMax[0] + boundsMin[0]) * 0.5;
    center[1] = (boundsMax[1] + boundsMin[1]) * 0.5;
    center[2] = (boundsMax[2] + boundsMin[2]) * 0.5;
    const viewPosition = renderContext.GetViewPosition();
    this.cameraDistance = Math.hypot(
      viewPosition[0] - center[0],
      viewPosition[1] - center[1],
      viewPosition[2] - center[2]
    );

    const viewport = renderContext.GetViewport();
    if (!viewport)
    {
      throw new TypeError("Tr2ProjectBoundingBoxBracket.UpdateValue requires an active viewport");
    }
    if (boundingBoxContainsPoint(boundsMin, boundsMax, viewPosition))
    {
      this.#SetFullViewportProjection(viewport);
      return;
    }

    const projection = renderContext.GetProjection();
    if (!projection)
    {
      throw new TypeError("Tr2ProjectBoundingBoxBracket.UpdateValue requires an active projection");
    }
    // Carbon composes view * projection; gl-matrix uses column vectors.
    mat4.multiply(viewProjection, projection, renderContext.GetViewTransform());
    if (!projectBoundingBoxToViewport(boundsMin, boundsMax, viewProjection, viewport, projectedBounds))
    {
      this.SetEmptyProjection();
      return;
    }

    this.projectedX = projectedBounds.x;
    this.projectedY = projectedBounds.y;
    this.projectedZ = projectedBounds.z;
    this.projectedWidth = projectedBounds.width;
    this.projectedHeight = projectedBounds.height;
    this.containsCamera = false;
    this.extendsOffscreen = projectedBounds.extendsOffscreen;
    this.coversViewport = projectedBounds.coversViewport;
    this.#ConstrainProjection(center, viewProjection, viewport);
    this.#PublishProjection(viewport);
  }

  /** Clears every published result and updates the attached bracket. */
  @carbon.method
  @impl.implemented
  SetEmptyProjection()
  {
    this.projectedX = 0;
    this.projectedY = 0;
    this.projectedZ = 0;
    this.projectedWidth = 0;
    this.projectedHeight = 0;
    this.isProjectionValid = false;
    this.containsCamera = false;
    this.extendsOffscreen = false;
    this.coversViewport = false;
    this.UpdateBracket();
  }

  /** Publishes the current rectangle to the attached Sprite2D container. */
  @carbon.method
  @impl.implemented
  UpdateBracket()
  {
    if (!this.bracket) return;
    this.bracket.SetDisplayX(this.projectedX);
    this.bracket.SetDisplayY(this.projectedY);
    this.bracket.SetDisplayWidth(this.projectedWidth);
    this.bracket.SetDisplayHeight(this.projectedHeight);
  }

  /** Publishes a projection covering the full active viewport. */
  #SetFullViewportProjection(viewport)
  {
    this.projectedX = viewport.x;
    this.projectedY = viewport.y;
    this.projectedZ = viewport.minZ;
    this.projectedWidth = viewport.width;
    this.projectedHeight = viewport.height;
    if (!this.#ClampToScreenMargin(viewport))
    {
      this.SetEmptyProjection();
      return;
    }
    this.isProjectionValid = true;
    this.containsCamera = true;
    this.extendsOffscreen = true;
    this.coversViewport = true;
    this.UpdateBracket();
  }

  /** Applies authored size and integer-coordinate constraints. */
  #ConstrainProjection(boxCenter, matrix, viewport)
  {
    let centerX = this.projectedX + this.projectedWidth * 0.5;
    let centerY = this.projectedY + this.projectedHeight * 0.5;
    if (this.maxProjectedWidth > 0 || this.maxProjectedHeight > 0)
    {
      transformPointToClip(projectablePoints[0], boxCenter, matrix);
      const clipCenter = projectablePoints[0];
      if (clipCenter[2] >= 0 && clipCenter[3] > 0 && projectClipPoint(clipCenter, viewport, projected))
      {
        centerX = projected[0];
        centerY = projected[1];
      }
    }

    this.projectedWidth = clampProjectedSize(this.projectedWidth, this.minProjectedWidth, this.maxProjectedWidth);
    this.projectedHeight = clampProjectedSize(this.projectedHeight, this.minProjectedHeight, this.maxProjectedHeight);
    this.projectedX = centerX - this.projectedWidth * 0.5;
    this.projectedY = centerY - this.projectedHeight * 0.5;
    if (this.integerCoordinates)
    {
      this.projectedX = Math.floor(this.projectedX + 0.5);
      this.projectedY = Math.floor(this.projectedY + 0.5);
      this.projectedWidth = Math.floor(this.projectedWidth + 0.5);
      this.projectedHeight = Math.floor(this.projectedHeight + 0.5);
    }
  }

  /** Validates and publishes the current projected rectangle. */
  #PublishProjection(viewport)
  {
    if (this.projectedWidth <= 0 || this.projectedHeight <= 0 || !this.#ClampToScreenMargin(viewport))
    {
      this.SetEmptyProjection();
      return;
    }
    this.isProjectionValid = true;
    this.UpdateBracket();
    // Carbon may print optional debug text here through a process-global debug
    // renderer. Debug realization is engine-owned and does not change results.
  }

  /** Clips the projected rectangle to the configured screen margin. */
  #ClampToScreenMargin(viewport)
  {
    if (this.screenMargin <= 0) return true;
    const left = viewport.x + this.screenMargin;
    const top = viewport.y + this.screenMargin;
    const right = viewport.x + viewport.width - this.screenMargin;
    const bottom = viewport.y + viewport.height - this.screenMargin;
    const minX = Math.max(this.projectedX, left);
    const minY = Math.max(this.projectedY, top);
    const maxX = Math.min(this.projectedX + this.projectedWidth, right);
    const maxY = Math.min(this.projectedY + this.projectedHeight, bottom);
    if (maxX <= minX || maxY <= minY) return false;
    this.projectedX = minX;
    this.projectedY = minY;
    this.projectedWidth = maxX - minX;
    this.projectedHeight = maxY - minY;
    return true;
  }

  @io.read
  @type.float32
  cameraDistance = 0;

  @io.read
  @type.float32
  projectedHeight = 0;

  @io.readwrite
  @type.float32
  screenMargin = 0;

  @io.readwrite
  @type.boolean
  integerCoordinates = true;

  @io.readwrite
  @type.float32
  maxProjectedHeight = 0;

  @io.readwrite
  @type.float32
  maxProjectedWidth = 0;

  @io.readwrite
  @type.float32
  minProjectedHeight = 0;

  @io.readwrite
  @type.float32
  minProjectedWidth = 0;

  @io.readwrite
  @type.string
  name = "";

  @io.readwrite
  @type.objectRef("ITr2BoundingBox")
  object = null;

  @io.readwrite
  @type.objectRef("Tr2Sprite2dContainer")
  parent = null;

  @io.readwrite
  @type.objectRef("Tr2Sprite2dContainer")
  bracket = null;

  @io.read
  @type.boolean
  isProjectionValid = false;

  @io.read
  @type.boolean
  containsCamera = false;

  @io.read
  @type.boolean
  coversViewport = false;

  @io.read
  @type.boolean
  extendsOffscreen = false;

  @io.read
  @type.float32
  projectedWidth = 0;

  @io.read
  @type.float32
  projectedX = 0;

  @io.read
  @type.float32
  projectedY = 0;

  @io.read
  @type.float32
  projectedZ = 0;
}
