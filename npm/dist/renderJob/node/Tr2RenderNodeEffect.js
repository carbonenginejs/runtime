import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_sources, _init_extra_sources, _init_renderingMode, _init_extra_renderingMode, _init_effect, _init_extra_effect, _init_viewport, _init_extra_viewport, _init_inputNodes, _init_extra_inputNodes;

/** A render-graph node that binds named sources onto an effect and produces its output. */
let _Tr2RenderNodeEffect;
new class extends _identity {
  static [class Tr2RenderNodeEffect extends CjsModel {
    static {
      ({
        e: [_init_sources, _init_extra_sources, _init_renderingMode, _init_extra_renderingMode, _init_effect, _init_extra_effect, _init_viewport, _init_extra_viewport, _init_inputNodes, _init_extra_inputNodes, _initProto],
        c: [_Tr2RenderNodeEffect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2RenderNodeEffect",
        family: "renderJob"
      })], [[type.list("Tr2RenderNodeEffectSource"), 0, "sources"], [[io, io.readwrite, type, type.int32, void 0, type.enum("RenderingMode")], 16, "renderingMode"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.readwrite, void 0, type.objectRef("TriViewport")], 16, "viewport"], [[io, io.persist, void 0, type.list("ITr2RenderNode")], 16, "inputNodes"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddSource"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_inputNodes(this);
    }
    /** Carbon's grouped source/parameter bindings. */
    sources = (_initProto(this), _init_sources(this, []));

    /** m_renderingMode (Tr2EffectStateManager::RenderingMode - enum RenderingMode) [READWRITE, ENUM] */
    renderingMode = (_init_extra_sources(this), _init_renderingMode(this, 8));

    /** m_effect (Tr2EffectPtr) [READWRITE] */
    effect = (_init_extra_renderingMode(this), _init_effect(this, null));

    /** m_viewport (TriViewportPtr) [READWRITE] */
    viewport = (_init_extra_effect(this), _init_viewport(this, null));

    /** m_inputNodes (PITr2RenderNodeVector) [READ, PERSIST] */
    inputNodes = (_init_extra_viewport(this), _init_inputNodes(this, []));

    /** Carbon method AddSource (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    AddSource(name, source, outputName = "") {
      if (!source) return false;
      let entry = this.sources.find(item => item.node === source);
      if (!entry) {
        entry = {
          node: source,
          params: [],
          outputNames: [],
          outputs: []
        };
        this.sources.push(entry);
      }
      const normalizedOutput = String(outputName ?? "");
      entry.params.push({
        paramName: String(name),
        outputName: normalizedOutput,
        outputIndex: 0
      });
      entry.outputNames.length = 0;
      entry.outputs.length = 0;
      for (const parameter of entry.params) {
        if (!parameter.outputName) continue;
        let outputIndex = entry.outputNames.indexOf(parameter.outputName);
        if (outputIndex === -1) {
          outputIndex = entry.outputNames.length;
          entry.outputNames.push(parameter.outputName);
          entry.outputs.push({
            name: parameter.outputName,
            texture: null
          });
        }
        parameter.outputIndex = outputIndex;
      }
      this.inputNodes.push(source);
      return true;
    }
  }];
  RenderingMode = Object.freeze({
    RM_ANY: 0,
    RM_OPAQUE: 1,
    RM_DECAL: 2,
    RM_DECAL_NO_DEPTH: 3,
    RM_ALPHA: 4,
    RM_ALPHA_ADDITIVE: 5,
    RM_DEPTH_ONLY: 6,
    RM_PICKING: 7,
    RM_FULLSCREEN: 8,
    RM_SPRITE2D: 9,
    RM_CULL: 10,
    RM_LIGHT: 11,
    RM_ERASE: 12,
    RM_PREPASS_COLOR: 13,
    RM_COUNT: 14
  });
  constructor() {
    super(_Tr2RenderNodeEffect), _initClass();
  }
}();

export { _Tr2RenderNodeEffect as Tr2RenderNodeEffect };
//# sourceMappingURL=Tr2RenderNodeEffect.js.map
