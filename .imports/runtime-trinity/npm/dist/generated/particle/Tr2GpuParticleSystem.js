import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_enableEmit, _init_extra_enableEmit, _init_display, _init_extra_display, _init_enableSort, _init_extra_enableSort, _init_enableUpdate, _init_extra_enableUpdate, _init_updateVisibleCount, _init_extra_updateVisibleCount, _init_maxParticles, _init_extra_maxParticles, _init_visibleCount, _init_extra_visibleCount, _init_clear, _init_extra_clear, _init_emit, _init_extra_emit, _init_sortInner, _init_extra_sortInner, _init_sortStep, _init_extra_sortStep, _init_sort, _init_extra_sort, _init_render, _init_extra_render, _init_update, _init_extra_update, _init_setDrawParameters, _init_extra_setDrawParameters, _init_setSortParameters, _init_extra_setSortParameters;

/** Tr2GpuParticleSystem (particle) - generated from schema shapeHash 6115dd0d.... */
let _Tr2GpuParticleSystem;
class Tr2GpuParticleSystem extends CjsModel {
  static {
    ({
      e: [_init_enableEmit, _init_extra_enableEmit, _init_display, _init_extra_display, _init_enableSort, _init_extra_enableSort, _init_enableUpdate, _init_extra_enableUpdate, _init_updateVisibleCount, _init_extra_updateVisibleCount, _init_maxParticles, _init_extra_maxParticles, _init_visibleCount, _init_extra_visibleCount, _init_clear, _init_extra_clear, _init_emit, _init_extra_emit, _init_sortInner, _init_extra_sortInner, _init_sortStep, _init_extra_sortStep, _init_sort, _init_extra_sort, _init_render, _init_extra_render, _init_update, _init_extra_update, _init_setDrawParameters, _init_extra_setDrawParameters, _init_setSortParameters, _init_extra_setSortParameters, _initProto],
      c: [_Tr2GpuParticleSystem, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GpuParticleSystem",
      family: "particle"
    })], [[[io, io.readwrite, type, type.boolean], 16, "enableEmit"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.readwrite, type, type.boolean], 16, "enableSort"], [[io, io.readwrite, type, type.boolean], 16, "enableUpdate"], [[io, io.readwrite, type, type.boolean], 16, "updateVisibleCount"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "maxParticles"], [[io, io.read, type, type.uint32], 16, "visibleCount"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "clear"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "emit"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "sortInner"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "sortStep"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "sort"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "render"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "update"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "setDrawParameters"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "setSortParameters"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Clear"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_setSortParameters(this);
  }
  /** m_enableEmit (bool) [READWRITE] */
  enableEmit = (_initProto(this), _init_enableEmit(this, true));

  /** m_enableRender (bool) [READWRITE] */
  display = (_init_extra_enableEmit(this), _init_display(this, true));

  /** m_enableSort (bool) [READWRITE] */
  enableSort = (_init_extra_display(this), _init_enableSort(this, true));

  /** m_enableUpdate (bool) [READWRITE] */
  enableUpdate = (_init_extra_enableSort(this), _init_enableUpdate(this, true));

  /** m_updateVisibleCount (bool) [READWRITE] */
  updateVisibleCount = (_init_extra_enableUpdate(this), _init_updateVisibleCount(this, false));

  /** m_maxParticles (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  maxParticles = (_init_extra_updateVisibleCount(this), _init_maxParticles(this, 0));

  /** m_visibleCount (uint32_t) [READ] */
  visibleCount = (_init_extra_maxParticles(this), _init_visibleCount(this, 0));

  /** m_clear (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  clear = (_init_extra_visibleCount(this), _init_clear(this, null));

  /** m_emit (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  emit = (_init_extra_clear(this), _init_emit(this, null));

  /** m_sortInner (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  sortInner = (_init_extra_emit(this), _init_sortInner(this, null));

  /** m_sortStep (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  sortStep = (_init_extra_sortInner(this), _init_sortStep(this, null));

  /** m_sort (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  sort = (_init_extra_sortStep(this), _init_sort(this, null));

  /** m_render (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  render = (_init_extra_sort(this), _init_render(this, null));

  /** m_update (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  update = (_init_extra_render(this), _init_update(this, null));

  /** m_setDrawParameters (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  setDrawParameters = (_init_extra_update(this), _init_setDrawParameters(this, null));

  /** m_setSortParameters (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  setSortParameters = (_init_extra_setDrawParameters(this), _init_setSortParameters(this, null));

  /** Carbon method Clear (MAP_METHOD_AND_WRAP). */
  Clear(...args) {
    throw new Error("Tr2GpuParticleSystem.Clear is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2GpuParticleSystem as Tr2GpuParticleSystem };
//# sourceMappingURL=Tr2GpuParticleSystem.js.map
