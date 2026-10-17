// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { Tr2ResourceSetAL, Tr2ResourceSetDescriptionAL } from "../../../trinityal/Tr2ResourceSetAL/index.js";
import { Tr2MaterialStageInput } from "./Tr2MaterialStageInput.js";

/** Collects one effect library's local and global stage inputs, rerouted parameters, and resource-set state. */
@blue.define("Tr2EffectLibraryParameters")
export class Tr2EffectLibraryParameters
{

  /** m_localInput (Tr2MaterialStageInput) */
  @type.rawStruct("Tr2MaterialStageInput")
  localInput = new Tr2MaterialStageInput();

  /** m_globalInput (Tr2MaterialStageInput) */
  @type.rawStruct("Tr2MaterialStageInput")
  globalInput = new Tr2MaterialStageInput();

  /** m_globalResourceSetDesc (Tr2ResourceSetDescriptionAL) */
  @type.rawStruct("Tr2ResourceSetDescriptionAL")
  globalResourceSetDesc = new Tr2ResourceSetDescriptionAL();

  /**
   * m_globalResourceSet (Tr2ResourceSetAL), held by value (Shader/Tr2Material.h:162),
   * so it is created with the library. A default handle is invalid until
   * created (trinityal/src/Tr2ResourceSetAL.cpp:552-555); Carbon tests
   * IsValid() before creating it (Shader/Tr2Material.cpp:581).
   */
  @type.rawStruct("Tr2ResourceSetAL")
  globalResourceSet = new Tr2ResourceSetAL();

  /** m_reroutedParameters (std::vector<ITriReroutable*>) */
  @type.list("ITriReroutable")
  reroutedParameters = [];

  /** m_usedResources (std::vector<ITr2EffectValuePtr>) */
  @type.list("ITr2EffectValue")
  usedResources = [];

  /** m_usedTextures (Tr2BindlessResourcesAL) */
  @type.rawStruct("Tr2BindlessResourcesAL")
  usedTextures = null;

  /** m_globalResourceSetDirty (bool) */
  @type.boolean
  globalResourceSetDirty = true;

  /**
   * m_usedTexturesDirty (bool). Carbon leaves it unset: the constructor
   * (Shader/Tr2Material.cpp:99) initializes only globalResourceSetDirty.
   */
  @type.boolean
  usedTexturesDirty = false;

  /** Records a resource this library binds and marks the used-texture list stale. */
  @blue.method
  AddUsedResource(resource)
  {
    this.usedResources.push(resource);
    this.usedTexturesDirty = true;
  }

  /**
   * Records a parameter whose value destination has been rerouted into this
   * library's storage.
   */
  @blue.method
  AddReroutable(reroutable)
  {
    this.reroutedParameters.push(reroutable);
  }

}
