import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_influence, _init_extra_influence, _init_path, _init_extra_path;

/** Tr2PPLutEffect (postProcess) - generated from schema shapeHash 7000dd13.... */
let _Tr2PPLutEffect;
class Tr2PPLutEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_influence, _init_extra_influence, _init_path, _init_extra_path],
      c: [_Tr2PPLutEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPLutEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "influence"], [[io, io.persist, type, type.string], 16, "path"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_path(this);
  }
  /** m_influence (float) [READWRITE, PERSIST] */
  influence = _init_influence(this, 0);

  /** m_path (BlueSharedString) [READWRITE, PERSIST] */
  path = (_init_extra_influence(this), _init_path(this, "res:/dx9/scene/postprocess/LUTdefault.dds"));

  /** Carbon Tr2PPLutEffect::IsActive override. */
  IsActive() {
    return this.display && this.influence > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPLutEffect as Tr2PPLutEffect };
//# sourceMappingURL=Tr2PPLutEffect.js.map
