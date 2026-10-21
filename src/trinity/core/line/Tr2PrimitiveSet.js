import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2PrimitiveSet.h
// Source: trinity/trinity/Tr2PrimitiveSet.cpp
// Source: trinity/trinity/Tr2PrimitiveSet_Blue.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { INotify, IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { TriBatchType } from "#consts/graphics";
import { Tr2PickType } from "#consts/graphics/tr2PickType";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2PerObjectDataStandard } from "../rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../ITr2Renderable.js";
import { ITr2Pickable } from "../ITr2Pickable.js";

/** A drawable set of primitives with a world transform, sort value and bounding sphere. */
@blue.define({ className: "Tr2PrimitiveSet", abstract: true })
@blue.inherit(ITr2Renderable, ITr2Pickable, INotify)
@blue.interface(ITr2Renderable, ITr2Pickable, INotify)
export class Tr2PrimitiveSet
{

  /** Carbon Tr2PrimitiveSet.cpp:170: propagate edited color through the virtual setter. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "color")) this.SetCurrentColor(this.color);
    return true;
  }


  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  localTransform = mat4.create();

  /** m_worldTransform (Matrix) [READ] */
  @be.mapAttribute(be.READ)
  @type.mat4
  worldTransform = mat4.create();

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @blue.readwrite
  @type.unknown
  _userData = null;

  /** m_viewOriented (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  viewOriented = false;

  /** m_scaleByDistanceToView (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  scaleByDistanceToView = false;

  /** m_color (Color) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_scale (float) [READ] */
  @be.mapAttribute(be.READ)
  @type.float32
  scale = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.rootRef("Tr2Effect")
  effect = null;

  /** m_pickEffect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.rootRef("Tr2Effect")
  pickEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** Carbon method SetCurrentColor (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.noop
  SetCurrentColor(_color)
  {
  }

  /** Native local-space bound; CleanUp in derived sets deliberately retains it. */
  @type.vec4
  boundingSphere = vec4.create();

  /**
   * Native opaque/picking dispatch (cpp:52), despite its stale transparent comment.
   * Adapted: the effect is asked `IsGood()` first, which renews what it holds
   * and skips it while its resource is not good (Tr2Effect.IsGood).
   */

  @meta.adapted
  GetBatches(accumulator, batchType, perObjectData, _reason)
  {
    if (batchType === TriBatchType.TRIBATCHTYPE_OPAQUE && this.effect && this.effect.IsGood())
      this.GetBatchesImpl(accumulator, perObjectData, this.effect, Tr2PrimitiveSet.GetBatchesReason.Draw);
    else if (batchType === TriBatchType.TRIBATCHTYPE_PICKING && this.pickEffect && this.pickEffect.IsGood())
      this.GetBatchesImpl(accumulator, perObjectData, this.pickEffect, Tr2PrimitiveSet.GetBatchesReason.Picking);
  }

  /** Native subclasses supply their own geometry. */
  @blue.abstract
  GetBatchesImpl(_accumulator, _perObjectData, _effect, _reason) {}

  /** Native primitive sets participate in transparent sorting (cpp:47). */

  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Distance from the view to the bounding sphere's surface (cpp:67-75). */

  @meta.implemented
  GetSortValue()
  {
    const bound = this.GetBoundingSphere(Tr2PrimitiveSet.scratch.vec4_0);
    const eye = Tr2Renderer.GetViewPosition();
    return Math.hypot(eye[0] - bound[0], eye[1] - bound[1], eye[2] - bound[2]) - bound[3];
  }

  /** An optional output replaces Carbon's value-returned world sphere (cpp:82). */

  @meta.adapted
  GetBoundingSphere(out = vec4.create()) // alloc: value-returned sphere belongs to the caller.
  {
    vec3.transformMat4(out, this.boundingSphere, this.worldTransform);
    out[3] = this.boundingSphere[3] * this.scale;
    return out;
  }

  /** Native transform reference (header:29). */

  @meta.implemented
  GetWorldTransform()
  {
    return this.worldTransform;
  }

  /**
   * The JS object is Carbon's raw-root picking identity (header:39).
   * GetID/GetPickingBatches implement the native ITr2Pickable contract.
   */

  @meta.adapted
  GetID(_areaId)
  {
    return this;
  }

  /** Both cpp-local native structs contain exactly one WorldMat (cpp:93-114). */

  @meta.adapted
  GetPerObjectData(accumulator)
  {
    // These existing layouts have the identical native single-matrix shape.
    const vs = accumulator.Alloc("EvePerObjectVSData");
    if (!vs) return null;
    const ps = accumulator.Alloc("EvePerObjectPSData");
    if (!ps) return null;
    const data = new Tr2PerObjectDataStandard();
    data.vs = vs;
    data.ps = ps;
    data.vs.SetAndTranspose("WorldMat", this.worldTransform);
    data.ps.SetAndTranspose("WorldMat", this.worldTransform);
    return data;
  }

  /**
   * Native view-facing and distance-scaled transform (cpp:109-167), from the
   * renderer's current view; matrix composition reverses Carbon order.
   */

  @meta.implemented
  UpdateTransform()
  {
    const view = Tr2Renderer.GetViewTransform(), local = this.localTransform;
    const world = this.worldTransform, { vec3_0 } = Tr2PrimitiveSet.scratch;
    this.scale = 1;
    if (this.scaleByDistanceToView)
    {
      const eye = Tr2Renderer.GetViewPosition();
      this.scale = Math.abs(((eye[0] - local[12]) * view[2] +
        (eye[1] - local[13]) * view[6] + (eye[2] - local[14]) * view[10]) *
        Tr2PrimitiveSet.primitiveDistanceScaleMultiplier * Tr2Renderer.GetFieldOfView());
    }
    if (this.viewOriented)
    {
      mat4.identity(world);
      for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++)
        world[row * 4 + column] = view[column * 4 + row];
    }
    else mat4.copy(world, local);
    vec3.set(vec3_0, this.scale, this.scale, this.scale);
    // Carbon: scale_mat * rotation/local; gl applies scale on the right.
    mat4.scale(world, world, vec3_0);
    if (this.viewOriented)
    {
      world[12] = local[12]; world[13] = local[13]; world[14] = local[14];
    }
  }

  /** Native bit-mask dispatch through the regular batch gates (cpp:182). */

  @meta.implemented
  GetPickingBatches(accumulator, pickTypes, perObjectData)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING) this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE) this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_TRANSPARENT, perObjectData);
      this.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData);
    }
  }

  @meta.setting("primitiveDistanceScaleMultiplier")
  static primitiveDistanceScaleMultiplier = 1 / 7;

  static scratch = { vec3_0: vec3.create(), vec4_0: vec4.create() };

  static GetBatchesReason = Object.freeze({
    Draw: 0,
    Picking: 1,
  });

}


CjsSchema.decorateMethod(Tr2PrimitiveSet, "OnModified", blue.method);
