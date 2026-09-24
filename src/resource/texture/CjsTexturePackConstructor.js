// Not Carbon: `dynamic:/texturepack` is ours, registered in
// /docs/architecture/non-carbon-extensions.md. Carbon's dynamic constructors
// (SolidColorTexture.cpp, GradientTexture.cpp) rasterize from values in the
// query; this one composes other resources.
import { IBlueDynamicResourceConstructor } from "#blue";
import { PixelFormat } from "#consts/render-context";
import { TriTextureRes } from "./TriTextureRes.js";
import { Tr2TexturePipeline } from "./Tr2TexturePipeline.js";
import { Tr2TexturePipelineStepPack } from "./Tr2TexturePipelineStepPack.js";
import { Tr2TexturePackChannel } from "./Tr2TexturePackChannel.js";
import { Tr2TexturePipelineStepGenerateMips } from "./Tr2TexturePipelineStepGenerateMips.js";
import { CjsTexturePipelineStepConvert } from "./CjsTexturePipelineStepConvert.js";
import { CjsTexturePipelineStepResize } from "./CjsTexturePipelineStepResize.js";

/** The prefix a pack path starts with. */
export const TexturePackPrefix = "dynamic:/texturepack/";

/** Authored channel letters, in Carbon's RGBA authoring order. */
const CHANNEL_INDEX = { r: 0, g: 1, b: 2, a: 3 };

/**
 * `dynamic:/texturepack/<source>;<source>...` - up to four channels packed
 * from separate images into one texture.
 *
 * Each source is a resource path, optionally followed by the channels to take
 * from it: `res:/a.dds:rg;res:/b.dds:rg` puts a's red and green into red and
 * green, and b's into blue and alpha. Without a suffix a source gives its red
 * channel, as the scalar maps this exists for store their value there. The
 * query becomes a Carbon texture-pipeline recipe - Convert, Resize, Pack,
 * GenerateMips - which the texture runs through Carbon's `.ctr` route.
 *
 * Kept in the cache after release: rebuilding means downloading and decoding
 * every source again.
 */
export class CjsTexturePackConstructor extends IBlueDynamicResourceConstructor
{

  /**
   * @param {object} resourceManager The `CjsResMan` that loads the sources.
   */
  constructor(resourceManager)
  {
    super();
    this._resourceManager = resourceManager;
  }

  /**
   * A generated pack costs downloads and decodes to rebuild, so it is kept.
   *
   * @returns {boolean} Always true.
   */
  IsCacheable()
  {
    return true;
  }

  /**
   * Build the texture a pack query describes. The recipe starts running at
   * once; the texture is prepared when it finishes.
   *
   * @param {string} query Text after `dynamic:/texturepack/`.
   * @returns {TriTextureRes} The texture resource.
   */
  GetResource(query)
  {
    const texture = new TriTextureRes();
    texture.Initialize(TexturePackPrefix + query, "");

    const pipeline = CjsTexturePackConstructor.buildRecipe(query);

    if (!pipeline)
    {
      const error = new Error(`Failed to parse ${TexturePackPrefix}${query} texture path`);
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      texture.SetError(error);
      return texture;
    }

    texture.LoadPipeline(pipeline, this._resourceManager);
    return texture;
  }

  /**
   * The recipe for a pack query, or null when it is malformed.
   *
   * @param {string} query `source[:channels];source[:channels]...`
   * @returns {Tr2TexturePipeline|null} The recipe.
   */
  static buildRecipe(query)
  {
    const sources = CjsTexturePackConstructor.parseQuery(query);

    if (!sources) return null;

    const pack = new Tr2TexturePipelineStepPack();
    pack.format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;

    // Output channels fill red, green, blue, alpha in order; alpha defaults opaque.
    const outputs = [ "r", "g", "b", "a" ];
    let slot = 0;

    for (const { path, channels } of sources)
    {
      for (const letter of channels)
      {
        pack[outputs[slot++]] = Object.assign(new Tr2TexturePackChannel(), { path, channel: CHANNEL_INDEX[letter] });
      }
    }

    for (; slot < 4; slot++)
    {
      pack[outputs[slot]] = Object.assign(new Tr2TexturePackChannel(), { fill: outputs[slot] === "a" ? 255 : 0 });
    }

    const pipeline = new Tr2TexturePipeline();
    pipeline.steps = [
      new CjsTexturePipelineStepConvert(),
      new CjsTexturePipelineStepResize(),
      pack,
      new Tr2TexturePipelineStepGenerateMips()
    ];
    return pipeline;
  }

  /**
   * Split a pack query into sources and the channels each gives.
   *
   * A path contains `:` itself (`res:/...`), so only a trailing `:` followed by
   * one to four channel letters is read as a channel selection.
   *
   * @param {string} query The query.
   * @returns {{path: string, channels: string[]}[]|null} Sources, or null when
   *   malformed or when they add up to more than four channels.
   */
  static parseQuery(query)
  {
    const sources = String(query).split(";").map(part => part.trim()).filter(part => part);

    if (sources.length === 0) return null;

    const parsed = sources.map(part =>
    {
      const match = /^(.*):([rgba]{1,4})$/i.exec(part);
      return match
        ? { path: match[1], channels: [ ...match[2].toLowerCase() ] }
        : { path: part, channels: [ "r" ] };
    });

    const total = parsed.reduce((sum, source) => sum + source.channels.length, 0);
    return total >= 1 && total <= 4 && parsed.every(source => source.path) ? parsed : null;
  }

}

/**
 * Registers `dynamic:/texturepack` on a manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterTexturePack(resourceManager)
{
  resourceManager.RegisterResourceConstructor("texturepack", new CjsTexturePackConstructor(resourceManager));
  return resourceManager;
}
