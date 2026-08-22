import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, impl, io, type } from '@carbonenginejs/runtime-utils/schema';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { Vec3TransformByViewport } from '../../core/view/TriViewport.js';

let _initProto, _initClass, _init_marginLeft, _init_extra_marginLeft, _init_marginRight, _init_extra_marginRight, _init_marginTop, _init_extra_marginTop, _init_marginBottom, _init_extra_marginBottom, _init_ballTrackingScaling, _init_extra_ballTrackingScaling, _init_bracketUpdateCallback, _init_extra_bracketUpdateCallback, _init_displayChangeCallback, _init_extra_displayChangeCallback, _init_minDispRange, _init_extra_minDispRange, _init_maxDispRange, _init_extra_maxDispRange, _init_trackBall, _init_extra_trackBall, _init_cameraDistance, _init_extra_cameraDistance, _init_trackPosition, _init_extra_trackPosition, _init_isInFront, _init_extra_isInFront, _init_offsetX, _init_extra_offsetX, _init_integerCoordinates, _init_extra_integerCoordinates, _init_name, _init_extra_name, _init_parent, _init_extra_parent, _init_dock, _init_extra_dock, _init_projectedPosition, _init_extra_projectedPosition, _init_rawProjectedPosition, _init_extra_rawProjectedPosition, _init_trackTransform, _init_extra_trackTransform, _init_bracket, _init_extra_bracket, _init_bracketIcon, _init_extra_bracketIcon, _init_offsetY, _init_extra_offsetY, _init_isVisible, _init_extra_isVisible;
const FLOAT32_MAX = 3.4028234663852886e38;
function createProjectionScratch() {
  return {
    position: vec3.create(),
    projected: vec3.create(),
    cylindricalVertical: vec3.create(),
    cylindricalHorizontal: vec3.create()
  };
}
function projectToViewport(out, source, projection, viewport) {
  vec3.transformMat4(out, source, projection);
  return Vec3TransformByViewport(out, viewport);
}
function bicylindricProjection(out, source, projection, viewport, scratch) {
  const {
    cylindricalVertical,
    cylindricalHorizontal
  } = scratch;
  const zSquared = source[2] * source[2];
  vec3.set(cylindricalVertical, 0, -source[1], Math.sqrt(source[0] * source[0] + zSquared));
  vec3.set(cylindricalHorizontal, source[0], 0, Math.sqrt(source[1] * source[1] + zSquared));
  projectToViewport(cylindricalVertical, cylindricalVertical, projection, viewport);
  projectToViewport(cylindricalHorizontal, cylindricalHorizontal, projection, viewport);
  out[0] = cylindricalHorizontal[0];
  out[1] = cylindricalVertical[1];
  out[2] = (source[2] >= 0 ? -0.5 : 0.5) * (cylindricalVertical[2] + cylindricalHorizontal[2]);
  return out;
}
function callBlueCallback(callback, ...args) {
  if (typeof callback === "function") return callback(...args);
  return callback.CallVoid(...args);
}

