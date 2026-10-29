import { CjsSchema } from "#schema/CjsSchema";
import { blue as blueService } from "#blue/blue";
// Not Carbon: `dynamic:/incarna` is ours, like `dynamic:/texturepack`. It
// serves the textures an Incarna material becomes when it is drawn with the
// quad shaders: each is one channel mapping of one Incarna texture, built by
// Carbon's texture pipeline (operator, 2026-10-25).
import { IBlueDynamicResourceConstructor } from "#blue";
import { PixelFormat } from "#consts/render-context";
import { meta } from "#schema";
import { TriTextureRes } from "../../../trinity/resources/texture/TriTextureRes.js";
import { Tr2TexturePipeline } from "../../../trinity/texturePipeline/Tr2TexturePipeline.js";
import { CjsTexturePipelineStepConvert } from "../../../trinity/texturePipeline/CjsTexturePipelineStepConvert.js";
import { CjsTexturePipelineStepPack } from "../../../trinity/texturePipeline/CjsTexturePipelineStepPack.js";
import { Tr2TexturePackChannel } from "../../../trinity/texturePipeline/Tr2TexturePackChannel.js";

/** The prefix an Incarna texture path starts with. */
export const IncarnaTexturePrefix = "dynamic:/incarna/";

/** Source channel letters, in Carbon's RGBA authoring order. */
const CHANNEL_INDEX = { r: 0, g: 1, b: 2, a: 3 };

/**
 * What each quad input takes from its Incarna texture: the output format, then
 * the r, g, b and a outputs, each a source channel letter or a constant byte.
 *
 * From an `_os` overlay map (R diffuse, G specular, B reflection, A glow):
 * `albedo` is the diffuse in all three colour channels, `roughness` the
 * specular (quad reads it as a gloss multiplier, so it is not inverted),
 * `material` the reflection mask, and `glow` the glow mask. From an `_nm`
 * normal map (G and A the normal, B the grime intensity): `normal` puts A and G
 * in red and green, and `dirt` is the grime. From a `_ds` detail diffuse:
 * `detail` is a flat normal (128) with the map's alpha as the detail mask.
 */
const ROLES = {
  albedo: { format: PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, channels: [ "r", "r", "r", 255 ] },
  roughness: { format: PixelFormat.PIXEL_FORMAT_R8_UNORM, channels: [ "g" ] },
  material: { format: PixelFormat.PIXEL_FORMAT_R8_UNORM, channels: [ "b" ] },
  glow: { format: PixelFormat.PIXEL_FORMAT_R8_UNORM, channels: [ "a" ] },
  normal: { format: PixelFormat.PIXEL_FORMAT_R8G8_UNORM, channels: [ "a", "g" ] },
  dirt: { format: PixelFormat.PIXEL_FORMAT_R8_UNORM, channels: [ "b" ] },
  detail: { format: PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, channels: [ 128, 128, 128, "a" ] }
};

/**
 * `dynamic:/incarna/<role>/<source>` - one quad shader input made from one
 * Incarna texture, such as
 * `dynamic:/incarna/albedo/res:/graphics/interior/caldari/modular_walkway/walkway_04_cal_01_os.dds`.
 *
 * The role names the channel mapping (`ROLES`), so the path holds no `;` and a
 * texture array can take it as a layer. The query becomes a Carbon
 * texture-pipeline recipe - Convert, then Pack - which the texture runs
 * through Carbon's `.ctr` route, and the texture keeps the packed bitmap an
 * array layer reads. Pack keeps the source's mip chain, so the recipe has no
 * GenerateMips step: HostBitmap refuses a bitmap that already has mips
 * (`imageio/HostBitmap.cpp:1036-1041`), which failed the whole recipe, and a
 * texture whose recipe fails is prepared empty, as Carbon's is
 * (`TriTextureRes.cpp:312-336`).
 *
 * Kept in the cache after release: rebuilding means downloading and decoding
 * the source again.
 */
@meta.define("CjsIncarnaTextureConstructor")
export class CjsIncarnaTextureConstructor extends IBlueDynamicResourceConstructor
{


  /**
   * A built texture costs a download and a decode to rebuild, so it is kept.
   *
   * @returns {boolean} Always true.
   */
  @meta.implemented
  IsCacheable()
  {
    return true;
  }

  /**
   * Build the native texture handle, retaining its recipe for same-handle reload.
   * @param {string} query Authored dynamic texture recipe after its registered prefix.
   * @returns {TriTextureRes} Initialized texture with a recipe retained for same-handle reload.
   */
  GetResource(query)
  {
    const texture = new TriTextureRes();
    const path = IncarnaTexturePrefix + query;
    const pipeline = CjsIncarnaTextureConstructor.buildRecipe(query);
    if (!pipeline)
    {
      texture._path = path;
      const error = new Error("Failed to parse " + path + " texture path");
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      blueService.resMan._FailResourceLoad(texture, error);
      return texture;
    }
    texture._pipeline = pipeline;
    texture._pipelineEx = "raw";
    texture.Initialize(path, "");
    return texture;
  }

  /**
   * The recipe for an Incarna query, or null for an unknown role or a missing
   * source.
   *
   * @param {string} query `<role>/<source path>`.
   * @returns {Tr2TexturePipeline|null} The recipe.
   */
  @meta.implemented
  static buildRecipe(query)
  {
    const slash = String(query).indexOf("/");
    if (slash < 1) return null;
    const role = ROLES[String(query).slice(0, slash).toLowerCase()];
    const path = String(query).slice(slash + 1).trim();
    if (!role || !path) return null;

    const pack = new CjsTexturePipelineStepPack();
    pack.format = role.format;
    for (const [ index, output ] of [ "r", "g", "b", "a" ].entries())
    {
      const source = index < role.channels.length ? role.channels[index] : (output === "a" ? 255 : 0);
      pack[output] = typeof source === "number"
        ? Object.assign(new Tr2TexturePackChannel(), { fill: source })
        : Object.assign(new Tr2TexturePackChannel(), { path, channel: CHANNEL_INDEX[source] });
    }

    const pipeline = new Tr2TexturePipeline();
    pipeline.steps = [
      new CjsTexturePipelineStepConvert(),
      pack
    ];
    return pipeline;
  }

  /**
   * The `dynamic:/incarna/` path for one quad input made from one Incarna
   * texture.
   *
   * @param {string} role A `ROLES` key, such as "albedo".
   * @param {string} sourcePath The Incarna texture's resource path.
   * @returns {string} The texture path.
   */
  @meta.implemented
  static texturePath(role, sourcePath)
  {
    return `${IncarnaTexturePrefix}${role}/${sourcePath}`;
  }

}

/**
 * Registers `dynamic:/incarna` on a manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterIncarnaTextures(resourceManager)
{
  resourceManager.RegisterResourceConstructor("incarna", new CjsIncarnaTextureConstructor());
  return resourceManager;
}

export default CjsIncarnaTextureConstructor;

CjsSchema.decorateMethod(CjsIncarnaTextureConstructor, "GetResource", CjsSchema.meta.implemented);
