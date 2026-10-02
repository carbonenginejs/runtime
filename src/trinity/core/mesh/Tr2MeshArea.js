// Source: trinity/trinity/Tr2MeshArea.h
// Source: trinity/trinity/Tr2MeshArea.cpp
// Source: trinity/trinity/Tr2MeshArea_Blue.cpp
import { meta } from "#schema";


/**
 * One drawable range of a mesh: the index and count of geometry groups plus the
 * effect, shadow, depth and LOD state that decide how the range is batched.
 */
@meta.define({ className: "Tr2MeshArea", family: "trinityCore" })
export class Tr2MeshArea
{
  // m_ownerMeshes (std::vector<Tr2MeshBase*>)
  #ownerMeshes = [];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  index = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  count = 1;

  @meta.blue.readwrite
  @meta.blue.persistOnly
  @meta.type.boolean
  reversed = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  useSHLighting = false;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  effect = null;

  // DIVERGENCE (deliberate, precedent: EvePlaneSetItem.blinkData): Carbon
  // keeps these four as private runtime state stamped by SOF through
  // setters. The JS values path has no setter side channel, so they are
  // schema-backed here so SOF-authored shadow/depth/LOD state survives
  // values exchange. Without them every area defaults to shadow-casting.

  /** m_castsShadows - per-batch-type shadow participation (SOF-stamped). */

  @meta.blue.persist
  @meta.type.boolean
  castsShadows = true;

  /** m_generateDepthArea - authored depth-area participation (SOF-stamped). */

  @meta.blue.persist
  @meta.type.boolean
  generateDepthArea = false;

  /** m_alphaCutout - decal-style surface whose ray-facing rule is two-sided. */

  @meta.blue.persist
  @meta.type.boolean
  alphaCutout = false;

  /** m_minLod (Tr2Lod) - minimal visible lod; TR2_LOD_UNSPECIFIED = -1. */

  @meta.blue.persist
  @meta.type.int32
  minLod = -1;

  /** m_jointCount - skinning joint count, fed by Tr2MeshBase.BindToRig. */
  #jointCount = 0;

  /** m_jointMappingAnimRig - shared joint mapping owned by the parent mesh. */
  #jointMappingAnimRig = null;

  /** First geometry group of the area's range. */
  @meta.blue.method
  @meta.adapted
  GetIndex()
  {
    return this.index;
  }

  /**
   * Sets the first geometry group, coerced to a signed integer; schedules the
   * batches rebuild.
   */
  @meta.blue.method
  @meta.adapted
  SetIndex(value)
  {
    this.index = Number(value) | 0;
  }

  /** Number of geometry groups in the area's range. */
  @meta.blue.method
  @meta.adapted
  GetCount()
  {
    return this.count;
  }

  /**
   * Sets the group count, coerced to a signed integer; schedules the batches
   * rebuild.
   */
  @meta.blue.method
  @meta.adapted
  SetCount(value)
  {
    this.count = Number(value) | 0;
  }

  /** Whether the area is drawn; a hidden area emits no batch. */
  @meta.blue.method
  @meta.adapted
  GetDisplay()
  {
    return this.display;
  }

  /** Shows or hides the area. */
  @meta.blue.method
  @meta.adapted
  SetDisplay(value)
  {
    this.display = !!value;
  }

  /** Whether the area is drawn with reversed winding. */
  @meta.blue.method
  @meta.adapted
  GetReversed()
  {
    return this.reversed;
  }

  /** Carbon's second name for GetReversed. */
  @meta.blue.method
  @meta.adapted
  IsReversed()
  {
    return this.reversed;
  }

  /** Sets the reversed-winding flag; schedules the batches rebuild. */
  @meta.blue.method
  @meta.adapted
  SetReversed(value)
  {
    this.reversed = !!value;
  }

  /** Whether the area is lit with spherical-harmonic lighting. */
  @meta.blue.method
  @meta.adapted
  GetUseSHLighting()
  {
    return this.useSHLighting;
  }

  /** Sets the spherical-harmonic lighting flag; schedules the batches rebuild. */
  @meta.blue.method
  @meta.adapted
  SetUseSHLighting(value)
  {
    this.useSHLighting = !!value;
  }

  /**
   * The area's effect, which serves as its material and shader key during batch
   * collection; null areas produce no batch.
   */
  @meta.blue.method
  @meta.adapted
  GetMaterialInterface()
  {
    return this.effect;
  }

  /** Binds the effect used as this area's material. */
  @meta.blue.method
  @meta.adapted
  SetMaterial(value)
  {
    this.effect = value ?? null;
  }

