// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { Tr2MaterialStageInput } from "./Tr2MaterialStageInput.js";

/** Collects one effect library's local and global stage inputs, rerouted parameters, and resource-set state. */
@meta.define({ className: "Tr2EffectLibraryParameters", family: "shader" })
export class Tr2EffectLibraryParameters
{

  /** m_localInput (Tr2MaterialStageInput) */
  @meta.type.rawStruct("Tr2MaterialStageInput")
  localInput = new Tr2MaterialStageInput();

  /** m_globalInput (Tr2MaterialStageInput) */
  @meta.type.rawStruct("Tr2MaterialStageInput")
  globalInput = new Tr2MaterialStageInput();

  /** m_globalResourceSetDesc (Tr2ResourceSetDescriptionAL) */
  @meta.type.rawStruct("Tr2ResourceSetDescriptionAL")
  globalResourceSetDesc = null;

  /** m_globalResourceSet (Tr2ResourceSetAL) */
  @meta.type.rawStruct("Tr2ResourceSetAL")
  globalResourceSet = null;

  /** m_reroutedParameters (std::vector<ITriReroutable*>) */
  @meta.type.list("ITriReroutable")
  reroutedParameters = [];

  /** m_usedResources (std::vector<ITr2EffectValuePtr>) */
  @meta.type.list("ITr2EffectValue")
  usedResources = [];

  /** m_usedTextures (Tr2BindlessResourcesAL) */
  @meta.type.rawStruct("Tr2BindlessResourcesAL")
  usedTextures = null;

  /** m_globalResourceSetDirty (bool) */
  @meta.type.boolean
  globalResourceSetDirty = true;

  /** m_usedTexturesDirty (bool) */
  @meta.type.boolean
  usedTexturesDirty = false;

  /** Records a resource this library binds and marks the used-texture list stale. */
  AddUsedResource(resource)
  {
    this.usedResources.push(resource);
    this.usedTexturesDirty = true;
  }

  /**
   * Records a parameter whose value destination has been rerouted into this
   * library's storage.
   */
  AddReroutable(reroutable)
  {
    this.reroutedParameters.push(reroutable);
  }

}
