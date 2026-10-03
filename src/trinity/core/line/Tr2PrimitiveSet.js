// Source: trinity/trinity/Tr2PrimitiveSet.h
// Source: trinity/trinity/Tr2PrimitiveSet.cpp
// Source: trinity/trinity/Tr2PrimitiveSet_Blue.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { INotify, IsMatch } from "#blue";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { TriBatchType } from "#consts/graphics";
import { Tr2PickType } from "../view/Tr2PickType.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2PerObjectDataStandard } from "../rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../ITr2Renderable.js";

/** A drawable set of primitives with a world transform, sort value and bounding sphere. */
@meta.define({ className: "Tr2PrimitiveSet", family: "trinityCore" })
@meta.blue.inherit(ITr2Renderable, INotify)
@meta.blue.mapInterface(INotify)
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
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  localTransform = mat4.create();

  /** m_worldTransform (Matrix) [READ] */
  @meta.blue.read
  @meta.type.mat4
  worldTransform = mat4.create();

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("PyObject")
  _userData = null;

  /** m_viewOriented (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  viewOriented = false;

  /** m_scaleByDistanceToView (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  scaleByDistanceToView = false;

  /** m_color (Color) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_scale (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  scale = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  effect = null;

  /** m_pickEffect (Tr2EffectPtr) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  pickEffect = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Carbon method SetCurrentColor (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.noop
  SetCurrentColor(_color)
  {
  }

  /** Native local-space bound; CleanUp in derived sets deliberately retains it. */
  boundingSphere = vec4.create();

  /** Native opaque/picking dispatch (cpp:52), despite its stale transparent comment. */
  @meta.blue.method
  @meta.implemented
  GetBatches(accumulator, batchType, perObjectData, _reason)
  {
    if (batchType === TriBatchType.TRIBATCHTYPE_OPAQUE && this.effect)
      this.GetBatchesImpl(accumulator, perObjectData, this.effect, Tr2PrimitiveSet.GetBatchesReason.Draw);
    else if (batchType === TriBatchType.TRIBATCHTYPE_PICKING && this.pickEffect)
      this.GetBatchesImpl(accumulator, perObjectData, this.pickEffect, Tr2PrimitiveSet.GetBatchesReason.Picking);
  }

  /** Native subclasses supply their own geometry. */
  @meta.blue.method
  @meta.abstract
  GetBatchesImpl(_accumulator, _perObjectData, _effect, _reason)
  {
    throw new Error("Tr2PrimitiveSet.GetBatchesImpl must be implemented by a primitive set.");
  }

  /** Native primitive sets participate in transparent sorting (cpp:47). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Renderer-global camera state is supplied by the active JS render context. */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.adapted
  GetSortValue(context)
  {
    context ??= Tr2RenderContext_GetMainThreadRenderContext();
    const bound = this.GetBoundingSphere(Tr2PrimitiveSet.scratch.vec4_0);
    const eye = context.GetViewPosition();
    return Math.hypot(eye[0] - bound[0], eye[1] - bound[1], eye[2] - bound[2]) - bound[3];
  }

  /** An optional output replaces Carbon's value-returned world sphere (cpp:82). */
  @meta.blue.method
  @meta.adapted
  GetBoundingSphere(out = vec4.create()) // alloc: value-returned sphere belongs to the caller.
  {
    vec3.transformMat4(out, this.boundingSphere, this.worldTransform);
    out[3] = this.boundingSphere[3] * this.scale;
    return out;
  }

  /** Native transform reference (header:29). */
  @meta.blue.method
  @meta.implemented
  GetWorldTransform()
  {
    return this.worldTransform;
  }

  /**
   * The JS object is Carbon's raw-root picking identity (header:39).
   * GetID/GetPickingBatches are exposed directly and inherited by the concrete
   * primitive classes; the undecided ITr2Pickable declaration is not required.
   */
  @meta.blue.method
  @meta.adapted
  GetID(_areaId)
  {
    return this;
  }

  /** Both cpp-local native structs contain exactly one WorldMat (cpp:93-114). */
  @meta.blue.method
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
   * Native view-facing and distance-scaled transform (cpp:117-167). Camera
   * state lives on the JS context; matrix composition reverses Carbon order.
   */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.adapted
  UpdateTransform(context)
  {
    context ??= Tr2RenderContext_GetMainThreadRenderContext();
    const view = context.GetViewTransform(), local = this.localTransform;
    const world = this.worldTransform, { vec3_0 } = Tr2PrimitiveSet.scratch;
    this.scale = 1;
    if (this.scaleByDistanceToView)
    {
      const eye = context.GetViewPosition();
      this.scale = Math.abs(((eye[0] - local[12]) * view[2] +
        (eye[1] - local[13]) * view[6] + (eye[2] - local[14]) * view[10]) *
        Tr2PrimitiveSet.primitiveDistanceScaleMultiplier * context.GetFieldOfView());
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
  @meta.blue.method
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

meta.blue.interfaceTable({ interfaces: [Tr2PrimitiveSet, ITr2Renderable, INotify], chainTo: null })(Tr2PrimitiveSet, { kind: "class" });
