// Source: trinity/trinity/Tr2PrimitiveScene.h
// Source: trinity/trinity/Tr2PrimitiveScene.cpp
// Source: trinity/trinity/Tr2PrimitiveScene_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { ITr2Scene } from "../ITr2Scene.js";
import { ITr2PickableScene } from "./ITr2PickableScene.js";
import { Tr2PickBuffer } from "./Tr2PickBuffer.js";
import { PixelFormat, ShaderType } from "#consts/render-context";
import { RenderingMode, TriBatchType } from "#consts/graphics";
import { TriRenderBatchAccumulator } from "../batch/TriRenderBatch/index.js";
import { TriPoolAllocator } from "../rawData/TriPoolAllocator.js";
import { RawData } from "../rawData/RawData.js";
import { Tr2RenderUtils } from "../Tr2RenderUtils.js";
import { PER_FRAME_VS } from "../Tr2Renderer.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { TriProjection } from "../view/TriProjection.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";

/** Native primitive scene and tool handles. Text rendering is a separate port. */
@blue.define("Tr2PrimitiveScene")
@blue.inherit(ITr2Scene)
@blue.interface(ITr2Scene)
export class Tr2PrimitiveScene extends ITr2PickableScene
{
  @blue.read
  @blue.persist
  @type.list("Tr2PrimitiveSet")
  primitives = [];

  @blue.read
  @blue.persist
  @type.list("Tr2PrimitiveText")
  textLabels = [];

  @blue.readwrite
  @type.rootRef("Tr2ManipulationTool")
  manipulator = null;

  @type.rawStruct("Tr2PickBuffer")
  _pickBuffer = new Tr2PickBuffer(PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT, 1);
  @type.rawStruct("TriPoolAllocator")
  _allocator = new TriPoolAllocator().RegisterCatalog();
  @type.rawStruct("TriRenderBatchAccumulator")
  _opaqueBatches = new TriRenderBatchAccumulator().SetTriPoolAllocator(this._allocator);
  @type.rawStruct("TriRenderBatchAccumulator")
  _pickingBatches = new TriRenderBatchAccumulator().SetTriPoolAllocator(this._allocator);
  @type.rawStruct("Tr2ConstantBufferAL")
  _vertexConstants = null;
  _frameData = RawData.create("Tr2PerFrameVSData");

  /** Native device-resource registration with lazy attachment preparation. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** Immediate object picking becomes awaitable on browser backends. */
  @blue.method
  @meta.adapted
  @meta.renamed("PickObjectOnly")
  async PickObject(x, y, projection, view, viewport, _flags = 0)
  {
    const result = { components: 1, object: null };
    await super.PickObject(Tr2RenderContext_GetMainThreadRenderContext(), x, y, projection, view, viewport, result);
    return result.object;
  }

  /** Native object/point tuple, with an awaitable readback. */
  @blue.method
  @meta.adapted
  async PickPointAndObject(x, y, projection, view, viewport)
  {
    const result = { components: 5, object: null };
    await super.PickObject(Tr2RenderContext_GetMainThreadRenderContext(), x, y, projection, view, viewport, result);
    return result.object ? [result.object, result.position] : null;
  }

  /** Native back-to-front primitive draw, inside the caller's render context. */
  @meta.adapted
  Render(context)
  {
    if (this.textLabels.length) throw new Error("Tr2PrimitiveText rendering is not ported.");
    const objects = this.GetPickingObjectsToRender(null, context);
    objects.sort((a, b) => b.GetSortValue(context) - a.GetSortValue(context));
    this.SetupPerFrameData(context);
    const esm = context.GetEffectStateManager(), inverted = esm.IsDepthTestInverted(), managed = esm.IsManagedRendering();
    esm.BeginManagedRendering();
    try
    {
      this._opaqueBatches.SetTriPoolAllocator(this._allocator);
      for (const object of objects)
      {
        object.GetBatches(this._opaqueBatches, TriBatchType.TRIBATCHTYPE_OPAQUE, object.GetPerObjectData(this._opaqueBatches));
      }
      this._opaqueBatches.Finalize();
      esm.SetInvertedDepthTest(true);
      esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
      context.RenderBatches(this._opaqueBatches);
    }
    finally
    {
      this._opaqueBatches.Clear();
      this._allocator.Clear();
      esm.SetInvertedDepthTest(inverted);
      if (!managed) esm.EndManagedRendering();
    }
  }

  /** Native empty scene update; manipulators update when rendered or picked. */
  @meta.implemented
  Update(_realTime, _simTime)
  {
  }

  /** Native empty debug-render entry point. */
  @meta.implemented
  RenderDebugInfo(_context)
  {
  }

  /** Native empty prepare hook; constants are created when first filled. */
  @meta.implemented
  OnPrepareResources()
  {
    return true;
  }

  /** Explicitly drives the native resource hook while its C++ base has no JS port. */
  @meta.adapted
  PrepareResources()
  {
    return this.OnPrepareResources();
  }

  /** Native device-resource diagnostic description. */
  @meta.adapted
  GetDescription()
  {
    return "Tr2PrimitiveScene";
  }

  /** Native constant-buffer release. */
  @meta.adapted
  ReleaseResources()
  {
    if (this._vertexConstants) this._vertexConstants.Destroy();
    this._vertexConstants = null;
  }

  /** Explicit destruction releases the owned picker and device registration. */
  @meta.adapted
  Destroy()
  {
    this.ReleaseResources();
    this._pickBuffer.Destroy();
    this._opaqueBatches.Clear();
    this._pickingBatches.Clear();
    this._allocator.Clear();
    TriDevice.UnregisterResource(this);
  }

