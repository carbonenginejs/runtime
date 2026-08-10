import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_size, _init_extra_size;

/** Tr2ShaderBuffer (shader) - generated from schema shapeHash 977c582f.... */
let _Tr2ShaderBuffer;
class Tr2ShaderBuffer extends CjsModel {
  static {
    ({
      e: [_init_size, _init_extra_size, _initProto],
      c: [_Tr2ShaderBuffer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ShaderBuffer",
      family: "shader"
    })], [[[io, io.read, type, type.int32], 16, "size"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetData"]], 0, void 0, CjsModel));
  }
  /** m_size (int) [READ] */
  size = (_initProto(this), _init_size(this, 0));
  data = (_init_extra_size(this), null);
  shaderType = 1;

  /** Carbon method SetData -> SetDataFromScript (MAP_METHOD_AND_WRAP). */
  SetData(data, size = data?.byteLength ?? data?.length ?? 0) {
    const byteSize = Math.max(0, Number(size) || 0);
    if (!byteSize) {
      this.data = null;
      this.size = 0;
      return;
    }
    this.data = _Tr2ShaderBuffer.copyBytes(data, byteSize);
    this.size = byteSize;
  }

  /**
   * Sets which shader stage this buffer belongs to; a non-numeric value becomes
   * 0.
   */
  SetShaderType(shaderType) {
    this.shaderType = Number(shaderType) || 0;
  }

  /**
   * Always false - binding the buffer to a device is outside this GPU-free
   * package.
   */
  ApplyBuffer() {
    return false;
  }

  /**
   * Copies up to `size` bytes out of an ArrayBuffer, typed-array view, latin-1
   * string or array-like into a new zero-padded Uint8Array the caller owns.
   */
  static copyBytes(data, size) {
    const out = new Uint8Array(size);
    if (data instanceof ArrayBuffer) {
      out.set(new Uint8Array(data, 0, Math.min(size, data.byteLength)));
    } else if (ArrayBuffer.isView(data)) {
      out.set(new Uint8Array(data.buffer, data.byteOffset, Math.min(size, data.byteLength)));
    } else if (typeof data === "string") {
      for (let i = 0; i < Math.min(size, data.length); i++) {
        out[i] = data.charCodeAt(i) & 0xff;
      }
    } else if (data && typeof data.length === "number") {
      out.set(Array.from(data).slice(0, size));
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _Tr2ShaderBuffer as Tr2ShaderBuffer };
//# sourceMappingURL=Tr2ShaderBuffer.js.map
