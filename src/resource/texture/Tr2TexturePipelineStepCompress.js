// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.h
// Schema: format-carbon resources/Tr2TexturePipelineStepCompress.json; maintained by the runtime resource layer.
import { carbon, CjsSchema, edit, impl, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepCompress (resources) - maintained from schema shapeHash 4d367f1c.... */
export class Tr2TexturePipelineStepCompress extends CjsModel
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = 71;

  /** m_bWeight (float) [READWRITE, PERSIST] */
  b = 1;

  /** m_gWeight (float) [READWRITE, PERSIST] */
  g = 1;

  /** m_rWeight (float) [READWRITE, PERSIST] */
  r = 1;

  /**
   * Carbon's ITr2TexturePipelineStep default (ITr2TexturePipelineStep.h:21):
   * this step names no resources.
   *
   * @param {Set<string>} [resources] Caller-owned; allocated when omitted.
   * @returns {Set<string>} The set, unchanged.
   */
  GetResourceDependencies(resources = new Set())
  {
    return resources;
  }

  /**
   * Carbon Execute (cpp:15-21) checks validity and returns true, compressing
   * nothing, so a pipeline asking for compression silently gets uncompressed
   * output (issue 20, /docs/research/carbon-imageio-issue.md).
   *
   * diverged: this refuses instead of lying. When the bitmap is already in the
   * requested format there is nothing to do and it succeeds; otherwise it
   * fails until a block encoder exists, which is the hook this step becomes
   * (/docs/projects/hostbitmap-port.md).
   *
   * @param {import("#imageio").HostBitmap} bitmap The pipeline's bitmap.
   * @returns {boolean} Whether the step succeeded.
   */
  Execute(bitmap)
  {
    if (!bitmap.IsValid()) return false;

    return bitmap.GetFormat() === this.format;
  }

}

CjsSchema.define(Tr2TexturePipelineStepCompress, {
  className: "Tr2TexturePipelineStepCompress", family: "resources",
  fields: {
    format: [ edit.persist, type.int32, type.enum("PixelFormat") ],
    b: [ edit.persist, type.float32 ],
    g: [ edit.persist, type.float32 ],
    r: [ edit.persist, type.float32 ]
  },
  methods: {
    GetResourceDependencies: [ carbon.method, impl.implemented ],
    Execute: [ carbon.method, impl.adapted, impl.reason("Carbon's step compresses nothing and returns true; ours refuses rather than pass uncompressed data off as compressed (issue 20).") ]
  }
});
