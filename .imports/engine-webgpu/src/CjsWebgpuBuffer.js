import { cloneJson } from "./core/freeze.js";
import { CjsWebgpuResource } from "./CjsWebgpuResource.js";

/**
 * Immutable WebGPU-facing buffer binding descriptor.
 */
export class CjsWebgpuBuffer extends CjsWebgpuResource
{

  /**
   * @param {object} values Descriptor values.
   */
  constructor(values = {})
  {
    super(values);
    this.bufferKind = String(values.bufferKind || "buffer");
    Object.freeze(this);
  }

  /**
   * @returns {object} Plain JSON-compatible descriptor.
   */
  ToJSON()
  {
    return {
      ...cloneJson(super.ToJSON()),
      bufferKind: this.bufferKind
    };
  }
}