/** Projects an authored world position into a Sprite2D bracket. */
let _EveProjectBracket;
class EveProjectBracket extends CjsModel {
  static {
    ({
      e: [_init_marginLeft, _init_extra_marginLeft, _init_marginRight, _init_extra_marginRight, _init_marginTop, _init_extra_marginTop, _init_marginBottom, _init_extra_marginBottom, _init_ballTrackingScaling, _init_extra_ballTrackingScaling, _init_bracketUpdateCallback, _init_extra_bracketUpdateCallback, _init_displayChangeCallback, _init_extra_displayChangeCallback, _init_minDispRange, _init_extra_minDispRange, _init_maxDispRange, _init_extra_maxDispRange, _init_trackBall, _init_extra_trackBall, _init_cameraDistance, _init_extra_cameraDistance, _init_trackPosition, _init_extra_trackPosition, _init_isInFront, _init_extra_isInFront, _init_offsetX, _init_extra_offsetX, _init_integerCoordinates, _init_extra_integerCoordinates, _init_name, _init_extra_name, _init_parent, _init_extra_parent, _init_dock, _init_extra_dock, _init_projectedPosition, _init_extra_projectedPosition, _init_rawProjectedPosition, _init_extra_rawProjectedPosition, _init_trackTransform, _init_extra_trackTransform, _init_bracket, _init_extra_bracket, _init_bracketIcon, _init_extra_bracketIcon, _init_offsetY, _init_extra_offsetY, _init_isVisible, _init_extra_isVisible, _initProto],
      c: [_EveProjectBracket, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveProjectBracket",
      family: "eve/ui"
    })], [[[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2Renderer camera state and BeOS current-frame time are supplied by the active Tr2RenderContext; BlueScriptCallback accepts a host function or a Carbon callback object; Carbon's optional global debug-text side effect remains engine-owned and is omitted.")], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("BlueScriptCallback accepts a host function or a Carbon callback object.")], 18, "SetBracketDisplayState"], [[io, io.readwrite, type, type.float32], 16, "marginLeft"], [[io, io.readwrite, type, type.float32], 16, "marginRight"], [[io, io.readwrite, type, type.float32], 16, "marginTop"], [[io, io.readwrite, type, type.float32], 16, "marginBottom"], [[io, io.readwrite, type, type.float32], 16, "ballTrackingScaling"], [[io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "bracketUpdateCallback"], [[io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "displayChangeCallback"], [[io, io.readwrite, type, type.float32], 16, "minDispRange"], [[io, io.readwrite, type, type.float32], 16, "maxDispRange"], [[io, io.readwrite, void 0, type.objectRef("ITriVectorFunction")], 16, "trackBall"], [[io, io.read, type, type.float32], 16, "cameraDistance"], [[io, io.readwrite, type, type.vec3], 16, "trackPosition"], [[io, io.read, type, type.boolean], 16, "isInFront"], [[io, io.readwrite, type, type.float32], 16, "offsetX"], [[io, io.readwrite, type, type.boolean], 16, "integerCoordinates"], [[io, io.readwrite, type, type.string], 16, "name"], [[io, io.readwrite, void 0, type.objectRef("Tr2Sprite2dContainer")], 16, "parent"], [[io, io.readwrite, type, type.boolean], 16, "dock"], [[io, io.read, type, type.vec2], 16, "projectedPosition"], [[io, io.read, type, type.vec2], 16, "rawProjectedPosition"], [[io, io.readwrite, void 0, type.objectRef("IWorldPosition")], 16, "trackTransform"], [[io, io.readwrite, void 0, type.objectRef("Tr2Sprite2dContainer")], 16, "bracket"], [[io, io.readwrite, void 0, type.objectRef("EveSprite2dBracket")], 16, "bracketIcon"], [[io, io.readwrite, type, type.float32], 16, "offsetY"], [[io, io.read, type, type.boolean], 16, "isVisible"]], 0, void 0, CjsModel));
  }
  /**
   * Projects the tracked position using the active frame context.
   *
   * Carbon ignores the curve-set time and samples a global frame clock. The
   * JavaScript frame driver owns that clock on Tr2RenderContext.
   */
  UpdateValue(_time, renderContext) {
    const scratchIndex = this.#scratchDepth++;
    const scratch = this.#scratch[scratchIndex] ??= createProjectionScratch();
    try {
      return this.#UpdateValue(renderContext, scratch);
    } finally {
      this.#scratchDepth--;
    }
  }

  /** Evaluates one bracket projection using depth-indexed reentrant scratch. */
  #UpdateValue(renderContext, scratch) {
    const {
      position,
      projected
    } = scratch;
    if (!renderContext) {
      throw new TypeError("EveProjectBracket.UpdateValue requires the active Tr2RenderContext");
    }
    if (this.trackBall) {
      this.trackBall.GetValueAt(renderContext.GetAnimationTime(), position);
      vec3.scale(position, position, this.ballTrackingScaling);
    } else if (this.trackTransform) {
      vec3.copy(position, this.trackTransform.GetWorldPosition());
    } else {
      vec3.copy(position, this.trackPosition);
    }
    vec3.transformMat4(position, position, renderContext.GetViewTransform());
    this.isInFront = position[2] <= 0;
    this.cameraDistance = Math.hypot(position[0], position[1], position[2]);
    const viewport = renderContext.GetViewport();
    if (!viewport) {
      throw new TypeError("EveProjectBracket.UpdateValue requires an active viewport");
    }
    const projection = renderContext.GetProjection();
    if (!projection) {
      throw new TypeError("EveProjectBracket.UpdateValue requires an active projection");
    }
    projectToViewport(projected, position, projection, viewport);
    let x = projected[0];
    let y = projected[1];
    this.rawProjectedPosition[0] = x;
    this.rawProjectedPosition[1] = y;
    if (!this.isInFront && !this.dock) {
      this.SetBracketDisplayState(false);
      return;
    }
    if (this.cameraDistance < this.minDispRange || this.cameraDistance > this.maxDispRange) {
      this.SetBracketDisplayState(false);
      return;
    }
    this.SetBracketDisplayState(true);
    let left = viewport.x + this.marginLeft;
    let right = viewport.x + viewport.width - this.marginRight;
    let top = viewport.y + this.marginTop;
    let bottom = viewport.y + viewport.height - this.marginBottom;
    if (this.parent) {
      x -= this.parent.GetDisplayX();
      y -= this.parent.GetDisplayY();
      left = this.marginLeft;
      top = this.marginTop;
      right = left + this.parent.GetDisplayWidth() - this.marginRight;
      bottom = top + this.parent.GetDisplayHeight() - this.marginBottom;
    }
    if (this.bracket) {
      x -= this.bracket.GetDisplayWidth() * 0.5;
      y -= this.bracket.GetDisplayHeight() * 0.5;
    }
    if (this.dock) {
      if (!this.isInFront || x < left || x >= right || y < top || y >= bottom) {
        y = bicylindricProjection(projected, position, projection, viewport, scratch)[1];
        const halfViewportHeight = viewport.height * 0.5;
        if (y >= halfViewportHeight) {
          y = (y - halfViewportHeight) * 1.5 + halfViewportHeight;
        } else {
          y = halfViewportHeight - (halfViewportHeight - y) * 1.5;
        }
      }
      if (this.isInFront) {
        if (x < left) x = left;else if (x > right) x = right;
      } else {
        x = x > viewport.width * 0.5 ? left : right;
      }
      if (y < top) y = top;else if (y > bottom) y = bottom;
    }
    x += this.offsetX;
    y += this.offsetY;
    if (this.integerCoordinates) {
      x = Math.floor(x + 0.5);
      y = Math.floor(y + 0.5);
    }
    // Carbon optionally calls g_debugRenderer->Printf here. Trinity owns the
    // projection policy, not the process-global debug renderer; engine/tool
    // integration may realize that presentation-only side effect.

    if (this.bracket) {
      this.bracket.SetDisplayX(x);
      this.bracket.SetDisplayY(y);
    }
    this.projectedPosition[0] = x;
    this.projectedPosition[1] = y;
    if (this.bracketUpdateCallback) {
      callBlueCallback(this.bracketUpdateCallback, this);
    }
    if (this.bracketIcon) {
      this.bracketIcon.SetTranslation(this.projectedPosition);
    }
  }

  /** Applies one visibility transition to both owned bracket representations. */
  SetBracketDisplayState(state) {
    const next = Boolean(state);
    if (next === this.isVisible && this.#isVisibleStateSet) return;
    this.isVisible = next;
    this.#isVisibleStateSet = true;
    if (this.bracket) this.bracket.SetDisplay(next);
    if (this.bracketIcon) this.bracketIcon.SetDisplay(next);
    if (this.displayChangeCallback) {
      callBlueCallback(this.displayChangeCallback, this, next);
    }
  }

  /** m_marginLeft (float) [READWRITE] */
  marginLeft = (_initProto(this), _init_marginLeft(this, 0));

  /** m_marginRight (float) [READWRITE] */
  marginRight = (_init_extra_marginLeft(this), _init_marginRight(this, 0));

  /** m_marginTop (float) [READWRITE] */
  marginTop = (_init_extra_marginRight(this), _init_marginTop(this, 0));

  /** m_marginBottom (float) [READWRITE] */
  marginBottom = (_init_extra_marginTop(this), _init_marginBottom(this, 0));

  /** m_ballTrackingScaling (float) [READWRITE] */
  ballTrackingScaling = (_init_extra_marginBottom(this), _init_ballTrackingScaling(this, 1));

  /** m_bracketUpdateCallback (BlueScriptCallback) [READWRITE] */
  bracketUpdateCallback = (_init_extra_ballTrackingScaling(this), _init_bracketUpdateCallback(this, null));

  /** m_displayChangeCallback (BlueScriptCallback) [READWRITE] */
  displayChangeCallback = (_init_extra_bracketUpdateCallback(this), _init_displayChangeCallback(this, null));

  /** m_minDispRange (float) [READWRITE] */
  minDispRange = (_init_extra_displayChangeCallback(this), _init_minDispRange(this, 0));

  /** m_maxDispRange (float) [READWRITE] */
  maxDispRange = (_init_extra_minDispRange(this), _init_maxDispRange(this, FLOAT32_MAX));

  /** m_trackBall (ITriVectorFunctionPtr) [READWRITE] */
  trackBall = (_init_extra_maxDispRange(this), _init_trackBall(this, null));

  /** m_cameraDistance (float) [READ] */
  cameraDistance = (_init_extra_trackBall(this), _init_cameraDistance(this, 0));

  /** m_trackPosition (Vector3) [READWRITE] */
  trackPosition = (_init_extra_cameraDistance(this), _init_trackPosition(this, vec3.create()));

  /** m_isInFront (bool) [READ] */
  isInFront = (_init_extra_trackPosition(this), _init_isInFront(this, true));

  /** m_offsetX (float) [READWRITE] */
  offsetX = (_init_extra_isInFront(this), _init_offsetX(this, 0));

  /** m_integerCoordinates (bool) [READWRITE] */
  integerCoordinates = (_init_extra_offsetX(this), _init_integerCoordinates(this, true));

  /** m_name (std::wstring) [READWRITE] */
  name = (_init_extra_integerCoordinates(this), _init_name(this, ""));

  /** m_parent (Tr2Sprite2dContainerPtr) [READWRITE] */
  parent = (_init_extra_name(this), _init_parent(this, null));

  /** m_dock (bool) [READWRITE] */
  dock = (_init_extra_parent(this), _init_dock(this, false));

  /** m_projectedPosition (Vector2) [READ] */
  projectedPosition = (_init_extra_dock(this), _init_projectedPosition(this, vec2.create()));

  /** m_rawProjectedPosition (Vector2) [READ] */
  rawProjectedPosition = (_init_extra_projectedPosition(this), _init_rawProjectedPosition(this, vec2.create()));

  /** m_trackTransform (IWorldPositionPtr) [READWRITE] */
  trackTransform = (_init_extra_rawProjectedPosition(this), _init_trackTransform(this, null));

  /** m_bracket (Tr2Sprite2dContainerPtr) [READWRITE] */
  bracket = (_init_extra_trackTransform(this), _init_bracket(this, null));

  /** m_bracketIcon (EveSprite2dBracketPtr) [READWRITE] */
  bracketIcon = (_init_extra_bracket(this), _init_bracketIcon(this, null));

  /** m_offsetY (float) [READWRITE] */
  offsetY = (_init_extra_bracketIcon(this), _init_offsetY(this, 0));

  /** m_isVisible (bool) [READ] */
  isVisible = (_init_extra_offsetY(this), _init_isVisible(this, true));
  #isVisibleStateSet = (_init_extra_isVisible(this), false);
  #scratch = [];
  #scratchDepth = 0;
  static {
    _initClass();
  }
}

export { _EveProjectBracket as EveProjectBracket };
//# sourceMappingURL=EveProjectBracket.js.map
