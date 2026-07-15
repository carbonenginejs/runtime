import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initProto, _initClass, _init_pipelineType, _init_extra_pipelineType, _init_steps, _init_extra_steps;

/** Tr2TexturePipeline (resources) - generated from schema shapeHash b997ef3d.... */
let _Tr2TexturePipeline;
class Tr2TexturePipeline extends CjsModel {
  static {
    ({
      e: [_init_pipelineType, _init_extra_pipelineType, _init_steps, _init_extra_steps, _initProto],
      c: [_Tr2TexturePipeline, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipeline",
      family: "resources"
    })], [[[io, io.persist, type, type.string], 16, "pipelineType"], [[io, io.persist, void 0, type.list("ITr2TexturePipelineStep")], 16, "steps"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Execute"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetResourceDependencies"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_steps(this);
  }
  /** m_pipelineType (std::string) [READWRITE, PERSIST] */
  pipelineType = (_initProto(this), _init_pipelineType(this, ""));

  /** m_steps (PITr2TexturePipelineStepVector) [READ, PERSIST] */
  steps = (_init_extra_pipelineType(this), _init_steps(this, []));

  /** Carbon method Execute -> ExecuteFromScript (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  Execute(...args) {
    throw new Error("Tr2TexturePipeline.Execute is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetResourceDependencies -> GetResourceDependenciesFromScript (MAP_METHOD_AND_WRAP). */
  GetResourceDependencies(...args) {
    throw new Error("Tr2TexturePipeline.GetResourceDependencies is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2TexturePipeline as Tr2TexturePipeline };
//# sourceMappingURL=Tr2TexturePipeline.js.map
