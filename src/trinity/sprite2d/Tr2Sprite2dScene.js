import { exposure as be } from "#be";
import { Tr2Sprite2dDisplayList } from "./Tr2Sprite2dDisplayList.js";
import { Tr2Sprite2dDisplayListEntry } from "./Tr2Sprite2dDisplayListEntry.js";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2RingVertexBuffer } from "../core/device/Tr2RingVertexBuffer.js";
import { Tr2RingIndexBuffer } from "../core/device/Tr2RingIndexBuffer.js";
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2RenderUtils } from "../core/Tr2RenderUtils.js";
import { PER_OBJECT_VS_GUI } from "../core/Tr2Renderer.js";
import { g_textureAtlasMan } from "../core/Tr2TextureAtlasMan.js";
import { Tr2BufferAL, Tr2BufferDescriptionAL, Tr2ConstantBufferAL, Tr2TextureAL, Failed } from "#trinityal";
import { PixelFormat, RenderState, ShaderType, Topology, Tr2ColorSpace, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2AtlasTexture } from "../core/Tr2AtlasTexture.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { RenderingMode, TriStorageFlags } from "#consts/graphics";
import * as CcpLog from "../../global/logging/ccpLog.js";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene_Blue.cpp
import { meta, blue } from "#schema";
import { IsMatch, INotify, BlueList } from "#blue";
import { ITr2Scene } from "../core/ITr2Scene.js";
import { ITr2Updateable } from "../core/ITr2Updateable.js";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { TriCurveSet } from "../curves/TriCurveSet.js";
import { Tr2VariableStore } from "../core/variable/Tr2VariableStore.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { mat4 } from "#math/mat4";
import { Tr2Sprite2dClipRect } from "./Tr2Sprite2dClipRect.js";
import { screenToProjection } from "../core/view/pickRay.js";
import { quat } from "#math/quat";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectPickState, Tr2SpriteObjectEffect, Tr2Sprite2dTextureSettings } from "../generated/sprite2d/enums.js";
import { TriVariableContentType } from "../generated/trinityCore/enums.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import "./Tr2SpriteObjectBase.js";

/** Carbon's effect path for the 2D UI ubershader (Tr2Sprite2dScene.cpp:52). @type {string} */
const EFFECT_UBERSHADER_RESPATH = "res:/Graphics/Effect/UI/UberShader.fx";

/** Carbon's effect path for the 3D UI ubershader (Tr2Sprite2dScene.cpp:53). @type {string} */
const EFFECT_RENDER_UBERSHADER_RESPATH_3D = "res:/Graphics/Effect/UI/UberShader3d.fx";

/** Carbon's `s_layerIndices`, the two triangles EndLayer draws (Tr2Sprite2dScene.cpp:1672). @type {number[]} */
const s_layerIndices = [0, 1, 3, 3, 1, 2];

/**
 * Carbon's Sprite2D scene and the ITr2Sprite2dRenderer every sprite object gathers into.
 * Owns sprite declarations and CPU curve updates using raw Blue frame clocks.
 * Direct rendering, layers and captured display lists use the effect/AL pipeline.
 * Native automatic device-resource registration remains unported; resource
 * teardown is explicit (`Destruct`).
 *
 * Build choice: Carbon's `#if !CCP_DEPLOY` and `CCP_ASSERT` branches are ported as the
 * shipping (deploy, NDEBUG) build compiles them: the default-texture substitution in
 * SetTexture is absent and asserts are no-ops. `exefile/version.h:5-7` names the
 * CCP_DEPLOY build `ExeFile_deploy`, the deployed client.
 *
 * Complete canonical members retain native order and indexed aliases. Legacy
 * getField/getDefaults expose no Scene fields; use Blue declaration consumers.
 */
