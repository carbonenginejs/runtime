// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.h
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp
// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.cpp
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.cpp
import { carbon, CjsSchema, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import {
  executeTexturePipeline,
  getTexturePipelineDependencies
} from "./texturePipelineBehavior.js";

/**
 * Carbon texture-specific CPU bitmap transformation pipeline.
 *
 * Inputs are supplied explicitly, through a load callback, or through an
 * injected CjsResMan. The result is a canonical plain RGBA payload.
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
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Execute the CPU pipeline and return a canonical RGBA payload.
   *
   * @param {number} maxWidth Optional caller width limit.
   * @param {number} maxHeight Optional caller height limit.
   * @param {object|null} options Input map, load callback, or CjsResMan.
   * @returns {Promise<object>} Canonical RGBA payload.
   */
  async Execute(maxWidth = 0, maxHeight = 0, options = null)
  {
    return executeTexturePipeline(this.steps, { maxWidth, maxHeight }, options);
  }

  /**
   * Return sorted unique resource paths consumed by load and pack steps.
   *
   * @returns {string[]} Resource dependency paths.
   */
  GetResourceDependencies()
  {
    return getTexturePipelineDependencies(this.steps);
  }

}

CjsSchema.define(Tr2TexturePipeline, {
  className: "Tr2TexturePipeline", family: "resources",
  fields: {
    pipelineType: [ io.persist, type.string ],
    steps: [ io.persist, type.list("ITr2TexturePipelineStep") ]
  },
  methods: {
    Execute: [ carbon.method, impl.adapted, impl.reason("Carbon fills an ImageIO::HostBitmap through blocking file reads; JavaScript resolves inputs asynchronously and returns the runtime resource layer's plain CPU payload.") ],
    GetResourceDependencies: [ carbon.method, impl.implemented ]
  }
});
