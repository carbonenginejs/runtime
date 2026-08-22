import { CjsFormat } from '../../format/CjsFormat.js';
import { CjsFsd32Format } from './32/CjsFsd32Format.js';
import { CjsFsd64Format } from './64/CjsFsd64Format.js';
import './64/core/CjsFsd64Binary.js';
import './64/core/CjsFsd64SchemaDecoder.js';

const OUTPUT_JSON = "json";

/**
 * Normal FSD format-pipeline entry point.
 *
 * Modern cFSD identifies itself through its 32-byte envelope. Legacy FSD is
 * headerless and therefore must be identified by the caller/profile through
 * `bitWidth: 32` or `variant: "fsd32"` until its schema-driven reader exists.
 */
class CjsFsdFormat extends CjsFormat {
  static inspect(input, options = {}) {
    if (CjsFsd32Format.is(input, options)) {
      return CjsFsd32Format.inspect(input, options);
    }
    return CjsFsd64Format.inspect(input, options);
  }
  static probeSupport(input, options = {}) {
    if (CjsFsd32Format.is(input, options)) {
      return CjsFsd32Format.probeSupport(input, options);
    }
    return CjsFsd64Format.probeSupport(input, options);
  }
  static read(input, options = {}) {
    if (CjsFsd32Format.is(input, options)) {
      return CjsFsd32Format.read(input, options);
    }
    if (CjsFsd64Format.is(input)) {
      return CjsFsd64Format.read(input, options);
    }
    const error = new Error("FSD input is neither an identified legacy 32-bit layout nor a valid modern 64-bit cFSD container.");
    error.code = "CJS_FSD_VARIANT_UNKNOWN";
    error.path = options.path ?? null;
    throw error;
  }
  static readJSON(input, options = {}) {
    return this.read(input, {
      ...options,
      emit: OUTPUT_JSON
    });
  }
  static id = "fsd";
  static extensions = Object.freeze([".fsdbinary"]);
  static mediaTypes = Object.freeze(["data"]);
  static outputs = CjsFormat.defineOutputs({
    payload: {
      default: true,
      decoded: true
    },
    json: {
      decoded: true
    }
  });
}

export { CjsFsdFormat, CjsFsdFormat as default };
//# sourceMappingURL=CjsFsdFormat.js.map
