import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { mat4 } from '@carbonenginejs/core-math/mat4';
import { vec2 } from '@carbonenginejs/core-math/vec2';
import { vec4 } from '@carbonenginejs/core-math/vec4';

let _initClass, _init_WorldMat, _init_extra_WorldMat, _init_uvLinearTransform, _init_extra_uvLinearTransform, _init_uvTranslation, _init_extra_uvTranslation, _init_padding, _init_extra_padding;

/** Tr2InteriorPerObjectVSData (interior) - generated from schema shapeHash 31167b80.... */
let _Tr2InteriorPerObject;
class Tr2InteriorPerObjectVSData extends CjsModel {
  static {
    ({
      e: [_init_WorldMat, _init_extra_WorldMat, _init_uvLinearTransform, _init_extra_uvLinearTransform, _init_uvTranslation, _init_extra_uvTranslation, _init_padding, _init_extra_padding],
      c: [_Tr2InteriorPerObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorPerObjectVSData",
      family: "interior"
    })], [[[type, type.mat4], 16, "WorldMat"], [[type, type.vec4], 16, "uvLinearTransform"], [[type, type.vec2], 16, "uvTranslation"], [[type, type.vec2], 16, "padding"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_padding(this);
  }
  /** WorldMat (Matrix) */
  WorldMat = _init_WorldMat(this, mat4.create());

  /** uvLinearTransform (Vector4) */
  uvLinearTransform = (_init_extra_WorldMat(this), _init_uvLinearTransform(this, vec4.create()));

  /** uvTranslation (Vector2) */
  uvTranslation = (_init_extra_uvLinearTransform(this), _init_uvTranslation(this, vec2.create()));

  /** padding (Vector2) */
  padding = (_init_extra_uvTranslation(this), _init_padding(this, vec2.create()));
  static {
    _initClass();
  }
}

export { _Tr2InteriorPerObject as Tr2InteriorPerObjectVSData };
//# sourceMappingURL=Tr2InteriorPerObjectVSData.js.map
