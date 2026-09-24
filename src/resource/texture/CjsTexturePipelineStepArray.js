// Not Carbon. A texture-pipeline step of our own, registered in
// /docs/architecture/non-carbon-extensions.md.
import { CjsSchema, edit, impl, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Stacks the named inputs, in order, into one 2D texture array: layer 0 is the
 * first path.
 *
 * Carbon's pipeline has no array step - Carbon's arrays arrive as authored
 * files or are grown element by element (`Tr2TextureArray`). We assemble one
 * from separate images for `dynamic:/texturearray`, so a family of maps (the
 * Detail1Map..Detail3Map kind) binds as one sampler on WebGL2's 16-unit budget
 * while the effect keeps its named parameters.
 *
 * The layers must already match in format, size and mip count - run
 * `CjsTexturePipelineStepConvert` and `CjsTexturePipelineStepResize` first.
 */
export class CjsTexturePipelineStepArray extends CjsModel
{

  /** Layer paths, layer 0 first. */
  paths = [];

  /**
   * Every layer is a resource this step reads.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set.
   */
  GetResourceDependencies(resources = new Set())
  {
    for (const path of this.paths) resources.add(String(path));
    return resources;
  }

  /**
   * Build the array into the pipeline's bitmap.
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @param {Map<string, import("#imageio").HostBitmap>} inputs Loaded inputs by path.
   * @returns {boolean} False when a layer is missing or the layers do not match.
   */
  Execute(bitmap, inputs)
  {
    const layers = this.paths.map(path => inputs.get(String(path)));

    if (!layers.length || layers.some(layer => !layer)) return false;

    const [ first ] = layers;
    const mips = first.GetTrueMipCount();

    for (const layer of layers)
    {
      if (layer.GetFormat() !== first.GetFormat()
        || layer.GetWidth() !== first.GetWidth()
        || layer.GetHeight() !== first.GetHeight()
        || layer.GetTrueMipCount() !== mips
        || layer.GetArraySize() > 1) return false;
    }

    if (!bitmap.Create2DArray(first.GetWidth(), first.GetHeight(), mips, layers.length, first.GetFormat())) return false;

    for (let index = 0; index < layers.length; index++)
    {
      for (let mip = 0; mip < mips; mip++)
      {
        bitmap.GetMipRawData(mip, index).set(layers[index].GetMipRawData(mip).subarray(0, layers[index].GetMipSize(mip)));
      }
    }
    return true;
  }

}

CjsSchema.define(CjsTexturePipelineStepArray, {
  className: "CjsTexturePipelineStepArray", family: "resources",
  fields: {
    paths: [ edit.persist, type.list("string") ]
  },
  methods: {
    GetResourceDependencies: impl.custom,
    Execute: impl.custom
  }
});
