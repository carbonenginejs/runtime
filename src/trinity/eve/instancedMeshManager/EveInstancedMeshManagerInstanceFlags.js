// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:13-26
// Source: trinity/trinity/Eve/EveInstancedMeshManager.cpp:1002-1052
import { meta, type, blue } from "#schema";


/**
 * Carbon EveInstancedMeshManager::InstanceFlags (EveInstancedMeshManager.h:13-26):
 * a uint32 bitfield describing what a bounding-sphere group may draw - one bit
 * `1 << batchType` per batch type it carries, plus `castsShadow` (bit 30) and
 * `renderInReflection` (bit 31). The manager matches a pass's filter against
 * it before culling the group (cpp:1036-1042).
 *
 * Every write ends in `>>> 0`, because a JavaScript bitwise result is a signed
 * int32 and bit 31 would otherwise read back negative; the stored value stays
 * Carbon's unsigned uint32.
 */
@meta.define({ className: "EveInstancedMeshManagerInstanceFlags", donors: [ "EveInstancedMeshManager::InstanceFlags" ] })
export class EveInstancedMeshManagerInstanceFlags
{

  /** CASTS_SHADOW (static const uint32_t, h:23): `1 << 30`. */
  static castsShadow = 0x40000000;

  /** RENDER_IN_REFLECTION (static const uint32_t, h:24): `1 << 31`, as an unsigned value. */
  static renderInReflection = 0x80000000;

  /** m_flags (uint32_t, h:25). Carbon initializes it to 0. */
  @type.uint32
  flags = 0;

  /**
   * Carbon AddBatchType (cpp:1002-1005): sets bit `1 << type`.
   * @param {number} type A TriBatchType value.
   */
  @blue.method
  @meta.implemented
  AddBatchType(type)
  {
    this.flags = (this.flags | (1 << (type >>> 0))) >>> 0;
  }

  /**
   * Carbon SetCastsShadow (cpp:1007-1017): sets or clears CASTS_SHADOW.
   * @param {boolean} castsShadow
   */
  @blue.method
  @meta.implemented
  SetCastsShadow(castsShadow)
  {
    if (castsShadow)
    {
      this.flags = (this.flags | EveInstancedMeshManagerInstanceFlags.castsShadow) >>> 0;
    }
    else
    {
      this.flags = (this.flags & ~EveInstancedMeshManagerInstanceFlags.castsShadow) >>> 0;
    }
  }

  /**
   * Carbon GetCastsShadow (cpp:1019-1022).
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  GetCastsShadow()
  {
    return (this.flags & EveInstancedMeshManagerInstanceFlags.castsShadow) !== 0;
  }

  /**
   * Carbon SetRenderInReflections (cpp:1024-1034): sets or clears RENDER_IN_REFLECTION.
   * @param {boolean} renderInReflections
   */
  @blue.method
  @meta.implemented
  SetRenderInReflections(renderInReflections)
  {
    if (renderInReflections)
    {
      this.flags = (this.flags | EveInstancedMeshManagerInstanceFlags.renderInReflection) >>> 0;
    }
    else
    {
      this.flags = (this.flags & ~EveInstancedMeshManagerInstanceFlags.renderInReflection) >>> 0;
    }
  }

  /**
   * Carbon MatchesFilter (cpp:1036-1042): true when this group carries at
   * least one of the filter's batch-type bits AND every one of the filter's
   * render-pass bits (shadow, reflection).
   * @param {EveInstancedMeshManagerInstanceFlags} filter
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  MatchesFilter(filter)
  {
    const renderPassFlags = (EveInstancedMeshManagerInstanceFlags.castsShadow | EveInstancedMeshManagerInstanceFlags.renderInReflection) >>> 0;
    const batchFilter = (filter.flags & ~renderPassFlags) >>> 0;
    const renderFlagsFilter = (filter.flags & renderPassFlags) >>> 0;

    return (this.flags & batchFilter) !== 0 && ((this.flags & renderFlagsFilter) >>> 0) === renderFlagsFilter;
  }

  /**
   * Carbon's `operator==` (cpp:1044-1047), which JavaScript cannot overload.
   * @param {EveInstancedMeshManagerInstanceFlags} other
   * @returns {boolean}
   */
  @meta.renamed("operator==")
  Equals(other)
  {
    return this.flags === other.flags;
  }

  /**
   * Carbon's `operator!=` (cpp:1049-1052), defined separately from `operator==`.
   * @param {EveInstancedMeshManagerInstanceFlags} other
   * @returns {boolean}
   */
  @meta.renamed("operator!=")
  NotEquals(other)
  {
    return this.flags !== other.flags;
  }

}
