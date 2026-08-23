import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_indexBuffer, _init_extra_indexBuffer;

/** EveSOFDataDecalIndexBuffer (eve) - generated from schema shapeHash 0c215c06.... */
let _EveSOFDataDecalIndex;
class EveSOFDataDecalIndexBuffer extends CjsModel {
  static {
    ({
      e: [_init_indexBuffer, _init_extra_indexBuffer, _initProto],
      c: [_EveSOFDataDecalIndex, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataDecalIndexBuffer",
      family: "eve"
    })], [[[io, io.persistOnly, void 0, type.typedArray("Uint32Array")], 16, "indexBuffer"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetIndices"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_indexBuffer(this);
  }
  /** indexBuffer (typedArray) [PERSISTONLY] */
  indexBuffer = (_initProto(this), _init_indexBuffer(this, null));

  /** Carbon method AddIndex (MAP_METHOD_AND_WRAP). */
  AddIndex(index) {
    const source = this.indexBuffer ?? [];
    const next = new Uint32Array(source.length + 1);
    next.set(source);
    next[source.length] = Number(index) >>> 0;
    this.indexBuffer = next;
    // Carbon: void AddIndex(uint32_t) (EveSOFData.h:1276) - no return value.
  }

  /** Carbon method GetIndices (MAP_METHOD_AND_WRAP). */
  GetIndices() {
    return Array.from(this.indexBuffer ?? [], value => Number(value) >>> 0);
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataDecalIndex as EveSOFDataDecalIndexBuffer };
//# sourceMappingURL=EveSOFDataDecalIndexBuffer.js.map
