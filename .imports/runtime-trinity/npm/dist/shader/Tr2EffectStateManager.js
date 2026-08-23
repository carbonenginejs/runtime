import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { RenderingMode } from '@carbonenginejs/runtime-utils/graphics';

let _initClass, _init_renderContext, _init_extra_renderContext, _init_perObjectConstantBuffers, _init_extra_perObjectConstantBuffers, _init_shaderProgram, _init_extra_shaderProgram, _init_vertexDeclaration, _init_extra_vertexDeclaration, _init_vertexBuffer, _init_extra_vertexBuffer, _init_offset, _init_extra_offset, _init_stride, _init_extra_stride, _init_streams, _init_extra_streams, _init_indexBuffer, _init_extra_indexBuffer, _init_indexStride, _init_extra_indexStride, _init_renderingMode, _init_extra_renderingMode, _init_renderStateSetup, _init_extra_renderStateSetup, _init_currentValues, _init_extra_currentValues, _init_isManagedRendering, _init_extra_isManagedRendering, _init_states, _init_extra_states, _init_dirty, _init_extra_dirty, _init_renderStates, _init_extra_renderStates, _init_renderStateOverrides, _init_extra_renderStateOverrides, _init_renderTargetWidth, _init_extra_renderTargetWidth, _init_renderTargetHeight, _init_extra_renderTargetHeight, _init_viewport, _init_extra_viewport, _init_viewportOnDevice, _init_extra_viewportOnDevice, _init_viewportStack, _init_extra_viewportStack, _init_viewportSizeVar, _init_extra_viewportSizeVar;

