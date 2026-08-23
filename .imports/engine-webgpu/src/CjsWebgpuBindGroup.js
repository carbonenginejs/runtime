import { cloneJson, deepFreeze } from "./core/freeze.js";

/**
 * Immutable WebGPU-facing bind-group descriptor.
 */
export class CjsWebgpuBindGroup
{

  /**
   * @param {object} values Descriptor values.
   */
  constructor(values = {})
  {
    this.key = String(values.key || "");
    this.techniqueName = String(values.techniqueName || "");
    this.passIndex = Number.isInteger(values.passIndex) ? values.passIndex : 0;
    this.group = Number.isInteger(values.group) ? values.group : null;
    this.bindings = deepFreeze(Array.isArray(values.bindings) ? values.bindings.slice() : []);
    Object.freeze(this);
  }

  /**
   * @param {string} key Binding key.
   * @returns {any|null} Matching binding descriptor.
   */
  GetBinding(key)
  {
    return this.bindings.find((entry) => entry.key === key) || null;
  }

  /**
   * @param {number} binding Numeric WebGPU binding slot.
   * @returns {any|null} Matching binding descriptor.
   */
  GetBindingAt(binding)
  {
    return this.bindings.find((entry) => entry.binding === binding) || null;
  }

  /**
   * @returns {object} Plain JSON-compatible descriptor.
   */
  ToJSON()
  {
    return cloneJson({
      key: this.key,
      techniqueName: this.techniqueName,
      passIndex: this.passIndex,
      group: this.group,
      bindings: this.bindings.map((entry) => entry.ToJSON())
    });
  }
}
