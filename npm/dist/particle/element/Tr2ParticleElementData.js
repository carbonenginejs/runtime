import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_dimension, _init_extra_dimension, _init_usageIndex, _init_extra_usageIndex, _init_bufferType, _init_extra_bufferType, _init_offset, _init_extra_offset, _init_none, _init_extra_none;

/** Tr2ParticleElementData (particle) - generated from schema shapeHash ca640653.... */
let _Tr2ParticleElementDa;
new class extends _identity {
  static [class Tr2ParticleElementData extends CjsModel {
    static {
      ({
        e: [_init_dimension, _init_extra_dimension, _init_usageIndex, _init_extra_usageIndex, _init_bufferType, _init_extra_bufferType, _init_offset, _init_extra_offset, _init_none, _init_extra_none],
        c: [_Tr2ParticleElementDa, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ParticleElementData",
        family: "particle"
      })], [[[type, type.uint32], 16, "dimension"], [[type, type.uint32], 16, "usageIndex"], [[type, type.int32, void 0, schema.enum("BufferType")], 16, "bufferType"], [[type, type.uint32], 16, "offset"], [type.rawStruct("Tr2ParticleElementData"), 0, "none"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_none(this);
    }
    /** m_dimension (unsigned) */
    dimension = _init_dimension(this, 0);

    /** m_usageIndex (unsigned) */
    usageIndex = (_init_extra_dimension(this), _init_usageIndex(this, 0));

    /** m_bufferType (BufferType - enum BufferType) */
    bufferType = (_init_extra_usageIndex(this), _init_bufferType(this, 0));

    /** m_offset (unsigned) */
    offset = (_init_extra_bufferType(this), _init_offset(this, 0));

    /** none (Tr2ParticleElementData) */
    none = (_init_extra_offset(this), _init_none(this, null));
  }];
  BufferType = Object.freeze({
    Vertex: 0,
    Index: 1,
    Storage: 2,
    Undefined: 3
  });
  constructor() {
    super(_Tr2ParticleElementDa), _initClass();
  }
}();

export { _Tr2ParticleElementDa as Tr2ParticleElementData };
//# sourceMappingURL=Tr2ParticleElementData.js.map
