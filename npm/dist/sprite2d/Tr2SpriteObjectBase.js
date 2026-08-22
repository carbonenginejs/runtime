import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2SpriteObjectPickState } from '../generated/sprite2d/enums.js';

let _initProto, _initClass, _init_display, _init_extra_display, _init_pickState, _init_extra_pickState, _init_isDirty, _init_extra_isDirty, _init_displayHeight, _init_extra_displayHeight, _init_pickingMask, _init_extra_pickingMask, _init_name, _init_extra_name, _init_auxMouseover, _init_extra_auxMouseover, _init_displayWidth, _init_extra_displayWidth, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY;

/** Shared portable state and dirty propagation for Sprite2D objects. */
let _Tr2SpriteObjectBase;
new class extends _identity {
  static [class Tr2SpriteObjectBase extends CjsModel {
    static {
      ({
        e: [_init_display, _init_extra_display, _init_pickState, _init_extra_pickState, _init_isDirty, _init_extra_isDirty, _init_displayHeight, _init_extra_displayHeight, _init_pickingMask, _init_extra_pickingMask, _init_name, _init_extra_name, _init_auxMouseover, _init_extra_auxMouseover, _init_displayWidth, _init_extra_displayWidth, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY, _initProto],
        c: [_Tr2SpriteObjectBase, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SpriteObjectBase",
        family: "sprite2d"
      })], [[[carbon, carbon.method, impl, impl.notImplemented], 18, "GatherSprites"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickPoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplayX"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplayX"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplayY"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplayY"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplayWidth"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplayWidth"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplayHeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplayHeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDirty"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetChildDirty"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsAuxMouseover"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.persist, type, type.int32, void 0, type.enum("Tr2SpriteObjectPickState")], 16, "pickState"], [[io, io.readwrite, type, type.boolean], 16, "isDirty"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayHeight"], [[io, io.readwrite, void 0, type.objectRef("Tr2Sprite2dPickingMask")], 16, "pickingMask"], [[io, io.readwrite, type, type.string], 16, "name"], [[io, io.read, void 0, type.objectRef("ITr2SpriteObject")], 16, "auxMouseover"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayWidth"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayX"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "displayY"]], 0, void 0, CjsModel));
    }
    /** Required ITr2SpriteObject traversal contract. */
    GatherSprites(..._args) {
      throw new Error("Tr2SpriteObjectBase.GatherSprites must be implemented by a concrete Sprite2D object.");
    }

    /** Required ITr2SpriteObject picking contract. */
    PickPoint(..._args) {
      throw new Error("Tr2SpriteObjectBase.PickPoint must be implemented by a concrete Sprite2D object.");
    }

    /** Carbon method GetDisplay. */
    GetDisplay() {
      return this.display;
    }

    /** Carbon method SetDisplay. */
    SetDisplay(value) {
      const next = Boolean(value);
      if (next !== this.display) {
        this.display = next;
        this.SetDirty();
      }
    }

    /** Carbon method GetDisplayX. */
    GetDisplayX() {
      return this.displayX;
    }

    /** Carbon method SetDisplayX. */
    SetDisplayX(value) {
      this.#SetDisplayValue("displayX", value);
    }

    /** Carbon method GetDisplayY. */
    GetDisplayY() {
      return this.displayY;
    }

    /** Carbon method SetDisplayY. */
    SetDisplayY(value) {
      this.#SetDisplayValue("displayY", value);
    }

    /** Carbon method GetDisplayWidth. */
    GetDisplayWidth() {
      return this.displayWidth;
    }

    /** Carbon method SetDisplayWidth. */
    SetDisplayWidth(value) {
      this.#SetDisplayValue("displayWidth", value);
    }

    /** Carbon method GetDisplayHeight. */
    GetDisplayHeight() {
      return this.displayHeight;
    }

    /** Carbon method SetDisplayHeight. */
    SetDisplayHeight(value) {
      this.#SetDisplayValue("displayHeight", value);
    }

    /** Carbon method SetParent. */
    SetParent(parent) {
      this.#parent = parent;
      this.SetDirty();
    }

    /** Carbon method SetDirty (MAP_METHOD_AND_WRAP). */
    SetDirty() {
      this.isDirty = true;
      if (this.#parent) {
        this.#parent.SetChildDirty(this);
      }
    }

    /** Carbon's base container notification is intentionally a no-op. */
    SetChildDirty(_child) {}

    /** Carbon's base object is never an auxiliary mouse-over result. */
    IsAuxMouseover() {
      return false;
    }

    /** Carbon INotify callback. */
    OnModified(_value) {
      this.SetDirty();
      return true;
    }

    /** Updates one display scalar and marks the object dirty on change. */
    #SetDisplayValue(name, value) {
      const next = Number(value);
      if (next !== this[name]) {
        this[name] = next;
        this.SetDirty();
      }
    }

    /** m_display (bool) [READWRITE] */
    display = (_initProto(this), _init_display(this, true));

    /** m_pickState (Tr2SpriteObjectPickState - enum Tr2SpriteObjectPickState) [READWRITE, PERSIST, ENUM] */
    pickState = (_init_extra_display(this), _init_pickState(this, Tr2SpriteObjectPickState.TR2_SPS_ON));

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
    #parent = (_init_extra_displayY(this), null);
  }];
  Tr2SpriteObjectPickState = Tr2SpriteObjectPickState;
  constructor() {
    super(_Tr2SpriteObjectBase), _initClass();
  }
}();

export { _Tr2SpriteObjectBase as Tr2SpriteObjectBase };
//# sourceMappingURL=Tr2SpriteObjectBase.js.map
