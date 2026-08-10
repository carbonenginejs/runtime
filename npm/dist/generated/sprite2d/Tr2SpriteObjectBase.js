import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2SpriteObjectPickState } from './enums.js';

let _initProto, _initClass, _init_pickState, _init_extra_pickState, _init_isDirty, _init_extra_isDirty, _init_displayHeight, _init_extra_displayHeight, _init_pickingMask, _init_extra_pickingMask, _init_name, _init_extra_name, _init_auxMouseover, _init_extra_auxMouseover, _init_displayWidth, _init_extra_displayWidth, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY;

/** Tr2SpriteObjectBase (sprite2d) - generated from schema shapeHash cccd3638.... */
let _Tr2SpriteObjectBase;
new class extends _identity {
  static [class Tr2SpriteObjectBase extends CjsModel {
    static {
      ({
        e: [_init_pickState, _init_extra_pickState, _init_isDirty, _init_extra_isDirty, _init_displayHeight, _init_extra_displayHeight, _init_pickingMask, _init_extra_pickingMask, _init_name, _init_extra_name, _init_auxMouseover, _init_extra_auxMouseover, _init_displayWidth, _init_extra_displayWidth, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY, _initProto],
        c: [_Tr2SpriteObjectBase, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SpriteObjectBase",
        family: "sprite2d"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Tr2SpriteObjectPickState")], 16, "pickState"], [[io, io.readwrite, type, type.boolean], 16, "isDirty"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayHeight"], [[io, io.readwrite, void 0, type.objectRef("Tr2Sprite2dPickingMask")], 16, "pickingMask"], [[io, io.readwrite, type, type.string], 16, "name"], [[io, io.read, void 0, type.objectRef("ITr2SpriteObject")], 16, "auxMouseover"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayWidth"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayX"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayY"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDirty"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_displayY(this);
    }
    /** m_pickState (Tr2SpriteObjectPickState - enum Tr2SpriteObjectPickState) [READWRITE, PERSIST, ENUM] */
    pickState = (_initProto(this), _init_pickState(this, 0));

    /** m_isDirty (bool) [READWRITE] */
    isDirty = (_init_extra_pickState(this), _init_isDirty(this, true));

    /** m_displayHeight (float) [READWRITE, NOTIFY] */
    displayHeight = (_init_extra_isDirty(this), _init_displayHeight(this, 0));

    /** m_pickingMask (Tr2Sprite2dPickingMaskPtr) [READWRITE] */
    pickingMask = (_init_extra_displayHeight(this), _init_pickingMask(this, null));

    /** m_name (std::wstring) [READWRITE] */
    name = (_init_extra_pickingMask(this), _init_name(this, ""));

    /** m_auxMouseover (ITr2SpriteObject*) [READ] */
    auxMouseover = (_init_extra_name(this), _init_auxMouseover(this, null));

    /** m_displayWidth (float) [READWRITE, NOTIFY] */
    displayWidth = (_init_extra_auxMouseover(this), _init_displayWidth(this, 0));

    /** m_translation.x (Vector2) [READWRITE, NOTIFY] */
    displayX = (_init_extra_displayWidth(this), _init_displayX(this, 0));

    /** m_translation.y (Vector2) [READWRITE, NOTIFY] */
    displayY = (_init_extra_displayX(this), _init_displayY(this, 0));

    /** Carbon method SetDirty (MAP_METHOD_AND_WRAP). */
    SetDirty() {
      this.isDirty = true;
    }
  }];
  Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;
  constructor() {
    super(_Tr2SpriteObjectBase), _initClass();
  }
}();

export { _Tr2SpriteObjectBase as Tr2SpriteObjectBase };
//# sourceMappingURL=Tr2SpriteObjectBase.js.map