/** Tr2EffectStateManager (shader) - generated from schema shapeHash 6d2b836e.... */
let _Tr2EffectStateManage;
new class extends _identity {
  static [class Tr2EffectStateManager extends CjsModel {
    static {
      ({
        e: [_init_renderContext, _init_extra_renderContext, _init_perObjectConstantBuffers, _init_extra_perObjectConstantBuffers, _init_shaderProgram, _init_extra_shaderProgram, _init_vertexDeclaration, _init_extra_vertexDeclaration, _init_vertexBuffer, _init_extra_vertexBuffer, _init_offset, _init_extra_offset, _init_stride, _init_extra_stride, _init_streams, _init_extra_streams, _init_indexBuffer, _init_extra_indexBuffer, _init_indexStride, _init_extra_indexStride, _init_renderingMode, _init_extra_renderingMode, _init_renderStateSetup, _init_extra_renderStateSetup, _init_currentValues, _init_extra_currentValues, _init_isManagedRendering, _init_extra_isManagedRendering, _init_states, _init_extra_states, _init_dirty, _init_extra_dirty, _init_renderStates, _init_extra_renderStates, _init_renderStateOverrides, _init_extra_renderStateOverrides, _init_renderTargetWidth, _init_extra_renderTargetWidth, _init_renderTargetHeight, _init_extra_renderTargetHeight, _init_viewport, _init_extra_viewport, _init_viewportOnDevice, _init_extra_viewportOnDevice, _init_viewportStack, _init_extra_viewportStack, _init_viewportSizeVar, _init_extra_viewportSizeVar],
        c: [_Tr2EffectStateManage, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2EffectStateManager",
        family: "shader"
      })], [[type.rawStruct("Tr2RenderContext"), 0, "renderContext"], [type.rawStruct("Tr2ConstantBufferAL"), 0, "perObjectConstantBuffers"], [[type, type.uint32], 16, "shaderProgram"], [[type, type.uint32], 16, "vertexDeclaration"], [type.rawStruct("Tr2BufferAL"), 0, "vertexBuffer"], [[type, type.uint32], 16, "offset"], [[type, type.uint32], 16, "stride"], [type.rawStruct("HalStream"), 0, "streams"], [type.rawStruct("Tr2BufferAL"), 0, "indexBuffer"], [[type, type.uint32], 16, "indexStride"], [[type, type.int32, void 0, type.enum("RenderingMode")], 16, "renderingMode"], [[type, type.uint32], 16, "renderStateSetup"], [type.rawStruct("CurrentValues"), 0, "currentValues"], [[type, type.boolean], 16, "isManagedRendering"], [type.list("uint32_t"), 0, "states"], [[type, type.boolean], 16, "dirty"], [type.list("RenderStates"), 0, "renderStates"], [type.objectRef("uint32_t"), 0, "renderStateOverrides"], [[type, type.int32], 16, "renderTargetWidth"], [[type, type.int32], 16, "renderTargetHeight"], [type.rawStruct("CTriViewport"), 0, "viewport"], [type.rawStruct("Tr2Viewport"), 0, "viewportOnDevice"], [type.rawStruct("std::list<CTriViewport>"), 0, "viewportStack"], [type.rawStruct("Tr2Variable"), 0, "viewportSizeVar"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_viewportSizeVar(this);
    }
    /** m_renderContext (Tr2RenderContext&) */
    renderContext = _init_renderContext(this, null);

    /** m_perObjectConstantBuffers (Tr2ConstantBufferAL) */
    perObjectConstantBuffers = (_init_extra_renderContext(this), _init_perObjectConstantBuffers(this, null));

    /** m_shaderProgram (uint32_t) */
    shaderProgram = (_init_extra_perObjectConstantBuffers(this), _init_shaderProgram(this, 0));

    /** m_vertexDeclaration (uint32_t) */
    vertexDeclaration = (_init_extra_shaderProgram(this), _init_vertexDeclaration(this, 0));

    /** m_vertexBuffer (Tr2BufferAL) */
    vertexBuffer = (_init_extra_vertexDeclaration(this), _init_vertexBuffer(this, null));

    /** m_offset (uint32_t) */
    offset = (_init_extra_vertexBuffer(this), _init_offset(this, 0));

    /** m_stride (uint32_t) */
    stride = (_init_extra_offset(this), _init_stride(this, 0));

    /** m_streams (HalStream) */
    streams = (_init_extra_stride(this), _init_streams(this, null));

    /** m_indexBuffer (Tr2BufferAL) */
    indexBuffer = (_init_extra_streams(this), _init_indexBuffer(this, null));

    /** m_indexStride (uint32_t) */
    indexStride = (_init_extra_indexBuffer(this), _init_indexStride(this, 0));

    /** m_renderingMode (Tr2EffectStateManager::RenderingMode - enum RenderingMode) */
    renderingMode = (_init_extra_indexStride(this), _init_renderingMode(this, 0));

    /** m_renderStateSetup (uint32_t) */
    renderStateSetup = (_init_extra_renderingMode(this), _init_renderStateSetup(this, 0));

    /** m_currentValues (CurrentValues) */
    currentValues = (_init_extra_renderStateSetup(this), _init_currentValues(this, null));

    /** m_isManagedRendering (bool) */
    isManagedRendering = (_init_extra_currentValues(this), _init_isManagedRendering(this, false));

    /** states (std::vector<uint32_t>) */
    states = (_init_extra_isManagedRendering(this), _init_states(this, []));

    /** dirty (bool) */
    dirty = (_init_extra_states(this), _init_dirty(this, false));

    /** m_renderStates (std::vector<RenderStates>) */
    renderStates = (_init_extra_dirty(this), _init_renderStates(this, []));

    /** m_renderStateOverrides (const uint32_t*) */
    renderStateOverrides = (_init_extra_renderStates(this), _init_renderStateOverrides(this, null));

    /** m_renderTargetWidth (int) */
    renderTargetWidth = (_init_extra_renderStateOverrides(this), _init_renderTargetWidth(this, 0));

    /** m_renderTargetHeight (int) */
    renderTargetHeight = (_init_extra_renderTargetWidth(this), _init_renderTargetHeight(this, 0));

    /** m_viewport (CTriViewport) */
    viewport = (_init_extra_renderTargetHeight(this), _init_viewport(this, null));

    /** m_viewportOnDevice (Tr2Viewport) */
    viewportOnDevice = (_init_extra_viewport(this), _init_viewportOnDevice(this, null));

    /** m_viewportStack (std::list<CTriViewport>) */
    viewportStack = (_init_extra_viewportOnDevice(this), _init_viewportStack(this, null));

    /** m_viewportSizeVar (Tr2Variable) */
    viewportSizeVar = (_init_extra_viewportStack(this), _init_viewportSizeVar(this, null));
  }];
  RenderingMode = RenderingMode;
  constructor() {
    super(_Tr2EffectStateManage), _initClass();
  }
}();

export { _Tr2EffectStateManage as Tr2EffectStateManager };
//# sourceMappingURL=Tr2EffectStateManager.js.map
