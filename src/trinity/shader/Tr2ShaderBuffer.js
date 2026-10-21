import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Shader/Tr2ShaderBuffer.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { ShaderType } from "#consts/render-context";
import { PER_OBJECT_PS, PER_OBJECT_VS } from "../core/Tr2Renderer.js";
import { Tr2RenderUtils } from "../core/Tr2RenderUtils.js";

const EMPTY_DATA = new Uint8Array(0); // alloc: shared empty byte payload, never allocated per upload.


/** Owns a detached byte payload and binds it at the selected stage's per-object register. */
@be.define("Tr2ShaderBuffer")
@blue.inherit(IRoot)

export class Tr2ShaderBuffer
{

  /** m_size (int) [READ] */
  @blue.read
  @type.int32
  size = 0;

  data = null;

  shaderType = ShaderType.PIXEL_SHADER;

  /** Carbon method SetData -> SetDataFromScript (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
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
  @blue.method
  SetShaderType(shaderType)
  {
    this.shaderType = Number(shaderType) || 0;
  }

  /**
   * Carbon ApplyBuffer (Tr2ShaderBuffer.cpp:25-28): fill the context-owned
   * stage buffer and bind it at that stage's per-object register.
   * @param {Tr2RenderContext} renderContext The context receiving the data.
   * @returns {boolean} Whether the upload and binding succeeded.
   */
  @meta.implemented
  @blue.method
  ApplyBuffer(renderContext)
  {
    return Tr2RenderUtils.fillAndSetConstants(
      renderContext.GetConstantBuffer(this.shaderType),
      this.data ?? EMPTY_DATA,
      this.size,
      1 << this.shaderType,
      this.shaderType === ShaderType.PIXEL_SHADER ? PER_OBJECT_PS : PER_OBJECT_VS,
      renderContext
    );
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
