// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h:141-171
//   trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.cpp:394-441
//   (the parameter's methods live in the volume's translation unit)
// Hand-maintained from Carbon source, promoted out of generated intake
// 2026-09-06 (docs/research/ratchet-three-method-tier-2026-09-06.md).
//
// CopyToResourceSet (cpp:415-433) is deliberately NOT here: it is
// Tr2ResourceSetDescriptionAL/Tr2TextureAL device work and stays with the
// engine lane.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { CjsParameter } from "../../shader/parameter/CjsParameter.js";

/** Binds an editable cloud volume to a named effect texture parameter and records whether the effect consumes it. */
@type.define({ className: "EveCloudVolumeTextureParameter", family: "eve/child", purpose: "Binds an editable cloud volume to a named effect texture parameter and records whether the effect consumes it." })
export class EveCloudVolumeTextureParameter extends CjsModel
{

  /** m_volume (EveCloudEditableVolumePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveCloudEditableVolume")
  volume = null;

  /** m_isUsedByEffect (bool) [READ] */
  @io.read
  @type.boolean
  isUsedByEffect = false;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /**
   * Carbon GetHashValue (EveCloudEditableVolume.cpp:435-441): folds the
   * referenced volume's POINTER IDENTITY into the incoming resource-set
   * hash with FNV1. JS has no pointer bytes, so each volume gets a stable
   * per-object id on first hash - same object, same hash, for the life of
   * the process, which is exactly what the pointer bought Carbon.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon hashes the volume pointer's bytes; the parameter library's identity hash gives the same same-object-same-hash contract.")
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1Identity(this.volume, startingHash);
  }

  /** Carbon GetParameterName (cpp:394-397). */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /**
   * Carbon RebuildEffectHandles (cpp:399-413): clear the flag, early-out on
   * an empty name or no shader, then mark the parameter used only when the
   * shader actually declares a resource of this name - the
   * effectRes->GetResource(m_name) probe, which is the resource half of the
   * TriTextureParameter convention (donor checks resources only, not
   * constants).
   */
  @carbon.method
  @impl.implemented
  RebuildEffectHandles(effectRes)
  {
    this.isUsedByEffect = false;
    if (!this.name || !effectRes) return;
    this.isUsedByEffect = CjsParameter.hasEffectResource(effectRes, this.name);
  }

}
