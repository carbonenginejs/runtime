import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from '../../renderJob/step/TriRenderStep.js';

let _initClass, _init_destinationTarget, _init_extra_destinationTarget, _init_clearTargetOnFailure, _init_extra_clearTargetOnFailure, _init_node, _init_extra_node;

/** Tr2StepExecuteRenderNode (renderJob) - generated from schema shapeHash 94e1bbf3.... */
let _Tr2StepExecuteRender;
class Tr2StepExecuteRenderNode extends _TriRenderStep {
  static {
    ({
      e: [_init_destinationTarget, _init_extra_destinationTarget, _init_clearTargetOnFailure, _init_extra_clearTargetOnFailure, _init_node, _init_extra_node],
      c: [_Tr2StepExecuteRender, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2StepExecuteRenderNode",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("Tr2RenderTarget")], 16, "destinationTarget"], [[io, io.readwrite, type, type.boolean], 16, "clearTargetOnFailure"], [[io, io.persist, void 0, type.model("ITr2RenderNode")], 16, "node"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_node(this);
  }
  /** m_destinationTarget (Tr2RenderTargetPtr) [READWRITE] */
  destinationTarget = _init_destinationTarget(this, null);

  /** m_clearTargetOnFailure (bool) [READWRITE] */
  clearTargetOnFailure = (_init_extra_destinationTarget(this), _init_clearTargetOnFailure(this, true));

  /** m_node (ITr2RenderNodePtr) [READWRITE, PERSIST] */
  node = (_init_extra_clearTargetOnFailure(this), _init_node(this, null));
  static {
    _initClass();
  }
}

export { _Tr2StepExecuteRender as Tr2StepExecuteRenderNode };
//# sourceMappingURL=Tr2StepExecuteRenderNode.js.map
