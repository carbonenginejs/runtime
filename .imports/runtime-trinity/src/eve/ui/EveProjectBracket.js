// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/UI/EveProjectBracket.h
// Source: trinity/trinity/Eve/UI/EveProjectBracket.cpp
// Source: trinity/trinity/Eve/UI/EveProjectBracket_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; projection is portable CPU work.
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { Vec3TransformByViewport } from "../../core/view/TriViewport.js";


const FLOAT32_MAX = 3.4028234663852886e38;


function createProjectionScratch()
{
  return {
    position: vec3.create(),
    projected: vec3.create(),
    cylindricalVertical: vec3.create(),
    cylindricalHorizontal: vec3.create()
  };
}


function projectToViewport(out, source, projection, viewport)
{
  vec3.transformMat4(out, source, projection);
  return Vec3TransformByViewport(out, viewport);
}


function bicylindricProjection(out, source, projection, viewport, scratch)
{
  const { cylindricalVertical, cylindricalHorizontal } = scratch;
  const zSquared = source[2] * source[2];
  vec3.set(cylindricalVertical, 0, -source[1], Math.sqrt(source[0] * source[0] + zSquared));
  vec3.set(cylindricalHorizontal, source[0], 0, Math.sqrt(source[1] * source[1] + zSquared));
  projectToViewport(cylindricalVertical, cylindricalVertical, projection, viewport);
  projectToViewport(cylindricalHorizontal, cylindricalHorizontal, projection, viewport);
  out[0] = cylindricalHorizontal[0];
  out[1] = cylindricalVertical[1];
  out[2] = (source[2] >= 0 ? -0.5 : 0.5) *
    (cylindricalVertical[2] + cylindricalHorizontal[2]);
  return out;
}


function callBlueCallback(callback, ...args)
{
  if (typeof callback === "function") return callback(...args);
  return callback.CallVoid(...args);
}


/** Projects an authored world position into a Sprite2D bracket. */
@type.define({ className: "EveProjectBracket", family: "eve/ui" })
export class EveProjectBracket extends CjsModel
{
  /**
   * Projects the tracked position using the active frame context.
   *
   * Carbon ignores the curve-set time and samples a global frame clock. The
   * JavaScript frame driver owns that clock on Tr2RenderContext.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer camera state and BeOS current-frame time are supplied by the active Tr2RenderContext; BlueScriptCallback accepts a host function or a Carbon callback object; Carbon's optional global debug-text side effect remains engine-owned and is omitted.")
  UpdateValue(_time, renderContext)
  {
    const scratchIndex = this.#scratchDepth++;
    const scratch = this.#scratch[scratchIndex] ??= createProjectionScratch();
    try
    {
      return this.#UpdateValue(renderContext, scratch);
    }
    finally
    {
      this.#scratchDepth--;
    }
  }

  /** Evaluates one bracket projection using depth-indexed reentrant scratch. */
  #UpdateValue(renderContext, scratch)
  {
    const { position, projected } = scratch;
    if (!renderContext)
    {
      throw new TypeError("EveProjectBracket.UpdateValue requires the active Tr2RenderContext");
    }

    if (this.trackBall)
    {
      this.trackBall.GetValueAt(renderContext.GetAnimationTime(), position);
      vec3.scale(position, position, this.ballTrackingScaling);
    }
    else if (this.trackTransform)
    {
      vec3.copy(position, this.trackTransform.GetWorldPosition());
    }
    else
    {
      vec3.copy(position, this.trackPosition);
    }

    vec3.transformMat4(position, position, renderContext.GetViewTransform());
    this.isInFront = position[2] <= 0;
    this.cameraDistance = Math.hypot(position[0], position[1], position[2]);

    const viewport = renderContext.GetViewport();
    if (!viewport)
    {
      throw new TypeError("EveProjectBracket.UpdateValue requires an active viewport");
    }
    const projection = renderContext.GetProjection();
    if (!projection)
    {
      throw new TypeError("EveProjectBracket.UpdateValue requires an active projection");
    }
    projectToViewport(projected, position, projection, viewport);

    let x = projected[0];
    let y = projected[1];
    this.rawProjectedPosition[0] = x;
    this.rawProjectedPosition[1] = y;

    if (!this.isInFront && !this.dock)
    {
      this.SetBracketDisplayState(false);
      return;
    }
    if (this.cameraDistance < this.minDispRange || this.cameraDistance > this.maxDispRange)
    {
      this.SetBracketDisplayState(false);
      return;
    }
    this.SetBracketDisplayState(true);

    let left = viewport.x + this.marginLeft;
    let right = viewport.x + viewport.width - this.marginRight;
    let top = viewport.y + this.marginTop;
    let bottom = viewport.y + viewport.height - this.marginBottom;
    if (this.parent)
    {
      x -= this.parent.GetDisplayX();
      y -= this.parent.GetDisplayY();
      left = this.marginLeft;
      top = this.marginTop;
      right = left + this.parent.GetDisplayWidth() - this.marginRight;
      bottom = top + this.parent.GetDisplayHeight() - this.marginBottom;
    }
    if (this.bracket)
    {
      x -= this.bracket.GetDisplayWidth() * 0.5;
      y -= this.bracket.GetDisplayHeight() * 0.5;
    }

    if (this.dock)
    {
      if (!this.isInFront || x < left || x >= right || y < top || y >= bottom)
      {
        y = bicylindricProjection(projected, position, projection, viewport, scratch)[1];
        const halfViewportHeight = viewport.height * 0.5;
        if (y >= halfViewportHeight)
        {
          y = (y - halfViewportHeight) * 1.5 + halfViewportHeight;
        }
        else
        {
          y = halfViewportHeight - (halfViewportHeight - y) * 1.5;
        }
      }

      if (this.isInFront)
      {
        if (x < left) x = left;
        else if (x > right) x = right;
      }
      else
      {
        x = x > viewport.width * 0.5 ? left : right;
      }
      if (y < top) y = top;
      else if (y > bottom) y = bottom;
    }

    x += this.offsetX;
    y += this.offsetY;
    if (this.integerCoordinates)
    {
      x = Math.floor(x + 0.5);
      y = Math.floor(y + 0.5);
    }
    // Carbon optionally calls g_debugRenderer->Printf here. Trinity owns the
    // projection policy, not the process-global debug renderer; engine/tool
    // integration may realize that presentation-only side effect.

    if (this.bracket)
    {
      this.bracket.SetDisplayX(x);
      this.bracket.SetDisplayY(y);
    }
    this.projectedPosition[0] = x;
    this.projectedPosition[1] = y;
    if (this.bracketUpdateCallback)
    {
      callBlueCallback(this.bracketUpdateCallback, this);
    }
    if (this.bracketIcon)
    {
      this.bracketIcon.SetTranslation(this.projectedPosition);
    }
  }

