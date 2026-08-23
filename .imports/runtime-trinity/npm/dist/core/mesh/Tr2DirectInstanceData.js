import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_aabbMax, _init_extra_aabbMax, _init_aabbMin, _init_extra_aabbMin, _init_count, _init_extra_count;

/**
 * Instance data whose buffer lives entirely on the GPU: Trinity keeps only the
 * CPU-side layout metadata, stride, instance count and bounds.
 */
let _Tr2DirectInstanceDat;
class Tr2DirectInstanceData extends CjsModel {
  static {
    ({
      e: [_init_aabbMax, _init_extra_aabbMax, _init_aabbMin, _init_extra_aabbMin, _init_count, _init_extra_count, _initProto],
      c: [_Tr2DirectInstanceDat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2DirectInstanceData",
      family: "trinityCore"
    })], [[[io, io.read, type, type.vec3], 16, "aabbMax"], [[io, io.read, type, type.vec3], 16, "aabbMin"], [[io, io.read, type, type.uint32], 16, "count"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBoundingBox"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetStride"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetLayout"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLayout"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInstanceBufferBoundingBox"]], 0, void 0, CjsModel));
  }
  /** m_aabb.m_max (Vector3) [READ] */
  aabbMax = (_initProto(this), _init_aabbMax(this, vec3.create()));

  /** m_aabb.m_min (Vector3) [READ] */
  aabbMin = (_init_extra_aabbMax(this), _init_aabbMin(this, vec3.create()));

  /** GetCount (MAP_PROPERTY_READONLY "count") - number of instances. */
  count = (_init_extra_aabbMin(this), _init_count(this, 0));

  /** m_layout (Tr2VertexDefinition) - CPU metadata for the direct GPU stream. */
  #layout = (_init_extra_count(this), Object.freeze([]));
  #stride = 0;

  /**
   * Assigns the CPU-side instance bounds without realizing a GPU buffer.
   * Accepts the JavaScript `{ min, max }` box representation; a two-vector
   * form is retained for consistency with `Tr2RuntimeInstanceData`.
   */
  SetBoundingBox(bounds, maxBounds) {
    const min = maxBounds === undefined ? bounds?.min ?? bounds?.minBounds : bounds;
    const max = maxBounds === undefined ? bounds?.max ?? bounds?.maxBounds : maxBounds;
    if (!min || !max) {
      throw new TypeError("Bounding box requires min and max vectors");
    }
    vec3.copy(this.aabbMin, min);
    vec3.copy(this.aabbMax, max);
  }

  /** Number of instances in the GPU-side buffer. */
  GetCount() {
    return this.count;
  }

  /**
   * Byte stride of one instance, computed by SetLayout as the largest offset
   * plus element size in the layout.
   */
  GetStride() {
    return this.#stride;
  }

  /**
   * Records the CPU vertex-layout metadata. Carbon computes the stride as
   * max(offset + elementSize); the direct GPU buffer itself is realized by
   * the engine (GetData/UpdateData/DestroyData are engine-owned).
   */
  SetLayout(layout) {
    if (!Array.isArray(layout)) {
      throw new TypeError("Layout must be an array of element descriptors");
    }
    let stride = 0;
    for (const element of layout) {
      const offset = Number(element?.offset) || 0;
      const byteSize = Number(element?.byteSize) || 0;
      stride = Math.max(stride, offset + byteSize);
    }
    this.#layout = Object.freeze(layout.slice());
    this.#stride = stride;
  }

  /** The frozen element-descriptor list recorded by SetLayout. */
  GetLayout() {
    return this.#layout;
  }

  /**
   * A detached copy of the recorded bounds; the buffer index is ignored because
   * only one stream is modelled.
   */
  GetInstanceBufferBoundingBox(_bufferIndex = 0) {
    return {
      min: vec3.clone(this.aabbMin),
      max: vec3.clone(this.aabbMax)
    };
  }
  static {
    _initClass();
  }
}

export { _Tr2DirectInstanceDat as Tr2DirectInstanceData };
//# sourceMappingURL=Tr2DirectInstanceData.js.map
