// Source: trinity/trinity/Shader/Parameter/Tr2GeometryBufferParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { meta } from "#schema";
import { CjsParameter } from "./CjsParameter.js";
import { ITriEffectResourceParameter } from "./ITriEffectResourceParameter.js";

/** Carries a named shader-buffer path for host resolution or a caller-owned GPU buffer reference. */
@meta.define({ className: "Tr2GeometryBufferParameter", family: "shader" })
@meta.blue.inherit(ITriEffectResourceParameter)
@meta.blue.inherit(IInitialize, INotify)
export class Tr2GeometryBufferParameter extends CjsParameter
{

  /** m_resourcePath (std::wstring) [READWRITE, NOTIFY, PERSIST] */

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  resourcePath = "";

  /** m_gpuBuffer (ITr2GpuBufferPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITr2GpuBuffer")
  gpuBuffer = null;

  /** m_isUsedByEffect (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  usedByCurrentEffect = false;

  /** m_meshIndex (int32_t) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  meshIndex = 0;

  /** m_name (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  cachedEffect = null;

  /** The shader resource name this buffer binds to. */
  @meta.blue.method
  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: resource path (when set) then name. */
  @meta.blue.method
  @meta.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    if (this.resourcePath)
    {
      startingHash = CjsParameter.hashFnv1String(this.resourcePath, startingHash);
    }
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /**
   * Not ported yet - a resource path is never resolved
   * to a buffer here; returns true.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    return true;
  }

  /**
   * Consumes the `resource` dirty flag by re-initializing and re-resolving
   * handles against the cached shader.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS releases its provider reference instead of unlocking a native smart pointer; Initialize resource acquisition remains an explicit port gap.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "resourcePath"))
    {
      this.gpuBuffer = null;
      this.Initialize();
      this.RebuildEffectHandles(this.cachedEffect);
    }
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a resource of this name;
   * no GPU buffer is bound.
   */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.implemented
  CopyToResourceSet(resourceDesc, stage, registerIndex, _flags = 0)
  {
    const buffer = this.gpuBuffer?.GetGpuBuffer(this.meshIndex);

    if (!buffer) return false;

    return resourceDesc.SetSrv(stage, registerIndex, buffer, 0, 1);
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
  @meta.blue.method
  @meta.implemented
  ApplyUav(resourceDesc, stage, registerIndex)
  {
    return resourceDesc.SetUav(stage, registerIndex, this.gpuBuffer?.GetGpuBuffer(this.meshIndex) ?? null, 0, 1);
  }

  /**
   * Whether a buffer object has actually been attached; an authored resourcePath
   * alone does not make the parameter valid.
   */
  @meta.blue.method
  @meta.implemented
  IsValid()
  {
    return !!this.gpuBuffer;
  }

  /**
   * Attaches a buffer object directly and clears the authored resource path, so
   * the path can no longer override it.
   */
  @meta.blue.method
  @meta.implemented
  SetGpuBuffer(buffer)
  {
    this.resourcePath = "";
    this.gpuBuffer = buffer;
  }

  /**
   * The attached buffer object, or null; held by reference and never created
   * here.
   */
  @meta.blue.method
  @meta.implemented
  GetGpuBuffer()
  {
    return this.gpuBuffer;
  }

}

// Exact identities from Tr2GeometryBufferParameter_Blue.cpp; no exposure chain.
meta.blue.interfaceTable({ interfaces: [ITriEffectParameter, ITriEffectResourceParameter, IInitialize, INotify], chainTo: null })(Tr2GeometryBufferParameter, { kind: "class" });
