// Source: trinity/trinity/Tr2DirectInstanceData.h
//   trinity/trinity/Tr2DirectInstanceData.cpp
//   trinity/trinity/Tr2DirectInstanceData_Blue.cpp
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { withITr2InstanceData } from "./ITr2InstanceData.js";


/**
 * Instance data whose buffer lives entirely on the GPU: Trinity keeps only the
 * CPU-side layout metadata, stride, instance count and bounds.
 */
@type.define({ className: "Tr2DirectInstanceData", family: "trinityCore" })
export class Tr2DirectInstanceData extends withITr2InstanceData(CjsModel)
{

  /** m_aabb.m_max (Vector3) [READ] */
  @io.read
  @type.vec3
  aabbMax = vec3.create();

  /** m_aabb.m_min (Vector3) [READ] */
  @io.read
  @type.vec3
  aabbMin = vec3.create();

  /** GetCount (MAP_PROPERTY_READONLY "count") - number of instances. */
  @io.read
  @type.uint32
  count = 0;

  /** m_layout (Tr2VertexDefinition) - CPU metadata for the direct GPU stream. */
  #layout = Object.freeze([]);

  #stride = 0;

  /**
   * Assigns the CPU-side instance bounds without realizing a GPU buffer.
   * Accepts the JavaScript `{ min, max }` box representation; a two-vector
   * form is retained for consistency with `Tr2RuntimeInstanceData`.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
  GetCount()
  {
    return this.count;
  }

  /**
   * Byte stride of one instance, computed by SetLayout as the largest offset
   * plus element size in the layout.
   */
  @carbon.method
  @impl.implemented
  GetStride()
  {
    return this.#stride;
  }

  /**
   * Records the CPU vertex-layout metadata. Carbon computes the stride as
   * max(offset + elementSize); the direct GPU buffer itself is realized by
   * the engine (GetData/UpdateData/DestroyData are engine-owned).
   */
  @carbon.method
  @impl.adapted
  SetLayout(layout)
  {
    if (!Array.isArray(layout))
    {
      throw new TypeError("Layout must be an array of element descriptors");
    }
    let stride = 0;
    for (const element of layout)
    {
      const offset = Number(element?.offset) || 0;
      const byteSize = Number(element?.byteSize) || 0;
      stride = Math.max(stride, offset + byteSize);
    }
    this.#layout = layout.slice();
    this.#stride = stride;
  }

  /** The frozen element-descriptor list recorded by SetLayout. */
  @carbon.method
  @impl.implemented
  GetLayout()
  {
    return this.#layout;
  }

  /**
   * A detached copy of the recorded bounds; the buffer index is ignored because
   * only one stream is modelled.
   */
  @carbon.method
  @impl.implemented
  GetInstanceBufferBoundingBox(_bufferIndex = 0)
  {
    return {
      min: vec3.clone(this.aabbMin),
      max: vec3.clone(this.aabbMax)
    };
  }

}
