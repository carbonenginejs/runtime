import { exposure as be } from "#be";
import { Tr2DeviceResource } from "../../core/device/Tr2DeviceResource.js";
import { ITr2Pickable } from "../../core/ITr2Pickable.js";
// Source: trinity/trinity/Eve/UI/EveEllipseSet.h
import { INotify } from "../../../global/blue/INotify.js";
import { IEveSpaceObjectChild } from "../child/IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "../child/EveSpaceObjectChild.js";
//   trinity/trinity/Eve/UI/EveEllipseSet.cpp
//   trinity/trinity/Eve/UI/EveEllipseSet_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { sph3 } from "#math/sph3";
import { CjsSchema, meta, type, blue } from "#schema";
import { quat } from "#math/quat";
import { BLUELISTEVENT } from "#consts/blue";
import { TriBatchType, TriStorageFlags } from "#consts/graphics";
import { Tr2PickType } from "#consts/graphics/tr2PickType";
import { Topology, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2Lod } from "#consts/trinity";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveEllipseDefinition } from "./EveEllipseDefinition.js";
import { EveEllipseSetEllipseVertex } from "./EveEllipseSetEllipseVertex.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/Tr2RenderBatch.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2PerObjectDataStandard } from "../../core/rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { Tr2VertexDefinition } from "../../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { BoundingSphereQuery } from "../../generated/eve/enums.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";


/** TRI_PI (Include/TriMath.h:243): Carbon's float pi, `3.141592654f`. */
const TRI_PI = Math.fround(3.141592654);


/**
 * Carbon's EveEllipseSet: a transform child that draws closed elliptical
 * orbits as screen-space ribbons. Each EveEllipseDefinition becomes
 * `ribbonSegmentCount` centre-line points (clamped to 16-512), each stored
 * twice - a left and a right edge vertex sharing the point and its unit
 * tangent - and joined into a closed triangle strip by an index buffer. The
 * vertex shader widens each pair to the ribbon's pixel width. The set draws
 * in the transparent pass, and in the picking pass with the same effect.
 *
 * Geometry is rebuilt in UpdateSyncronous whenever a definition, the list or
 * a notifying member changed.
 */
@be.define("EveEllipseSet")
@blue.inherit(ITr2Renderable, IListNotify, INotify, ITr2Pickable, Tr2DeviceResource)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(ITr2Renderable)
@be.mapInterface(ITr2Pickable)
@be.mapInterface(IListNotify)
@be.mapInterface(INotify)
export class EveEllipseSet extends EveChildTransform
{

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:22 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:23 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:24 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_ribbonSegmentCount (unsigned int) [READWRITE, NOTIFY, PERSIST] - EveEllipseSet_Blue.cpp:26, h:75 */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.uint32
  ribbonSegmentCount = 128;

