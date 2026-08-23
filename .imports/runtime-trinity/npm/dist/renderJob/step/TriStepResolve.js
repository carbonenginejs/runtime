import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_generateMipmap, _init_extra_generateMipmap, _init_source, _init_extra_source, _init_destination, _init_extra_destination;

/**
 * Step that resolves one render target into another, optionally regenerating the
 * destination's mip chain afterwards.
 */
let _TriStepResolve;
class TriStepResolve extends _TriRenderStep {
  static {
    ({
      e: [_init_generateMipmap, _init_extra_generateMipmap, _init_source, _init_extra_source, _init_destination, _init_extra_destination, _initProto],
      c: [_TriStepResolve, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepResolve",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.boolean], 16, "generateMipmap"], [[io, io.readwrite, void 0, type.objectRef("Tr2RenderTarget")], 16, "source"], [[io, io.readwrite, void 0, type.objectRef("Tr2RenderTarget")], 16, "destination"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_destination(this);
  }
  generateMipmap = (_initProto(this), _init_generateMipmap(this, false));
  source = (_init_extra_generateMipmap(this), _init_source(this, null));
  destination = (_init_extra_source(this), _init_destination(this, null));

  /** Stores the resolve operands in Carbon's destination-first argument order. */
  __init__(destination = null, source = null) {
    this.destination = destination ?? null;
    this.source = source ?? null;
  }

  /**
   * Skips silently with RS_OK when either operand is missing or the executor
   * reports it invalid; otherwise resolves and, when requested, regenerates the
   * destination's mip maps. An explicit false from the resolve is RS_FAILED.
   */
  Execute(_realTime, _simTime, executor) {
    if (!this.source || !this.destination) return _TriRenderJob.StepResult.RS_OK;
    if (executor?.IsRenderTargetValid) {
      if (!executor.IsRenderTargetValid(this.source) || !executor.IsRenderTargetValid(this.destination)) {
        return _TriRenderJob.StepResult.RS_OK;
      }
    }
    const resolved = executor?.ResolveRenderTarget?.(this.source, this.destination);
    if (resolved === false) return _TriRenderJob.StepResult.RS_FAILED;
    if (this.generateMipmap) executor?.GenerateMipMaps?.(this.destination);
    return _TriRenderJob.StepResult.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepResolve as TriStepResolve };
//# sourceMappingURL=TriStepResolve.js.map
