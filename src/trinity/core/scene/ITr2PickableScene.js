// Source: trinity/trinity/ITr2PickableScene.h
// Source: trinity/trinity/ITr2PickableScene.cpp
import { CjsSchema, meta, blue } from "#schema";
import { vec3 } from "#math/vec3";
import { ITr2Pickable } from "../ITr2Pickable.js";
import { TriBatchType, RenderingMode } from "#consts/graphics";
import { CullMode } from "#consts/render-context";
import { ALResult, Failed } from "#trinityal";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { screenToProjection, convertProjectionCoordToWorldPickRay } from "../view/pickRay.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
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
    Tr2Renderer.PushProjection();
    Tr2Renderer.PushViewTransform();
    esm.PushViewport();
    try
    {
      this.SetupTransformsForPicking(pixel.x, pixel.y, projection, view, viewport);
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
      Tr2Renderer.PopViewTransform();
      Tr2Renderer.PopProjection();
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

  /**
   * Carbon SetupTransformsForPicking (ITr2PickableScene.cpp:177-192): the
   * view and projection, then the projection scaled so one pixel covers the
   * viewport and centred on the pick point. AdjustProjection leaves the
   * translation row alone, so an orthographic projection is not recentred;
   * Carbon's own Tr2PrimitiveScene overrides for exactly that.
   */
  @meta.implemented
  SetupTransformsForPicking(fx, fy, projection, view, viewport)
  {
    Tr2Renderer.SetViewTransform(view.GetTransform());
    projection.SetProjection();

    // Projection is set up to scale the image such that the viewport is
    // covered by one pixel, translated to centre on the pick ray origin.
    const scaling = [ viewport.width, viewport.height ];
    const translation = [ -fx * scaling[0], -fy * scaling[1] ];
    Tr2Renderer.AdjustProjection(scaling, translation);
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