  /** m_name (std::string) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:19 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:20, h:72 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  /** m_enablePicking (bool) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:21, h:73 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  enablePicking = true;

  /** m_depthOffset (float) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:25, h:74 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  depthOffset = 0;

  /** m_ellipses (PEveEllipseDefinitionVector) [READ, PERSIST] - EveEllipseSet_Blue.cpp:28, h:89 */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveEllipseDefinition")
  ellipses = [];

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] - EveEllipseSet_Blue.cpp:27, h:78 */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2Effect")
  effect = null;

  /** m_lowestLodVisible (Tr2Lod, h:76): the lowest parent LOD the set draws at; public, not exposed. */
  @type.int32
  @type.enum("trinity.Tr2Lod")
  lowestLodVisible = Tr2Lod.TR2_LOD_LOW;

  /** m_boundingSphere (Vector4, h:91): the local sphere over every ribbon point, rebuilt with the geometry. */
  _boundingSphere = vec4.create();

  /** m_isVisible (bool, h:92): the last UpdateVisibility result. */
  _isVisible = false;

  /** m_geometryDirty (bool, h:94): whether the ribbon geometry must be rebuilt. */
  _geometryDirty = true;

  /** m_vertexBuffer (Tr2BufferAL, h:96): EllipseVertex records. */
  _vertexBuffer = new Tr2BufferAL();

  /** m_indexBuffer (Tr2BufferAL, h:97): 32-bit triangle-list indices. */
  _indexBuffer = new Tr2BufferAL();

  /** m_vertexDeclHandle (unsigned int, h:98): UNINITIALIZED_DECLARATION until prepared. */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_indexCount (unsigned int, h:99): the indices the last successful rebuild uploaded. */
  _indexCount = 0;

  /**
   * Carbon's constructor (EveEllipseSet.cpp:70-76): starts from
   * BoundingSphereInitialize's zero sphere and prepares the device
   * resources.
   *
   * Carbon's Tr2DeviceResource base registers with the device in its own
   * constructor (Tr2DeviceResource.cpp:6-9); a class taking that base through
   * `@blue.inherit` registers here instead (Tr2DeviceResource.js head). Carbon
   * also makes the set its ellipse list's notify target (cpp:73); a JavaScript
   * array has no notify slot, so list events reach OnListModified from the
   * Blue loader and the set's own list methods bind definitions explicitly.
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
    vec4.set(this._boundingSphere, 0, 0, 0, 0);
    this.PrepareResources();
  }

  /**
   * Carbon ReleaseResources (EveEllipseSet.cpp:78-85): drops both buffers and
   * the declaration handle, and marks the geometry for rebuild.
   *
   * Adapted: Carbon assigns an empty Tr2BufferAL value, which releases this
   * reference; Tr2BufferAL.Destroy is that release, because JavaScript has no
   * deterministic value destruction.
   *
   * @param {number} _s TriStorageFlags; Carbon releases everything regardless.
   * @returns {void}
   */

  @meta.adapted
  ReleaseResources(_s)
  {
    this._vertexBuffer.Destroy();
    this._indexBuffer.Destroy();
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._indexCount = 0;
    this._geometryDirty = true;
  }

  /**
   * Final release, where Carbon's destructor (EveEllipseSet.cpp:130-137) unbinds
   * every definition's dirty flag, since a definition may outlive the set,
   * and Tr2DeviceResource's destructor unregisters it (Tr2DeviceResource.cpp:11-14).
   * JavaScript has no deterministic destructor, so the owner calls this.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   *
   * @returns {void}
   */
  Destruct()
  {
    for (const ellipse of this.ellipses)
    {
      ellipse.SetDirtyFlag(null);
    }

    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    TriDevice.UnregisterResource(this);
  }

  /**
   * Carbon OnPrepareResources (EveEllipseSet.cpp:87-100): interns the
   * EllipseVertex declaration - a float3 POSITION and a float4 TEXCOORD0 -
   * once. Buffers are created by the geometry rebuild, not here.
   *
   * Carbon declares it private; Tr2DeviceResource.PrepareResources calls it by
   * this name, so it keeps the public spelling.
   *
   * @returns {boolean} Whether the declaration handle is valid.
   */

  @meta.implemented
  OnPrepareResources()
  {
    if (this._vertexDeclHandle !== Tr2EffectStateManager.Unknown)
    {
      return true;
    }

    const decl = new Tr2VertexDefinition();
    decl.Add("FLOAT32_3", "POSITION");
    // TEXCOORD0 tangent + sideSign
    decl.Add("FLOAT32_4", "TEXCOORD", 0);
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(decl);
    return this._vertexDeclHandle !== Tr2EffectStateManager.Unknown;
  }

  /**
   * Appends an ellipse, binds its dirty callback and marks ribbon geometry for rebuild.
   * Carbon AddEllipse (EveEllipseSet.cpp:112-128).
   *
   * Adapted: A JavaScript callback replaces the native dirty-flag pointer. Construction
   * uses new rather than the Blue factory's boolean failure result.
   *
   * @param {vec3} center Centre in local space.
   * @param {number} semiMajor Semi-major axis length.
   * @param {number} semiMinor Semi-minor axis length.
   * @param {vec3} planeNormal Ellipse plane normal.
   * @param {number} rotationDegrees In-plane rotation in degrees.
   * @returns {boolean} True after insertion.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  AddEllipse(center, semiMajor, semiMinor, planeNormal, rotationDegrees)
  {
    const ellipse = new EveEllipseDefinition();
    vec3.copy(ellipse.center, center);
    ellipse.semiMajor = semiMajor;
    ellipse.semiMinor = semiMinor;
    vec3.copy(ellipse.planeNormal, planeNormal);
    ellipse.rotationDegrees = rotationDegrees;
    this._BindEllipse(ellipse);
    this.ellipses.push(ellipse);
    this._MarkGeometryDirty();
    return true;
  }

  /**
   * Carbon py__init__ (EveEllipseSet.cpp:189-198), exposed as `__init__`
   * (EveEllipseSet_Blue.cpp:36): without an assigned effect, and when the
   * `ellipseRibbonEffectPath` setting names one, creates the ribbon effect
   * from that path. An assigned effect is kept.
   *
   * Adapted: also rebinds the persisted definitions' dirty callbacks. Carbon
   * binds them on the list's BELIST_LOADFINISHED (cpp:157-163); a hydrated
   * JavaScript array may arrive without that event, and the callbacks are
   * what stand in for the native dirty-flag pointer.
   *
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  __init__()
  {
    if (!this.effect && EveEllipseSet.ellipseRibbonEffectPath !== "")
    {
      this.effect = new Tr2Effect();
      this.effect.StartUpdate();
      this.effect.SetEffectPathName(EveEllipseSet.ellipseRibbonEffectPath);
      this.effect.EndUpdate();
    }

    for (const ellipse of this.ellipses)
    {
      this._BindEllipse(ellipse);
    }
  }

  /**
   * Unbinds ellipse dirty callbacks, empties the set and invalidates its geometry.
   * Carbon ClearEllipses (EveEllipseSet.cpp:102-110).
   *
   * Adapted: JavaScript callbacks replace the native dirty-flag pointer. Every
   * owned definition must provide SetDirtyFlag, as in Carbon.
   *
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  ClearEllipses()
  {
    for (const ellipse of this.ellipses)
    {
      ellipse.SetDirtyFlag(null);
    }
    this.ellipses.length = 0;
    this._MarkGeometryDirty();
  }

  /**
   * Carbon OnModified (EveEllipseSet.cpp:183-187): any notifying member - the
   * segment count - marks the ribbon geometry for rebuild.
   *
   * @param {*} [_value] The modified member.
   * @returns {boolean} Always true.
   */

  @meta.implemented
  OnModified(_value = null)
  {
    this._MarkGeometryDirty();
    return true;
  }

  /**
   * Binds or releases definition callbacks after a list mutation.
   *
   * Adapted: JavaScript represents the owner's dirty-flag pointer with a callback; list
   * event ordering follows Carbon.
   *
   * @param {number} event BLUELISTEVENT flags.
   * @param {number} _key
   * @param {number} _key2
   * @param {EveEllipseDefinition|null} value The inserted or removed item.
   * @param {Array} list The list that changed.
   * @returns {void}
   */

  @meta.adapted
  @meta.invalidates("#geometryDirty")
  OnListModified(event, _key, _key2, value, list)
  {
    // Source: Eve/UI/EveEllipseSet.cpp:139-175. Loading suppresses per-item
    // binding, but every notification still invalidates geometry below.
    if (list === this.ellipses && (event & BLUELISTEVENT.BELIST_LOADING) === 0)
    {
      switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
      {
        case BLUELISTEVENT.BELIST_INSERTED:
        {
          const ellipse = CjsSchema.cast(value, EveEllipseDefinition);
          if (ellipse) this._BindEllipse(ellipse);
          break;
        }
        case BLUELISTEVENT.BELIST_REMOVED:
        {
          const ellipse = CjsSchema.cast(value, EveEllipseDefinition);
          if (ellipse) ellipse.SetDirtyFlag(null);
          break;
        }
        case BLUELISTEVENT.BELIST_LOADFINISHED:
          for (const ellipse of this.ellipses) this._BindEllipse(ellipse);
          break;
        case BLUELISTEVENT.BELIST_UNLOADSTART:
          for (const ellipse of this.ellipses) ellipse.SetDirtyFlag(null);
          break;
      }
    }
    this._MarkGeometryDirty();
  }

  /**
   * Carbon UpdateSyncronous (EveEllipseSet.cpp:200-207): prepares the
   * declaration if a release dropped it, then rebuilds stale geometry.
   *
   * @param {EveUpdateContext} updateContext The frame context.
   * @param {EveChildUpdateParams} _params Unused, as in Carbon.
   * @returns {void}
   */

  @meta.implemented
  UpdateSyncronous(updateContext, _params)
  {
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      this.PrepareResources();
    }
    this._RefreshGeometryIfNeeded(updateContext);
  }

  /**
   * Carbon UpdateAsyncronous (EveEllipseSet.cpp:209-212): places the set under
   * its parent.
   *
   * @param {EveUpdateContext} _updateContext Unused, as in Carbon.
   * @param {EveChildUpdateParams} params Carries the parent's local-to-world transform.
   * @returns {void}
   */

  @meta.implemented
  UpdateAsyncronous(_updateContext, params)
  {
    this.UpdateTransform(params.localToWorldTransform);
  }

  /**
   * Carbon UpdateVisibility (EveEllipseSet.cpp:351-362): visible while
   * displayed, holding geometry, and the parent's LOD is at least
   * lowestLodVisible.
   *
   * @param {EveUpdateContext} _updateContext Unused, as in Carbon.
   * @param {mat4} _parentTransform Unused, as in Carbon.
   * @param {number} parentLod The parent's Tr2Lod.
   * @returns {void}
   */

  @meta.implemented
  UpdateVisibility(_updateContext, _parentTransform, parentLod)
  {
    this._isVisible = false;
    if (!this.display)
    {
      return;
    }

    if (this._indexCount > 0 && parentLod >= this.lowestLodVisible)
    {
      this._isVisible = true;
    }
  }

  /**
   * Carbon GetRenderables (EveEllipseSet.cpp:364-370): the set itself while
   * visible with geometry.
   *
   * @param {ITr2Renderable[]} renderables Receives the set.
   * @returns {void}
   */

  @meta.implemented
  GetRenderables(renderables)
  {
    if (this._isVisible && this._indexCount > 0)
    {
      renderables.push(this);
    }
  }

  /**
   * Carbon GetBoundingSphere (EveEllipseSet.cpp:372-377): the local ribbon
   * sphere through BoundingSphereTransform (Utilities/BoundingSphere.cpp:70-81)
   * by the world transform - TransformCoord of the centre, the radius scaled
   * by the longest basis row (gl flat [0..2], [4..6], [8..10]). One matrix
   * applied, no composition, so no operand swap.
   *
   * @param {vec4} sphere Receives the world sphere (x, y, z, radius).
   * @param {number} [_query] BoundingSphereQuery; unused, as in Carbon.
   * @returns {boolean} Always true.
   */

  @meta.implemented
  GetBoundingSphere(sphere, _query = BoundingSphereQuery.EVE_BOUNDS_NORMAL)
  {
    const world = this.worldTransform;
    vec4.copy(sphere, this._boundingSphere);
    vec3.transformMat4(sphere, sphere, world);
    sphere[3] *= Math.max(
      Math.hypot(world[0], world[1], world[2]),
      Math.max(Math.hypot(world[4], world[5], world[6]), Math.hypot(world[8], world[9], world[10]))
    );
    return true;
  }

  /**
   * Carbon GetLocalToWorldTransform (EveEllipseSet.cpp:379-382): the world
   * transform. Carbon writes a Matrix reference; the copy is also returned.
   *
   * @param {mat4} transform Receives the transform.
   * @returns {mat4} transform
   */

  @meta.implemented
  GetLocalToWorldTransform(transform)
  {
    return mat4.copy(transform, this.worldTransform);
  }

  /**
   * Carbon Setup (EveEllipseSet.cpp:384-391): the base transform setup, then
   * remembers the lowest LOD it is visible at.
   *
   * @param {vec3|null} scale
   * @param {quat|null} rotation
   * @param {vec3|null} translation
   * @param {number} lowestLodVisible A Tr2Lod.
   * @returns {void}
   */

  @meta.implemented
  Setup(scale, rotation, translation, lowestLodVisible)
  {
    // call base class's setup
    super.Setup(scale, rotation, translation, lowestLodVisible);

    // and remember lodding!
    this.lowestLodVisible = lowestLodVisible;
  }

  /**
   * Carbon GetID (EveEllipseSet.cpp:393-396): GetRawRoot(), the set itself,
   * for every area.
   *
   * @param {number} _areaId Unused, as in Carbon.
   * @returns {EveEllipseSet} this
   */

  @meta.implemented
  GetID(_areaId)
  {
    return this;
  }

  /**
   * Carbon GetBatches (EveEllipseSet.cpp:419-446): while displayed and given
   * per-object data, prepares a dropped declaration, then - with an effect,
   * both buffers, indices and a declaration - commits the ribbon in the
   * picking pass and the transparent pass, with the same effect in both.
   *
   * @param {ITriRenderBatchAccumulator} accumulator Receives the batch.
   * @param {number} batchType A TriBatchType.
   * @param {Tr2PerObjectData|null} perObjectData The set's per-object data.
   * @param {number} [_reason] Tr2RenderReason; unused, as in Carbon.
   * @returns {void}
   */

  @meta.implemented
  GetBatches(accumulator, batchType, perObjectData, _reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display || !perObjectData)
    {
      return;
    }

    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      this.PrepareResources();
    }

    if (!this.effect || !this._vertexBuffer.IsValid() || !this._indexBuffer.IsValid() || this._indexCount === 0
      || this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      return;
    }

    if (batchType === TriBatchType.TRIBATCHTYPE_PICKING)
    {
      this._CommitRibbonBatch(accumulator, perObjectData, this.effect);
      return;
    }

    if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      return;
    }

    this._CommitRibbonBatch(accumulator, perObjectData, this.effect);
  }

  /**
   * Carbon GetPickingBatches (EveEllipseSet.cpp:448-458): the picking-pass
   * batches, when picking is enabled and the pick asks for picking geometry.
   *
   * @param {ITriRenderBatchAccumulator} batches Receives the batch.
   * @param {number} pickTypes Tr2PickType flags.
   * @param {Tr2PerObjectData|null} perObjectData The set's per-object data.
   * @returns {void}
   */

  @meta.implemented
  GetPickingBatches(batches, pickTypes, perObjectData)
  {
    if (!this.enablePicking)
    {
      return;
    }

    if ((pickTypes & Tr2PickType.PICK_TYPE_PICKING) !== 0)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }
  }

  /**
   * Carbon HasTransparentBatches (EveEllipseSet.cpp:460-463): while displayed.
   *
   * @returns {boolean}
   */

  @meta.implemented
  HasTransparentBatches()
  {
    return this.display;
  }

  /**
   * Carbon GetSortValue (EveEllipseSet.cpp:465-471): the distance from the
   * view position to the world-space sphere centre, plus depthOffset.
   *
   * @returns {number}
   */

  @meta.implemented
  GetSortValue()
  {
    const { vec3_0 } = EveEllipseSet.scratch;
    // vec3_0 is worldCenter, then toCamera
    const viewPosition = Tr2Renderer.GetViewPosition();

    vec3.set(vec3_0, this._boundingSphere[0], this._boundingSphere[1], this._boundingSphere[2]);
    vec3.transformMat4(vec3_0, vec3_0, this.worldTransform);
    vec3.subtract(vec3_0, viewPosition, vec3_0);
    return vec3.length(vec3_0) + this.depthOffset;
  }

  /**
   * Carbon GetPerObjectData (EveEllipseSet.cpp:473-489): a
   * Tr2PerObjectDataStandard carrying EvePerObjectVSData and
   * EvePerObjectPSData, each with WorldMat = Transpose( m_worldTransform ).
   * SetAndTranspose is that transpose; Carbon's zero-initialised stack
   * structs are the lease's fresh buffers.
   *
   * @param {ITriRenderBatchAccumulator} accumulator Leases the data.
   * @returns {Tr2PerObjectDataStandard}
   */

  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = Tr2PerObjectDataStandard.alloc(accumulator, "EvePerObjectVSData", "EvePerObjectPSData");

    data.vs.SetAndTranspose("WorldMat", this.worldTransform);
    data.ps.SetAndTranspose("WorldMat", this.worldTransform);

    return data;
  }

  /**
   * Carbon CommitRibbonBatch (EveEllipseSet.cpp:398-417): one indexed
   * triangle-list draw of the uploaded ribbon. The packed depth is the
   * world-space sphere centre's distance from the view, plus depthOffset,
   * over the frustum radius, clamped to [0, 1] and inverted into 28 bits;
   * the arithmetic is Carbon's float.
   *
   * Adapted: Carbon reads Tr2Renderer's frustum-radius and view-position
   * statics; they live on the main-thread render context here
   * (Tr2RenderContext.js head).
   *
   * @param {ITriRenderBatchAccumulator} accumulator Receives the batch.
   * @param {Tr2PerObjectData} perObjectData The set's per-object data.
   * @param {Tr2Effect} effect The material.
   * @returns {void}
   */

  @meta.adapted
  _CommitRibbonBatch(accumulator, perObjectData, effect)
  {
    const f = Math.fround;
    const { vec3_0 } = EveEllipseSet.scratch;
    // vec3_0 is center

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);

    const maxDepth = f(Tr2Renderer.GetFrustumRadius());
    vec3.set(vec3_0, this._boundingSphere[0], this._boundingSphere[1], this._boundingSphere[2]);
    vec3.transformMat4(vec3_0, vec3_0, this.worldTransform);
    vec3.subtract(vec3_0, vec3_0, Tr2Renderer.GetViewPosition());
    // std::min( std::max( x, 0.f ), 1.f ), where std::max(a, b) is (a < b) ? b : a and std::min(a, b) is (b < a) ? b : a.
    const ratio = f(f(f(vec3.length(vec3_0)) + f(this.depthOffset)) / maxDepth);
    const lower = ratio < 0 ? 0 : ratio;
    const z = 1 < lower ? 1 : lower;
    batch.depth = f(f(0xFFFFFFF) * f(1 - z)) >>> 0;

    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, this._vertexBuffer, EveEllipseSetEllipseVertex.byteSize);
    batch.SetIndices(this._indexBuffer, 4);
    batch.SetTopology(Topology.TOP_TRIANGLES);
    batch.SetDrawIndexedInstanced(this._indexCount, 1, 0, 0, 0);
    accumulator.Commit(batch);
  }

  /**
   * Carbon MarkGeometryDirty (EveEllipseSet.cpp:178-181): flags the ribbon
   * geometry as stale so the next UpdateSyncronous rebuilds it.
   *
   * @returns {void}
   */

  @meta.implemented
  _MarkGeometryDirty()
  {
    this._geometryDirty = true;
  }

  /**
   * Carbon RefreshGeometryIfNeeded (EveEllipseSet.cpp:214-229): rebuilds while
   * displayed and dirty. A rebuild that fails on a GPU buffer leaves the flag
   * set, so the next frame retries.
   *
   * @param {EveUpdateContext} updateContext The frame context.
   * @returns {void}
   */

  @meta.implemented
  _RefreshGeometryIfNeeded(updateContext)
  {
    if (!this.display)
    {
      return;
    }

    if (!this._geometryDirty)
    {
      return;
    }

    this._RebuildGeometry(updateContext);
  }

  /**
   * Carbon RebuildGeometry (EveEllipseSet.cpp:231-349): builds every
   * ellipse's ribbon, grows the bounding sphere over its points, and uploads
   * both buffers, growing each only when it is too small. An empty set drops
   * both buffers. Each segment point is written twice, sideSign -1 then +1,
   * and segment i joins its pair to segment i + 1's (wrapping) as triangles
   * (curLeft, nextLeft, curRight) and (curRight, nextLeft, nextRight).
   *
   * Adapted: Carbon stages vertices and indices in the renderer's frame pool
   * allocator and returns when it cannot allocate; here they are typed arrays,
   * which cannot fail that way. Scalar steps (segment angle, cosines, clamps)
   * are rounded to float as Carbon's are; the vector sums are evaluated in
   * double and rounded once, when stored into the float vertex array.
   *
   * @param {EveUpdateContext} _updateContext Unused, as in Carbon.
   * @returns {void}
   */

  @meta.adapted
  _RebuildGeometry(_updateContext)
  {
    const f = Math.fround;
    const { vec3_0, vec3_1, vec3_5 } = EveEllipseSet.scratch;
    // vec3_0 is semiMajorAxis, vec3_1 semiMinorAxis, vec3_5 point: a float Vector3, as Carbon's is
    const FLOATS = EveEllipseSetEllipseVertex.floatCount;

    this._indexCount = 0;

    // BoundingSphereInitialize (Utilities/BoundingSphere.cpp:9-12)
    vec4.set(this._boundingSphere, 0, 0, 0, 0);

    const segmentCount = Math.max(16, Math.min(512, this.ribbonSegmentCount));
    const ellipseCount = this.ellipses.length;
    const vertexCount = ellipseCount * 2 * segmentCount;
    const indexCount = ellipseCount * 6 * segmentCount;

    if (ellipseCount === 0)
    {
      this._vertexBuffer.Destroy();
      this._indexBuffer.Destroy();
      this._geometryDirty = false;
      return;
    }

    const vertices = new Float32Array(vertexCount * FLOATS); // alloc: Carbon's pool allocation, per rebuild
    const indices = new Uint32Array(indexCount); // alloc: Carbon's pool allocation, per rebuild
    const minimumAxis = f(1e-4);
    const minimumTangentLength = f(1e-12);
    const fullTurn = f(2 * TRI_PI);

    let vWrite = 0;
    let iWrite = 0;

    // Screen-space billboard ribbon: store centerline + tangent; VS expands to pixel width at draw time.
    for (const spec of this.ellipses)
    {
      EveEllipseSet.buildOrbitEllipseAxes(spec, vec3_0, vec3_1);

      const center = spec.center;
      const semiMajor = spec.semiMajor < minimumAxis ? minimumAxis : spec.semiMajor;
      const semiMinor = spec.semiMinor < minimumAxis ? minimumAxis : spec.semiMinor;

      const baseVertexIndex = vWrite;

      for (let i = 0; i < segmentCount; ++i)
      {
        const angle = f(f(i / segmentCount) * fullTurn);
        const cosAngle = f(Math.cos(angle));
        const sinAngle = f(Math.sin(angle));
        const major = f(semiMajor * cosAngle), minor = f(semiMinor * sinAngle);
        vec3_5[0] = center[0] + vec3_0[0] * major + vec3_1[0] * minor;
        vec3_5[1] = center[1] + vec3_0[1] * major + vec3_1[1] * minor;
        vec3_5[2] = center[2] + vec3_0[2] * major + vec3_1[2] * minor;

        const tangentMajor = f(-semiMajor * sinAngle), tangentMinor = f(semiMinor * cosAngle);
        let tx = vec3_0[0] * tangentMajor + vec3_1[0] * tangentMinor;
        let ty = vec3_0[1] * tangentMajor + vec3_1[1] * tangentMinor;
        let tz = vec3_0[2] * tangentMajor + vec3_1[2] * tangentMinor;
        let tangentLength = f(Math.hypot(tx, ty, tz));
        if (tangentLength < minimumTangentLength)
        {
          tx = vec3_0[0];
          ty = vec3_0[1];
          tz = vec3_0[2];
          tangentLength = f(Math.hypot(tx, ty, tz));
        }
        const inverseLength = f(1 / tangentLength);
        tx *= inverseLength;
        ty *= inverseLength;
        tz *= inverseLength;

        // Left edge: sideSign = -1
        let offset = vWrite * FLOATS;
        vertices.set(vec3_5, offset);
        vertices[offset + 3] = tx;
        vertices[offset + 4] = ty;
        vertices[offset + 5] = tz;
        vertices[offset + 6] = -1;
        sph3.boundingSphereUpdate(this._boundingSphere, vec3_5);
        vWrite++;

        // Right edge: sideSign = +1
        offset = vWrite * FLOATS;
        vertices.set(vec3_5, offset);
        vertices[offset + 3] = tx;
        vertices[offset + 4] = ty;
        vertices[offset + 5] = tz;
        vertices[offset + 6] = 1;
        sph3.boundingSphereUpdate(this._boundingSphere, vec3_5);
        vWrite++;
      }

      for (let i = 0; i < segmentCount; ++i)
      {
        const next = (i + 1) % segmentCount;
        const curLeft = baseVertexIndex + 2 * i;
        const curRight = baseVertexIndex + 2 * i + 1;
        const nextLeft = baseVertexIndex + 2 * next;
        const nextRight = baseVertexIndex + 2 * next + 1;
        indices[iWrite++] = curLeft;
        indices[iWrite++] = nextLeft;
        indices[iWrite++] = curRight;
        indices[iWrite++] = curRight;
        indices[iWrite++] = nextLeft;
        indices[iWrite++] = nextRight;
      }
    }

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    const vertexStride = EveEllipseSetEllipseVertex.byteSize;
    if (!this._vertexBuffer.IsValid() || this._vertexBuffer.GetSize() < vertexStride * vertexCount)
    {
      if (Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.create__Stride(vertexStride, vertexCount,
        Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE), null, renderContext))) return;
    }
    {
      const mapping = this._vertexBuffer.MapForWriting(renderContext);
      if (Failed(mapping.result)) return;
      mapping.data.set(new Uint8Array(vertices.buffer, 0, vertexStride * vertexCount)); // alloc: byte view for the upload
      this._vertexBuffer.UnmapForWriting(renderContext);
    }

    if (!this._indexBuffer.IsValid() || this._indexBuffer.GetSize() < 4 * indexCount)
    {
      if (Failed(this._indexBuffer.Create(Tr2BufferDescriptionAL.create__Stride(4, indexCount,
        Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.WRITE), null, renderContext))) return;
    }
    {
      const mapping = this._indexBuffer.MapForWriting(renderContext);
      if (Failed(mapping.result)) return;
      mapping.data.set(new Uint8Array(indices.buffer, 0, 4 * indexCount)); // alloc: byte view for the upload
      this._indexBuffer.UnmapForWriting(renderContext);
    }

    this._indexCount = indexCount;
    this._geometryDirty = false;
  }

  /**
   * Points an ellipse definition's dirty callback back at this set, so editing
   * the definition invalidates the set's geometry. Ours: Carbon passes
   * `&m_geometryDirty` to SetDirtyFlag (cpp:124, 148, 161).
   *
   * @param {EveEllipseDefinition} ellipse
   * @returns {void}
   */
  _BindEllipse(ellipse)
  {
    ellipse.SetDirtyFlag(() => this._MarkGeometryDirty());
  }

  /**
   * Carbon: BuildOrbitPlaneBasisPython (trinity/trinity/Eve/UI/EveEllipseSet.cpp:25-48)
   *
   * The orbit plane's basis, built as the Python client's
   * `_get_orbit_rotation_from_axes` builds it: n = Normalize( planeNormal ),
   * basisU = normalize( n x (0, 1, 0) ), basisV = normalize( basisU x n ). A
   * normal within ~1.8 degrees of the Y axis (|n x Y|^2 < 1e-3) crosses with
   * whichever of the X and Z axes it is less aligned with instead. Carbon's
   * divisions by a float multiply by its reciprocal (Vector3_inline.h:81-89),
   * as these do. Carbon's `CCP_ASSERT( lenSq > 0.f )` (cpp:43) is a debug
   * assertion and is not ported.
   *
   * @param {vec3} planeNormal The orbit plane's normal; need not be unit.
   * @param {vec3} basisU Receives the first in-plane axis.
   * @param {vec3} basisV Receives the second in-plane axis.
   * @param {vec3} n Receives the unit normal.
   * @returns {void}
   */
  @meta.implemented
  static buildOrbitPlaneBasisPython(planeNormal, basisU, basisV, n)
  {
    vec3.normalizeCarbon(n, planeNormal);
    vec3.cross(basisU, n, vec3.Y_AXIS);
    let lenSq = vec3.dot(basisU, basisU);
    if (lenSq < Math.fround(1e-3))
    {
      const d0 = Math.abs(vec3.dot(n, vec3.X_AXIS));
      const d1 = Math.abs(vec3.dot(n, vec3.Z_AXIS));
      const ref = (d0 < d1) ? vec3.X_AXIS : vec3.Z_AXIS;
      vec3.cross(basisU, n, ref);
      lenSq = vec3.dot(basisU, basisU);
    }

    vec3.scale(basisU, basisU, 1 / Math.fround(Math.sqrt(lenSq)));
    vec3.cross(basisV, basisU, n);
    const lv = vec3.length(basisV);
    vec3.scale(basisV, basisV, 1 / Math.fround(lv));
  }

  /**
   * Carbon: BuildOrbitEllipseAxes (trinity/trinity/Eve/UI/EveEllipseSet.cpp:50-63)
   *
   * An ellipse's unit semi-major and semi-minor axis directions: the plane
   * basis rotated by rotationDegrees about the normal, outU = basisU cos(phi)
   * + basisV sin(phi), then outV = normalize( outU x n ). Rotation degrees
   * match the Python client's atan2( maj . basis_v, maj . basis_u ).
   *
   * @param {EveEllipseDefinition} spec The ellipse.
   * @param {vec3} outU Receives the semi-major axis direction.
   * @param {vec3} outV Receives the semi-minor axis direction.
   * @returns {void}
   */
  @meta.implemented
  static buildOrbitEllipseAxes(spec, outU, outV)
  {
    const { vec3_2, vec3_3, vec3_4 } = EveEllipseSet.scratch;
    // vec3_2 is basisU, vec3_3 basisV, vec3_4 n
    EveEllipseSet.buildOrbitPlaneBasisPython(spec.planeNormal, vec3_2, vec3_3, vec3_4);

    const phiRad = Math.fround(spec.rotationDegrees * Math.fround(TRI_PI / 180));
    const cf = Math.fround(Math.cos(phiRad));
    const sf = Math.fround(Math.sin(phiRad));
    // unit since basisU and basisV are unit
    vec3.scale(outU, vec3_2, cf);
    vec3.scaleAndAdd(outU, outU, vec3_3, sf);
    vec3.cross(outV, outU, vec3_4);
    const lv = vec3.length(outV);
    vec3.scale(outV, outV, 1 / Math.fround(lv));
  }

  /**
   * g_ellipseRibbonEffectPath (EveEllipseSet.cpp:67-68, TRI_REGISTER_SETTING
   * "ellipseRibbonEffectPath"): the effect __init__ creates for a set with
   * none; empty by default, so no effect is created.
   */
  @meta.setting("ellipseRibbonEffectPath", { applies: meta.setting.CREATE })
  static ellipseRibbonEffectPath = "";

  /** Carbon's anonymous-namespace EllipseVertex (cpp:18-23), the ribbon vertex record. */
  static EllipseVertex = EveEllipseSetEllipseVertex;

  static scratch = {
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    vec3_3: vec3.create(),
    vec3_4: vec3.create(),
    vec3_5: vec3.create()
  };
}

// EveEllipseSet_Blue.cpp: native exposure. partTag (MAP_PROPERTY_READONLY,
// _Blue.cpp:37), GetParent and GetOwner (:38-39) are EveSpaceObjectChild's.