@blue.define({
  className: "Tr2Sprite2dScene",
  members: [
    {"carbon":{"member":true},"name":"name","type":{"kind":"wstring"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"display","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"drawWireFrame","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"ignoreClip","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"lastPickPos","type":{"kind":"vec2"},"edit":{"read":true}},
    {"carbon":{"member":true},"name":"isFullscreen","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"is2dRender","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"is2dPick","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"translation","type":{"kind":"vec3"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"displayX","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true},"key":"translation","index":0,"impl":{"status":"adapted","adapted":true,"reason":"Native stored translation component exposed through an indexed canonical member."}},
    {"carbon":{"member":true},"name":"displayY","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true},"key":"translation","index":1,"impl":{"status":"adapted","adapted":true,"reason":"Native stored translation component exposed through an indexed canonical member."}},
    {"carbon":{"member":true},"name":"rotation","type":{"kind":"quat"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"scaling","type":{"kind":"vec3"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"displayWidth","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"displayHeight","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"depthMin","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"depthMax","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"pickState","type":{"kind":"int32"},"edit":{"read":true,"write":true,"persist":true},"enum":{"enumType":"trinity.Tr2SpriteObjectPickState"}},
    {"carbon":{"member":true},"name":"clearBackground","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"backgroundColor","type":{"kind":"color"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"children","type":{"kind":"list","className":"ITr2SpriteObject","itemType":"ITr2SpriteObject"},"edit":{"read":true,"persist":true}},
    {"carbon":{"member":true},"name":"background","type":{"kind":"list","className":"ITr2SpriteObject","itemType":"ITr2SpriteObject"},"edit":{"read":true,"persist":true}},
    {"carbon":{"member":true},"name":"clearFinishedCurveSets","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"carbon":{"member":true},"name":"curveSets","type":{"kind":"list","className":"TriCurveSet","itemType":"TriCurveSet"},"edit":{"read":true,"persist":true}},
    {"carbon":{"member":true},"name":"ubershader2d","type":{"kind":"rootRef","className":"Tr2Effect"},"edit":{"read":true}},
    {"carbon":{"member":true},"name":"ubershader3d","type":{"kind":"rootRef","className":"Tr2Effect"},"edit":{"read":true}},
    {"carbon":{"member":true},"name":"defaultTextureUpdates","type":{"kind":"boolean"},"edit":{"read":true,"write":true}},
    {"carbon":{"member":true},"name":"maxItemsToRender","type":{"kind":"uint32"},"edit":{"read":true,"write":true}},
    {"carbon":{"member":true},"name":"maxDrawCallsToRender","type":{"kind":"uint32"},"edit":{"read":true,"write":true}},
    {"carbon":{"member":true},"name":"maxSpriteCount","type":{"kind":"uint32"},"edit":{"read":true,"write":true,"notify":true}},
    {"carbon":{"member":true},"name":"captureIndexDataCapacity","type":{"kind":"uint32"},"edit":{"read":true}}
  ],
  // MAP_PROPERTY rows (Tr2Sprite2dScene_Blue.cpp:229-239): flags derived from the accessors.
  properties: [
    {"carbon":{"member":true},"name":"useLinearColorSpace","type":{"kind":"boolean"},"property":{"persisted":false}},
    {"carbon":{"member":true},"name":"gammaCorrectText","type":{"kind":"boolean"},"property":{"persisted":false}}
  ]
})
@blue.inherit(INotify)
@blue.interface(ITr2Scene, ITr2Updateable, INotify)
export class Tr2Sprite2dScene extends ITr2Scene
{
  /** Native wide-string scene label. @type {string} */
  name = "";

  /** Whether update and rendering work is enabled; clocks are retained while hidden. @type {boolean} */
  display = true;

  /** Requests wireframe fill while the scene renders. @type {boolean} */
  drawWireFrame = false;

  /** Disables scene clipping for native rendering diagnostics. @type {boolean} */
  ignoreClip = false;

  /** Coordinates of the most recent pick in scene space. @type {Float32Array} */
  lastPickPos = vec2.create();

  /** Requests native viewport-sized display dimensions each rendered frame. @type {boolean} */
  isFullscreen = false;

  /** Selects screen-space rather than 3D scene rendering. @type {boolean} */
  is2dRender = true;

  /** Selects screen-space picking rather than a projected 3D pick. @type {boolean} */
  is2dPick = true;

  /** Scene translation; displayX and displayY alias the first two components. @type {Float32Array} */
  translation = vec3.create();

  /** Reads the native translation component alias. @returns {number} displayX coordinate. */
  get displayX()
  {
    return this.translation[0];
  }

  /** Writes the native component through the existing numeric adapter. @param {number} value Coordinate. */
  set displayX(value)
  {
    this.translation[0] = Number(value);
  }

  /** Reads the native translation component alias. @returns {number} displayY coordinate. */
  get displayY()
  {
    return this.translation[1];
  }

  /** Writes the native component through the existing numeric adapter. @param {number} value Coordinate. */
  set displayY(value)
  {
    this.translation[1] = Number(value);
  }

  /** Scene orientation quaternion for 3D rendering. @type {Float32Array} */
  rotation = quat.create();

  /** Scene scale for 3D rendering, initially one on each axis. @type {Float32Array} */
  scaling = vec3.fromValues(1, 1, 1);

  /** Displayed scene width, updated by the native renderer when fullscreen. @type {number} */
  displayWidth = 1;

  /** Displayed scene height, updated by the native renderer when fullscreen. @type {number} */
  displayHeight = 1;

  /** Lower bound of the native scene depth range. @type {number} */
  depthMin = 0;

  /** Upper bound of the native scene depth range. @type {number} */
  depthMax = 0;

  /** Native chooser controlling scene and child picking. @type {number} */
  pickState = 1;

  /** Requests clearing the render target to backgroundColor before rendering. @type {boolean} */
  clearBackground = false;

  /** Native packed-color default 0x000000ff represented as RGBA [0,0,1,0]. @type {Float32Array} */
  backgroundColor = vec4.fromValues(0, 0, 1, 0);

  /** Owned sprites contained by this scene; no container-parent callback is installed by native Scene. @type {BlueList<ITr2SpriteObject>} */
  children = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** Owned non-pickable background sprites that fill the scene extent. @type {BlueList<ITr2SpriteObject>} */
  background = new BlueList(ITr2SpriteObject, { className: null, listOps: 0 });

  /** Removes stopped curve sets after all sets have received the current update. @type {boolean} */
  clearFinishedCurveSets = false;

  /** Owned curve sets updated with raw real and simulation clocks in list order. @type {BlueList<TriCurveSet>} */
  curveSets = new BlueList(TriCurveSet, { className: "TriCurveSet", listOps: 0 });

  /** Carbon m_uberShader2d: the 2D UI effect, created by the constructor. @type {Tr2Effect|null} */
  ubershader2d = null;

  /** Carbon m_uberShader3d: the 3D UI effect, created by the constructor. @type {Tr2Effect|null} */
  ubershader3d = null;

  /** Native diagnostic flag that flashes the default texture during rendering. @type {boolean} */
  defaultTextureUpdates = false;

  /** Maximum sprite/items submitted by the native renderer; UINT32_MAX means unlimited. @type {number} */
  maxItemsToRender = 4294967295;

  /** Maximum native draw calls submitted; UINT32_MAX means unlimited. @type {number} */
  maxDrawCallsToRender = 4294967295;

  /** Maximum sprites per direct draw call; a notified change clamps it and releases resources. @type {number} */
  maxSpriteCount = 1024;

  /** Capacity, in indices, of the display-list capture index storage; grows as needed. @type {number} */
  captureIndexDataCapacity = 1536;

  /** Carbon m_useLinearColorSpace, behind the Blue useLinearColorSpace property. @type {boolean} */
  _useLinearColorSpace = false;

  /** Carbon m_isGammaCorrectingText, behind the Blue gammaCorrectText property. @type {boolean} */
  _isGammaCorrectingText = true;

  /** Carbon m_defaultTextureFlash, the grey level FlashDefaultTexture writes next. @type {number} */
  _defaultTextureFlash = 0;

  /**
   * Carbon m_stackOfStacks: the transform and clip stacks set aside by each open layer.
   * @type {Array<{transformStack: Array<object>, depthStack: null, clipStack: Tr2Sprite2dClipRect[], renderTargetTexture: Tr2TextureAL, renderTargetWrapper: Tr2AtlasTexture}>}
   */
  _stackOfStacks = [];

  /**
   * EndLayer's four vertices. Carbon's are a fresh stack array per call (Tr2Sprite2dScene.cpp:1669); EndLayer
   * resets these to that array's constructed state before every use.
   */
  _layerVertices = Array.from({ length: 4 }, () => new Tr2Sprite2dD3DVertex()); // alloc: retained layer quad, reused by every EndLayer

  /**
   * Carbon constructor (Tr2Sprite2dScene.cpp:58-173): creates both UI ubershaders and points
   * them at their effect paths. The other constructor work is in field initializers; the
   * atlas lookup (cpp:139-149) is repeated by _OnPrepareResources and is not done here.
   */
  constructor()
  {
    super();

    this.ubershader2d = new Tr2Effect();
    this.ubershader2d.SetEffectPathName(EFFECT_UBERSHADER_RESPATH);

    this.ubershader3d = new Tr2Effect();
    this.ubershader3d.SetEffectPathName(EFFECT_RENDER_UBERSHADER_RESPATH_3D);
  }

  /** Blue useLinearColorSpace (Tr2Sprite2dScene_Blue.cpp:229-233). @returns {boolean} Whether UI colour math is linear. */
  get useLinearColorSpace()
  {
    return this._IsUsingLinearColorSpace();
  }

  /** Blue useLinearColorSpace setter. @param {boolean} value Whether UI colour math is linear. */
  set useLinearColorSpace(value)
  {
    this._SetUseLinearColorSpace(Boolean(value));
  }

  /** Blue gammaCorrectText (Tr2Sprite2dScene_Blue.cpp:235-239). @returns {boolean} Whether font output is gamma corrected. */
  get gammaCorrectText()
  {
    return this._IsGammaCorrectingText();
  }

  /** Blue gammaCorrectText setter. @param {boolean} value Whether font output is gamma corrected. */
  set gammaCorrectText(value)
  {
    this._SetGammaCorrectText(Boolean(value));
  }

  /**
   * Carbon IsUsingLinearColorSpace (Tr2Sprite2dScene.cpp:2631-2634).
   *
   * @returns {boolean} Whether the scene renders in linear colour space.
   */
  @meta.implemented
  @blue.method
  _IsUsingLinearColorSpace()
  {
    return this._useLinearColorSpace;
  }

  /**
   * Carbon SetUseLinearColorSpace (Tr2Sprite2dScene.cpp:2636-2647): stores the flag and
   * selects the matching COLOR_SPACE option on both ubershaders.
   *
   * The flag also drives two render-time effects: Render and RunJobHelper switch
   * RS_SRGBWRITEENABLE on around the scene, and texture SRVs are bound through an sRGB view
   * (COLOR_SPACE_SRGB) so sRGB-encoded textures are decoded into linear space.
   *
   * @param {boolean} use Whether to render in linear colour space.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _SetUseLinearColorSpace(use)
  {
    this._useLinearColorSpace = use;

    if (this.ubershader2d) this.ubershader2d.SetOption("COLOR_SPACE", this._useLinearColorSpace ? "COLOR_SPACE_LINEAR" : "COLOR_SPACE_SRGB");
    if (this.ubershader3d) this.ubershader3d.SetOption("COLOR_SPACE", this._useLinearColorSpace ? "COLOR_SPACE_LINEAR" : "COLOR_SPACE_SRGB");
  }

  /**
   * Carbon SetGammaCorrectText (Tr2Sprite2dScene.cpp:2648-2652): stores the flag and selects
   * the FONT_GAMMACORRECT option on the 2D ubershader only.
   *
   * @param {boolean} use Whether font output is gamma corrected.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _SetGammaCorrectText(use)
  {
    this._isGammaCorrectingText = use;
    this.ubershader2d.SetOption("FONT_GAMMACORRECT", this._isGammaCorrectingText ? "ENABLED" : "DISABLED");
  }

  /**
   * Carbon IsGammaCorrectingText (Tr2Sprite2dScene.cpp:2654-2657).
   *
   * @returns {boolean} Whether font output is gamma corrected.
   */
  @meta.implemented
  @blue.method
  _IsGammaCorrectingText()
  {
    return this._isGammaCorrectingText;
  }

  /** Last real-time timestamp received, in raw Blue 100ns ticks. @type {number} */
  _realTime = 0;

  /** Last simulation timestamp received, in raw Blue 100ns ticks. @type {number} */
  _simTime = 0;

  /** Persistent shader-vector storage because TriVariable.SetValue retains its input array. @type {Float32Array} */
  _dotVectorValue = vec4.fromValues(0, 0, 0, 1);

  /** Native nullable global shader-variable handle, using the existing store adapter. @type {TriVariable|null} */
  _dotVectorVar = Tr2VariableStore.globalStore().RegisterVariableInternal("g_DotVector", TriVariableContentType.TRIVARIABLE_FLOAT4, this._dotVectorValue);

  /** Native traversal stacks; entries own their values until popped. */
  _transformStack = [];

  _clipStack = [];

  _depthStack = [];

  _accumulatedAlpha = 1;

  _is2dRenderContext = true;

  _depth = 0;

  /** Combines a translation with the current parent without promoting translation-only paths. */
  @meta.implemented
  @blue.method
  PushTranslation(translation)
  {
    const parent = this._transformStack.at(-1);
    const entry = { isTranslationOnlySet: true, isTranslationOnly: !parent || parent.isTranslationOnly, translation: vec2.clone(translation), transform: null }; // alloc: each active nested stack entry owns its translation until popped

    if (parent)
    {
      if (parent.isTranslationOnly) vec2.add(entry.translation, entry.translation, parent.translation);
      else
      {
        entry.transform = mat4.clone(parent.transform); // alloc: independent nested stack transform, retained until popped
        mat4.translate(entry.transform, entry.transform, [translation[0], translation[1], 0]);
      }
    }

    this._transformStack.push(entry);
  }

  /** Removes the current translation scope. */
  @meta.implemented
  @blue.method
  PopTranslation()
  {
    this._transformStack.pop();
  }

  /** Returns the current native translation slot, or zero outside traversal. */
  @meta.adapted
  @blue.method
  GetTranslation()
  {
    return this._transformStack.at(-1)?.translation ?? [0, 0];
  }

  /** Composes local then parent using reversed gl-matrix multiplication order. */
  @meta.adapted
  @blue.method
  PushTransform(matrix)
  {
    const parent = this._transformStack.at(-1);
    const transform = mat4.clone(matrix); // alloc: stack entry owns this matrix

    if (parent)
    {
      if (parent.isTranslationOnly)
      {
        transform[12] += parent.translation[0];
        transform[13] += parent.translation[1];
      }
      else mat4.multiply(transform, parent.transform, matrix);
    }

    this._transformStack.push({ isTranslationOnly: false, isTranslationOnlySet: false, transform, translation: null });
  }

  /** Removes the current matrix scope. */
  @meta.implemented
  @blue.method
  PopTransform()
  {
    this._transformStack.pop();
  }

  /** Temporarily ignores inherited transforms for absolute-coordinate containers. */
  @meta.implemented
  @blue.method
  PushTransformAbsolute()
  {
    this._transformStack.push({ isTranslationOnly: true, isTranslationOnlySet: true, translation: [0, 0], transform: null });
  }

  /** Restores the parent after an absolute-coordinate scope. */
  @meta.implemented
  @blue.method
  PopTransformAbsolute()
  {
    this._transformStack.pop();
  }

  /** Returns a point in local coordinates; matrices use the native non-perspective transform. */
  @meta.adapted
  @blue.method
  InverseTransformPoint(point)
  {
    const parent = this._transformStack.at(-1);
    const result = vec2.clone(point); // alloc: returned point belongs to caller
    if (!parent) return result;

    if (parent.isTranslationOnly) return vec2.subtract(result, result, parent.translation);

    const inverse = mat4.alloc();
    try
    {
      if (!mat4.invert(inverse, parent.transform)) inverse.fill(NaN);
      this._TransformPoint(result, point, inverse);
      return result;
    }
    finally { mat4.unalloc(inverse); }
  }

  /**
   * Carbon's private TransformPoint (Tr2Sprite2dScene.h:176, cpp:2622-2629): the row-vector
   * Vector4(x, y, 0, 1) * m, deliberately without perspective division.
   *
   * @param {Float32Array|number[]} result Receives x and y.
   * @param {Float32Array|number[]} point The point to transform.
   * @param {Float32Array} matrix The transform.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _TransformPoint(result, point, matrix)
  {
    const x = point[0], y = point[1];
    result[0] = matrix[0] * x + matrix[4] * y + matrix[12];
    result[1] = matrix[1] * x + matrix[5] * y + matrix[13];
  }

  /** Pushes the transformed axis-aligned bounds intersected with the parent clip. */
  @meta.implemented
  @blue.method
  PushClipRectangle(x, y, width, height)
  {
    if (this.ignoreClip || !this.is2dRender) return;

    const parent = this._transformStack.at(-1);
    const rect = new Tr2Sprite2dClipRect();
    rect.left = x;
    rect.top = y;
    rect.right = x + width;
    rect.bottom = y + height;

    if (parent?.isTranslationOnly)
    {
      rect.left += parent.translation[0];
      rect.right += parent.translation[0];
      rect.top += parent.translation[1];
      rect.bottom += parent.translation[1];
    }
    else if (parent)
    {
      const m = parent.transform;
      rect.left = rect.top = Infinity;
      rect.right = rect.bottom = -Infinity;

      for (let index = 0; index < 4; index++)
      {
        const px = x + (index & 1 ? width : 0), py = y + (index & 2 ? height : 0);
        const tx = m[0] * px + m[4] * py + m[12], ty = m[1] * px + m[5] * py + m[13];
        rect.left = Math.min(rect.left, tx);
        rect.right = Math.max(rect.right, tx);
        rect.top = Math.min(rect.top, ty);
        rect.bottom = Math.max(rect.bottom, ty);
      }
    }

    const clip = this._clipStack.at(-1);
    if (clip)
    {
      rect.left = Math.max(rect.left, clip.left);
      rect.right = Math.min(rect.right, clip.right);
      rect.top = Math.max(rect.top, clip.top);
      rect.bottom = Math.min(rect.bottom, clip.bottom);
    }

    this._clipStack.push(rect);
  }

  /** Restores the parent clip; native 3D clipping remains disabled. */
  @meta.implemented
  @blue.method
  PopClipRectangle()
  {
    if (this.ignoreClip || !this.is2dRender) return;

    this._clipStack.pop();
  }

  /** Returns the active absolute clipping bounds. */
  @meta.implemented
  @blue.method
  GetClipRectangle()
  {
    return this._clipStack.at(-1);
  }

  /** Tests inclusive absolute clip bounds before local-coordinate hit testing. */
  @meta.implemented
  @blue.method
  IsInsideClipRect(point)
  {
    const clip = this._clipStack.at(-1);
    return !clip || !(point[0] < clip.left || point[0] > clip.right || point[1] < clip.top || point[1] > clip.bottom);
  }

  /** Native rectangular, circular or radius=-1 elliptical hit test. */
  @meta.implemented
  @blue.method
  IsInside(point, topLeft, width, height, radius)
  {
    if (!this.IsInsideClipRect(point)) return false;

    const local = this.InverseTransformPoint(point);
    const x = local[0] - topLeft[0], y = local[1] - topLeft[1];
    if (x < 0 || x > width || y < 0 || y > height) return false;

    const dx = width * 0.5 - x, dy = height * 0.5 - y;
    if (radius > 0) return !(dx * dx + dy * dy > radius * radius);

    if (radius === -1)
    {
      // Carbon quirk, Tr2Sprite2dScene.cpp:1423-1438, CE-132: the long semi-axis is always
      // divided into dX, so a tall rectangle tests against a wide ellipse. Reproduced.
      const a = Math.max(width, height) * 0.5, b = Math.min(width, height) * 0.5;
      return !(dx * dx / (a * a) + dy * dy / (b * b) > 1);
    }

    return true;
  }

  /** Tests Carbon's finite line band and midpoint-radius endpoint bound in screen space. */
  @meta.implemented
  @blue.method
  IsInsideLineSegment(point, start, end, lineWidth)
  {
    if (!this.IsInsideClipRect(point)) return false;

    const parent = this._transformStack.at(-1);
    const a = [start[0], start[1]], b = [end[0], end[1]];
    if (parent?.isTranslationOnly)
    {
      a[0] += parent.translation[0]; a[1] += parent.translation[1];
      b[0] += parent.translation[0]; b[1] += parent.translation[1];
    }
    else if (parent)
    {
      this._TransformPoint(a, a, parent.transform);
      this._TransformPoint(b, b, parent.transform);
    }

    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1.1920928955078125e-7) return false;

    const distance = Math.abs(dy * point[0] - dx * point[1] - a[0] * b[1] + a[1] * b[0]) / length;
    if (distance > lineWidth) return false;

    const cx = point[0] - (a[0] + b[0]) * 0.5, cy = point[1] - (a[1] + b[1]) * 0.5;
    return !(Math.sqrt(cx * cx + cy * cy) > length * 0.5);
  }

  /** Tests native triangle winding after transforming vertices, including native degeneracy gates. */
  @meta.implemented
  @blue.method
  IsInsideTriangle(point, v0, v1, v2)
  {
    if (!this.IsInsideClipRect(point)) return false;

    // Carbon quirk, Tr2Sprite2dScene.cpp:1522-1535, CE-133: IsDegenerateTriangle never
    // compares v1 with v2, and it tests the untransformed vertices. Reproduced.
    const epsilon = 1.1920928955078125e-7;
    if ((Math.abs(v0[0] - v1[0]) < epsilon && Math.abs(v0[1] - v1[1]) < epsilon)
      || (Math.abs(v0[0] - v2[0]) < epsilon && Math.abs(v0[1] - v2[1]) < epsilon)) return false;

    const parent = this._transformStack.at(-1);
    const vertices = [[v0[0], v0[1]], [v1[0], v1[1]], [v2[0], v2[1]]];
    if (parent)
    {
      for (const vertex of vertices)
      {
        if (parent.isTranslationOnly)
        {
          vertex[0] += parent.translation[0];
          vertex[1] += parent.translation[1];
        }
        else this._TransformPoint(vertex, vertex, parent.transform);
      }
    }

    for (let index = 0; index < 3; index++)
    {
      const a = vertices[index], b = vertices[(index + 1) % 3];
      const sign = (point[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (point[1] - b[1]);
      if (sign < 0) return false;
    }

    return true;
  }

  /** Native CPU render state and two texture slots. */
  _color = vec4.fromValues(1, 1, 1, 1);
  _outlineColor = vec4.fromValues(0, 0, 0, 1);
  _outlineThreshold = 0;
  _blendMode = 0;
  _spriteTarget = 1;
  _glowBrightness = 1;
  _spriteEffect = 0;
  _numTexturesUsed = 0;
  _isAntiAliased = false;
  _tileMode = 0;
  _texture = [null, null];
  _textureSettings = Array.from({ length: 2 }, () => ({
    textureWindow: vec4.fromValues(0, 0, 1, 1), // alloc: one retained window per instance texture slot
    useTransform: false,
    transform: mat4.create(), // alloc: one retained matrix per instance texture slot
    tileX: false,
    tileY: false,
    repeatMode: 0
  }));

  /** Copies the current vertex tint. */
  @meta.implemented
  @blue.method
  SetColor(value)
  {
    vec4.copy(this._color, value);
  }

  /** Copies the outline tint. */
  @meta.implemented
  @blue.method
  SetOutlineColor(value)
  {
    vec4.copy(this._outlineColor, value);
  }

  /** Sets the outline alpha threshold. */
  @meta.implemented
  @blue.method
  SetOutlineThreshold(value)
  {
    this._outlineThreshold = value;
  }

  /** Sets the sprite blend code. */
  @meta.implemented
  @blue.method
  SetBlendmode(value)
  {
    this._blendMode = value;
  }

  /** Selects color, glow, or both render outputs. */
  @meta.implemented
  @blue.method
  SetSpriteTarget(value)
  {
    this._spriteTarget = value;
  }

  /** Sets glow output intensity. */
  @meta.implemented
  @blue.method
  SetGlowBrightness(value)
  {
    this._glowBrightness = value;
  }

  /** Retains only the native horizontal and vertical tiling bits. */
  @meta.implemented
  @blue.method
  SetTileMode(value)
  {
    this._tileMode = value & (Tr2Sprite2dTextureSettings.S2D_TS_TILE_X | Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y);
  }

  /** Selects the vertex effect and its required texture count. */
  @meta.implemented
  @blue.method
  SetSpriteEffect(value)
  {
    if (this._spriteEffect === value) return;

    this._spriteEffect = value;
    this._numTexturesUsed = 0;
    this._isAntiAliased = value === Tr2SpriteObjectEffect.TR2_SFX_FILL_AA;
    if (value >= Tr2SpriteObjectEffect.TR2_SFX_ONE_TEXTURE)
    {
      this._numTexturesUsed++;
      if (value >= Tr2SpriteObjectEffect.TR2_SFX_TWO_TEXTURES) this._numTexturesUsed++;
    }
  }

  /** Selects a subrectangle within the current atlas input. */
  @meta.implemented
  @blue.method
  SetTextureWindow(index, x, y, width, height)
  {
    if (this._texture[index]) this._texture[index].CalcSubTextureWindow(this._textureSettings[index].textureWindow, x, y, width, height);
  }

  /** Copies the texture transform, or disables it for a null matrix. */
  @meta.implemented
  @blue.method
  SetTextureTransform(index, matrix)
  {
    const setting = this._textureSettings[index];
    setting.useTransform = matrix !== null;
    if (matrix !== null) mat4.copy(setting.transform, matrix);
  }

  /** Checks every texture required by the active effect. */
  @meta.implemented
  @blue.method
  _TexturesReady()
  {
    for (let i = 0; i < this._numTexturesUsed; i++)
    {
      if (!this._texture[i] || !this._texture[i].IsGood()) return false;
    }

    return true;
  }

  /**
   * Carbon SetSpriteVerticesUVs (public, Tr2Sprite2dScene.h:106, cpp:2402-2459): applies
   * tiling, affine UV transforms, and atlas windows in native order.
   *
   * @param {Array<Array<number[]>>} uv [texture][corner] UV pairs to fill.
   * @param {number} width Sprite width, for tiling.
   * @param {number} height Sprite height, for tiling.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  SetSpriteVerticesUVs(uv, width, height)
  {
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let i = 0; i < this._numTexturesUsed; i++)
    {
      const setting = this._textureSettings[i], window = setting.textureWindow;
      const scaleX = setting.tileX ? width * this._texture[i].GetWidthReciprocal() : 1;
      const scaleY = setting.tileY ? height * this._texture[i].GetHeightReciprocal() : 1;
      for (let j = 0; j < 4; j++)
      {
        let x = corners[j][0] * scaleX, y = corners[j][1] * scaleY;
        if (setting.useTransform)
        {
          const matrix = setting.transform;
          const transformedX = matrix[0] * x + matrix[4] * y + matrix[12];
          y = matrix[1] * x + matrix[5] * y + matrix[13];
          x = transformedX;
        }

        uv[i][j][0] = x * window[2] + window[0];
        uv[i][j][1] = y * window[3] + window[1];
      }
    }
  }

  /**
   * Prepares four local vertices; transform/clip/parent alpha are applied at submission.
   * Adapted: unused native UV stack slots are zero-filled deterministically in JS.
   */
  @meta.adapted
  @blue.method
  PrepareSpriteVerts(vertices, position, width, height, effect)
  {
    if (!this._TexturesReady()) return false;

    const uv = Array.from({ length: 2 }, () => Array.from({ length: 4 }, () => [0, 0]));
    this.SetSpriteVerticesUVs(uv, width, height);
    const initial = uv[0].map(value => value.slice());
    const positions = [[position[0], position[1]], [position[0] + width, position[1]], [position[0] + width, position[1] + height], [position[0], position[1] + height]];
    const effects = Tr2SpriteObjectEffect;
    const blur = effect === effects.TR2_SFX_BLUR || effect === effects.TR2_SFX_GLOW;
    if (blur)
    {
      const reciprocalX = this._texture[0] ? 1 / this._texture[0].GetTextureWidth() : 1;
      const reciprocalY = this._texture[0] ? 1 / this._texture[0].GetTextureHeight() : 1;
      for (let i = 0; i < 4; i++)
      {
        const x = i === 0 || i === 3 ? -1 : 1, y = i < 2 ? -1 : 1;
        positions[i][0] += x; positions[i][1] += y;
        uv[0][i][0] += x * reciprocalX; uv[0][i][1] += y * reciprocalY;
      }
    }

    for (let i = 0; i < 4; i++)
    {
      const vertex = vertices[i];
      vec3.set(vertex.position, positions[i][0], positions[i][1], this._depth);
      vec4.copy(vertex.color, this._color);
      vec2.copy(vertex.texCoord[0], uv[0][i]);
      vec2.copy(vertex.texCoord[1], blur || effect === effects.TR2_SFX_OUTLINE ? initial[(i + 2) % 4] : uv[1][i]);
      if (effect === effects.TR2_SFX_OUTLINE)
      {
        vec4.copy(vertex.outlineColor, this._outlineColor);
        vertex.outlineThreshold = this._outlineThreshold;
      }

      vertex.glowBrightness = this._glowBrightness;
      vertex.blendMode = this._blendMode | (this._spriteTarget << 3);
      vertex.spriteEffect = this._spriteEffect;
      vertex.transformIndex = 0;
      vertex.tileMode = this._tileMode;
    }

    return true;
  }

  /**
   * Carbon PrepareTriangleVerts (Tr2Sprite2dScene.h:108-112, cpp:925-998): converts authored
   * vertices into renderer vertices with the current colour, texture windows and transforms,
   * blend state and effect.
   *
   * Writes only what Carbon writes: position, colour (source times the current colour), the
   * texture coordinates of the textures the effect uses (both, untouched, when
   * anti-aliased), glow, blend mode, sprite effect, tile mode and a zero transform index.
   * The clip rectangle, outline fields and unused texture slots keep whatever the destination
   * held. Parent translation, alpha, depth, transform index and clip are applied later, at
   * RenderTriangleVerts.
   *
   * Adapted: Carbon walks `verts` as raw memory with a byte `stride`, so one routine accepts
   * every vertex type derived from Tr2Sprite2dVertexBase. A JS array of vertex objects is
   * indexed by element and needs no stride, so `stride` is accepted for the donor signature
   * and unused. A C++ pointer offset (`&m_vertices[16]`) is a `slice()` of the array here:
   * the slice holds the same vertex objects, so the writes reach the caller's array.
   *
   * @param {Tr2Sprite2dD3DVertex[]} destVerts Renderer vertices to fill, from index 0.
   * @param {Tr2Sprite2dVertexBase[]} verts Authored vertices to read, from index 0.
   * @param {number} _stride Carbon's byte stride between source vertices; unused.
   * @param {number} vertexCount Number of vertices to convert.
   * @returns {boolean} False when a texture the current effect needs is not ready.
   */
  @meta.adapted
  @blue.method
  PrepareTriangleVerts(destVerts, verts, _stride, vertexCount)
  {
    if (!this._TexturesReady()) return false;

    const color = this._color;
    const blendMode = this._blendMode | (this._spriteTarget << 3);

    for (let i = 0; i < vertexCount; i++)
    {
      const source = verts[i], dest = destVerts[i];

      vec3.copy(dest.position, source.position);

      dest.color[0] = source.color[0] * color[0];
      dest.color[1] = source.color[1] * color[1];
      dest.color[2] = source.color[2] * color[2];
      dest.color[3] = source.color[3] * color[3];

      for (let ix = 0; ix < this._numTexturesUsed; ix++)
      {
        const setting = this._textureSettings[ix], window = setting.textureWindow;
        let x = source.texCoord[ix][0], y = source.texCoord[ix][1];

        // Transform( Vector4( x, y, 0, 1 ), transform ): the row-vector product, no divide.
        if (setting.useTransform)
        {
          const matrix = setting.transform;
          const transformedX = x * matrix[0] + y * matrix[4] + matrix[12];
          y = x * matrix[1] + y * matrix[5] + matrix[13];
          x = transformedX;
        }

        dest.texCoord[ix][0] = x * window[2] + window[0];
        dest.texCoord[ix][1] = y * window[3] + window[1];
      }

      if (this._isAntiAliased)
      {
        vec2.copy(dest.texCoord[0], source.texCoord[0]);
        vec2.copy(dest.texCoord[1], source.texCoord[1]);
      }

      dest.glowBrightness = this._glowBrightness;
      dest.blendMode = blendMode;
      dest.spriteEffect = this._spriteEffect;
      dest.tileMode = this._tileMode;
      dest.transformIndex = 0;
    }

    return true;
  }

  /** Stores inherited opacity for the next gathered elements. */
  @meta.implemented
  @blue.method
  SetAccumulatedAlpha(value)
  {
    this._accumulatedAlpha = value;
  }

  /** Returns inherited opacity. */
  @meta.implemented
  @blue.method
  GetAccumulatedAlpha()
  {
    return this._accumulatedAlpha;
  }

  /** Seeds the native root depth and unclipped bounds before gathering. */
  @meta.implemented
  @blue.method
  _PrepareStacksBeforeRender()
  {
    const maximum = 3.4028234663852886e38;
    const clip = Tr2Sprite2dClipRect.create__AllFields(-maximum, -maximum, maximum, maximum); // Tr2Sprite2dScene.cpp:2389
    this._depthStack.push([this.depthMin, this.depthMax]);
    this._clipStack.push(clip);
  }

  /** Removes the root stack entries after balanced traversal. */
  @meta.implemented
  @blue.method
  _CleanUpStacksAfterRender()
  {
    this._depthStack.pop();
    this._clipStack.pop();
  }

  /** Maps a child [-1,1] depth interval into its parent's interval in 3D mode. */
  @meta.implemented
  @blue.method
  PushDepthRange(min, max)
  {
    if (this._is2dRenderContext) return;

    const parent = this._depthStack.at(-1), range = parent[1] - parent[0];
    this._depthStack.push([parent[0] + range * 0.5 * (min + 1), parent[0] + range * 0.5 * (max + 1)]);
  }

  /** Restores the parent 3D depth interval. */
  @meta.implemented
  @blue.method
  PopDepthRange()
  {
    if (!this._is2dRenderContext) this._depthStack.pop();
  }

  /** Maps a relative depth into the active 3D interval. */
  @meta.implemented
  @blue.method
  SetDepth(depth)
  {
    if (this._is2dRenderContext) return;

    const range = this._depthStack.at(-1);
    this._depth = range[0] + 0.5 * (depth + 1) * (range[1] - range[0]);
  }

  /** Native camera-direction quaternion tweak, shared read-only by updates. @type {number[]} */
  static _viewTweak = [0.332621, 0.332621, 0, 0.882455];

  /** Existing class-local view of the native pick-state chooser. @type {Object<string, number>} */
  static Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;

  /**
   * Publishes the camera direction and updates every owned curve set before cleanup.
   *
   * Adapted: Carbon reads Tr2Renderer::GetViewLookAt (cpp:205), the view's third
   * column; writes go through the existing variable-store handle; curve-set clocks
   * remain raw ticks.
   *
   * @param {number} realTime Raw Blue real-time ticks (100ns).
   * @param {number} simTime Raw Blue simulation ticks (100ns).
   * Not Blue-exposed: Tr2Sprite2dScene_Blue.cpp:242 maps PickObject only; Update is the
   * ITr2Scene interface entry.
   *
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  Update(realTime, simTime)
  {
    this._realTime = realTime;
    this._simTime = simTime;
    if (!this.display) return;
    const view = Tr2Renderer.GetViewTransform();
    const direction = vec3.alloc();
    const dot = this._dotVectorValue;
    try
    {
      // TriMath.cpp: q*v*conjugate(q), retaining the non-unit tweak's scale.
      const [x, y, z, w] = Tr2Sprite2dScene._viewTweak;
      const vx = view[2], vy = view[6], vz = view[10];
      const ww = w * w, xx = x * x, yy = y * y, zz = z * z;
      vec3.set(direction,
        vx * (ww + xx - yy - zz) + 2 * (vy * (x * y - w * z) + vz * (x * z + w * y)),
        vy * (ww - xx + yy - zz) + 2 * (vx * (x * y + w * z) + vz * (y * z - w * x)),
        vz * (ww - xx - yy + zz) + 2 * (vx * (x * z - w * y) + vy * (y * z + w * x)));
      vec4.set(dot, direction[0], direction[1], direction[2], 1);
      if (this._dotVectorVar) this._dotVectorVar.SetValue(dot);
    }
    finally
    {
      vec3.unalloc(direction);
    }
    for (const curveSet of this.curveSets) curveSet.Update__RealTimeSimTime(realTime, simTime);
    if (this.clearFinishedCurveSets) this._RemoveFinishedCurveSets();
  }

  /**
   * Carbon's private RemoveFinishedCurveSets (Tr2Sprite2dScene.h:163, cpp:2252-2267): removes
   * stopped sets in place using native Blue list removal semantics.
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _RemoveFinishedCurveSets()
  {
    for (let index = 0; index < this.curveSets.length;)
    {
      if (!this.curveSets[index].IsPlaying()) this.curveSets.Remove(index);
      else index++;
    }
  }

  /**
   * Carbon OnModified (Tr2Sprite2dScene.cpp:2193-2205): clamps maxSpriteCount to
   * SPRITE_COUNT_MAX and releases the scene resources.
   *
   * @param {*} value The modified Blue value.
   * @returns {boolean} Always true.
   */
  @meta.implemented
  @blue.method
  OnModified(value)
  {
    if (IsMatch(value, "maxSpriteCount"))
    {
      if (this.maxSpriteCount > 16383) this.maxSpriteCount = 16383;
      this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    }
    return true;
  }

  /** Native scene resource release; explicit Destroy replaces AL value destruction. */
  @meta.adapted
  @blue.method
  ReleaseResources(storage)
  {
    // m_uiTransformsCb = Tr2ConstantBufferAL() (Tr2Sprite2dScene.cpp:1201).
    this._uiTransformsCb.Destroy();
    this._effect = null;
    // Carbon's m_defaultTexture = nullptr drops the scene's only reference, so
    // the texture's OnShutdown gives its region back to the atlas at once.
    if (this._defaultTexture) this._defaultTexture.OnShutdown();
    this._defaultTexture = null;
    if (storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY) this._vertexDecl = -1;
  }

  /**
   * Explicit native destructor equivalent: JavaScript does not destroy owned AL values on scope exit.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    this._ResetCapture();
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    this._vertexBuffer.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    this._indexBuffer.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    this.children.Clear();
    this.background.Clear();
    this.curveSets.Clear();
    this.ubershader2d = this.ubershader3d = null;
  }

  /**
   * Carbon Render (Tr2Sprite2dScene.cpp:223-293): draws the background and children through
   * the effect/AL pipeline, with sRGB writes on around the scene in linear colour space.
   *
   * Not Blue-exposed: Tr2Sprite2dScene_Blue.cpp:242 maps PickObject only; Render is the
   * ITr2Scene interface entry.
   *
   * Adapted: Carbon's Tr2RenderContext is the backend context, so its AddGpuMarker is a
   * direct call; ours composes the backend and reaches it through GetRenderContextAL().
   * D3DPERF_EVENT is an empty macro in Carbon (TriUtil.h:8) and has no port. m_lastViewMatrix
   * and m_lastProjectionMatrix (cpp:249-250) are written and never read, so they are not
   * stored.
   *
   * @param {Tr2RenderContext} renderContext The context to render into.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  Render(renderContext)
  {
    if (!this.display || !renderContext.IsValid()) return;

    const isReady = this._PrepareResourcesForRender();
    if (!isReady) return;

    renderContext.GetRenderContextAL().AddGpuMarker("Tr2Sprite2dScene::Render"); // __FUNCTION__

    if (this._useLinearColorSpace) renderContext.SetRenderState(RenderState.RS_SRGBWRITEENABLE, 1);

    // Flash default texture to make it easier to spot missing textures
    this._FlashDefaultTexture();

    this._DetermineWorldTransform();
    this._DetermineViewportSize();

    renderContext.GetEffectStateManager().PushDepthStencilBuffer__TextureAL(new Tr2TextureAL());
    this._PrepareRenderContextForRendering(renderContext);
    this._PrepareStacksBeforeRender();

    this._itemsRendered = 0;
    this._drawCallsRendered = 0;

    for (let i = this.background.length - 1; i >= 0; i--) this.background[i].GatherSprites(this);
    for (let i = this.children.length - 1; i >= 0; i--) this.children[i].GatherSprites(this);

    // CCP_ASSERT( !m_captureDisplayList ) (cpp:275) is compiled out of the shipping build.
    this._IssueDrawCall();

    this._PrepareRenderContextAfterRendering(renderContext);
    this._CleanUpStacksAfterRender();
    renderContext.GetEffectStateManager().PopDepthStencilBuffer();

    this._is2dRenderContext = this.is2dRender;

    renderContext.GetRenderContextAL().AddGpuMarker("Tr2Sprite2dScene::Render End");

    if (this._useLinearColorSpace) renderContext.SetRenderState(RenderState.RS_SRGBWRITEENABLE, 0);
  }

  /**
   * Carbon DetermineWorldTransform (Tr2Sprite2dScene.cpp:2336-2352): the 2D render context
   * starts as the scene's setting; 2D scenes cancel the view, 3D scenes place themselves with
   * TransformationMatrix( scaling, rotation, translation ).
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _DetermineWorldTransform()
  {
    this._is2dRenderContext = this.is2dRender;

    if (this.is2dRender) mat4.copy(this._worldTransform, Tr2Renderer.GetInverseViewTransform());
    else mat4.fromRotationTranslationScale(this._worldTransform, this.rotation, this.translation, this.scaling);

    Tr2Renderer.SetWorldTransform(this._worldTransform);
  }

  /**
   * Carbon DetermineViewportSize (Tr2Sprite2dScene.cpp:2313-2334): a fullscreen scene takes
   * the main viewport's size, then the size is published to UIViewportSize.
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _DetermineViewportSize()
  {
    if (this.isFullscreen)
    {
      const viewport = Tr2Renderer.GetViewport();
      this.displayWidth = viewport.width;
      this.displayHeight = viewport.height;
    }

    this._SetViewportSizeToVariableStore(this.displayWidth, this.displayHeight);
  }

  /**
   * Carbon SetViewportSizeToVariableStore (Tr2Sprite2dScene.cpp:2303-2311).
   *
   * @param {number} displayWidth Width in pixels.
   * @param {number} displayHeight Height in pixels.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _SetViewportSizeToVariableStore(displayWidth, displayHeight)
  {
    this._viewportSizeValue.set([displayWidth, displayHeight, this.is2dRender ? 1 : 0, 1]);
    this._viewportSizeVar.SetValue(this._viewportSizeValue);
  }

  /**
   * Carbon PrepareRenderContextForRendering (Tr2Sprite2dScene.cpp:2354-2368).
   *
   * @param {Tr2RenderContext} renderContext The rendering context.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _PrepareRenderContextForRendering(renderContext)
  {
    const esm = renderContext.GetEffectStateManager();

    esm.BeginManagedRendering();
    esm.ApplyStandardStates(RenderingMode.RM_SPRITE2D);

    if (this.clearBackground) renderContext.Clear({ color: Array.from(this.backgroundColor), depth: 0, stencil: 0, clearColor: true, clearDepth: false, clearStencil: false });

    esm.SetWireframeRendering(this.drawWireFrame);
    esm.ApplyVertexDeclaration(this._vertexDecl);
    esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
  }

  /**
   * Carbon PrepareRenderContextAfterRendering (Tr2Sprite2dScene.cpp:2370-2380).
   * EndManagedRendering clears the textures set on the device, so the cached ones are dropped.
   *
   * @param {Tr2RenderContext} renderContext The rendering context.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _PrepareRenderContextAfterRendering(renderContext)
  {
    const esm = renderContext.GetEffectStateManager();

    esm.EndManagedRendering();
    esm.SetWireframeRendering(false);

    this._texture.fill(null);
  }

  /**
   * Carbon FlashDefaultTexture (Tr2Sprite2dScene.cpp:2222-2250): with defaultTextureUpdates
   * on, fills the 2x2 default texture with the next grey level so missing textures blink.
   * Each pixel is the little-endian uint32 0xff000000 | f << 16 | f << 8 | f, so the
   * B8G8R8A8 bytes are f, f, f, 0xff. Like Carbon, a failed lock is not tolerated.
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _FlashDefaultTexture()
  {
    if (!this.defaultTextureUpdates) return;

    const flash = this._defaultTextureFlash;
    this._defaultTextureFlash = (this._defaultTextureFlash + 5) % 255;

    const mapping = this._defaultTexture.LockBuffer();
    for (const row of [0, mapping.pitch])
    {
      for (let pixel = 0; pixel < 2; pixel++)
      {
        const offset = row + pixel * 4;
        mapping.data[offset] = flash;
        mapping.data[offset + 1] = flash;
        mapping.data[offset + 2] = flash;
        mapping.data[offset + 3] = 0xff;
      }
    }

    this._defaultTexture.UnlockBuffer();
  }

  /** Native scene debug rendering is empty. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.noop
  @blue.method
  RenderDebugInfo(_renderContext)
  {
  }

  /**
   * Picks children in native order, projecting through the scene plane in 3D mode.
   * The only Blue-exposed method (Tr2Sprite2dScene_Blue.cpp:242-252).
   *
   * Adapted: Uses the portable ScreenToProjection helper; debug-renderer annotations are omitted.
   *
   * @param {number} x Screen x.
   * @param {number} y Screen y.
   * @param {TriProjection|null} [projection=null] Projection, for 3D picking.
   * @param {TriView|null} [view=null] View, for 3D picking.
   * @param {TriViewport|null} [viewport=null] Viewport, for 3D picking.
   * @param {number} [_pickFilter] Carbon's unused Be::Optional<int> pick filter.
   * @returns {ITr2SpriteObject|null} The picked object.
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.adapted
  PickObject(x, y, projection = null, view = null, viewport = null, _pickFilter = undefined)
  {
    let finalX = x, finalY = y;

    if (!this.is2dPick)
    {
      const coords = screenToProjection(x, y, viewport);
      const matrix = mat4.alloc(), temporary = mat4.alloc();
      const start = vec3.alloc(), end = vec3.alloc();
      try
      {
        mat4.fromRotationTranslationScale(matrix, this.rotation, this.translation, this.scaling);
        view.GetTransform(temporary);
        mat4.multiply(matrix, temporary, matrix);
        projection.GetTransform(temporary);
        mat4.multiply(matrix, temporary, matrix);
        if (!mat4.invert(matrix, matrix)) matrix.fill(NaN);
        vec3.set(start, coords.x, coords.y, 0);
        vec3.set(end, coords.x, coords.y, 0.5);
        vec3.transformMat4(start, start, matrix);
        vec3.transformMat4(end, end, matrix);
        const slopeX = (end[2] - start[2]) / (end[0] - start[0]);
        const slopeY = (end[2] - start[2]) / (end[1] - start[1]);
        finalX = (slopeX * start[0] - start[2]) / slopeX;
        finalY = 1 - (slopeY * start[1] - start[2]) / slopeY;

        if (this.is2dRender)
        {
          finalX = finalX * this.displayWidth + this.displayWidth / 2;
          finalY = finalY * this.displayHeight - this.displayHeight / 2;
        }
        else
        {
          finalX += this.displayWidth / 2;
          finalY += this.displayHeight / 2;
        }
      }
      finally
      {
        mat4.unalloc(matrix);
        mat4.unalloc(temporary);
        vec3.unalloc(start);
        vec3.unalloc(end);
      }
    }

    vec2.set(this.lastPickPos, finalX, finalY);

    for (const child of this.children)
    {
      const object = child.PickPoint(finalX, finalY, this);
      if (object) return object;
    }

    return null;
  }

  _vertexBuffer = new Tr2RingVertexBuffer();
  _indexBuffer = new Tr2RingIndexBuffer();
  _vertexDecl = -1;
  _vertexBytes = null;
  _vertexView = null;
  _indexData = null;
  _vertexCount = 0;
  _indexCount = 0;
  _transformCurrent = 0;
  _transformArray = Array.from({ length: 32 }, () => mat4.create()); // alloc: per-instance transform palette, retained for subsequent draws
  _transposedTransforms = new Float32Array(32 * 16); // alloc: per-instance packed matrix palette, not a vector
  _uiTransformsCb = new Tr2ConstantBufferAL();
  _effect = null;
  _textureRegisters = [0, 1];
  _defaultTexture = null;
  _drawCallStartIndex = 0;
  _drawCallsRendered = 0;
  _itemsRendered = 0;
  _worldTransform = mat4.create();
  _viewportSizeValue = vec4.create();
  _viewportSizeVar = Tr2VariableStore.globalStore().RegisterVariableInternal("UIViewportSize", TriVariableContentType.TRIVARIABLE_FLOAT4, this._viewportSizeValue);
  _texelSizeValues = [vec4.create(), vec4.create()];
  _texelSizeVar = this._texelSizeValues.map((value, index) => Tr2VariableStore.globalStore().RegisterVariableInternal(`g_texelSizeUI${index}`, TriVariableContentType.TRIVARIABLE_FLOAT4, value));

  /**
   * Carbon PrepareResourcesForRender (Tr2Sprite2dScene.cpp:2272-2301): prepares the ring
   * buffers when they are invalid, then refuses to render until the 2D ubershader's effect
   * resource has loaded, asking a failed one to reload. Carbon gates on m_uberShader2d in 3D
   * mode too; reproduced.
   *
   * Carbon quirk, Tr2Sprite2dScene.cpp:2193-2210, 1199-1210, 2275, CE-126: OnModified
   * (maxSpriteCount) releases only the constant buffer, effect, default texture and vertex
   * declaration, so the still-valid ring buffers keep Carbon from ever re-running
   * OnPrepareResources and the mirrors keep their old size. This port also re-prepares when
   * the vertex declaration is uninitialized, which resizes the buffers and restores the
   * default texture: a silent fix, kept until the operator rules on CE-126 (reproduce or
   * keep). That pending ruling, not a platform limit, is the reason for the adapted marker.
   *
   * @returns {boolean} Whether rendering can go forward.
   */
  @meta.adapted
  @blue.method
  _PrepareResourcesForRender()
  {
    // Prepare resources if we don't have valid index or vertex buffers.
    // Carbon quirk, Tr2Sprite2dScene.cpp:2275, CE-126: Carbon tests only the buffers; the
    // _vertexDecl test is this port's silent fix, kept pending the operator's ruling.
    if (this._vertexDecl === -1 || !this._indexBuffer.IsValid() || !this._vertexBuffer.IsValid())
    {
      this._OnPrepareResources();

      // Bail out if the buffers still aren't valid
      if (!this._indexBuffer.IsValid() || !this._vertexBuffer.IsValid()) return false;
    }

    const effectRes = this.ubershader2d.GetEffectRes();

    // Effect is still loading - can't render any UI
    if (!effectRes || effectRes.IsLoading()) return false;

    if (!effectRes.IsGood())
    {
      // Effect load failed - can't render any UI
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s: Effect used for rendering failed to load - attempting to reload", "Tr2Sprite2dScene::PrepareResourcesForRender");
      effectRes.Reload();
      return false;
    }

    return true;
  }

  /** Creates native ring buffers, the 88-byte vertex declaration and diagnostic texture. */
  @meta.adapted
  @blue.method
  _OnPrepareResources()
  {
    if (this._vertexDecl === -1)
    {
      const declaration = new Tr2VertexDefinition();
      for (const [type, usage, index] of [["FLOAT32_3", "POSITION", 0], ["FLOAT32_4", "COLOR", 0],
        ["FLOAT32_2", "TEXCOORD", 0], ["FLOAT32_2", "TEXCOORD", 1], ["FLOAT32_4", "TEXCOORD", 2],
        ["FLOAT32_1", "TEXCOORD", 3], ["UBYTE_4", "BLENDINDICES", 0], ["FLOAT32_4", "COLOR", 1], ["FLOAT32_1", "TEXCOORD", 4]]) declaration.Add(type, usage, index);
      this._vertexDecl = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
    }
    if (!this._vertexBuffer.Create(this.maxSpriteCount * 4 * 88) || !this._indexBuffer.Create(this.maxSpriteCount * 6, 4)) return false;
    this._vertexBytes = new Uint8Array(this.maxSpriteCount * 4 * 88); // alloc: retained geometry storage allocated only on preparation or capacity growth
    this._vertexView = new DataView(this._vertexBytes.buffer);
    this._indexData = new Uint32Array(this.maxSpriteCount * 6); // alloc: retained geometry storage allocated only on preparation or capacity growth
    let atlas = g_textureAtlasMan.FindAtlas(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    if (!atlas)
    {
      g_textureAtlasMan.AddAtlas(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, 2048, 2048);
      atlas = g_textureAtlasMan.FindAtlas(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    }
    this._defaultTexture = atlas.CreateTexture(2, 2, 1);
    if (this._defaultTexture)
    {
      const mapping = this._defaultTexture.LockBuffer();
      if (mapping)
      {
        mapping.data.set([255, 0, 255, 0, 0, 255, 0, 255]);
        mapping.data.set([0, 255, 0, 255, 255, 0, 255, 0], mapping.pitch);
        this._defaultTexture.UnlockBuffer();
      }
    }
    return true;
  }

  /** Resolves primary texture registers from the native UI effect reflection. */
  @meta.implemented
  @blue.method
  _SelectEffect()
  {
    const effect = this.is2dRender ? this.ubershader2d : this.ubershader3d;
    if (effect === this._effect) return effect !== null;
    this._effect = null;
    if (!effect) return false;
    const shader = effect.GetShaderStateInterface();
    if (!shader) return false;
    this._textureRegisters[0] = 0; this._textureRegisters[1] = 1;
    const resources = shader.GetEffectDescription().techniques[0].passes[0].stageInputs[ShaderType.PIXEL_SHADER].resources;
    for (const [index, resource] of resources)
    {
      if (resource.name === "PrimaryTexture0") this._textureRegisters[0] = index;
      else if (resource.name === "PrimaryTexture1") this._textureRegisters[1] = index;
    }
    this._effect = effect;
    return true;
  }

  /**
   * Carbon SetTexture (Tr2Sprite2dScene.cpp:706-779): flushes when the underlying AL identity
   * changes, including atlas relocation, and caches the window, repeat and tiling settings.
   *
   * Ported as the shipping build: Carbon substitutes m_defaultTexture for a null texture only
   * under `#if !CCP_DEPLOY` (cpp:714-719), so a null texture stays null here and an effect
   * that needs it fails TexturesReady. See the class JSDoc for the build choice.
   *
   * Carbon quirk (CE-166), Tr2Sprite2dScene.cpp:736: the comparison reads only GetTexture(), so a
   * render-target texture (GetTexture() null) flushes on every call. Reproduced.
   *
   * @param {number} index Texture slot, 0 or 1.
   * @param {Tr2AtlasTexture|null} texture The texture, or null.
   * @param {number} settings Tr2Sprite2dTextureSettings bits.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  SetTexture(index, texture, settings)
  {
    const al = texture ? texture.GetTexture() ?? texture.GetRenderTarget() : null;
    if (!this._texture[index] || al !== this._texture[index].GetTexture())
    {
      this._IssueDrawCall();
      if (index === 0)
      {
        this._texelSizeValues[0].set([al ? 1 / al.GetWidth() : 0, al ? 1 / al.GetHeight() : 0, 0, 0]);
        this._texelSizeVar[0].SetValue(this._texelSizeValues[0]);
      }
    }
    this._texture[index] = texture;
    const state = this._textureSettings[index];
    if (texture) texture.GetTextureWindow(state.textureWindow);
    else state.textureWindow.set([0, 0, 1, 1]);
    state.repeatMode = settings & Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_CLAMP ? 2 : settings & Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_MIRROR ? 1 : 0;
    state.tileX = !!(settings & Tr2Sprite2dTextureSettings.S2D_TS_TILE_X);
    state.tileY = !!(settings & Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y);
  }

  /** Reports an active native display-list capture. */
  @meta.implemented
  @blue.method
  IsCapturing()
  {
    return this._captureDisplayList !== null;
  }

  _captureDisplayList = null;
  _captureVertexDataCapacity = 1024;
  _captureVertexData = new Uint8Array(1024 * 88); // alloc: retained geometry storage allocated only on preparation or capacity growth
  _captureIndexData = new Uint32Array(1536); // alloc: retained geometry storage allocated only on preparation or capacity growth
  _captureVertexDataSize = 0;
  _captureIndexDataSize = 0;
  _captureStartIndex = 0;

  /**
   * Carbon StartCapture (Tr2Sprite2dScene.cpp:1941-1972): flushes direct geometry before
   * recording a container's display list.
   *
   * CCP_ASSERT( !m_captureDisplayList ) (cpp:1946) is compiled out of the shipping build, so
   * a capture started inside another one replaces it, as Carbon's does (which leaks it).
   *
   * @param {ITr2SpriteObject} owner The display list's owner.
   * @returns {boolean} Always true; the capture storage always exists here.
   */
  @meta.implemented
  @blue.method
  StartCapture(owner)
  {
    this._IssueDrawCall();
    this._captureDisplayList = new Tr2Sprite2dDisplayList(owner);
    this._captureVertexDataSize = this._captureIndexDataSize = this._captureStartIndex = 0;
    return true;
  }

  /** Native doubling growth; typed-array allocation/copy replaces aligned realloc. */
  @meta.adapted
  @blue.method
  _GrowCaptureVertexBuffer(vertexCount)
  {
    this._captureVertexDataCapacity = Math.max(this._captureVertexDataCapacity * 2, this._captureVertexDataSize + vertexCount);
    const data = new Uint8Array(this._captureVertexDataCapacity * 88); // alloc: retained geometry storage allocated only on preparation or capacity growth
    data.set(this._captureVertexData);
    this._captureVertexData = data;
  }

  /** Native doubling growth; typed-array allocation/copy replaces aligned realloc. */
  @meta.adapted
  @blue.method
  _GrowCaptureIndexBuffer(indexCount)
  {
    this.captureIndexDataCapacity = Math.max(this.captureIndexDataCapacity * 2, this._captureIndexDataSize + indexCount);
    const data = new Uint32Array(this.captureIndexDataCapacity); // alloc: retained geometry storage allocated only on preparation or capacity growth
    data.set(this._captureIndexData);
    this._captureIndexData = data;
  }

  /** Uploads capture storage, reusing previous native buffers when their size fits.
   * Explicit AL ownership transfer replaces C++ value assignment. */
  @meta.adapted
  @blue.method
  EndCapture(previousDisplayList)
  {
    if (!this._captureDisplayList) return null;
    this._IssueDrawCall();
    const list = this._captureDisplayList, context = Tr2RenderContext_GetMainThreadRenderContext();
    if (!this._captureVertexDataSize || !this._captureIndexDataSize)
    {
      this._ResetCapture();
      return null;
    }

    const sizes = [this._captureVertexDataSize * 88, this._captureIndexDataSize * 4];
    const capacities = [this._captureVertexDataCapacity, this.captureIndexDataCapacity];
    const counts = [this._captureVertexDataSize, this._captureIndexDataSize];
    const data = [this._captureVertexData, this._captureIndexData];
    const keys = ["vertexBuffer", "indexBuffer"];
    for (let i = 0; i < 2; i++)
    {
      const key = keys[i], previous = previousDisplayList ? previousDisplayList[key] : null;
      if (previous && previous.IsValid() && previous.GetSize() >= sizes[i] && previous.GetSize() / 2 <= sizes[i]
        && !Failed(previous.UpdateBuffer(0, sizes[i], data[i], context)))
      {
        list[key] = previous;
        previousDisplayList[key] = new Tr2BufferAL();
        continue;
      }

      const capacity = Math.min(capacities[i], counts[i] + Math.floor(counts[i] / 4));
      const description = Tr2BufferDescriptionAL.create__Stride(i ? 4 : 1, i ? capacity : capacity * 88,
        i ? Tr2GpuUsage.INDEX_BUFFER : Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE);
      if (Failed(list[key].Create(description, data[i], context)))
      {
        this._ResetCapture();
        return null;
      }
    }
    this._captureDisplayList = null;
    this._ResetCapture();
    return list;
  }

  /** Native capture cancellation/restoration; JS keeps direct and capture arrays separately. */
  @meta.adapted
  @blue.method
  _ResetCapture()
  {
    this._captureDisplayList?.Destruct();
    this._captureDisplayList = null;
    this._captureVertexDataSize = this._captureIndexDataSize = 0;
    this._vertexCount = this._indexCount = this._transformCurrent = 0;
  }

  /**
   * Carbon ReplayCapture (Tr2Sprite2dScene.cpp:2073-2132): replays captured geometry with its
   * saved effects, textures and transform arrays, running captured render jobs in sequence.
   *
   * Carbon quirk, Tr2Sprite2dScene.cpp:2117-2118, CE-134: replay binds
   * `texture->GetTexture()` only, without IssueDrawCall's render-target fallback
   * (cpp:1135-1141), so captured render-target textures replay as null. Reproduced.
   *
   * @param {Tr2Sprite2dDisplayList} list The display list to replay.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  ReplayCapture(list)
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext(), esm = context.GetEffectStateManager();

    this._IssueDrawCall();

    if (!list.vertexBuffer.IsValid() || !list.indexBuffer.IsValid() || !list.entries.length) return;

    esm.ApplyIndexBuffer(list.indexBuffer);
    esm.ApplyStreamSource(0, list.vertexBuffer, 0, 88);

    for (const entry of list.entries)
    {
      if (++this._itemsRendered >= this.maxItemsToRender) continue;

      if (entry.job)
      {
        this.RunJobHelper(entry.job);

        esm.ApplyIndexBuffer(list.indexBuffer);
        esm.ApplyStreamSource(0, list.vertexBuffer, 0, 88);
        continue;
      }

      this._texelSizeValues[0].set(entry.texelSize0);
      this._texelSizeValues[1].set(entry.texelSize1);
      this._texelSizeVar[0].SetValue(this._texelSizeValues[0]);
      this._texelSizeVar[1].SetValue(this._texelSizeValues[1]);

      const pass = entry.effect.GetPassDescription(0, 0);
      const colorSpace = this._useLinearColorSpace ? Tr2ColorSpace.COLOR_SPACE_SRGB : Tr2ColorSpace.COLOR_SPACE_LINEAR;
      for (let i = 0; i < 2; i++)
      {
        const texture = i ? entry.texture1 : entry.texture0;
        pass.resourceSetDirty = pass.resourceSetDesc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, this._textureRegisters[i], texture ? texture.GetTexture() : null, colorSpace) || pass.resourceSetDirty;
      }

      entry.effect.Render(entry, context);
    }

    this._texture.fill(null);
    esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
  }

  /**
   * Carbon RunJob (Tr2Sprite2dScene.cpp:1755-1792): flushes geometry, then records the job in
   * an open capture or runs it now and drops the cached textures the job may have replaced.
   *
   * @param {TriRenderJob} job The render job.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  RunJob(job)
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();

    this._IssueDrawCall();

    if (this.IsCapturing())
    {
      const entry = new Tr2Sprite2dDisplayListEntry();
      entry.job = job;
      this._captureDisplayList.entries.push(entry);
      return;
    }

    this.RunJobHelper(job);

    // The render job may have set different textures - clear our state for texture settings
    this._texture.fill(null);
    context.GetEffectStateManager().ApplyIndexBuffer(this._indexBuffer.GetBuffer());
  }

  /**
   * Carbon RunJobHelper (public, Tr2Sprite2dScene.h:75, cpp:2139-2175): hands the state over
   * to an embedded job and restores the UI state after it, with sRGB writes off during the
   * job in linear colour space.
   *
   * @param {TriRenderJob} job The render job.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  RunJobHelper(job)
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext(), esm = context.GetEffectStateManager();

    esm.EndManagedRendering();

    if (this._useLinearColorSpace) context.SetRenderState(RenderState.RS_SRGBWRITEENABLE, 0);

    // When rendering of this scene started, a NULL value was pushed for depth/stencil buffer.
    // Pop it here, to get whatever was in use before back. The null value is pushed again
    // after the job has finished.
    esm.PopDepthStencilBuffer();

    esm.PushRenderTarget__TextureAL(new Tr2TextureAL(), 1);

    esm.PushViewport();
    job.Run(this._realTime, this._simTime);
    esm.PopViewport();

    esm.PopRenderTarget(1);

    esm.PushDepthStencilBuffer__TextureAL(new Tr2TextureAL());

    esm.BeginManagedRendering();
    esm.ApplyStandardStates(RenderingMode.RM_SPRITE2D);

    if (this._useLinearColorSpace) context.SetRenderState(RenderState.RS_SRGBWRITEENABLE, 1);

    esm.ApplyVertexDeclaration(this._vertexDecl);
  }

  /**
   * Carbon StartLayer (Tr2Sprite2dScene.cpp:1593-1630): flushes, switches to 2D, renders into
   * the layer's texture, and sets the transform and clip stacks aside for fresh ones clipped
   * to the texture. Layers nest.
   *
   * @param {Tr2TextureAL} rt The layer's render-target texture.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  StartLayer(rt)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    // Finish outstanding rendering before changing render target
    this._IssueDrawCall();

    // A scene rendered in 3d renders in 2d within a layer
    this._is2dRenderContext = true;

    // Set the render target to the top level surface of the given texture
    renderContext.GetEffectStateManager().PushRenderTarget__TextureAL(rt);

    const width = rt.GetWidth(), height = rt.GetHeight();
    this._viewportSizeValue.set([width, height, 0, 1]);
    this._viewportSizeVar.SetValue(this._viewportSizeValue);

    // Coordinate transformation and clipping is reset - push the current stacks onto a stack
    // for later retrieval when we end the layer. Carbon leaves the entry's depthStack unset.
    const renderTargetWrapper = new Tr2AtlasTexture(); // alloc: Carbon CreateInstance()s one wrapper per layer
    renderTargetWrapper.SetRenderTarget(rt);
    this._stackOfStacks.push({ transformStack: this._transformStack, depthStack: null, clipStack: this._clipStack, renderTargetTexture: rt, renderTargetWrapper });

    this._transformStack = []; // alloc: Carbon CCP_NEWs a fresh stack per layer
    this._clipStack = []; // alloc: Carbon CCP_NEWs a fresh stack per layer

    // alloc: the layer's root clip entry, owned until EndLayer (Tr2Sprite2dScene.cpp:1629)
    const clip = Tr2Sprite2dClipRect.create__AllFields(0, 0, width, height);
    this._clipStack.push(clip);
  }

  /**
   * Carbon EndLayer (Tr2Sprite2dScene.cpp:1632-1684): restores the outer stacks and render
   * target, then draws the layer texture into the outer target as one sprite with the current
   * colour, effect and blend mode.
   *
   * Carbon quirk, Tr2Sprite2dScene.cpp:1669-1673: PrepareSpriteVerts' false return is
   * ignored, so a layer whose textures are not ready still renders its vertices. They are a
   * fresh stack array whose Vector3, Color and Vector2 members zero-construct, so that draw is
   * an all-zero, degenerate (invisible) quad. Reproduced: the retained _layerVertices are reset
   * to that state on every call, so a failed EndLayer never re-draws the previous layer's quad.
   *
   * Adapted: the D3D vertex's scalar members (clipRect, glowBrightness, transformIndex,
   * blendMode, spriteEffect, tileMode, outlineThreshold) are left uninitialised on Carbon's
   * stack (ITr2Sprite2dRenderer.h:62-95); JS cannot reproduce indeterminate memory, so they
   * reset to 0.
   *
   * @param {number} x Layer left, in the outer coordinates.
   * @param {number} y Layer top.
   * @param {number} width Layer width.
   * @param {number} height Layer height.
   * @param {ITr2Sprite2dTexture|null} secondaryTexture Optional secondary texture.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  EndLayer(x, y, width, height, secondaryTexture)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    // CCP_ASSERTs on the emptied stacks (cpp:1639, 1643) are compiled out of the shipping build.
    this._clipStack.pop();

    // Finish outstanding rendering before resetting render target
    this._IssueDrawCall();

    renderContext.GetEffectStateManager().PopRenderTarget();

    // Set the coordinate transformations and clipping to what it was before we started this layer.
    const entry = this._stackOfStacks.at(-1);
    this._transformStack = entry.transformStack;
    this._clipStack = entry.clipStack;

    // Render the layer into the current one as a sprite
    this.SetTexture(0, entry.renderTargetWrapper, Tr2Sprite2dTextureSettings.S2D_TS_NONE);
    this.SetTextureTransform(0, null);
    this.SetTileMode(0);

    if (secondaryTexture) secondaryTexture.Apply(this, 1);

    // Tr2Sprite2dD3DVertex vertices[4] (cpp:1669): a fresh, zero-constructed array every call.
    const vertices = this._layerVertices;
    for (const vertex of vertices)
    {
      vec3.set(vertex.position, 0, 0, 0);
      vec4.set(vertex.color, 0, 0, 0, 0);
      vec2.set(vertex.texCoord[0], 0, 0);
      vec2.set(vertex.texCoord[1], 0, 0);
      vertex.clipRect.left = vertex.clipRect.top = vertex.clipRect.right = vertex.clipRect.bottom = 0;
      vertex.glowBrightness = 0;
      vertex.transformIndex = 0;
      vertex.blendMode = 0;
      vertex.spriteEffect = 0;
      vertex.tileMode = 0;
      vec4.set(vertex.outlineColor, 0, 0, 0, 0);
      vertex.outlineThreshold = 0;
    }

    this.PrepareSpriteVerts(vertices, [x, y], width, height, this._spriteEffect);
    this.RenderTriangleVerts(vertices, 4, s_layerIndices, 6);

    this._stackOfStacks.pop();

    // Once we exit the final layer the 2d render context is determined by the scene
    if (!this._stackOfStacks.length) this._is2dRenderContext = this.is2dRender;

    this._DetermineViewportSize();
  }

  /** Carbon GetMaxVertexCountPerDrawCall (Tr2Sprite2dScene.cpp:2183-2186). @returns {number} Vertex capacity of one draw. */
  @meta.implemented
  @blue.method
  GetMaxVertexCountPerDrawCall()
  {
    return this.maxSpriteCount * 4;
  }

  /** Carbon GetMaxIndexCountPerDrawCall (Tr2Sprite2dScene.cpp:2188-2191). @returns {number} Index capacity of one draw. */
  @meta.implemented
  @blue.method
  GetMaxIndexCountPerDrawCall()
  {
    return this.maxSpriteCount * 6;
  }

  /**
   * Carbon RenderTriangleVerts (Tr2Sprite2dScene.cpp:1000-1019) with EnsureBufferSpace
   * (cpp:2511-2590), ProcessVertices (cpp:1825-1913) and CopyIndicesWithOffset
   * (cpp:2498-2509) inlined: copies vertices into the interleaved 88-byte AL layout with the
   * parent translation, accumulated alpha, 3D depth, transform index and clip, and offsets
   * the indices, without mutating the source vertices.
   *
   * Adapted: Carbon's helpers advance raw write pointers into the mirrors; here the write
   * position is the vertex and index count, so the pointer-keeping helpers fold into this
   * method and EnsureBufferSpace is not a separate public method.
   *
   * @param {Tr2Sprite2dD3DVertex[]} vertices Renderer vertices, from index 0.
   * @param {number} vertexCount Number of vertices.
   * @param {number[]} indices Triangle indices relative to the first vertex.
   * @param {number} indexCount Number of indices.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  RenderTriangleVerts(vertices, vertexCount, indices, indexCount)
  {
    // Buffers are full, kick off what we've got
    if (this._transformCurrent >= 31) this._IssueDrawCall();

    let vertexOffset = this._vertexCount, indexOffset = this._indexCount;
    let view = this._vertexView, indexData = this._indexData;
    if (this.IsCapturing())
    {
      if (this._captureVertexDataSize + vertexCount >= this._captureVertexDataCapacity) this._GrowCaptureVertexBuffer(vertexCount);
      if (this._captureIndexDataSize + indexCount >= this.captureIndexDataCapacity) this._GrowCaptureIndexBuffer(indexCount);
      vertexOffset = this._captureVertexDataSize;
      indexOffset = this._captureIndexDataSize;
      this._captureVertexDataSize += vertexCount;
      this._captureIndexDataSize += indexCount;
      view = new DataView(this._captureVertexData.buffer);
      indexData = this._captureIndexData;
    }
    else
    {
      if (++this._itemsRendered >= this.maxItemsToRender) return;
      if (this._vertexCount + vertexCount >= this.maxSpriteCount * 4 || this._indexCount + indexCount >= this.maxSpriteCount * 6) this._IssueDrawCall();
      if (vertexCount > this.maxSpriteCount * 4 || indexCount > this.maxSpriteCount * 6 || !this._vertexBytes) return;

      // Carbon quirk, Tr2Sprite2dScene.cpp:1103, 1158, 1911, 2569, CE-125: after a skipped
      // draw Carbon's m_currentVertexData keeps advancing while vertexOffset restarts at 0.
      // This port writes at the count, which silently fixes it; kept until the
      // operator rules on CE-125.
      vertexOffset = this._vertexCount;
      indexOffset = this._indexCount;
    }

    const top = this._transformStack.at(-1), clip = this._clipStack.at(-1);
    const translation = top?.isTranslationOnly ? top.translation : [0, 0];
    let transformIndex = 0;
    if (top && !top.isTranslationOnly)
    {
      transformIndex = ++this._transformCurrent;
      mat4.copy(this._transformArray[transformIndex], top.transform);
    }

    for (let i = 0; i < vertexCount; i++)
    {
      const vertex = vertices[i];
      let offset = (vertexOffset + i) * 88;
      const put = value => { view.setFloat32(offset, value, true); offset += 4; };
      put(vertex.position[0] + translation[0]); put(vertex.position[1] + translation[1]); put(this._is2dRenderContext ? vertex.position[2] : this._depth);
      put(vertex.color[0]); put(vertex.color[1]); put(vertex.color[2]); put(vertex.color[3] * this._accumulatedAlpha);
      for (const uv of vertex.texCoord) { put(uv[0]); put(uv[1]); }
      put(clip.left); put(clip.top); put(clip.right); put(clip.bottom); put(vertex.glowBrightness);
      view.setUint8(offset++, transformIndex || vertex.transformIndex);
      view.setUint8(offset++, vertex.blendMode); view.setUint8(offset++, vertex.spriteEffect); view.setUint8(offset++, vertex.tileMode);
      for (const value of vertex.outlineColor) put(value);
      put(vertex.outlineThreshold);
    }

    for (let i = 0; i < indexCount; i++) indexData[indexOffset + i] = indices[i] + vertexOffset;
    this._vertexCount += vertexCount; this._indexCount += indexCount;
  }

  /**
   * Carbon's Tr2BufferAL overload of RenderTriangleVerts (Tr2Sprite2dScene.h:120-124,
   * cpp:1021-1045), split by its C++ parameter type: draws caller-owned GPU buffers whose
   * vertices already carry their final translation and clip.
   *
   * CCP_ASSERT( !m_captureDisplayList ) (cpp:1023) is compiled out of the shipping build, so
   * inside a capture this flushes into the capture and still draws directly, as Carbon does.
   *
   * Adapted: two silent fixes of Carbon behaviour are kept pending the operator's ruling (the
   * reason for the marker): see CE-123 and CE-124 at their sites.
   *
   * @param {Tr2BufferAL} vertices Vertex buffer in the 88-byte Tr2Sprite2dD3DVertex layout.
   * @param {number} vertexCount Number of vertices.
   * @param {Tr2BufferAL} indices Index buffer.
   * @param {number} indexCount Number of indices.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  RenderTriangleVerts__Tr2BufferAL(vertices, vertexCount, indices, indexCount)
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext(), esm = context.GetEffectStateManager();

    this._SelectEffect();
    this._IssueDrawCall();

    // Carbon quirk, Tr2Sprite2dScene.cpp:1021-1045, CE-124: Carbon binds no
    // textures here, so the draw samples whatever slot-0 SRV was bound last. This port binds
    // the current textures; a silent fix kept until the operator rules on CE-124.
    if (this._effect)
    {
      const pass = this._effect.GetPassDescription(0, 0);
      const colorSpace = this._useLinearColorSpace ? Tr2ColorSpace.COLOR_SPACE_SRGB : Tr2ColorSpace.COLOR_SPACE_LINEAR;
      for (let i = 0; i < 2; i++)
      {
        const texture = this._texture[i];
        const al = texture ? texture.GetTexture() ?? texture.GetRenderTarget() : null;
        pass.resourceSetDirty = pass.resourceSetDesc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, this._textureRegisters[i], al, colorSpace) || pass.resourceSetDirty;
      }
    }

    esm.ApplyIndexBuffer(indices);
    esm.ApplyStreamSource(0, vertices, 0, 88);

    this._indexCount = indexCount;
    this._vertexCount = vertexCount;

    // Carbon quirk, Tr2Sprite2dScene.cpp:1034-1042, 1192, CE-123: Carbon draws
    // from the stale ring m_drawCallStartIndex and leaves m_indexCount set afterwards. This
    // port draws from index 0 and zeroes the index count too; a silent fix kept until the
    // operator rules on CE-123.
    this._drawCallStartIndex = 0;

    if (this._effect) this._effect.Render(this, context);

    this._vertexCount = 0;
    this._indexCount = 0;

    esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
  }

  /**
   * Carbon IssueDrawCall (Tr2Sprite2dScene.cpp:1047-1164): records the pending batch into an
   * open capture, or uploads it through the ring buffers and renders it with the UI effect.
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _IssueDrawCall()
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();

    if (!this._indexCount) return;

    const effectOK = this._SelectEffect();

    if (this.IsCapturing())
    {
      if (effectOK)
      {
        context.GetRenderContextAL().AddGpuMarker("Tr2Sprite2dScene::IssueDrawCall Captured");

        const entry = new Tr2Sprite2dDisplayListEntry();
        for (let i = 0; i < 32; i++) mat4.copy(entry.transformArray[i], this._transformArray[i]);
        entry.numVertices = this._captureVertexDataSize;
        entry.primitiveCount = this._indexCount / 3;
        entry.startIndex = this._captureStartIndex;
        entry.texture0 = this._texture[0];
        entry.texture1 = this._texture[1];
        entry.effect = this._effect;
        entry.texelSize0.set(this._texelSizeValues[0]);
        entry.texelSize1.set(this._texelSizeValues[1]);
        entry.uiTransformsCb = this._uiTransformsCb;
        this._captureDisplayList.entries.push(entry);
      }

      this._vertexCount = this._indexCount = this._transformCurrent = 0;
      this._captureStartIndex = this._captureIndexDataSize;
      return;
    }

    ++this._drawCallsRendered;

    if (effectOK && this._drawCallsRendered < this.maxDrawCallsToRender)
    {
      context.GetRenderContextAL().AddGpuMarker("Tr2Sprite2dScene::IssueDrawCall Direct");

      const vertex = this._vertexBuffer.PutData(this._vertexBytes, this._vertexCount * 88, 4, context);
      if (Failed(vertex.result))
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", "Failed to update stream vertex buffer for UI");
      }
      else
      {
        const index = this._indexBuffer.PutData(this._indexData, this._indexCount * 4, 4, context);
        if (Failed(index.result))
        {
          CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", "Failed to update stream index buffer for UI");
        }
        else
        {
          const pass = this._effect.GetPassDescription(0, 0);
          const colorSpace = this._useLinearColorSpace ? Tr2ColorSpace.COLOR_SPACE_SRGB : Tr2ColorSpace.COLOR_SPACE_LINEAR;
          for (let i = 0; i < 2; i++)
          {
            const texture = this._texture[i];
            const al = texture ? texture.GetTexture() ?? texture.GetRenderTarget() : null;
            pass.resourceSetDirty = pass.resourceSetDesc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, this._textureRegisters[i], al, colorSpace) || pass.resourceSetDirty;
          }

          this._drawCallStartIndex = index.offset / 4;
          const esm = context.GetEffectStateManager();
          esm.ApplyStreamSource(0, this._vertexBuffer.GetBuffer(), vertex.offset, 88);
          esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
          this._effect.Render(this, context);
          this._indexBuffer.DoneUsingData(context);
        }

        this._vertexBuffer.DoneUsingData(context);
      }
    }

    // Carbon quirk, Tr2Sprite2dScene.cpp:1103, 1158, CE-125: Carbon calls ResetBufferPointers
    // only inside the draw branch, so a skipped draw (effect not ready, or maxDrawCallsToRender)
    // leaves the write pointers advanced. Write positions here are the counts, so they restart
    // with them: a silent fix kept until the operator rules on CE-125.
    this._vertexCount = this._indexCount = this._transformCurrent = 0;
  }

  /**
   * Carbon SubmitGeometry (Tr2Sprite2dScene.cpp:1166-1197): binds the transposed GUI transform
   * array and draws the current indexed batch.
   *
   * Adapted: a typed-array palette replaces the native stack matrix array.
   *
   * @param {Tr2RenderContext} context The rendering context.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  SubmitGeometry(context)
  {
    for (let i = 0; i < 32; i++) mat4.transpose(this._transposedTransforms.subarray(i * 16, (i + 1) * 16), this._transformArray[i]);
    Tr2RenderUtils.fillAndSetConstants(this._uiTransformsCb, this._transposedTransforms, this._transposedTransforms.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_OBJECT_VS_GUI, context);
    context.SetTopology(Topology.TOP_TRIANGLES);
    context.DrawIndexedPrimitive(this._indexCount, this._drawCallStartIndex, this._indexCount / 3);
  }
}
