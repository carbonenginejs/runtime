// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/Tr2PerObjectData.h (Tr2PerObjectData base)
//
// GPU-free base for per-object render data. Carries the object id (Carbon's
// m_userData, used as the picking / object id) and is the value a renderable's
// GetPerObjectData returns and a batch references via SetPerObjectData. The
// concrete GPU upload path (Carbon SetPerObjectDataToDevice / ApplyConstantBuffers,
// which write Tr2ConstantBufferAL) is engine-owned and intentionally not modelled
// here; the engine reads whatever data a concrete subclass exposes at dispatch.

/**
 * GPU-free base for per-object render data, carrying the object id a batch is
 * picked and identified by; the GPU upload path is engine-owned.
 */
export class Tr2PerObjectData
{
  /** Starts with a zero object id. */
  constructor()
  {
    this.userData = 0;
  }

  /** Sets the object id, coerced to an unsigned 32-bit value. */
  SetUserData(userData)
  {
    this.userData = userData >>> 0;
  }

  /** The object id, which doubles as the picking id. */
  GetUserData()
  {
    return this.userData;
  }
}
