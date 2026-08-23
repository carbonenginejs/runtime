import { CjsBackendCandidate } from "#contracts";
import { CjsWebgpuDevice } from "./CjsWebgpuDevice.js";


function freezeLimits(value)
{
  return value == null ? value : Object.freeze({ ...value });
}


function freezeFeatures(value)
{
  return value == null ? value : Object.freeze(Array.from(value, String));
}


/**
 * WebGPU participant in runtime backend selection.
 *
 * Content requirements are visible to the composition layer. Native WebGPU
 * acquisition inputs remain engine-owned and are used only when proof runs.
 */
export class CjsWebgpuBackendCandidate extends CjsBackendCandidate
{

  name = "webgpu";

  /**
   * @param {object} [options]
   * @param {string} [options.label]
   * @param {object} [options.limits]
   * @param {Iterable<string>} [options.features]
   * @param {object} [options.requestOptions]
   */
  constructor(options = {})
  {
    super();

    const requestOptions = options.requestOptions === undefined ? {} : options.requestOptions;
    if (!requestOptions || typeof requestOptions !== "object" || Array.isArray(requestOptions))
    {
      throw new TypeError("CjsWebgpuBackendCandidate requestOptions must be an object.");
    }
    if (Object.prototype.hasOwnProperty.call(requestOptions, "deviceDescriptor"))
    {
      throw new TypeError(
        "CjsWebgpuBackendCandidate requestOptions cannot override the core-resolved device descriptor."
      );
    }

    this.label = options.label == null ? options.label : String(options.label);
    this.limits = freezeLimits(options.limits);
    this.features = freezeFeatures(options.features);
    this.requestOptions = Object.freeze({ ...requestOptions });
  }

  /**
   * Acquires the WebGPU device that proves this candidate.
   *
   * @param {object} context - Resolved backend-selection context.
   * @returns {Promise<CjsWebgpuDevice>} Ready WebGPU device boundary.
   */
  Prove(context)
  {
    if (!context || typeof context !== "object")
    {
      throw new TypeError("CjsWebgpuBackendCandidate.Prove requires a selection context.");
    }

    return CjsWebgpuDevice.Request({
      ...this.requestOptions,
      deviceDescriptor: context.descriptor
    });
  }

}
