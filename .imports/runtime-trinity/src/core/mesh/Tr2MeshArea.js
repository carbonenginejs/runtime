// Source: E:\carbonengine\trinity\trinity\Tr2MeshArea.h
// Source: E:\carbonengine\trinity\trinity\Tr2MeshArea.cpp
// Source: E:\carbonengine\trinity\trinity\Tr2MeshArea_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * One drawable range of a mesh: the index and count of geometry groups plus the
 * effect, shadow, depth and LOD state that decide how the range is batched.
 */
@type.define({ className: "Tr2MeshArea", family: "trinityCore" })
export class Tr2MeshArea extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.readwrite
  @type.boolean
  display = true;

  @io.rebuild("batches")
  @io.persist
  @type.int32
  index = 0;

  @io.rebuild("batches")
  @io.persist
  @type.int32
  count = 1;

  @io.rebuild("batches")
  @io.persistOnly
  @type.boolean
  reversed = false;

  @io.rebuild("batches")
  @io.persist
  @type.boolean
  useSHLighting = false;

  @io.rebuild("batches")
  @io.notify
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  // DIVERGENCE (deliberate, precedent: EvePlaneSetItem.blinkData): Carbon
  // keeps these four as private runtime state stamped by SOF through
  // setters. The JS values path has no setter side channel, so they are
  // schema-backed here so SOF-authored shadow/depth/LOD state survives
  // values exchange. Without them every area defaults to shadow-casting.

  /** m_castsShadows - per-batch-type shadow participation (SOF-stamped). */
  @io.rebuild("batches")
  @io.persist
  @type.boolean
  castsShadows = true;

  /** m_generateDepthArea - authored depth-area participation (SOF-stamped). */
  @io.rebuild("batches")
  @io.persist
  @type.boolean
  generateDepthArea = false;

  /** m_alphaCutout - decal-style surface whose ray-facing rule is two-sided. */
  @io.rebuild("batches")
  @io.persist
  @type.boolean
  alphaCutout = false;

  /** m_minLod (Tr2Lod) - minimal visible lod; TR2_LOD_UNSPECIFIED = -1. */
  @io.rebuild("batches")
  @io.persist
  @type.int32
  minLod = -1;

  /** m_jointCount - skinning joint count, fed by Tr2MeshBase.BindToRig. */
  #jointCount = 0;

  /** m_jointMappingAnimRig - shared joint mapping owned by the parent mesh. */
  #jointMappingAnimRig = null;

  /** First geometry group of the area's range. */
  @carbon.method
  @impl.adapted
  GetIndex()
  {
    return this.index;
  }

  /**
   * Sets the first geometry group, coerced to a signed integer; schedules the
   * batches rebuild.
   */
  @carbon.method
  @impl.adapted
  SetIndex(value)
  {
    this.index = Number(value) | 0;
  }

  /** Number of geometry groups in the area's range. */
  @carbon.method
  @impl.adapted
  GetCount()
  {
    return this.count;
  }

  /**
   * Sets the group count, coerced to a signed integer; schedules the batches
   * rebuild.
   */
  @carbon.method
  @impl.adapted
  SetCount(value)
  {
    this.count = Number(value) | 0;
  }

  /** Whether the area is drawn; a hidden area emits no batch. */
  @carbon.method
  @impl.adapted
  GetDisplay()
  {
    return this.display;
  }

  /** Shows or hides the area. */
  @carbon.method
  @impl.adapted
  SetDisplay(value)
  {
    this.display = !!value;
  }

  /** Whether the area is drawn with reversed winding. */
  @carbon.method
  @impl.adapted
  GetReversed()
  {
    return this.reversed;
  }

  /** Carbon's second name for GetReversed. */
  @carbon.method
  @impl.adapted
  IsReversed()
  {
    return this.reversed;
  }

  /** Sets the reversed-winding flag; schedules the batches rebuild. */
  @carbon.method
  @impl.adapted
  SetReversed(value)
  {
    this.reversed = !!value;
  }

  /** Whether the area is lit with spherical-harmonic lighting. */
  @carbon.method
  @impl.adapted
  GetUseSHLighting()
  {
    return this.useSHLighting;
  }

  /** Sets the spherical-harmonic lighting flag; schedules the batches rebuild. */
  @carbon.method
  @impl.adapted
  SetUseSHLighting(value)
  {
    this.useSHLighting = !!value;
  }

  /**
   * The area's effect, which serves as its material and shader key during batch
   * collection; null areas produce no batch.
   */
  @carbon.method
  @impl.adapted
  GetMaterialInterface()
  {
    return this.effect;
  }

  /** Binds the effect used as this area's material. */
  @carbon.method
  @impl.adapted
  SetMaterial(value)
  {
    this.effect = value ?? null;
  }

  /**
   * The authored area name, which SOF and effect bindings use to address this
   * area of the mesh.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the area name, coercing null to an empty string. */
  @carbon.method
  @impl.adapted
  SetName(value)
  {
    this.name = String(value ?? "");
  }

  /**
   * Whether the area takes part in shadow and overlay area-block collection; SOF
   * stamps this per batch type and it defaults to true.
   */
  @carbon.method
  @impl.adapted
  IsCastingShadows()
  {
    return this.castsShadows;
  }

  /** Sets shadow participation; schedules the batches rebuild. */
  @carbon.method
  @impl.adapted
  SetCastsShadows(value)
  {
    this.castsShadows = !!value;
  }

  /** Whether ray intersection treats this area as an alpha-cutout surface. */
  @carbon.method
  @impl.implemented
  IsAlphaCutout()
  {
    return this.alphaCutout;
  }

  /** Sets alpha-cutout participation; SOF stamps decal areas through this. */
  @carbon.method
  @impl.implemented
  SetAlphaCutout(value)
  {
    this.alphaCutout = !!value;
  }

  /** Whether the authored area participates in depth-area generation. */
  @carbon.method
  @impl.adapted
  GetGenerateDepthArea()
  {
    return this.generateDepthArea;
  }

  /** Sets depth-area participation; schedules the batches rebuild. */
  @carbon.method
  @impl.adapted
  SetGenerateDepthArea(value)
  {
    this.generateDepthArea = !!value;
  }

  /**
   * Lowest LOD at which the area is visible; -1 (TR2_LOD_UNSPECIFIED) means
   * unrestricted.
   */
  @carbon.method
  @impl.implemented
  GetMinLod()
  {
    return this.minLod;
  }

  /** Sets the minimum visible LOD, coerced to a signed integer. */
  @carbon.method
  @impl.implemented
  SetMinLod(lod)
  {
    this.minLod = Number(lod) | 0;
  }

  /** Skinning joint count, filled in when the parent mesh binds to a rig. */
  @carbon.method
  @impl.implemented
  GetJointCount()
  {
    return this.#jointCount;
  }

  /**
   * Sets the skinning joint count; CopyFrom deliberately resets it to zero for a
   * new owner.
   */
  @carbon.method
  @impl.implemented
  SetJointCount(value)
  {
    this.#jointCount = Number(value) >>> 0;
  }

  /**
   * The joint mapping array; it is owned by the parent mesh and shared by every
   * area, so it must not be mutated here.
   */
  @carbon.method
  @impl.implemented
  GetJointMappingAnimRig()
  {
    return this.#jointMappingAnimRig;
  }

  /**
   * The provided array is NOT owned by this instance, it is owned by the
   * parent mesh; each mesh area shares the same array.
   */
  @carbon.method
  @impl.implemented
  SetJointMappingAnimRig(value)
  {
    this.#jointMappingAnimRig = value ?? null;
  }

  /**
   * Carbon's operator= - copies authored fields and deliberately resets the
   * joint state, which BindToRig must rebuild for the new owner.
   */
  @carbon.method
  @impl.adapted
  CopyFrom(other)
  {
    this.name = other.name;
    this.index = other.index;
    this.count = other.count;
    this.reversed = other.reversed;
    this.effect = other.effect;
    this.#jointCount = 0;
    this.#jointMappingAnimRig = null;
    this.display = other.display;
    this.useSHLighting = other.useSHLighting;
    this.generateDepthArea = other.GetGenerateDepthArea();
    this.alphaCutout = other.IsAlphaCutout();
    return this;
  }
}
