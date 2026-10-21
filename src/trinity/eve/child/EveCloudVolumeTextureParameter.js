import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h:141-171
//   trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.cpp:394-441
//   (the parameter's methods live in the volume's translation unit)
// Hand-maintained from Carbon source, promoted out of generated intake
// 2026-09-06.
//
// CopyToResourceSet (cpp:415-433) is deliberately NOT here: it is
// Tr2ResourceSetDescriptionAL/Tr2TextureAL device work and stays with the
// engine lane.
import { meta, type, blue } from "#schema";
import { ITriEffectResourceParameter } from "../../shader/parameter/ITriEffectResourceParameter.js";
import { CjsParameter } from "../../shader/parameter/CjsParameter.js";

/** Binds an editable cloud volume to a named effect texture parameter and records whether the effect consumes it. */
@blue.define({ className: "EveCloudVolumeTextureParameter", purpose: "Binds an editable cloud volume to a named effect texture parameter and records whether the effect consumes it." })
@blue.inherit(ITriEffectResourceParameter)
@blue.interface(ITriEffectResourceParameter)
export class EveCloudVolumeTextureParameter
{

  /** m_volume (EveCloudEditableVolumePtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("EveCloudEditableVolume")
  volume = null;

  /** m_isUsedByEffect (bool) [READ] */
  @be.mapAttribute(be.READ)
  @type.boolean
  isUsedByEffect = false;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /**
   * Carbon GetHashValue (EveCloudEditableVolume.cpp:435-441): folds the
   * referenced volume's POINTER IDENTITY into the incoming resource-set
   * hash with FNV1. JS has no pointer bytes, so each volume gets a stable
   * per-object id on first hash - same object, same hash, for the life of
   * the process, which is exactly what the pointer bought Carbon.
   *
   * Adapted: Carbon hashes the volume pointer's bytes; the parameter library's identity hash
   * gives the same same-object-same-hash contract.
   */
  @blue.method
  @meta.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1Identity(this.volume, startingHash);
  }

  /** Carbon GetParameterName (cpp:394-397). */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  RebuildEffectHandles(effectRes)
  {
    this.isUsedByEffect = false;
    if (!this.name || !effectRes) return;
    this.isUsedByEffect = CjsParameter.hasEffectResource(effectRes, this.name);
  }

}
