import { CjsSchema, type } from "#schema";
// Source: trinity/trinity/Tr2VolumetricsRenderer.h (FogViewDependentResources, :155-170)
// Source: trinity/trinity/Tr2VolumetricsRenderer.cpp (its constructor, :21-45)
// Hand-maintained: Carbon's nested struct, in its own file so it is findable by
// name; Tr2VolumetricsRenderer.FogViewDependentResources is this type.
import { vec3 } from "#math/vec3";
import { Tr2Effect } from "../../shader/Tr2Effect.js";

const FOG_PATH = "res:/Graphics/Effect/Managed/Space/SpecialFX/Volumetric/Fog/";


/**
 * Carbon's Tr2VolumetricsRenderer::FogViewDependentResources (Tr2VolumetricsRenderer.h:155-170, cpp:21-45): the froxel
 * effects and temporal state one view renders its fog with. The scene view's set filters its froxels temporally; the
 * reflection map's does not, so its raymarch reads the froxels it just calculated.
 */
export class Tr2VolumetricsRendererFogViewDependentResources
{
  useTemporalFroxels = false;
  currentTemporalFroxels = false;
  froxelJitter = vec3.create();
  calculateFroxels = new Tr2Effect();
  rtCalculateFroxels = new Tr2Effect();
  filterFroxels = new Tr2Effect();
  raymarchFroxels = new Tr2Effect();
  applyFroxels = new Tr2Effect();

  /** @param {boolean} temporalFroxels Whether this view filters its froxels against the previous frame's. */
  constructor(temporalFroxels)
  {
    this.useTemporalFroxels = temporalFroxels;
    this.calculateFroxels.SetEffectPathName(FOG_PATH + "CalculateFroxels.fx");
    this.rtCalculateFroxels.SetEffectPathName(FOG_PATH + "RtCalculateFroxels.fx");
    this.filterFroxels.SetEffectPathName(FOG_PATH + "FilterFroxels.fx");
    this.raymarchFroxels.SetEffectPathName(FOG_PATH + "RaymarchFroxels.fx");
    this.raymarchFroxels.SetOption("INPUT_SOURCE", temporalFroxels ? "INPUT_SOURCE_INPUT_TEXTURE" : "INPUT_SOURCE_OUTPUT_TEXTURE");
    this.applyFroxels.SetEffectPathName(FOG_PATH + "ApplyFroxels.fx");
  }
}

CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "useTemporalFroxels", type.boolean);
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "currentTemporalFroxels", type.boolean);
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "froxelJitter", type.vec3);
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "calculateFroxels", type.rootRef("Tr2Effect"));
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "rtCalculateFroxels", type.rootRef("Tr2Effect"));
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "filterFroxels", type.rootRef("Tr2Effect"));
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "raymarchFroxels", type.rootRef("Tr2Effect"));
CjsSchema.decorateField(Tr2VolumetricsRendererFogViewDependentResources, "applyFroxels", type.rootRef("Tr2Effect"));
CjsSchema.meta.define(Tr2VolumetricsRendererFogViewDependentResources, { className: "Tr2VolumetricsRendererFogViewDependentResources", donors: ["Tr2VolumetricsRenderer::FogViewDependentResources"] });
