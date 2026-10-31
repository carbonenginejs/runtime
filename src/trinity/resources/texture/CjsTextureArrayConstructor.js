import { blue as blueService } from "#blue/blue";
import { CjsSchema } from "#schema/CjsSchema";

// Not Carbon: `dynamic:/texturearray` is ours.
import { IBlueDynamicResourceConstructor } from "#blue";
import { TriTextureRes } from "./TriTextureRes.js";
import { Tr2TexturePipeline } from "../../texturePipeline/Tr2TexturePipeline.js";
import { Tr2TexturePipelineStepGenerateMips } from "../../texturePipeline/Tr2TexturePipelineStepGenerateMips.js";
import { CjsTexturePipelineStepConvert } from "../../texturePipeline/CjsTexturePipelineStepConvert.js";
import { CjsTexturePipelineStepResize } from "../../texturePipeline/CjsTexturePipelineStepResize.js";
import { CjsTexturePipelineStepArray } from "../../texturePipeline/CjsTexturePipelineStepArray.js";

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
   * An assembled array costs downloads and decodes to rebuild, so it is kept.
   *
   * @returns {boolean} Always true.
   */
  IsCacheable()
  {
    return true;
  }

  /**
   * Build the native texture handle, retaining its recipe for same-handle reload.
   *
   * @implemented
   * @param {string} query Authored dynamic texture recipe after its registered prefix.
   * @returns {TriTextureRes} Initialized texture with a recipe retained for same-handle reload.
   */
  GetResource(query)
  {
    const texture = new TriTextureRes();
    const path = TextureArrayPrefix + query;
    const pipeline = CjsTextureArrayConstructor.buildRecipe(query);
    if (!pipeline)
    {
      texture._path = path;
      const error = new Error("Failed to parse " + path + " texture path");
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      blueService.resMan._FailResourceLoad(texture, error);
      return texture;
    }
    texture._pipeline = pipeline;
    texture._pipelineEx = "";
    texture.Initialize(path, "");
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
  resourceManager.RegisterResourceConstructor("texturearray", new CjsTextureArrayConstructor());
  return resourceManager;
}

CjsSchema.meta.define("CjsTextureArrayConstructor")(CjsTextureArrayConstructor);

CjsSchema.decorateMethod(CjsTextureArrayConstructor, "GetResource", CjsSchema.meta.implemented);