  /** Native orthographic crop preserves its width-based square pixel extent. */
  @meta.adapted
  SetupTransformsForPicking(fx, fy, projection, view, viewport, context)
  {
    const mat4_0 = mat4.alloc();
    try
    {
      if (projection.projectionType !== TriProjection.ORTHO)
        return super.SetupTransformsForPicking(fx, fy, projection, view, viewport, context);
      const width = projection.left, height = projection.top;
      const halfPixel = (width / viewport.width) / 2;
      const x = fx * width / 2, y = fy * height / 2;
      const matrix = mat4.identity(mat4_0);
      mat4.orthoZO(matrix, x - halfPixel, x + halfPixel, y - halfPixel, y + halfPixel, projection.zn, projection.zf);
      context.SetViewTransform(view.GetTransform());
      context.SetProjection(matrix, 1);
    }
    finally
    {
      mat4.unalloc(mat4_0);
    }
  }

  /** Native zero-initialized per-frame struct, with the three transposed matrices. */
  @meta.adapted
  SetupPerFrameData(context)
  {
    const mat4_0 = mat4.alloc();
    try
    {
      const data = this._frameData;
      data.GetData().fill(0);
      const view = context.GetViewTransform();
      const projection = context.GetReversedDepthProjectionTransform();
      const combined = mat4.multiply(mat4.identity(mat4_0), projection, view);
      data.SetAndTranspose("ViewMat", view);
      data.SetAndTranspose("ProjectionMat", projection);
      data.SetAndTranspose("ViewProjectionMat", combined);
      this._vertexConstants ??= context.CreateConstantBuffer();
      const bytes = data.GetData();
      Tr2RenderUtils.fillAndSetConstants(this._vertexConstants, bytes, bytes.byteLength, 1 << ShaderType.VERTEX_SHADER, PER_FRAME_VS, context);
    }
    finally
    {
      mat4.unalloc(mat4_0);
    }
  }

  /** Native per-frame hook. */
  @meta.implemented
  SetPerFrameDataForPicking(context)
  {
    this.SetupPerFrameData(context);
  }

  /** Native primitive and current manipulator visibility gather. */
  @meta.adapted
  GetPickingObjectsToRender(_direction, context = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const objects = [];
    for (const primitive of this.primitives)
    {
      primitive.UpdateTransform(context);
      objects.push(primitive);
    }
    if (this.manipulator)
    {
      this.manipulator.Update(context);
      objects.push(...this.manipulator.GetPrimitivesToRender());
    }
    return objects;
  }

  /** Native scene-owned accumulator. */
  @meta.implemented
  GetOpaquePickingBatchAccumulator()
  {
    return this._opaqueBatches;
  }
  /** Native scene-owned accumulator. */
  @meta.implemented
  GetPickingBatchAccumulator()
  {
    return this._pickingBatches;
  }
  /** Native primitive picking areas always participate. */
  @meta.implemented
  RenderPickingAreasForComponents(_pass)
  {
    return true;
  }
  /** Native scene-owned float picking target. */
  @meta.implemented
  GetPickBuffer()
  {
    return this._pickBuffer;
  }

  /** Returns native pass masks instead of an output array and count. */
  @meta.adapted
  GetRequiredPasses(requested)
  {
    const passes = [];
    if (requested & 3) passes.push(requested & 3);
    if (requested & 8) passes.push(8);
    if (requested & 4)
    {
      if (passes.length) passes[0] |= 4;
      else passes.push(4);
    }
    return passes;
  }

  /** Native float decoding; the donor does not write areaId for primitives. */
  @meta.adapted
  DecodeBufferPixel(data, pass, results)
  {
    const pixel = new DataView(data.buffer, data.byteOffset, 16);
    const b = pixel.getFloat32(0, true), g = pixel.getFloat32(4, true);
    const r = pixel.getFloat32(8, true), a = pixel.getFloat32(12, true);
    if (pass & 8) results.uv = [b, g];
    else results.objectId = a === 1 ? 0xffffffff : (((Math.trunc(g) & 0xffff) - 1) >>> 0);
    results.depth = r;
  }

  /** Native primitive pass draws dedicated picking geometry only. */
  @meta.adapted
  RenderPicking(_opaque, picking, pass, context)
  {
    const esm = context.GetEffectStateManager(), inverted = esm.IsDepthTestInverted();
    esm.SetInvertedDepthTest(true);
    Tr2VariableStore.globalStore().RegisterVariableInternal("PickingComponents", TriVariableContentType.TRIVARIABLE_FLOAT4, [pass & 1 ? 1 : 0, pass & 2 ? 1 : 0, pass & 4 ? 1 : 0, pass & 8 ? 1 : 0]);
    try
    {
      if (!this._pickBuffer.BeginRendering(0, context)) return false;
      try
      {
        if (picking && this.RenderPickingAreasForComponents(pass))
        {
          picking.Finalize();
          esm.ApplyStandardStates(RenderingMode.RM_PICKING);
          context.RenderBatchesForPicking__ObjectId(picking, "Main");
        }
        return true;
      }
      finally { this._pickBuffer.EndRendering(context); }
    }
    finally { esm.SetInvertedDepthTest(inverted); }
  }
}

CjsSchema.decorateMethod(Tr2PrimitiveScene, "Render", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "Update", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "RenderDebugInfo", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "OnPrepareResources", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "PrepareResources", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "GetDescription", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "ReleaseResources", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "SetupTransformsForPicking", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "SetupPerFrameData", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "SetPerFrameDataForPicking", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "GetPickingObjectsToRender", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "GetOpaquePickingBatchAccumulator", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "GetPickingBatchAccumulator", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "RenderPickingAreasForComponents", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "GetPickBuffer", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "GetRequiredPasses", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "DecodeBufferPixel", blue.method);
CjsSchema.decorateMethod(Tr2PrimitiveScene, "RenderPicking", blue.method);
