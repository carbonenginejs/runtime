// Not Carbon. A texture-pipeline step of our own.
import { CjsSchema, meta, type } from "#schema";
import { BeCallbackMan, BlueCallbackMan } from "#blue/services/BlueCallbackMan";
import { PixelFormat } from "#consts/render-context";
import { CONVERT_BITMAP_CALLBACK } from "../../resource/imageio/imageDecodeCallbacks.js";
import { createDdsBitmap } from "../../resource/formats/dds/ddsBitmap.js";
import { ITr2TexturePipelineStep } from "./ITr2TexturePipelineStep.js";

/**
 * Converts the pipeline's INPUTS to one pixel format before a later step reads
 * them - block formats decoded - so a `Pack` over EVE's compressed maps works.
 *
 * Carbon's `Tr2TexturePipelineStepPack` reads raw bytes and refuses block
 * formats, so in Carbon a pack of DXT1/BC4 sources fails. We decode on the CPU
 * because a browser cannot read a compressed texture back from the GPU.
 *
 * Each converted input is a COPY that replaces its entry in the pipeline's
 * `inputs` map, so the cached source bitmap is never changed.
 */
export class CjsTexturePipelineStepConvert
{

  /** The pixel format every named input is converted to. */
  format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;

  /** Input paths to convert; empty converts every input. */
  paths = [];

  /**
   * Names no resources: it works on inputs other steps name.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, unchanged.
   */
  GetResourceDependencies(resources = new Set())
  {
    return resources;
  }

  /**
   * Queue converted copies on BeCallbackMan, publishing only when every input succeeds.
   * The host registers IMAGE_DECODE_CALLBACK_MODULES and starts the manager;
   * workers decode off-thread, or the host ticks Update when workers are disabled.
   *
   * @cjs Browser workers require clone-safe packets and an asynchronous result.
   * @param {import("#imageio").HostBitmap} _bitmap The pipeline's bitmap (unused).
   * @param {Map<string, import("#imageio").HostBitmap>} inputs Loaded inputs by path; entries are replaced.
   * @param {object} _params Pipeline dimensions (unused by this step).
   * @param {object} [options] Pipeline cancellation options.
   * @param {AbortSignal} [options.signal] Cancels queued work and discards a running result.
   * @returns {Promise<boolean>} False when cancelled or an input cannot be converted.
   */
  async Execute(_bitmap, inputs, _params, options = {})
  {
    const signal = options.signal;
    if (signal?.aborted) return false;

    const converted = new Map();
    const id = { value: 0 };
    const cancel = () => BeCallbackMan.Cancel(id.value);
    if (signal) signal.addEventListener("abort", cancel, { once: true });
    try
    {
      for (const path of this.paths.length ? this.paths : inputs.keys())
      {
        const source = inputs.get(path);

        if (!source || signal?.aborted) return false;
        if (source.GetFormat() === this.format) continue;

        const result = await BeCallbackMan.Add__Name(CONVERT_BITMAP_CALLBACK, {
          packet: {
            description: {
              type: source.GetType(), format: source.GetFormat(), width: source.GetWidth(),
              height: source.GetHeight(), depth: source.GetDepth(), mipCount: source.GetMipCount(),
              arraySize: source.GetArraySize()
            },
            data: source.GetRawData(),
            metadata: source.metadata || { cutout: {}, metadata: [] }
          },
          format: this.format
        }, BlueCallbackMan.BCBF_NONE, id);
        if (!result || signal?.aborted) return false;

        converted.set(path, createDdsBitmap(result));
      }

      for (const [path, bitmap] of converted) inputs.set(path, bitmap);
      return true;
    }
    catch
    {
      return false;
    }
    finally
    {
      if (signal) signal.removeEventListener("abort", cancel);
    }
  }

}

CjsSchema.meta.define(CjsTexturePipelineStepConvert, {
  name: "CjsTexturePipelineStepConvert",
  fields: {
    format: [ meta.mapAttribute(meta.PERSIST), type.int32, type.enum("trinity.ImageIO.PixelFormat") ],
    paths: [ meta.mapAttribute(meta.PERSIST), type.list("string") ]
  },
  methods: {
    GetResourceDependencies: [],
    Execute: []
  }
});
CjsSchema.be.interface(ITr2TexturePipelineStep)(CjsTexturePipelineStepConvert, { kind: "class" });
