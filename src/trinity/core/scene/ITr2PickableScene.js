// Source: trinity/trinity/ITr2PickableScene.h
// Source: trinity/trinity/ITr2PickableScene.cpp
import { CjsSchema, meta, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { ITr2Pickable } from "../ITr2Pickable.js";
import { TriBatchType, RenderingMode } from "#consts/graphics";
import { CullMode } from "#consts/render-context";
import { ALResult, Failed } from "#trinityal";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { screenToProjection, convertProjectionCoordToWorldPickRay } from "../view/pickRay.js";
import { TriProjection } from "../view/TriProjection.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";

/** Native picking algorithm with nested result records and virtual scene hooks. */
export class ITr2PickableScene
{
  static PickComponent = Object.freeze({ PICK_OBJECT: 1, PICK_AREA: 2, PICK_POSITION: 4, PICK_UV: 8 });

  /**
   * Native immediate pick, adapted to await WebGPU. Each pass captures its own
   * mapping after submission. Camera state is restored before yielding, and
   * the candidate list is retained by this call until decoding finishes.
   */
  @meta.adapted
  async PickObject(context, x, y, projection, view, viewport, results)
  {
    results.object = null;
    const requested = results.components;
    results.components = 0;
    if (!context.IsValid()) return;
    const pixel = screenToProjection(x, y, viewport);
    const ray = convertProjectionCoordToWorldPickRay(pixel.x, pixel.y, projection.GetMatrixWithoutViewAdjustment(), view.GetTransform());
    if (!ray) return;
    const start = vec3.clone(ray.start), direction = vec3.clone(ray.direction); // alloc: request-owned ray retained across asynchronous readbacks.
    const esm = context.GetEffectStateManager();
    const mappings = [];
    let candidates = [];
    context.PushProjection();
    context.PushViewTransform();
    esm.PushViewport();
    try
    {
      this.SetupTransformsForPicking(pixel.x, pixel.y, projection, view, viewport, context);
      candidates = this.GetPickingObjectsToRender(direction, context).filter(object => CjsSchema.cast(object, ITr2Pickable));
      const passes = this.GetRequiredPasses(requested);
      if (!candidates.length || !passes.length || !this.GetPickBuffer().PrepareResources(context)) return;
      const opaque = this.GetOpaquePickingBatchAccumulator();
      const picking = this.GetPickingBatchAccumulator();
      try
      {
        opaque.SetTriPoolAllocator(context.GetTriPoolAllocator());
        if (picking) picking.SetTriPoolAllocator(context.GetTriPoolAllocator());
        this.GetBatches(candidates, opaque, picking);
        for (const pass of passes)
        {
          if (Failed(context.BeginScene())) continue;
          const managed = esm.IsManagedRendering();
          // The caller's winding: BeginManagedRendering's default cull is CW,
          // which would end a mirrored-cull span (Tr2EffectStateManager.cpp:670-690).
          const callerCull = esm.IsCullModeInverted() ? CullMode.CULLMODE_CCW : CullMode.CULLMODE_CW;
          let rendered = false;
          try
          {
            // Each pick owns a submission. Discard the caller's cached bindings:
            // EndScene clears backend state even when the managed handles match.
            esm.BeginManagedRendering();
            this.SetPerFrameDataForPicking(context);
            rendered = this.RenderPicking(opaque, picking, pass, context);
          }
          finally
          {
            esm.EndManagedRendering();
            try { context.EndScene(); }
            finally
            {
              // Resume the caller's mode and winding with an empty cache before
              // any readback yields; restoring old handles would suppress its
              // next rebind.
              if (managed) esm.BeginManagedRendering(callerCull);
            }
          }
          if (rendered) mappings.push({ pass, mapping: this.GetPickBuffer().MapForReading(context) });
        }
      }
      finally
      {
        opaque.Clear();
        if (picking) picking.Clear();
      }
    }
    finally
    {
      esm.PopViewport();
      context.PopViewTransform();
      context.PopProjection();
    }
    for (const pending of mappings)
    {
      const mapped = await pending.mapping;
      if (mapped.result !== ALResult.S_OK) continue;
      // Native BufferResults is a nested record, not an independent class.
      const buffer = { objectId: 0xffffffff, areaId: 0, depth: 0, uv: [0, 0] };
      this.DecodeBufferPixel(mapped.data, pending.pass, buffer);
      this.GetPickBuffer().UnmapForReading(context);
      results.components |= pending.pass;
      if (pending.pass & 1)
      {
        results.object = buffer.objectId < candidates.length
          ? CjsSchema.cast(candidates[buffer.objectId], ITr2Pickable).GetID(buffer.areaId) : null;
      }
      if (pending.pass & 2) results.area = buffer.areaId;
      if (pending.pass & 4) results.position = vec3.scaleAndAdd(vec3.create(), start, direction, buffer.depth - projection.zn); // alloc: position transferred into the caller-owned result.
      if (pending.pass & 8) results.uv = buffer.uv;
    }
  }

  /** Native projection crop, with column-vector multiplication order reversed. */
  @meta.adapted
  SetupTransformsForPicking(fx, fy, projection, view, viewport, context)
  {
    const mat4_0 = mat4.alloc();
    try
    {
      const crop = mat4.identity(mat4_0);
      crop[0] = viewport.width;
      crop[5] = viewport.height;
      crop[12] = -fx * viewport.width;
      crop[13] = -fy * viewport.height;
      const original = projection.GetMatrixWithoutViewAdjustment();
      // Carbon sets the original projection before AdjustProjection, which
      // preserves its FOV. Custom/off-center projections have no stored fov;
      // deriving it from the cropped matrix would shrink distance-scaled tools.
      const fieldOfView = projection.projectionType === TriProjection.ORTHO ? 1
        : projection.projectionType === TriProjection.FOV ? projection.fov
          : (original[5] ? 2 * Math.atan(1 / original[5]) : 0);
      mat4.multiply(crop, crop, original);
      context.SetViewTransform(view.GetTransform());
      context.SetProjection(crop, fieldOfView);
    }
    finally
    {
      mat4.unalloc(mat4_0);
    }
  }

  /** Native object indices remain local to this call's retained candidate list. */
  @meta.adapted
  GetBatches(objects, opaque, picking)
  {
    for (let i = 0; i < objects.length; i++)
    {
      const data = objects[i].GetPerObjectData(opaque);
      if (!data) continue;
      data.SetUserData(i);
      const count = opaque.GetBatchCount();
      objects[i].GetBatches(opaque, TriBatchType.TRIBATCHTYPE_OPAQUE, data);
      if (opaque.GetBatchCount() === count) objects[i].GetBatches(opaque, TriBatchType.TRIBATCHTYPE_OPAQUE_PREPASS, data);
      if (picking) objects[i].GetBatches(picking, TriBatchType.TRIBATCHTYPE_PICKING, data);
    }
    opaque.Finalize();
    if (picking) picking.Finalize();
  }

  /** The native generic opaque/picking pass; primitives override its draw choice. */
  @meta.adapted
  RenderPicking(opaque, picking, pass, context)
  {
    Tr2VariableStore.globalStore().RegisterVariableInternal("PickingComponents", TriVariableContentType.TRIVARIABLE_FLOAT4, [pass & 1 ? 1 : 0, pass & 2 ? 1 : 0, pass & 4 ? 1 : 0, pass & 8 ? 1 : 0]);
    const target = this.GetPickBuffer();
    if (!target.BeginRendering(1, context)) return false;
    try
    {
      context.ApplyStandardStates(RenderingMode.RM_PICKING);
      if (opaque.GetBatchCount()) context.RenderBatchesForPicking__ObjectId(opaque, "Picking");
      if (picking && this.RenderPickingAreasForComponents(pass)) context.RenderBatchesForPicking__ObjectId(picking, "Main");
      return true;
    }
    finally
    {
      target.EndRendering(context);
    }
  }

  /** Native virtual scene hook. */
  @meta.abstract
  SetPerFrameDataForPicking(_context) {}
  /** Native virtual scene hook. */
  @meta.abstract
  GetPickingObjectsToRender(_direction, _context) {}
  /** Native virtual scene hook. */
  @meta.abstract
  GetOpaquePickingBatchAccumulator() {}
  /** Native virtual scene hook. */
  @meta.abstract
  GetPickingBatchAccumulator() {}
  /** Native virtual scene hook. */
  @meta.abstract
  GetRequiredPasses(_components) {}
  /** Native virtual scene hook. */
  @meta.abstract
  RenderPickingAreasForComponents(_pass) {}
  /** Native virtual scene hook. */
  @meta.abstract
  DecodeBufferPixel(_data, _pass, _results) {}
  /** Native virtual scene hook. */
  @meta.abstract
  GetPickBuffer() {}
}

CjsSchema.blue.define(ITr2PickableScene, { className: "ITr2PickableScene" });

CjsSchema.decorateMethod(ITr2PickableScene, "PickObject", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "SetupTransformsForPicking", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "GetBatches", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "RenderPicking", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "SetPerFrameDataForPicking", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "GetPickingObjectsToRender", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "GetOpaquePickingBatchAccumulator", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "GetPickingBatchAccumulator", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "GetRequiredPasses", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "RenderPickingAreasForComponents", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "DecodeBufferPixel", blue.method);
CjsSchema.decorateMethod(ITr2PickableScene, "GetPickBuffer", blue.method);
