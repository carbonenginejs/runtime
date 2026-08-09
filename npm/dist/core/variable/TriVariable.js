import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { TriVariableContentType } from '../../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_contentType, _init_extra_contentType;

/**
 * One named shader-binding variable: the content type fixed when it was
 * registered, plus the value payload standing in for Carbon's typed union.
 */
let _TriVariable;
new class extends _identity {
  static [class TriVariable extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_contentType, _init_extra_contentType, _initProto],
        c: [_TriVariable, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriVariable",
        family: "trinityCore"
      })], [[[io, io.read, type, type.string], 16, "name"], [[io, io.read, type, type.int32], 16, "contentType"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetType"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Invalidate"], [[carbon, carbon.method, impl, impl.adapted], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTypeName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTypeSize"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));

    /** m_type (TriVariableContentType). */
    contentType = (_init_extra_name(this), _init_contentType(this, TriVariableContentType.TRIVARIABLE_INVALID));

    /** Runtime value payload; the typed C++ union collapses to one slot. */
    value = (_init_extra_contentType(this), null);

    /** The registered variable name, which the store also uses as its key. */
    GetName() {
      return this.name;
    }

    /** The TriVariableContentType fixed at registration; SetValue never changes it. */
    GetType() {
      return this.contentType;
    }

    /**
     * Assigns the value payload. The content type stays as registered; Carbon
     * fixes it at registration time and SetValue only stores.
     */
    SetValue(value) {
      this.value = value;
      return true;
    }

    /**
     * Reads the payload; when out is array-like and so is the payload, the
     * overlapping components are copied into out and out is returned, otherwise
     * the stored payload itself is returned and is not a copy.
     */
    GetValue(out = undefined) {
      const value = this.value;
      if (out && value && typeof value.length === "number" && typeof out.length === "number") {
        const count = Math.min(out.length, value.length);
        for (let index = 0; index < count; index++) {
          out[index] = value[index];
        }
        return out;
      }
      return value;
    }

    /**
     * Clears the payload and returns the variable to the reserved INVALID
     * type, releasing texture/buffer references as Carbon's Clear does.
     */
    Invalidate() {
      this.value = null;
      this.contentType = TriVariableContentType.TRIVARIABLE_INVALID;
    }

    /**
     * Clears the value but leaves the type alone, so a new SetValue will
     * still work. Carbon zeroes the union slot and drops texture/buffer
     * references; the JS payload slot zero-fills arrays and nulls references.
     */
    Clear() {
      const value = this.value;
      if (value && typeof value.length === "number" && typeof value.fill === "function") {
        value.fill(0);
      } else if (typeof value === "number") {
        this.value = 0;
      } else {
        this.value = null;
      }
    }

    /**
     * Carbon's display name for a content type, defaulting to this variable's own
     * type.
     */
    GetTypeName(contentType = this.contentType) {
      return _TriVariable.GetTypeName(contentType);
    }

    /**
     * Constant-buffer byte size of a content type, defaulting to this variable's
     * own type.
     */
    GetTypeSize(contentType = this.contentType) {
      return _TriVariable.GetTypeSize(contentType);
    }

    /**
     * Maps a script value onto a Carbon content type the way the Python
     * bridge does: integers and booleans register as INT (Python bools are
     * ints), other numbers as FLOAT, arrays by length, texture-provider
     * shapes as TEXTURE_RES. Unknown values map to INVALID, which
     * RegisterVariable treats as unsupported (GPU-buffer duck detection has
     * no reliable JS shape yet and is left to the realization layer).
     */
    static getVariableType(value) {
      if (typeof value === "boolean") {
        return TriVariableContentType.TRIVARIABLE_INT;
      }
      if (typeof value === "number") {
        return Number.isInteger(value) ? TriVariableContentType.TRIVARIABLE_INT : TriVariableContentType.TRIVARIABLE_FLOAT;
      }
      if (value && typeof value.length === "number") {
        switch (value.length) {
          case 2:
            return TriVariableContentType.TRIVARIABLE_FLOAT2;
          case 3:
            return TriVariableContentType.TRIVARIABLE_FLOAT3;
          case 4:
            return TriVariableContentType.TRIVARIABLE_FLOAT4;
          case 16:
            return TriVariableContentType.TRIVARIABLE_FLOAT4X4;
        }
        return TriVariableContentType.TRIVARIABLE_INVALID;
      }
      if (value && typeof value === "object") {
        if (typeof value.GetTexture === "function" || typeof value.RequestResolution === "function") {
          return TriVariableContentType.TRIVARIABLE_TEXTURE_RES;
        }
      }
      return TriVariableContentType.TRIVARIABLE_INVALID;
    }

    /**
     * Carbon's display name for a content type; an unrecognised type falls back to
     * the INVALID label.
     */
    static GetTypeName(contentType) {
      return _TriVariable.#typeNames[contentType] ?? _TriVariable.#typeNames[0];
    }

    /**
     * Byte size a variable of the given content type occupies in a constant
     * buffer. INVALID and UNKNOWN_FLOAT may be converted to another type, so
     * they must register as the largest type. Texture and GPU-buffer slots are
     * pointer-sized in Carbon; the JS reference slot keeps the same 8 bytes so
     * shared-buffer offset math stays aligned with Carbon's.
     */
    static GetTypeSize(contentType) {
      return _TriVariable.#typeSizes[contentType] ?? 0;
    }
  }];
  #typeNames = Object.freeze(["INVALID TYPE!", "TRIVARIABLE_UNKNOWN_FLOAT", "TRIVARIABLE_TEXTURE_RES", "TRIVARIABLE_INT", "TRIVARIABLE_FLOAT", "TRIVARIABLE_FLOAT2", "TRIVARIABLE_FLOAT3", "TRIVARIABLE_FLOAT4", "TRIVARIABLE_FLOAT4X4", "TRIVARIABLE_COLOR", "TRIVARIABLE_GPUBUFFER"]);
  #typeSizes = Object.freeze([4 * 16, 4 * 16, 8, 4, 4, 4 * 2, 4 * 3, 4 * 4, 4 * 16, 4 * 4, 8]);
  ContentType = TriVariableContentType;
  constructor() {
    super(_TriVariable), _initClass();
  }
}();

export { _TriVariable as TriVariable };
//# sourceMappingURL=TriVariable.js.map
