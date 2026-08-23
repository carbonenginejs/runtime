// Source: trinity/trinity/Shader/Tr2ShaderBuffer.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** Owns a detached byte payload for one shader stage while leaving device binding to the engine. */
@type.define({ className: "Tr2ShaderBuffer", family: "shader" })
export class Tr2ShaderBuffer extends CjsModel
{

  /** m_size (int) [READ] */
  @io.read
  @type.int32
  size = 0;

  data = null;

  shaderType = 1;

  /** Carbon method SetData -> SetDataFromScript (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetData(data, size = data?.byteLength ?? data?.length ?? 0)
  {
    const byteSize = Math.max(0, Number(size) || 0);
    if (!byteSize)
    {
      this.data = null;
      this.size = 0;
      return;
    }
    this.data = Tr2ShaderBuffer.copyBytes(data, byteSize);
    this.size = byteSize;
  }

  /**
   * Sets which shader stage this buffer belongs to; a non-numeric value becomes
   * 0.
   */
  SetShaderType(shaderType)
  {
    this.shaderType = Number(shaderType) || 0;
  }

  /**
   * Always false - binding the buffer to a device is outside this GPU-free
   * package.
   */
  ApplyBuffer()
  {
    return false;
  }

  /**
   * Copies up to `size` bytes out of an ArrayBuffer, typed-array view, latin-1
   * string or array-like into a new zero-padded Uint8Array the caller owns.
   */
  static copyBytes(data, size)
  {
    const out = new Uint8Array(size);
    if (data instanceof ArrayBuffer)
    {
      out.set(new Uint8Array(data, 0, Math.min(size, data.byteLength)));
    }
    else if (ArrayBuffer.isView(data))
    {
      out.set(new Uint8Array(data.buffer, data.byteOffset, Math.min(size, data.byteLength)));
    }
    else if (typeof data === "string")
    {
      for (let i = 0; i < Math.min(size, data.length); i++)
      {
        out[i] = data.charCodeAt(i) & 0xff;
      }
    }
    else if (data && typeof data.length === "number")
    {
      out.set(Array.from(data).slice(0, size));
    }
    return out;
  }

}
