// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";
import { Tr2ResourceSetDescriptionAL } from "../../core/al/Tr2ResourceSetAL.js";
import { Tr2MaterialStageInput } from "./Tr2MaterialStageInput.js";

/** Collects one effect pass's per-stage inputs, rerouted parameters, used resources, and resource-set state. */
@type.define({ className: "Tr2EffectPassParameters", family: "shader" })
export class Tr2EffectPassParameters extends CjsModel
{

  /** m_stageInput (Tr2MaterialStageInput) */
  @type.rawStruct("Tr2MaterialStageInput")
  stageInput = Array.from({ length: 6 }, () => new Tr2MaterialStageInput());

  /** m_reroutedParameters (std::vector<ITriReroutable*>) */
  @type.list("ITriReroutable")
  reroutedParameters = [];

  // TWO DIFFERENT OBJECTS USED TO SHARE THIS NAME, and the field held the
  // wrong one until 2026-09-05. `Tr2Effect` assigned the READER's
  // `HlslResourceSetDescription` straight in - a class with `SetSampler` and
  // the D3D12 heap-view setters, but no `SetSrv`, `SetUav` or
  // `ClearResources`. Carbon's `m_resourceSetDesc` is a member of the pass
  // parameters, constructed here and filled at bind time by
  // `UpdateResourceSetDesc`; it is not something a format reader hands over.
  //
  // The reader's object is not junk - its heap views are a fidelity artifact
  // of the binding-manifest round trip and its own test asserts them - so the
  // two are separated rather than one deleted. See
  // /docs/research/graphics-path-review-2026-09-05.md.

  /** m_resourceSetDesc (Tr2ResourceSetDescriptionAL) */
  @type.rawStruct("Tr2ResourceSetDescriptionAL")
  resourceSetDesc = new Tr2ResourceSetDescriptionAL();

  /** m_resourceSet (Tr2ResourceSetAL) */
  @type.rawStruct("Tr2ResourceSetAL")
  resourceSet = null;

  /** m_usedResources (std::vector<ITr2EffectValuePtr>) */
  @type.list("ITr2EffectValue")
  usedResources = [];

  /** m_usedTextures (Tr2BindlessResourcesAL) */
  @type.rawStruct("Tr2BindlessResourcesAL")
  usedTextures = null;

  /** m_resourceSetHash (uint32_t) */
  @type.uint32
  resourceSetHash = 0;

  /** m_resourceSetDirty (bool) */
  @type.boolean
  resourceSetDirty = true;

  /** m_compatibleWithGdr (bool) */
  @type.boolean
  compatibleWithGdr = true;

  /** m_usedTexturesDirty (bool) */
  @type.boolean
  usedTexturesDirty = false;

  /** Records a resource this pass binds and marks the used-texture list stale. */
  AddUsedResource(resource)
  {
    this.usedResources.push(resource);
    this.usedTexturesDirty = true;
  }

  /**
   * Records a parameter whose value destination has been rerouted into this
   * pass's storage.
   */
  AddReroutable(reroutable)
  {
    this.reroutedParameters.push(reroutable);
  }

  /**
   * Allocates the CPU-side constant mirror for one shader stage of this pass.
   * @param type stage index into stageInput
   * @param size mirror size in bytes, rounded up to 16 by the stage
   */
  AllocateConstantMirror(type, size)
  {
    this.#stage(type).AllocateConstants(size);
  }

  /**
   * Fills one stage's constant mirror from already-built shared buffer contents and clears that stage's dirty flag.
   * @param type stage index into stageInput
   */
  GetSharedConstantBuffer(type, contents, size)
  {
    this.#stage(type).GetSharedConstantBuffer(contents, size);
  }

  /**
   * The stage input at the given index, created on demand; negative or
   * non-numeric indices clamp to 0.
   */
  #stage(type)
  {
    const index = Math.max(0, Number(type) || 0);
    this.stageInput[index] ??= new Tr2MaterialStageInput();
    return this.stageInput[index];
  }

}