  /**
   * The authored area name, which SOF and effect bindings use to address this
   * area of the mesh.
   */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the area name, coercing null to an empty string. */
  @meta.blue.method
  @meta.adapted
  SetName(value)
  {
    this.name = String(value ?? "");
  }

  /**
   * Whether the area takes part in shadow and overlay area-block collection; SOF
   * stamps this per batch type and it defaults to true.
   */
  @meta.blue.method
  @meta.adapted
  IsCastingShadows()
  {
    return this.castsShadows;
  }

  /** Sets shadow participation; schedules the batches rebuild. */
  @meta.blue.method
  @meta.adapted
  SetCastsShadows(value)
  {
    this.castsShadows = !!value;
  }

  /** Whether ray intersection treats this area as an alpha-cutout surface. */
  @meta.blue.method
  @meta.implemented
  IsAlphaCutout()
  {
    return this.alphaCutout;
  }

  /** Sets alpha-cutout participation; SOF stamps decal areas through this. */
  @meta.blue.method
  @meta.implemented
  SetAlphaCutout(value)
  {
    this.alphaCutout = !!value;
  }

  /** Whether the authored area participates in depth-area generation. */
  @meta.blue.method
  @meta.adapted
  GetGenerateDepthArea()
  {
    return this.generateDepthArea;
  }

  /** Sets depth-area participation; schedules the batches rebuild. */
  @meta.blue.method
  @meta.adapted
  SetGenerateDepthArea(value)
  {
    this.generateDepthArea = !!value;
  }

  /**
   * Lowest LOD at which the area is visible; -1 (TR2_LOD_UNSPECIFIED) means
   * unrestricted.
   */
  @meta.blue.method
  @meta.implemented
  GetMinLod()
  {
    return this.minLod;
  }

  /** Sets the minimum visible LOD, coerced to a signed integer. */
  @meta.blue.method
  @meta.implemented
  SetMinLod(lod)
  {
    this.minLod = Number(lod) | 0;
  }

  /** Skinning joint count, filled in when the parent mesh binds to a rig. */
  @meta.blue.method
  @meta.implemented
  GetJointCount()
  {
    return this.#jointCount;
  }

  /**
   * Sets the skinning joint count; CopyFrom deliberately resets it to zero for a
   * new owner.
   */
  @meta.blue.method
  @meta.implemented
  SetJointCount(value)
  {
    this.#jointCount = Number(value) >>> 0;
  }

  /**
   * The joint mapping array; it is owned by the parent mesh and shared by every
   * area, so it must not be mutated here.
   */
  @meta.blue.method
  @meta.implemented
  GetJointMappingAnimRig()
  {
    return this.#jointMappingAnimRig;
  }

  /**
   * The provided array is NOT owned by this instance, it is owned by the
   * parent mesh; each mesh area shares the same array.
   */
  @meta.blue.method
  @meta.implemented
  SetJointMappingAnimRig(value)
  {
    this.#jointMappingAnimRig = value ?? null;
  }

  /**
   * Carbon's operator= - copies authored fields and deliberately resets the
   * joint state, which BindToRig must rebuild for the new owner.
   */
  @meta.blue.method
  @meta.adapted
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

  /**
   * Carbon AddOwnerMesh (Tr2MeshArea.cpp:201-204): the mesh that took this area
   * records itself here. NOTHING IN THE DONOR READS m_ownerMeshes - the pair
   * writes it and no code in the tree consumes it - so this is ported for shape
   * rather than for a consumer.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon holds raw Tr2MeshBase* here, which do not keep the mesh alive; a JavaScript reference does. With no reader in the donor that retention is the only observable difference, and it is recorded rather than worked around.")
  AddOwnerMesh(mesh)
  {
    if (mesh) this.#ownerMeshes.push(mesh);
  }

  /** Carbon RemoveOwnerMesh (Tr2MeshArea.cpp:206-218): swap-with-back removal. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon CCP_ASSERTs when the mesh is absent, which is a debug-build check; here it throws, since unregistering from an area a mesh never took is a caller defect either way.")
  RemoveOwnerMesh(mesh)
  {
    const index = this.#ownerMeshes.indexOf(mesh);
    if (index === -1) throw new Error("Tr2MeshArea.RemoveOwnerMesh: that mesh does not own this area.");
    this.#ownerMeshes[index] = this.#ownerMeshes[this.#ownerMeshes.length - 1];
    this.#ownerMeshes.pop();
  }

  /** The meshes that have taken this area. */
  GetOwnerMeshes()
  {
    return this.#ownerMeshes;
  }
}

meta.blue.interfaceTable({ interfaces: [Tr2MeshArea], chainTo: null })(Tr2MeshArea, { kind: "class" });
