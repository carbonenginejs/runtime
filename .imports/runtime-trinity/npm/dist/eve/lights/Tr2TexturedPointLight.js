import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Light as _Tr2Light } from './Tr2Light.js';
import { Tr2PointLight as _Tr2PointLight } from './Tr2PointLight.js';

let _initProto, _initClass, _init_texture, _init_extra_texture, _init_texturePath, _init_extra_texturePath;

/**
 * Point light that projects a texture, adding the texture path and its resolved
 * resource to the point-light attribute set and updating dynamically.
 */
let _Tr2TexturedPointLigh;
new class extends _identity {
  static [class Tr2TexturedPointLight extends _Tr2PointLight {
    static {
      ({
        e: [_init_texture, _init_extra_texture, _init_texturePath, _init_extra_texturePath, _initProto],
        c: [_Tr2TexturedPointLigh, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2TexturedPointLight",
        family: "eve/lights"
      })], [[[io, io.read, void 0, type.objectRef("TriTextureRes")], 16, "texture"], [[io, io.notify, io, io.persist, type, type.string], 16, "texturePath"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSaturation"]], 0, void 0, _Tr2PointLight));
    }
    texture = (_initProto(this), _init_texture(this, null));

    /** m_lightData.texturePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
    texturePath = (_init_extra_texture(this), _init_texturePath(this, ""));
    isDynamic = (_init_extra_texturePath(this), true);
    type = _Tr2Light.POINT_LIGHT;
    #saturation = 1;

    /**
     * Records the saturation for the projected texture; the stored value is not
     * read anywhere else in the port yet.
     */
    SetSaturation(saturation) {
      this.#saturation = Number(saturation);
    }
  }];
  LightDataFields = [..._Tr2PointLight.LightDataFields, "texturePath"];
  constructor() {
    super(_Tr2TexturedPointLigh), _initClass();
  }
}();

export { _Tr2TexturedPointLigh as Tr2TexturedPointLight };
//# sourceMappingURL=Tr2TexturedPointLight.js.map
