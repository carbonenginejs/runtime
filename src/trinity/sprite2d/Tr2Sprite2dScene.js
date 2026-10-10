import { Tr2Sprite2dDisplayList, Tr2Sprite2dDisplayListEntry } from "./Tr2Sprite2dDisplayList.js";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2RingVertexBuffer } from "../core/device/Tr2RingVertexBuffer.js";
import { Tr2RingIndexBuffer } from "../core/device/Tr2RingIndexBuffer.js";
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2RenderUtils } from "../core/Tr2RenderUtils.js";
import { PER_OBJECT_VS_GUI } from "../core/Tr2Renderer.js";
import { g_textureAtlasMan } from "../core/Tr2TextureAtlasMan.js";
import { Tr2BufferAL, Tr2BufferDescriptionAL, Tr2TextureAL, Failed } from "#trinityal";
import { PixelFormat, ShaderType, Topology, Tr2ColorSpace, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { RenderingMode, TriStorageFlags } from "#consts/graphics";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dScene_Blue.cpp
import { meta } from "#schema";
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
import "./Tr2SpriteObjectBase.js";

/**
 * Owns sprite declarations and CPU curve updates using raw Blue frame clocks.
 * Direct rendering and captured display lists use the effect/AL pipeline.
 * Native automatic device-resource registration remains unported; resource
 * teardown is explicit.
 * Native useLinearColorSpace/gammaCorrectText properties and effect-option
 * methods remain absent; this class does not claim renderer parity.
 * Complete canonical members retain native order and indexed aliases. Legacy
 * getField/getDefaults expose no Scene fields; use Blue declaration consumers.
 */
@meta.define({
  className: "Tr2Sprite2dScene", family: "sprite2d",
  // Explicit ordered declarations keep native stored aliases in member order.
  members: [
    {"name":"name","type":{"kind":"wstring"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"display","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"drawWireFrame","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"ignoreClip","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"lastPickPos","type":{"kind":"vec2"},"edit":{"read":true}},
    {"name":"isFullscreen","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"is2dRender","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"is2dPick","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"translation","type":{"kind":"vec3"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"displayX","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true},"key":"translation","index":0,"impl":{"status":"adapted","adapted":true,"reason":"Native stored translation component exposed through an indexed canonical member."}},
    {"name":"displayY","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true},"key":"translation","index":1,"impl":{"status":"adapted","adapted":true,"reason":"Native stored translation component exposed through an indexed canonical member."}},
    {"name":"rotation","type":{"kind":"quat"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"scaling","type":{"kind":"vec3"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"displayWidth","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"displayHeight","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"depthMin","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"depthMax","type":{"kind":"float32"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"pickState","type":{"kind":"int32"},"edit":{"read":true,"write":true,"persist":true},"enum":{"enumType":"trinity.Tr2SpriteObjectPickState"}},
    {"name":"clearBackground","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"backgroundColor","type":{"kind":"color"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"children","type":{"kind":"list","className":"ITr2SpriteObject","itemType":"ITr2SpriteObject"},"edit":{"read":true,"persist":true}},
    {"name":"background","type":{"kind":"list","className":"ITr2SpriteObject","itemType":"ITr2SpriteObject"},"edit":{"read":true,"persist":true}},
    {"name":"clearFinishedCurveSets","type":{"kind":"boolean"},"edit":{"read":true,"write":true,"persist":true}},
    {"name":"curveSets","type":{"kind":"list","className":"TriCurveSet","itemType":"TriCurveSet"},"edit":{"read":true,"persist":true}},
    {"name":"ubershader2d","type":{"kind":"rootRef","className":"Tr2Effect"},"edit":{"read":true}},
    {"name":"ubershader3d","type":{"kind":"rootRef","className":"Tr2Effect"},"edit":{"read":true}},
    {"name":"defaultTextureUpdates","type":{"kind":"boolean"},"edit":{"read":true,"write":true}},
    {"name":"maxItemsToRender","type":{"kind":"uint32"},"edit":{"read":true,"write":true}},
    {"name":"maxDrawCallsToRender","type":{"kind":"uint32"},"edit":{"read":true,"write":true}},
    {"name":"maxSpriteCount","type":{"kind":"uint32"},"edit":{"read":true,"write":true,"notify":true}},
    {"name":"captureIndexDataCapacity","type":{"kind":"uint32"},"edit":{"read":true}}
  ]
})
@meta.blue.inherit(INotify)
@meta.blue.interface(ITr2Scene, ITr2Updateable, INotify)
export class Tr2Sprite2dScene extends ITr2Scene
{
  /** Native wide-string scene label. @type {string} */
  name = "";

  /** Whether update and rendering work is enabled; clocks are retained while hidden. @type {boolean} */
  display = true;

  /** Requests wireframe rendering from the unported sprite renderer. @type {boolean} */
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

  /** Native 2D uber-effect slot; automatic effect construction/acquisition remains unported. @type {Tr2Effect|null} */
  ubershader2d = null;

  /** Native 3D uber-effect slot; automatic effect construction/acquisition remains unported. @type {Tr2Effect|null} */
  ubershader3d = null;

  /** Native diagnostic flag that flashes the default texture during rendering. @type {boolean} */
  defaultTextureUpdates = false;

  /** Maximum sprite/items submitted by the native renderer; UINT32_MAX means unlimited. @type {number} */
  maxItemsToRender = 4294967295;

  /** Maximum native draw calls submitted; UINT32_MAX means unlimited. @type {number} */
  maxDrawCallsToRender = 4294967295;

  /** Maximum sprites per native draw; notified changes require unsupported resource invalidation. @type {number} */
  maxSpriteCount = 1024;

  /** Allocated capture-index capacity; zero because this port allocates no capture buffers. @type {number} */
  captureIndexDataCapacity = 1536;

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
  PopTranslation()
  {
    this._transformStack.pop();
  }

  /** Returns the current native translation slot, or zero outside traversal. */
  @meta.adapted
  GetTranslation()
  {
    return this._transformStack.at(-1)?.translation ?? [0, 0];
  }

  /** Composes local then parent using reversed gl-matrix multiplication order. */
  @meta.adapted
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
  PopTransform()
  {
    this._transformStack.pop();
  }

  /** Temporarily ignores inherited transforms for absolute-coordinate containers. */
  @meta.implemented
  PushTransformAbsolute()
  {
    this._transformStack.push({ isTranslationOnly: true, isTranslationOnlySet: true, translation: [0, 0], transform: null });
  }

  /** Restores the parent after an absolute-coordinate scope. */
  @meta.implemented
  PopTransformAbsolute()
  {
    this._transformStack.pop();
  }

  /** Returns a point in local coordinates; matrices use the native non-perspective transform. */
  @meta.adapted
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
      this.TransformPoint(result, point, inverse);
      return result;
    }
    finally { mat4.unalloc(inverse); }
  }

  /** Native Vector4(x,y,0,1) transform, deliberately without perspective division. */
  @meta.implemented
  TransformPoint(result, point, matrix)
  {
    const x = point[0], y = point[1];
    result[0] = matrix[0] * x + matrix[4] * y + matrix[12];
    result[1] = matrix[1] * x + matrix[5] * y + matrix[13];
  }

  /** Pushes the transformed axis-aligned bounds intersected with the parent clip. */
  @meta.implemented
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
  PopClipRectangle()
  {
    if (this.ignoreClip || !this.is2dRender) return;

    this._clipStack.pop();
  }

  /** Returns the active absolute clipping bounds. */
  @meta.implemented
  GetClipRectangle()
  {
    return this._clipStack.at(-1);
  }

  /** Tests inclusive absolute clip bounds before local-coordinate hit testing. */
  @meta.implemented
  IsInsideClipRect(point)
  {
    const clip = this._clipStack.at(-1);
    return !clip || !(point[0] < clip.left || point[0] > clip.right || point[1] < clip.top || point[1] > clip.bottom);
  }

  /** Native rectangular, circular or radius=-1 elliptical hit test. */
  @meta.implemented
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
      // Preserve Carbon's major-axis-on-X convention even for tall rectangles.
      const a = Math.max(width, height) * 0.5, b = Math.min(width, height) * 0.5;
      return !(dx * dx / (a * a) + dy * dy / (b * b) > 1);
    }

    return true;
  }

  /** Tests Carbon's finite line band and midpoint-radius endpoint bound in screen space. */
  @meta.implemented
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
      this.TransformPoint(a, a, parent.transform);
      this.TransformPoint(b, b, parent.transform);
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
  IsInsideTriangle(point, v0, v1, v2)
  {
    if (!this.IsInsideClipRect(point)) return false;

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
        else this.TransformPoint(vertex, vertex, parent.transform);
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
  SetColor(value)
  {
    vec4.copy(this._color, value);
  }

  /** Copies the outline tint. */
  @meta.implemented
  SetOutlineColor(value)
  {
    vec4.copy(this._outlineColor, value);
  }

  /** Sets the outline alpha threshold. */
  @meta.implemented
  SetOutlineThreshold(value)
  {
    this._outlineThreshold = value;
  }

  /** Sets the sprite blend code. */
  @meta.implemented
  SetBlendmode(value)
  {
    this._blendMode = value;
  }

  /** Selects color, glow, or both render outputs. */
  @meta.implemented
  SetSpriteTarget(value)
  {
    this._spriteTarget = value;
  }

  /** Sets glow output intensity. */
  @meta.implemented
  SetGlowBrightness(value)
  {
    this._glowBrightness = value;
  }

  /** Retains only the native horizontal and vertical tiling bits. */
  @meta.implemented
  SetTileMode(value)
  {
    this._tileMode = value & (Tr2Sprite2dTextureSettings.S2D_TS_TILE_X | Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y);
  }

  /** Selects the vertex effect and its required texture count. */
  @meta.implemented
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
  SetTextureWindow(index, x, y, width, height)
  {
    if (this._texture[index]) this._texture[index].CalcSubTextureWindow(this._textureSettings[index].textureWindow, x, y, width, height);
  }

  /** Copies the texture transform, or disables it for a null matrix. */
  @meta.implemented
  SetTextureTransform(index, matrix)
  {
    const setting = this._textureSettings[index];
    setting.useTransform = matrix !== null;
    if (matrix !== null) mat4.copy(setting.transform, matrix);
  }

  /** Checks every texture required by the active effect. */
  @meta.implemented
  _TexturesReady()
  {
    for (let i = 0; i < this._numTexturesUsed; i++)
    {
      if (!this._texture[i] || !this._texture[i].IsGood()) return false;
    }

    return true;
  }

  /** Applies tiling, affine UV transforms, and atlas windows in native order. */
  @meta.implemented
  _SetSpriteVerticesUVs(uv, width, height)
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
  PrepareSpriteVerts(vertices, position, width, height, effect)
  {
    if (!this._TexturesReady()) return false;

    const uv = Array.from({ length: 2 }, () => Array.from({ length: 4 }, () => [0, 0]));
    this._SetSpriteVerticesUVs(uv, width, height);
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

  /** Stores inherited opacity for the next gathered elements. */
  @meta.implemented
  SetAccumulatedAlpha(value)
  {
    this._accumulatedAlpha = value;
  }

  /** Returns inherited opacity. */
  @meta.implemented
  GetAccumulatedAlpha()
  {
    return this._accumulatedAlpha;
  }

  /** Seeds the native root depth and unclipped bounds before gathering. */
  @meta.implemented
  _PrepareStacksBeforeRender()
  {
    const maximum = 3.4028234663852886e38;
    const clip = new Tr2Sprite2dClipRect();
    Object.assign(clip, { left: -maximum, top: -maximum, right: maximum, bottom: maximum });
    this._depthStack.push([this.depthMin, this.depthMax]);
    this._clipStack.push(clip);
  }

  /** Removes the root stack entries after balanced traversal. */
  @meta.implemented
  _CleanUpStacksAfterRender()
  {
    this._depthStack.pop();
    this._clipStack.pop();
  }

  /** Maps a child [-1,1] depth interval into its parent's interval in 3D mode. */
  @meta.implemented
  PushDepthRange(min, max)
  {
    if (this._is2dRenderContext) return;

    const parent = this._depthStack.at(-1), range = parent[1] - parent[0];
    this._depthStack.push([parent[0] + range * 0.5 * (min + 1), parent[0] + range * 0.5 * (max + 1)]);
  }

  /** Restores the parent 3D depth interval. */
  @meta.implemented
  PopDepthRange()
  {
    if (!this._is2dRenderContext) this._depthStack.pop();
  }

  /** Maps a relative depth into the active 3D interval. */
  @meta.implemented
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
   * Adapted: Reads relocated view state from the supplied or main-thread context and writes
   * through the existing variable-store handle; curve-set clocks remain raw ticks.
   *
   * @param {number} realTime Raw Blue real-time ticks (100ns).
   * @param {number} simTime Raw Blue simulation ticks (100ns).
   * @param {Tr2RenderContext|null} [renderContext=null] Relocated camera state.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  Update(realTime, simTime, renderContext = null)
  {
    this._realTime = realTime;
    this._simTime = simTime;
    if (!this.display) return;
    const view = (renderContext ?? Tr2RenderContext_GetMainThreadRenderContext()).GetViewTransform();
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
    if (this.clearFinishedCurveSets) this.RemoveFinishedCurveSets();
  }

  /** Removes stopped sets in place using native Blue list removal semantics. @returns {void} */
  @meta.blue.method
  @meta.implemented
  RemoveFinishedCurveSets()
  {
    for (let index = 0; index < this.curveSets.length;)
    {
      if (!this.curveSets[index].IsPlaying()) this.curveSets.Remove(index);
      else index++;
    }
  }

  /** Native sprite limit clamp followed by scene resource invalidation. */
  @meta.blue.method
  @meta.implemented
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
  ReleaseResources(storage)
  {
    this._uiTransformsCb?.Destroy();
    this._uiTransformsCb = null;
    this._effect = null;
    this._defaultTexture = null;
    if (storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY) this._vertexDecl = -1;
  }

  /** Explicit native destructor equivalent: JavaScript does not destroy owned AL values on scope exit. */
  @meta.ours
  Destroy()
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

  /** Draws uncached sprite traversal through Carbon's effect/AL pipeline. */
  @meta.blue.method
  @meta.adapted
  Render(renderContext)
  {
    if (!this.display || !renderContext.IsValid()) return;
    if (!this._PrepareResourcesForRender(renderContext)) return;
    this._renderContext = renderContext;
    const esm = renderContext.GetEffectStateManager();
    if (this.isFullscreen)
    {
      const viewport = renderContext.GetViewport();
      this.displayWidth = viewport.width; this.displayHeight = viewport.height;
    }
    this._viewportSizeValue.set([this.displayWidth, this.displayHeight, this.is2dRender ? 1 : 0, 1]);
    this._viewportSizeVar.SetValue(this._viewportSizeValue);
    this._is2dRenderContext = this.is2dRender;
    if (this.is2dRender) renderContext.SetWorldTransform(renderContext.GetInverseViewTransform());
    else
    {
      mat4.fromRotationTranslationScale(this._worldTransform, this.rotation, this.translation, this.scaling);
      renderContext.SetWorldTransform(this._worldTransform);
    }
    esm.PushDepthStencilBuffer(new Tr2TextureAL());
    esm.BeginManagedRendering();
    this._PrepareStacksBeforeRender();
    try
    {
      esm.ApplyStandardStates(RenderingMode.RM_SPRITE2D);
      if (this.clearBackground) renderContext.Clear({ color: Array.from(this.backgroundColor), depth: 0, stencil: 0, clearColor: true, clearDepth: false, clearStencil: false });
      esm.SetWireframeRendering(this.drawWireFrame);
      esm.ApplyVertexDeclaration(this._vertexDecl);
      esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
      this._vertexCount = this._indexCount = this._transformCurrent = 0;
      this._itemsRendered = this._drawCallsRendered = 0;
      for (let i = this.background.length - 1; i >= 0; i--) this.background[i].GatherSprites(this);
      for (let i = this.children.length - 1; i >= 0; i--) this.children[i].GatherSprites(this);
      this._IssueDrawCall();
    }
    finally
    {
      if (this.IsCapturing()) this._ResetCapture();
      esm.EndManagedRendering();
      esm.SetWireframeRendering(false);
      this._texture.fill(null);
      this._CleanUpStacksAfterRender();
      esm.PopDepthStencilBuffer();
    }
  }

  /** Native scene debug rendering is empty. @param {Tr2RenderContext} _renderContext Active context. @returns {void} */
  @meta.blue.method
  @meta.noop
  RenderDebugInfo(_renderContext)
  {
  }

  /**
   * Picks children in native order, projecting through the scene plane in 3D mode.
   * Adapted: Uses the portable ScreenToProjection helper; debug-renderer annotations are omitted.
   */
  @meta.blue.method
  @meta.adapted
  PickObject(x, y, projection = null, view = null, viewport = null)
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
  _uiTransformsCb = null;
  _effect = null;
  _textureRegisters = [0, 1];
  _defaultTexture = null;
  _renderContext = null;
  _drawCallStartIndex = 0;
  _drawCallsRendered = 0;
  _itemsRendered = 0;
  _worldTransform = mat4.create();
  _viewportSizeValue = vec4.create();
  _viewportSizeVar = Tr2VariableStore.globalStore().RegisterVariableInternal("UIViewportSize", TriVariableContentType.TRIVARIABLE_FLOAT4, this._viewportSizeValue);
  _texelSizeValues = [vec4.create(), vec4.create()];
  _texelSizeVar = this._texelSizeValues.map((value, index) => Tr2VariableStore.globalStore().RegisterVariableInternal(`g_texelSizeUI${index}`, TriVariableContentType.TRIVARIABLE_FLOAT4, value));

  /** Lazily prepares native resources; browser/headless construction does not acquire a GPU. */
  @meta.adapted
  _PrepareResourcesForRender(context)
  {
    if (this._vertexDecl === -1 || !this._vertexBuffer.IsValid() || !this._indexBuffer.IsValid())
    {
      if (!this._OnPrepareResources()) return false;
    }
    if (!this.ubershader2d)
    {
      this.ubershader2d = new Tr2Effect();
      this.ubershader2d.SetEffectPathName("res:/Graphics/Effect/UI/UberShader.fx");
      this.ubershader3d = new Tr2Effect();
      this.ubershader3d.SetEffectPathName("res:/Graphics/Effect/UI/UberShader3d.fx");
    }
    this._renderContext = context;
    return this._SelectEffect();
  }

  /** Creates native ring buffers, the 88-byte vertex declaration and diagnostic texture. */
  @meta.adapted
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

  /** Flushes when the underlying AL identity changes, including atlas relocation. */
  @meta.implemented
  SetTexture(index, texture, settings)
  {
    texture ??= this._defaultTexture;
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
  IsCapturing() { return this._captureDisplayList !== null; }

  _captureDisplayList = null;
  _captureVertexDataCapacity = 1024;
  _captureVertexData = new Uint8Array(1024 * 88); // alloc: retained geometry storage allocated only on preparation or capacity growth
  _captureIndexData = new Uint32Array(1536); // alloc: retained geometry storage allocated only on preparation or capacity growth
  _captureVertexDataSize = 0;
  _captureIndexDataSize = 0;
  _captureStartIndex = 0;

  /** Flushes direct geometry before recording a container's display list. */
  @meta.implemented
  StartCapture(owner)
  {
    if (this._captureDisplayList) throw new Error("A sprite display-list capture is already active");
    this._IssueDrawCall();
    this._captureDisplayList = new Tr2Sprite2dDisplayList(owner);
    this._captureVertexDataSize = this._captureIndexDataSize = this._captureStartIndex = 0;
    return true;
  }

  /** Native doubling growth; typed-array allocation/copy replaces aligned realloc. */
  @meta.adapted
  _GrowCaptureVertexBuffer(vertexCount)
  {
    this._captureVertexDataCapacity = Math.max(this._captureVertexDataCapacity * 2, this._captureVertexDataSize + vertexCount);
    const data = new Uint8Array(this._captureVertexDataCapacity * 88); // alloc: retained geometry storage allocated only on preparation or capacity growth
    data.set(this._captureVertexData);
    this._captureVertexData = data;
  }

  /** Native doubling growth; typed-array allocation/copy replaces aligned realloc. */
  @meta.adapted
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
  EndCapture(previousDisplayList)
  {
    if (!this._captureDisplayList) return null;
    this._IssueDrawCall();
    const list = this._captureDisplayList, context = this._renderContext;
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
      const description = Tr2BufferDescriptionAL.FromStride(i ? 4 : 1, i ? capacity : capacity * 88,
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
  _ResetCapture()
  {
    this._captureDisplayList?.Destroy();
    this._captureDisplayList = null;
    this._captureVertexDataSize = this._captureIndexDataSize = 0;
    this._vertexCount = this._indexCount = this._transformCurrent = 0;
  }

  /** Replays captured geometry with its saved effects, textures and transform arrays. */
  @meta.implemented
  ReplayCapture(list)
  {
    this._IssueDrawCall();
    if (!list.vertexBuffer.IsValid() || !list.indexBuffer.IsValid() || !list.entries.length) return;
    const context = this._renderContext, esm = context.GetEffectStateManager();
    esm.ApplyIndexBuffer(list.indexBuffer);
    esm.ApplyStreamSource(0, list.vertexBuffer, 0, 88);
    for (const entry of list.entries)
    {
      if (++this._itemsRendered >= this.maxItemsToRender) continue;
      if (entry.job)
      {
        this._RunJobHelper(entry.job);
        esm.ApplyIndexBuffer(list.indexBuffer);
        esm.ApplyStreamSource(0, list.vertexBuffer, 0, 88);
        continue;
      }
      this._texelSizeValues[0].set(entry.texelSize0);
      this._texelSizeValues[1].set(entry.texelSize1);
      this._texelSizeVar[0].SetValue(this._texelSizeValues[0]);
      this._texelSizeVar[1].SetValue(this._texelSizeValues[1]);
      const pass = entry.effect.GetPassDescription(0, 0);
      for (let i = 0; i < 2; i++)
      {
        const texture = i ? entry.texture1 : entry.texture0;
        pass.resourceSetDirty = pass.resourceSetDesc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, this._textureRegisters[i], texture ? texture.GetTexture() : null, Tr2ColorSpace.COLOR_SPACE_LINEAR) || pass.resourceSetDirty;
      }
      entry.effect.Render(entry, context);
    }
    this._texture.fill(null);
    esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
  }

  /** Flushes geometry before recording or executing a native UI render job. */
  @meta.implemented
  RunJob(job)
  {
    this._IssueDrawCall();
    if (this.IsCapturing())
    {
      const entry = new Tr2Sprite2dDisplayListEntry();
      entry.job = job;
      this._captureDisplayList.entries.push(entry);
      return;
    }
    this._RunJobHelper(job);
    this._texture.fill(null);
    this._renderContext.GetEffectStateManager().ApplyIndexBuffer(this._indexBuffer.GetBuffer());
  }

  /** Native state handoff to an embedded job. Finally restores state when JS jobs throw.
   * The scene's unported linear-color-space option remains outside this path. */
  @meta.adapted
  _RunJobHelper(job)
  {
    const esm = this._renderContext.GetEffectStateManager();
    esm.EndManagedRendering();
    esm.PopDepthStencilBuffer();
    esm.PushRenderTarget__TextureAL(new Tr2TextureAL(), 1);
    esm.PushViewport();
    try
    {
      job.Run(this._realTime, this._simTime);
    }
    finally
    {
      esm.PopViewport();
      esm.PopRenderTarget(1);
      esm.PushDepthStencilBuffer(new Tr2TextureAL());
      esm.BeginManagedRendering();
      esm.ApplyStandardStates(RenderingMode.RM_SPRITE2D);
      esm.ApplyVertexDeclaration(this._vertexDecl);
    }
  }

  /** Native per-draw vertex capacity. */
  @meta.implemented
  GetMaxVertexCountPerDrawCall() { return this.maxSpriteCount * 4; }

  /** Copies native vertices into the interleaved AL byte layout without mutating source caches. */
  @meta.adapted
  RenderTriangleVerts(vertices, vertexCount, indices, indexCount)
  {
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

  /** Carbon's Tr2BufferAL overload, named explicitly because JS cannot overload.
   * Unlike CPU vertices these buffers already contain final translation and clip.
   * Finally clears draw counts and restores the ring binding even if an effect fails. */
  @meta.adapted
  RenderTriangleVerts__Buffers(vertices, vertexCount, indices, indexCount)
  {
    if (this.IsCapturing()) throw new Error("Direct Sprite2D buffers cannot be captured");

    this._IssueDrawCall();
    if (!indexCount || !this._SelectEffect()) return;

    const context = this._renderContext, esm = context.GetEffectStateManager();
    const pass = this._effect.GetPassDescription(0, 0);
    for (let i = 0; i < 2; i++)
    {
      const texture = this._texture[i];
      const al = texture ? texture.GetTexture() ?? texture.GetRenderTarget() : null;
      pass.resourceSetDirty = pass.resourceSetDesc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, this._textureRegisters[i], al, Tr2ColorSpace.COLOR_SPACE_LINEAR) || pass.resourceSetDirty;
    }
    esm.ApplyIndexBuffer(indices);
    esm.ApplyStreamSource(0, vertices, 0, 88);
    this._vertexCount = vertexCount;
    this._indexCount = indexCount;
    this._drawCallStartIndex = 0;
    try
    {
      this._effect.Render(this, context);
    }
    finally
    {
      this._vertexCount = this._indexCount = 0;
      esm.ApplyIndexBuffer(this._indexBuffer.GetBuffer());
    }
  }

  /** Uploads the batch through native ring buffers and effect rendering. */
  @meta.adapted
  _IssueDrawCall()
  {
    if (!this._indexCount) return;
    const context = this._renderContext;
    const effectOK = this._SelectEffect();
    if (this.IsCapturing())
    {
      if (effectOK)
      {
        const entry = new Tr2Sprite2dDisplayListEntry();
        for (let i = 0; i < 32; i++) mat4.copy(entry.transformArray[i], this._transformArray[i]);
        entry.numVertices = this._captureVertexDataSize;
        entry.startIndex = this._captureStartIndex;
        entry.primitiveCount = this._indexCount / 3;
        entry.texture0 = this._texture[0];
        entry.texture1 = this._texture[1];
        entry.effect = this._effect;
        entry.texelSize0.set(this._texelSizeValues[0]);
        entry.texelSize1.set(this._texelSizeValues[1]);
        this._uiTransformsCb ??= context.CreateConstantBuffer();
        entry._uiTransformsCb = this._uiTransformsCb;
        this._captureDisplayList.entries.push(entry);
      }
      this._vertexCount = this._indexCount = this._transformCurrent = 0;
      this._captureStartIndex = this._captureIndexDataSize;
      return;
    }
    ++this._drawCallsRendered;
    if (effectOK && this._drawCallsRendered < this.maxDrawCallsToRender)
    {
      const vertex = this._vertexBuffer.PutData(this._vertexBytes, this._vertexCount * 88, 4, context);
      if (!Failed(vertex.result))
      {
        const index = this._indexBuffer.PutData(this._indexData, this._indexCount * 4, 4, context);
        if (!Failed(index.result))
        {
          const pass = this._effect.GetPassDescription(0, 0);
          for (let i = 0; i < 2; i++)
          {
            const texture = this._texture[i];
            const al = texture ? texture.GetTexture() ?? texture.GetRenderTarget() : null;
            pass.resourceSetDirty = pass.resourceSetDesc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, this._textureRegisters[i], al, Tr2ColorSpace.COLOR_SPACE_LINEAR) || pass.resourceSetDirty;
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
    this._vertexCount = this._indexCount = this._transformCurrent = 0;
  }

  /** Binds the transposed native GUI transform array and draws the current indexed batch. */
  @meta.adapted
  SubmitGeometry(context)
  {
    this._uiTransformsCb ??= context.CreateConstantBuffer();
    for (let i = 0; i < 32; i++) mat4.transpose(this._transposedTransforms.subarray(i * 16, (i + 1) * 16), this._transformArray[i]);
    Tr2RenderUtils.fillAndSetConstants(this._uiTransformsCb, this._transposedTransforms, this._transposedTransforms.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_OBJECT_VS_GUI, context);
    context.SetTopology(Topology.TOP_TRIANGLES);
    context.DrawIndexedPrimitive(this._indexCount, this._drawCallStartIndex, this._indexCount / 3);
  }
}
