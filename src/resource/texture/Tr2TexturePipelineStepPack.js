// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
//   trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
// Schema: format-carbon resources/Tr2TexturePipelineStepPack.json; maintained by the runtime resource layer.
//
// CARBON'S PRIVATE STATIC `Pack` (h:47, cpp:182-215) IS ADAPTED AWAY, not
// missing: it is a per-channel byte interleaver whose independent pixel/row
// strides exist because Carbon packs from BGRA host bitmaps of differing
// formats and mip pitches. This runtime's pipeline speaks one canonical
// single-mip RGBA payload, so the interleave collapses into packBitmap's
// per-pixel loop (texturePipelineBehavior.js) and a separate stride-walking
// helper would have nothing distinct to do. Two donor quirks recorded there:
// the R8 arm of Execute's channel-count switch tests PIXEL_FORMAT_R8_UINT
// while only R8_UNORM is accepted (cpp:166-170), so Carbon's R8 output
// actually takes the four-source default - the JS form packs R8 correctly
// and that divergence is deliberate; and the source byte offset clamps to
// min(pixelStride-1, SwapRedBlue(channel)) (cpp:156).
import { CjsSchema, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { packBitmap } from "./texturePipelineBehavior.js";

/** Tr2TexturePipelineStepPack (resources) - maintained from schema shapeHash 3efe48d4.... */
export class Tr2TexturePipelineStepPack extends CjsModel
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = 87;

  /** m_a (PTr2TexturePackChannel) [READ, PERSIST] */
  a = null;

  /** m_b (PTr2TexturePackChannel) [READ, PERSIST] */
  b = null;

  /** m_g (PTr2TexturePackChannel) [READ, PERSIST] */
  g = null;

  /** m_r (PTr2TexturePackChannel) [READ, PERSIST] */
  r = null;

  /**
   * Carbon GetResourceDependencies (cpp:39-57), the ITr2TexturePipelineStep
   * virtual: insert each channel's non-empty path into the caller's set.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, for the caller that omitted it.
   */
  GetResourceDependencies(resources = new Set())
  {
    for (const channel of [ this.r, this.g, this.b, this.a ])
    {
      if (channel?.path) resources.add(String(channel.path));
    }
    return resources;
  }

  /**
   * Carbon Execute (cpp:60-179), the other step virtual: packs up to four
   * single-channel reads into one bitmap. Carbon fills an out-param
   * HostBitmap per mip; the canonical JS pipeline returns a single-mip RGBA
   * bitmap instead, and this method IS the body the pipeline dispatcher
   * runs (texturePipelineBehavior.js packBitmap).
   *
   * @param {Map<string, object>} inputs Resolved input bitmaps by path.
   * @returns {object} The packed bitmap.
   */
  Execute(inputs)
  {
    return packBitmap(this, inputs);
  }

}

CjsSchema.define(Tr2TexturePipelineStepPack, {
  className: "Tr2TexturePipelineStepPack", family: "resources",
  fields: {
    format: [ io.persist, type.int32, type.enum("PixelFormat") ],
    a: [ io.persist, type.objectRef("Tr2TexturePackChannel") ],
    b: [ io.persist, type.objectRef("Tr2TexturePackChannel") ],
    g: [ io.persist, type.objectRef("Tr2TexturePackChannel") ],
    r: [ io.persist, type.objectRef("Tr2TexturePackChannel") ]
  },
  methods: {
    GetResourceDependencies: impl.implemented,
    Execute: [ impl.adapted, impl.reason("Carbon fills an out-param BGRA HostBitmap per mip; the JS pipeline's canonical payload is a returned single-mip RGBA bitmap.") ]
  }
});
