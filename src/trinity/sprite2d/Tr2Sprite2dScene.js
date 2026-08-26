// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.cpp
// Promoted from generated source: displayX/displayY are scalar Blue aliases
// for m_translation.x/y, which the generator cannot currently express.
import { carbon, impl, io, type, CjsSchema } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";


/**
 * Owns a 2D sprite tree together with display transforms, clipping, picking,
 * batching limits, background, and render-mode state.
 */
@type.define({ className: "Tr2Sprite2dScene", family: "sprite2d" })
export class Tr2Sprite2dScene extends CjsModel
{

  /** m_pickState (Tr2SpriteObjectPickState) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Tr2SpriteObjectPickState")
  pickState = 1;

  /** m_uberShader2d (Tr2EffectPtr) [READ] */
  @io.read
  @type.objectRef("Tr2Effect")
  ubershader2d = null;

  /** m_uberShader3d (Tr2EffectPtr) [READ] */
  @io.read
  @type.objectRef("Tr2Effect")
  ubershader3d = null;

  /** m_displayWidth (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  displayWidth = 1;

  /** m_displayHeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  displayHeight = 1;

  /** m_backgroundColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  backgroundColor = vec4.create();

  /** m_background (PITr2SpriteObjectVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2SpriteObject")
  background = [];

  /** m_captureIndexDataCapacity (unsigned int) [READ] */
  @io.read
  @type.uint32
  captureIndexDataCapacity = 0;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_ignoreClip (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  ignoreClip = false;

  /** m_clearFinishedCurveSets (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  clearFinishedCurveSets = false;

  /** m_clearBackground (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  clearBackground = false;

  /** m_is2dRender (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  is2dRender = true;

  /** m_is2dPick (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  is2dPick = true;

  /** m_drawWireFrame (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  drawWireFrame = false;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_isFullscreen (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isFullscreen = false;

  /** m_depthMax (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  depthMax = 0;

  /** m_maxSpriteCount (unsigned int) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.uint32
  maxSpriteCount = 1024;

  /** m_depthMin (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  depthMin = 0;

  /** m_lastPickPos (Vector2) [READ] */
  @io.read
  @type.vec2
  lastPickPos = vec2.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_children (PITr2SpriteObjectVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2SpriteObject")
  children = [];

  /** m_maxDrawCallsToRender (unsigned int) [READWRITE] */
  @io.readwrite
  @type.uint32
  maxDrawCallsToRender = 4294967295;

  /** m_maxItemsToRender (unsigned int) [READWRITE] */
  @io.readwrite
  @type.uint32
  maxItemsToRender = 4294967295;

  /** m_name (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_defaultTextureUpdates (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  defaultTextureUpdates = false;

  /** Blue scalar alias for m_translation.x. */
  get displayX()
  {
    return this.translation[0];
  }

  /** Writes the Blue displayX alias through to m_translation.x. */
  set displayX(value)
  {
    this.translation[0] = Number(value);
  }

  /** Blue scalar alias for m_translation.y. */
  get displayY()
  {
    return this.translation[1];
  }

  /** Writes the Blue displayY alias through to m_translation.y. */
  set displayY(value)
  {
    this.translation[1] = Number(value);
  }

  /**
   * Picks the topmost sprite beneath a display-space coordinate.
   *
   * Carbon's implementation depends on the render-device viewport and the
   * complete sprite-container clipping/picking stack, neither of which is
   * available at this layer yet.
   */
  @carbon.method
  @impl.notImplemented
  PickObject(...args)
  {
    throw new Error("Tr2Sprite2dScene.PickObject is not implemented in CarbonEngineJS.");
  }

  static Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;

}

CjsSchema.decorateField(Tr2Sprite2dScene, "displayX", io.persist, type.float32);
CjsSchema.decorateField(Tr2Sprite2dScene, "displayY", io.persist, type.float32);
