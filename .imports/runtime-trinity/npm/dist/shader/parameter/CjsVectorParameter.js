import { CjsParameter } from './CjsParameter.js';

/**
 * Base for the multi-component shader parameters, adding fixed-length
 * destination reads and writes on top of CjsParameter.
 */
class CjsVectorParameter extends CjsParameter {
  /** Whether a value can receive `length` components written into it. */
  static isVectorDestination(value, length) {
    return CjsVectorParameter.isWritableNumberArray(value, length);
  }

  /**
   * Copies `length` components out of a destination into `out` in place; returns
   * `out`.
   */
  static readVectorDestination(destination, out, length) {
    for (let i = 0; i < length; i++) {
      out[i] = destination[i];
    }
    return out;
  }

  /**
   * Copies `length` components into a destination in place; the destination is
   * assumed to be large enough.
   */
  static writeVectorDestination(destination, value, length) {
    for (let i = 0; i < length; i++) {
      destination[i] = value[i];
    }
  }

  /**
   * Copies `length` components from `value` into `out` in place; returns `out`
   * so callers can hand it straight back.
   */
  static copyNumberArray(out, value, length) {
    for (let i = 0; i < length; i++) {
      out[i] = value[i];
    }
    return out;
  }
}

export { CjsVectorParameter };
//# sourceMappingURL=CjsVectorParameter.js.map