  /** Applies one visibility transition to both owned bracket representations. */
  @carbon.method
  @impl.adapted
  @impl.reason("BlueScriptCallback accepts a host function or a Carbon callback object.")
  SetBracketDisplayState(state)
  {
    const next = Boolean(state);
    if (next === this.isVisible && this.#isVisibleStateSet) return;
    this.isVisible = next;
    this.#isVisibleStateSet = true;
    if (this.bracket) this.bracket.SetDisplay(next);
    if (this.bracketIcon) this.bracketIcon.SetDisplay(next);
    if (this.displayChangeCallback)
    {
      callBlueCallback(this.displayChangeCallback, this, next);
    }
  }

  /** m_marginLeft (float) [READWRITE] */
  @io.readwrite
  @type.float32
  marginLeft = 0;

  /** m_marginRight (float) [READWRITE] */
  @io.readwrite
  @type.float32
  marginRight = 0;

  /** m_marginTop (float) [READWRITE] */
  @io.readwrite
  @type.float32
  marginTop = 0;

  /** m_marginBottom (float) [READWRITE] */
  @io.readwrite
  @type.float32
  marginBottom = 0;

  /** m_ballTrackingScaling (float) [READWRITE] */
  @io.readwrite
  @type.float32
  ballTrackingScaling = 1;

  /** m_bracketUpdateCallback (BlueScriptCallback) [READWRITE] */
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  bracketUpdateCallback = null;

  /** m_displayChangeCallback (BlueScriptCallback) [READWRITE] */
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  displayChangeCallback = null;

  /** m_minDispRange (float) [READWRITE] */
  @io.readwrite
  @type.float32
  minDispRange = 0;

  /** m_maxDispRange (float) [READWRITE] */
  @io.readwrite
  @type.float32
  maxDispRange = FLOAT32_MAX;

  /** m_trackBall (ITriVectorFunctionPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITriVectorFunction")
  trackBall = null;

  /** m_cameraDistance (float) [READ] */
  @io.read
  @type.float32
  cameraDistance = 0;

  /** m_trackPosition (Vector3) [READWRITE] */
  @io.readwrite
  @type.vec3
  trackPosition = vec3.create();

  /** m_isInFront (bool) [READ] */
  @io.read
  @type.boolean
  isInFront = true;

  /** m_offsetX (float) [READWRITE] */
  @io.readwrite
  @type.float32
  offsetX = 0;

  /** m_integerCoordinates (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  integerCoordinates = true;

  /** m_name (std::wstring) [READWRITE] */
  @io.readwrite
  @type.string
  name = "";

  /** m_parent (Tr2Sprite2dContainerPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2Sprite2dContainer")
  parent = null;

  /** m_dock (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  dock = false;

  /** m_projectedPosition (Vector2) [READ] */
  @io.read
  @type.vec2
  projectedPosition = vec2.create();

  /** m_rawProjectedPosition (Vector2) [READ] */
  @io.read
  @type.vec2
  rawProjectedPosition = vec2.create();

  /** m_trackTransform (IWorldPositionPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("IWorldPosition")
  trackTransform = null;

  /** m_bracket (Tr2Sprite2dContainerPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2Sprite2dContainer")
  bracket = null;

  /** m_bracketIcon (EveSprite2dBracketPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("EveSprite2dBracket")
  bracketIcon = null;

  /** m_offsetY (float) [READWRITE] */
  @io.readwrite
  @type.float32
  offsetY = 0;

  /** m_isVisible (bool) [READ] */
  @io.read
  @type.boolean
  isVisible = true;

  #isVisibleStateSet = false;
  #scratch = [];
  #scratchDepth = 0;
}
