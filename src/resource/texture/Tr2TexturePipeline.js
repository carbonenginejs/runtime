// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.h
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp
// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
import { carbon, CjsSchema, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2TexturePipelineParams } from "./Tr2TexturePipelineParams.js";
import { Tr2TexturePipelineStepLimitSize } from "./Tr2TexturePipelineStepLimitSize.js";

/**
 * Carbon texture-specific CPU bitmap transformation pipeline.
 *
 * The steps share one ImageIO::HostBitmap, exactly as Carbon does: each step
 * reads and rewrites it, and the caller supplies every input bitmap the steps
 * name, keyed by resource path.
 */
export class Tr2TexturePipeline extends CjsModel
{

  /** m_pipelineType (std::string) [READWRITE, PERSIST] */
  pipelineType = "";

  /** m_steps (PITr2TexturePipelineStepVector) [READ, PERSIST] */
  steps = [];

  /** Creates a Tr2TexturePipeline with caller-provided initial state. */
  constructor(values = null)
  {
    super();
    this.SetValues(values || {}, {
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Carbon Execute (cpp:24-45): run every step against one bitmap, then apply
   * the caller's size limit.
   *
   * diverged: a failed step stops the pipeline. Carbon ignores each step's
   * result and runs the next one as though it had succeeded, so a failed Load
   * leaves the following steps working on an empty bitmap (issue 19,
   * /docs/research/carbon-imageio-issue.md).
   *
   * @param {import("#imageio").HostBitmap} result Bitmap to fill; destroyed first.
   * @param {Map<string, import("#imageio").HostBitmap>} inputs Loaded inputs by path.
   * @param {Tr2TexturePipelineParams} params Caller size limits.
   * @returns {boolean} Whether the pipeline succeeded.
   */
  Execute(result, inputs, params = new Tr2TexturePipelineParams())
  {
    result.Destroy();

    // Carbon: CCP_LOGERR("Tr2TexturePipeline: no steps")
    if (!this.steps.length) return false;

    for (const step of this.steps)
    {
      if (!step.Execute(result, inputs, params)) return false;
    }

    if (params.maxHeight || params.maxWidth)
    {
      return Tr2TexturePipelineStepLimitSize.limitSize(result, params.maxWidth, params.maxHeight);
    }

    return true;
  }

  /**
   * Carbon GetResourceDependencies (cpp:15-22): every path the steps need.
   *
   * adapted: Carbon fills a caller-owned set; this returns the paths sorted,
   * which the resource layer wants for a stable load order.
   *
   * @returns {string[]} Resource dependency paths.
   */
  GetResourceDependencies()
  {
    const resources = new Set();
    for (const step of this.steps) step.GetResourceDependencies(resources);
    return [ ...resources ].sort();
  }

}

CjsSchema.define(Tr2TexturePipeline, {
  className: "Tr2TexturePipeline", family: "resources",
  fields: {
    pipelineType: [ edit.persist, type.string ],
    steps: [ edit.persist, type.list("ITr2TexturePipelineStep") ]
  },
  methods: {
    Execute: [ carbon.method, impl.adapted, impl.reason("Carbon ignores each step's result and runs the next one regardless; ours stops on the first failure (issue 19).") ],
    GetResourceDependencies: [ carbon.method, impl.adapted, impl.reason("Carbon fills a caller-owned set; ours returns the paths sorted, for a stable load order.") ]
  }
});
