import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2CpuUsage, Tr2GpuUsage } from '@carbonenginejs/runtime-utils/render-context';

let _initClass, _init_elements, _init_extra_elements, _init_texture, _init_extra_texture, _init_dimensions, _init_extra_dimensions, _init_onTextureChange, _init_extra_onTextureChange, _init_increment, _init_extra_increment, _init_cpuUsage, _init_extra_cpuUsage, _init_gpuUsage, _init_extra_gpuUsage;

/** Tr2TextureArray (trinityCore) - generated from schema shapeHash 1f8d9e53.... */
let _Tr2TextureArray;
new class extends _identity {
  static [class Tr2TextureArray extends CjsModel {
    static {
      ({
        e: [_init_elements, _init_extra_elements, _init_texture, _init_extra_texture, _init_dimensions, _init_extra_dimensions, _init_onTextureChange, _init_extra_onTextureChange, _init_increment, _init_extra_increment, _init_cpuUsage, _init_extra_cpuUsage, _init_gpuUsage, _init_extra_gpuUsage],
        c: [_Tr2TextureArray, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2TextureArray",
        family: "trinityCore"
      })], [[type.list("ImageIO::HostBitmap"), 0, "elements"], [type.rawStruct("Tr2TextureAL"), 0, "texture"], [type.rawStruct("Tr2BitmapDimensions"), 0, "dimensions"], [type.rawStruct("OnTextureChangeEvent"), 0, "onTextureChange"], [[type, type.uint32], 16, "increment"], [[type, type.int32, void 0, type.enum("Tr2CpuUsage")], 16, "cpuUsage"], [[type, type.int32, void 0, type.enum("Tr2GpuUsage")], 16, "gpuUsage"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_gpuUsage(this);
    }
    /** m_elements (std::vector<ImageIO::HostBitmap>) */
    elements = _init_elements(this, []);

    /** m_texture (Tr2TextureAL) */
    texture = (_init_extra_elements(this), _init_texture(this, null));

    /** m_dimensions (Tr2BitmapDimensions) */
    dimensions = (_init_extra_texture(this), _init_dimensions(this, null));

    /** m_onTextureChange (OnTextureChangeEvent) */
    onTextureChange = (_init_extra_dimensions(this), _init_onTextureChange(this, null));

    /** m_increment (uint32_t) */
    increment = (_init_extra_onTextureChange(this), _init_increment(this, 16));

    /** m_cpuUsage (Tr2CpuUsage::Type - enum Tr2CpuUsage) */
    cpuUsage = (_init_extra_increment(this), _init_cpuUsage(this, 0));

    /** m_gpuUsage (Tr2GpuUsage::Type - enum Tr2GpuUsage) */
    gpuUsage = (_init_extra_cpuUsage(this), _init_gpuUsage(this, 16));
  }];
  Tr2CpuUsage = Tr2CpuUsage;
  Tr2GpuUsage = Tr2GpuUsage;
  constructor() {
    super(_Tr2TextureArray), _initClass();
  }
}();

export { _Tr2TextureArray as Tr2TextureArray };
//# sourceMappingURL=Tr2TextureArray.js.map
