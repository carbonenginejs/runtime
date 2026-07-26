import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { ExecuteTexturePipeline, GetTexturePipelineDependencies } from './texturePipelineBehavior.js';

let _initProto, _initClass, _init_pipelineType, _init_extra_pipelineType, _init_steps, _init_extra_steps;

/**
 * Carbon texture-specific CPU bitmap transformation pipeline.
 *
 * Inputs are supplied explicitly, through a load callback, or through an
 * injected CjsResMan. The result is a canonical plain RGBA payload.
 */
let _Tr2TexturePipeline;
class Tr2TexturePipeline extends CjsModel {
  static {
    ({
      e: [_init_pipelineType, _init_extra_pipelineType, _init_steps, _init_extra_steps, _initProto],
      c: [_Tr2TexturePipeline, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipeline",
      family: "resources"
    })], [[[io, io.persist, type, type.string], 16, "pipelineType"], [[io, io.persist, void 0, type.list("ITr2TexturePipelineStep")], 16, "steps"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon fills an ImageIO::HostBitmap through blocking file reads; JavaScript resolves inputs asynchronously and returns the runtime-resource plain CPU payload.")], 18, "Execute"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetResourceDependencies"]], 0, void 0, CjsModel));
  }
  /** m_pipelineType (std::string) [READWRITE, PERSIST] */
  pipelineType = (_initProto(this), _init_pipelineType(this, ""));

  /** m_steps (PITr2TexturePipelineStepVector) [READ, PERSIST] */
  steps = (_init_extra_pipelineType(this), _init_steps(this, []));

  /** Creates a Tr2TexturePipeline with caller-provided initial state. */
  constructor(values = null) {
    super(), _init_extra_steps(this);
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
  async Execute(maxWidth = 0, maxHeight = 0, options = null) {
    return ExecuteTexturePipeline(this.steps, {
      maxWidth,
      maxHeight
    }, options);
  }

  /**
   * Return sorted unique resource paths consumed by load and pack steps.
   *
   * @returns {string[]} Resource dependency paths.
   */
  GetResourceDependencies() {
    return GetTexturePipelineDependencies(this.steps);
  }
  static {
    _initClass();
  }
}

export { _Tr2TexturePipeline as Tr2TexturePipeline };
//# sourceMappingURL=Tr2TexturePipeline.js.map
