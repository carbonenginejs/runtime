import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsParameter } from './CjsParameter.js';

let _initProto, _initClass, _init_value, _init_extra_value, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name;

/** An ordered list of vec4 rows uploaded into one named shader constant array. */
let _TriFloatArrayParamet;
class TriFloatArrayParameter extends CjsParameter {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name, _initProto],
      c: [_TriFloatArrayParamet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriFloatArrayParameter",
      family: "shader"
    })], [[[io, io.notify, io, io.persist, void 0, type.list("TriVector4")], 16, "value"], [[io, io.read, type, type.boolean], 16, "usedByCurrentTechnique"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"]], 0, void 0, CjsParameter));
  }
  value = (_initProto(this), _init_value(this, []));
  usedByCurrentTechnique = (_init_extra_value(this), _init_usedByCurrentTechnique(this, false));
  usedByCurrentEffect = (_init_extra_usedByCurrentTechnique(this), _init_usedByCurrentEffect(this, false));
  name = (_init_extra_usedByCurrentEffect(this), _init_name(this, ""));
  #cachedEffect = (_init_extra_name(this), null);

  /** The shader constant-array name these rows bind to. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: each row's vec4 bytes, then name. */
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
    for (const row of this.value) {
      startingHash = CjsParameter.hashFnv1Floats(row?.data ?? [0, 0, 0, 0], startingHash);
    }
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /** Nothing to resolve - the rows are authored data; returns true. */
  Initialize() {
    return true;
  }

  /**
   * Re-resolves effect handles against the cached shader after any notified
   * field changes.
   */
  OnModified(_options = {}) {
    this.RebuildEffectHandles(this.#cachedEffect);
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a constant of this name;
   * no GPU handle is bound.
   */
  RebuildEffectHandles(effectRes) {
    this.#cachedEffect = effectRes;
    const used = !!this.name && CjsParameter.hasEffectConstant(effectRes, this.name);
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Packs the rows contiguously into the destination, stopping at whichever limit comes first: the last row, the destination length, or the byte budget; a final row may be written partially.
   * @param size byte budget in the destination, four bytes per float
   */
  CopyValueToEffect(_inputType, out, size = Number.POSITIVE_INFINITY) {
    const byteLimit = Number.isFinite(size) ? Math.max(0, size) : Infinity;
    const floatLimit = Math.min(Number(out.length), Math.floor(byteLimit / 4));
    let offset = 0;
    for (const entry of this.value) {
      if (offset >= floatLimit) {
        break;
      }
      const count = Math.min(4, floatLimit - offset);
      _TriFloatArrayParamet.copyVector4ToDestination(out, entry.data, offset, count);
      offset += count;
    }
  }

  /**
   * Copies `count` components of one row into `out` starting at `offset`,
   * allowing a truncated tail row.
   */
  static copyVector4ToDestination(out, value, offset, count) {
    for (let i = 0; i < count; i++) {
      out[offset + i] = value[i];
    }
  }
  static {
    _initClass();
  }
}

export { _TriFloatArrayParamet as TriFloatArrayParameter };
//# sourceMappingURL=TriFloatArrayParameter.js.map
