// Source: trinity/trinity/Tr2DirectInstanceData.h
//   trinity/trinity/Tr2DirectInstanceData.cpp
//   trinity/trinity/Tr2DirectInstanceData_Blue.cpp
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { ITr2InstanceData } from "./ITr2InstanceData/index.js";


/**
 * Owns a directly writable AL instance buffer, its declaration and bounds.
 * The selected AL supplies mapping storage; this provider keeps no CPU copy.
 */
@meta.define({ className: "Tr2DirectInstanceData", family: "trinityCore" })
@meta.blue.inherit(ITr2InstanceData)
export class Tr2DirectInstanceData
{

  /** m_aabb.m_max (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  aabbMax = vec3.create();

  /** m_aabb.m_min (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  aabbMin = vec3.create();

  /** GetCount (MAP_PROPERTY_READONLY "count") - number of instances. */
  @meta.blue.read
  @meta.type.uint32
  count = 0;

  /** m_layout (Tr2VertexDefinition) - CPU metadata for the direct GPU stream. */
  _layout = [];

  _stride = 0;

  _vertexDeclaration = Tr2EffectStateManager.Unknown;

  _vertexBuffer = new Tr2BufferAL();

  /** Registers Carbon's inherited Tr2DeviceResource lifetime. */
  constructor()
  {
    TriDevice.RegisterResource(this);
  }

  /** Explicit JS teardown replaces the native resource destructor. */
  @meta.ours
  Destroy()
  {
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }

  /** Resets AL ownership explicitly in place of C++ RAII assignment (cpp:25-29). */
  @meta.blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclaration = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
  }

  /** Inherited Tr2DeviceResource.cpp:21-32 reset guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed() && !this.OnPrepareResources()) return false;
    return true;
  }

  /**
   * Recreates the buffer and declaration (cpp:39-65). JavaScript supplies an
   * AL description object instead of the native stride/count overload.
   */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
  {
    if (this._stride && this.count &&
      (!this._vertexBuffer.IsValid() || this._vertexBuffer.GetDesc().count < this.count))
    {
      const context = Tr2RenderContext_GetMainThreadRenderContext();
      const result = this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        this._stride, this.count, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
      ), null, context);
      if (Failed(result)) return false;
    }
    const items = this._layout.items ?? this._layout;
    if (this._vertexDeclaration === Tr2EffectStateManager.Unknown && items.length)
    {
      this._vertexDeclaration = Tr2EffectStateManager.getVertexDeclarationHandle(this._layout);
    }
    return true;
  }

  /** Both a declaration and a valid AL allocation are required (cpp:74-77). */
  @meta.blue.method
  @meta.implemented
  IsInstanceDataReady()
  {
    return this._vertexDeclaration !== Tr2EffectStateManager.Unknown && this._vertexBuffer.IsValid();
  }

  /** Returns the borrowed AL buffer and current row geometry (cpp:88-93). */
  @meta.blue.method
  @meta.implemented
  GetInstanceData(_bufferIndex = 0, _screenSize = 0)
  {
    return { buffer: this._vertexBuffer, offset: 0, stride: this._stride, count: this.count };
  }

  /** The sole stream's declaration handle; buffer index is unused (cpp:103-106). */
  @meta.blue.method
  @meta.implemented
  GetInstanceBufferVertexDeclaration(_bufferIndex = 0)
  {
    return this._vertexDeclaration;
  }

  /**
   * Maps count rows for writing, growing only when required (cpp:168-204).
   * The AL returns a byte view instead of Carbon's output pointer and HRESULT.
   */
  @meta.blue.method
  @meta.adapted
  GetData(count)
  {
    this.count = count;
    if (!this._stride || !this.count) return null;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (!this._vertexBuffer.IsValid() || this._vertexBuffer.GetDesc().count < this.count)
    {
      const result = this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        this._stride, this.count, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
      ), null, context);
      if (Failed(result)) return null;
    }
    const mapping = this._vertexBuffer.MapForWriting(context);
    return Failed(mapping.result) ? null : mapping.data;
  }

  /** Publishes writes by unmapping the valid buffer (cpp:211-221). */
  @meta.blue.method
  @meta.implemented
  UpdateData()
  {
    if (!this._vertexBuffer.IsValid()) return;
    this._vertexBuffer.UnmapForWriting(Tr2RenderContext_GetMainThreadRenderContext());
  }

  /** Explicit AL release replaces C++ RAII; layout survives (cpp:236-240). */
  @meta.blue.method
  @meta.adapted
  DestroyData()
  {
    this._vertexBuffer.Destroy();
    this.count = 0;
  }

  /**
   * Assigns the CPU-side instance bounds without realizing a GPU buffer.
   * Accepts the JavaScript `{ min, max }` box representation; a two-vector
   * form is retained for consistency with `Tr2RuntimeInstanceData`.
   */
  @meta.blue.method
  @meta.adapted
  SetBoundingBox(bounds, maxBounds)
  {
    const min = maxBounds === undefined ? bounds?.min ?? bounds?.minBounds : bounds;
    const max = maxBounds === undefined ? bounds?.max ?? bounds?.maxBounds : maxBounds;
    if (!min || !max)
    {
      throw new TypeError("Bounding box requires min and max vectors");
    }
    vec3.copy(this.aabbMin, min);
    vec3.copy(this.aabbMax, max);
  }

  /** Number of instances in the GPU-side buffer. */
  @meta.blue.method
  @meta.implemented
  GetCount()
  {
    return this.count;
  }

  /**
   * Byte stride of one instance, computed by SetLayout as the largest offset
   * plus element size in the layout.
   */
  @meta.blue.method
  @meta.implemented
  GetStride()
  {
    return this._stride;
  }

  /**
   * Discards rows and interns a stream-zero layout (cpp:130-150). JS accepts
   * the existing element-array form as well as Tr2VertexDefinition; explicit
   * byteSize descriptors retain their existing representation.
   */
  @meta.blue.method
  @meta.adapted
  SetLayout(layout)
  {
    const items = layout.items ?? layout;
    this._vertexBuffer.Destroy();
    this._stride = 0;
    this.count = 0;
    for (const element of items)
    {
      if ((element.stream ?? 0) !== 0)
      {
        console.error("Tr2DirectInstanceData: vertex layout needs to reference stream 0 only");
        return;
      }
      const byteSize = element.byteSize ?? Tr2VertexDefinition.getDataTypeSizeInBytes(element.type);
      this._stride = Math.max(this._stride, element.offset + byteSize);
    }
    const copied = items.map(element => ({ ...element }));
    if (Array.isArray(layout)) this._layout = copied;
    else
    {
      this._layout = new Tr2VertexDefinition();
      this._layout.items = copied;
      this._layout.nextOffset = layout.nextOffset.slice();
    }
    this._vertexDeclaration = Tr2EffectStateManager.getVertexDeclarationHandle(this._layout);
  }

  /** The owned vertex definition recorded by SetLayout. */
  @meta.blue.method
  @meta.implemented
  GetLayout()
  {
    return this._layout;
  }

  /**
   * A detached copy of the recorded bounds; the buffer index is ignored because
   * only one stream is modelled.
   */
  @meta.blue.method
  @meta.implemented
  GetInstanceBufferBoundingBox(_bufferIndex = 0)
  {
    return {
      min: vec3.clone(this.aabbMin),
      max: vec3.clone(this.aabbMax)
    };
  }

}
