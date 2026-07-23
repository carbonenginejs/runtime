import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_visualizeMethod, _init_extra_visualizeMethod, _init_Avatar, _init_extra_Avatar;

/** WodBakingScene (wod) - generated from schema shapeHash 3b77adad.... */
let _WodBakingScene;
new class extends _identity {
  static [class WodBakingScene extends CjsModel {
    static {
      ({
        e: [_init_visualizeMethod, _init_extra_visualizeMethod, _init_Avatar, _init_extra_Avatar],
        c: [_WodBakingScene, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "WodBakingScene",
        family: "wod"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32, void 0, schema.enum("VisualizeMethod")], 16, "visualizeMethod"], [[io, io.readwrite, void 0, type.objectRef("Tr2SkinnedObject")], 16, "Avatar"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_Avatar(this);
    }
    /** m_visualizeMethod (VisualizeMethod - enum VisualizeMethod) [READWRITE, ENUM, NOTIFY] */
    visualizeMethod = _init_visualizeMethod(this, 0);

    /** m_skinnedObject (Tr2SkinnedObjectPtr) [READWRITE] */
    Avatar = (_init_extra_visualizeMethod(this), _init_Avatar(this, null));
  }];
  VisualizeMethod = Object.freeze({
    VM_NONE: 0,
    VM_WHITE: 1,
    VM_OBJECT_NORMAL: 2,
    VM_TANGENT: 3,
    VM_BITANGENT: 4,
    VM_TEXCOORD0: 5,
    VM_TEXCOORD1: 6,
    VM_TEXELDENSITY0: 7,
    VM_NORMALMAP: 8,
    VM_DIFFUSEMAP: 9,
    VM_SPECULARMAP: 10,
    VM_OVERDRAW: 11,
    VM_EN_ONLY: 12,
    VM_DEPTH: 13,
    VM_ALL_LIGHTING: 14,
    VM_LIGHT_PRE_PASS_NORMALS: 15,
    VM_LIGHT_PRE_PASS_DEPTH: 16,
    VM_LIGHT_PRE_PASS_WORLD_POSITION: 17,
    VM_LIGHT_PRE_PASS_LIGHTING: 18,
    VM_LIGHT_PRE_PASS_LIGHT_OVERDRAW: 19,
    VM_LIGHT_PRE_PASS_DIFFUSE_LIGHTING: 20,
    VM_LIGHT_PRE_PASS_SPECULAR_LIGHTING: 21,
    VM_OCCLUSION: 22,
    VM_COUNT: 23
  });
  constructor() {
    super(_WodBakingScene), _initClass();
  }
}();

export { _WodBakingScene as WodBakingScene };
//# sourceMappingURL=WodBakingScene.js.map
