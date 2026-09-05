// Source: trinity/trinity/Shader/Parameter/Tr2GeometryBufferParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { CjsParameter } from "./CjsParameter.js";

/** Carries a named shader-buffer path for host resolution or a caller-owned GPU buffer reference. */
@type.define({ className: "Tr2GeometryBufferParameter", family: "shader" })
export class Tr2GeometryBufferParameter extends CjsParameter
{

  /** m_resourcePath (std::wstring) [READWRITE, NOTIFY, PERSIST] */
  @io.flag("resource")
  @io.notify
  @io.persist
  @type.string
  resourcePath = "";

  /** m_gpuBuffer (ITr2GpuBufferPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.objectRef("ITr2GpuBuffer")
  gpuBuffer = null;

  /** m_isUsedByEffect (bool) [READ] */
  @io.read
  @type.boolean
  usedByCurrentEffect = false;

  /** m_meshIndex (int32_t) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.int32
  meshIndex = 0;

  /** m_name (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  name = "";

  cachedEffect = null;

  /** The shader resource name this buffer binds to. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: resource path (when set) then name. */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    if (this.resourcePath)
    {
      startingHash = CjsParameter.hashFnv1String(this.resourcePath, startingHash);
    }
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /**
   * Nothing to do in this GPU-free package - a resource path is never resolved
   * to a buffer here; returns true.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    return true;
  }

  /**
   * Consumes the `resource` dirty flag by re-initializing and re-resolving
   * handles against the cached shader.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    if (this.__state.flags.delete("resource"))
    {
      this.Initialize();
      this.RebuildEffectHandles(this.cachedEffect);
    }
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a resource of this name;
   * no GPU buffer is bound.
   */
  @carbon.method
  @impl.adapted
  RebuildEffectHandles(effectRes)
  {
    this.cachedEffect = effectRes;
    this.usedByCurrentEffect = !!this.name && !!CjsParameter.getEffectResource(effectRes, this.name);
  }

  /**
   * Binds this parameter's geometry buffer as a shader resource.
   *
   * Carbon `Tr2GeometryBufferParameter::CopyToResourceSet`. No colour space —
   * a buffer has no transfer function — so `flags` is accepted for the shared
   * signature and unread, exactly as Carbon's is.
   *
   * A MISSING BUFFER BINDS NOTHING HERE and binds an EMPTY UAV below. That
   * asymmetry is Carbon's: an unbound srv register keeps whatever the previous
   * draw left, which a shader may legitimately still be reading, while an
   * unbound uav must be cleared or the next dispatch writes into a stale one.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @param {number} [_flags] A `ResourceFlags` word; unread for a buffer.
   * @returns {boolean} Whether the slot took the binding.
   */
  @carbon.method
  @impl.implemented
  CopyToResourceSet(resourceDesc, stage, registerIndex, _flags = 0)
  {
    const buffer = this.gpuBuffer?.GetGpuBuffer(this.meshIndex);

    if (!buffer) return false;

    return resourceDesc.SetSrv(stage, registerIndex, buffer);
  }

  /**
   * Binds this parameter's geometry buffer as an unordered-access view, or an
   * empty one when nothing is attached — see the note above on why.
   *
   * Carbon `Tr2GeometryBufferParameter::ApplyUav`.
   *
   * @param {object} resourceDesc A `Tr2ResourceSetDescriptionAL`.
   * @param {number} stage A `ShaderType`.
   * @param {number} registerIndex The register.
   * @returns {boolean} Whether the slot took the binding.
   */
  @carbon.method
  @impl.implemented
  ApplyUav(resourceDesc, stage, registerIndex)
  {
    return resourceDesc.SetUav(stage, registerIndex, this.gpuBuffer?.GetGpuBuffer(this.meshIndex) ?? null);
  }

  /**
   * Whether a buffer object has actually been attached; an authored resourcePath
   * alone does not make the parameter valid.
   */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return !!this.gpuBuffer;
  }

  /**
   * Attaches a buffer object directly and clears the authored resource path, so
   * the path can no longer override it.
   */
  @carbon.method
  @impl.implemented
  SetGpuBuffer(buffer)
  {
    this.resourcePath = "";
    this.gpuBuffer = buffer;
  }

  /**
   * The attached buffer object, or null; held by reference and never created
   * here.
   */
  @carbon.method
  @impl.implemented
  GetGpuBuffer()
  {
    return this.gpuBuffer;
  }

}
