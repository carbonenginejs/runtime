// Not Carbon: `dynamic:/texturearray` is ours, registered in
// /docs/architecture/non-carbon-extensions.md.
import { IBlueDynamicResourceConstructor } from "#blue";
import { TriTextureRes } from "./TriTextureRes.js";
import { Tr2TexturePipeline } from "./Tr2TexturePipeline.js";
import { Tr2TexturePipelineStepGenerateMips } from "./Tr2TexturePipelineStepGenerateMips.js";
import { CjsTexturePipelineStepConvert } from "./CjsTexturePipelineStepConvert.js";
import { CjsTexturePipelineStepResize } from "./CjsTexturePipelineStepResize.js";
import { CjsTexturePipelineStepArray } from "./CjsTexturePipelineStepArray.js";

/** The prefix an array path starts with. */
export const TextureArrayPrefix = "dynamic:/texturearray/";

/**
 * `dynamic:/texturearray/<path>;<path>...` - separate images as the layers of
 * one 2D texture array, layer 0 first.
 *
 * The string is the aggregate's whole identity: an effect keeps its named
 * parameters, and whatever binds the merged sampler reads their current paths
 * and asks for this string. A changed layer is a different string, so a
 * different cached array - nothing is mutated in place. Two effects naming the
 * same maps share one array.
 *
 * The query becomes a recipe - Convert, Resize, Array, GenerateMips - run
 * through Carbon's `.ctr` route. Kept in the cache after release: a rebuild
 * re-downloads and re-decodes every layer.
 */
export class CjsTextureArrayConstructor extends IBlueDynamicResourceConstructor
{

  /**
   * @param {object} resourceManager The `CjsResMan` that loads the layers.
   */
  constructor(resourceManager)
  {
    super();
    this._resourceManager = resourceManager;
  }

  /**
   * An assembled array costs downloads and decodes to rebuild, so it is kept.
   *
   * @returns {boolean} Always true.
   */
  IsCacheable()
  {
    return true;
  }

  /**
   * Build the texture array a query describes. The recipe starts at once; the
   * texture is prepared when it finishes.
   *
   * @param {string} query Text after `dynamic:/texturearray/`.
   * @returns {TriTextureRes} The texture resource.
   */
  GetResource(query)
  {
    const texture = new TriTextureRes();
    texture.Initialize(TextureArrayPrefix + query, "");

    const pipeline = CjsTextureArrayConstructor.buildRecipe(query);

    if (!pipeline)
    {
      const error = new Error(`Failed to parse ${TextureArrayPrefix}${query} texture path`);
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      texture.SetError(error);
      return texture;
    }

    texture.LoadPipeline(pipeline, this._resourceManager);
    return texture;
  }

  /**
   * The recipe for an array query, or null when it names no layers.
   *
   * @param {string} query `path;path;...`, layer 0 first.
   * @returns {Tr2TexturePipeline|null} The recipe.
   */
  static buildRecipe(query)
  {
    const paths = String(query).split(";").map(part => part.trim()).filter(part => part);

    if (paths.length === 0) return null;

    const array = new CjsTexturePipelineStepArray();
    array.paths = paths;

    const pipeline = new Tr2TexturePipeline();
    pipeline.steps = [
      new CjsTexturePipelineStepConvert(),
      new CjsTexturePipelineStepResize(),
      array,
      new Tr2TexturePipelineStepGenerateMips()
    ];
    return pipeline;
  }

}

/**
 * Registers `dynamic:/texturearray` on a manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterTextureArray(resourceManager)
{
  resourceManager.RegisterResourceConstructor("texturearray", new CjsTextureArrayConstructor(resourceManager));
  return resourceManager;
}
