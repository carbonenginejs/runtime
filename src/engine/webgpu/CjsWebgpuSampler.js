import { cloneJson } from "./core/freeze.js";
import { CjsWebgpuResource } from "./CjsWebgpuResource.js";

/**
 * Immutable WebGPU-facing sampler binding descriptor.
 */
export class CjsWebgpuSampler extends CjsWebgpuResource
{

  /**
   * @param {object} values Descriptor values.
   */
  constructor(values = {})
  {
    super(values);
    Object.freeze(this);
  }

  /**
   * @returns {object} Plain JSON-compatible descriptor.
   */
  ToJSON()
  {
    return cloneJson(super.ToJSON());
  }
}
