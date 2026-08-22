import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2SpriteObjectBase as _Tr2SpriteObjectBase } from './Tr2SpriteObjectBase.js';

let _initProto, _initClass, _init_background, _init_extra_background, _init_children, _init_extra_children, _init_opacity, _init_extra_opacity;
const BELIST_UNLOADSTART = 0x07;
const BELIST_INSERTED = 0x08;
const BELIST_REMOVED = 0x09;

/** Shared Sprite2D container state and child-parent propagation. */
let _Tr2Sprite2dContainer;
class Tr2Sprite2dContainerBase extends _Tr2SpriteObjectBase {
  static {
    ({
      e: [_init_background, _init_extra_background, _init_children, _init_extra_children, _init_opacity, _init_extra_opacity, _initProto],
      c: [_Tr2Sprite2dContainer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dContainerBase",
      family: "sprite2d"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "SetChildDirty"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"], [[io, io.read, void 0, type.list("ITr2SpriteObject")], 16, "background"], [[io, io.read, void 0, type.list("ITr2SpriteObject")], 16, "children"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "opacity"]], 0, void 0, _Tr2SpriteObjectBase));
  }
  constructor(...args) {
    super(...args);
    _init_extra_opacity(this);
  }
  /** Carbon method SetChildDirty. */
  SetChildDirty(_child) {
    super.SetDirty();
  }

  /** Carbon IList notification callback. */
  OnListModified(event, _key, _key2, value, list) {
    switch (event) {
      case BELIST_INSERTED:
        if (value) {
          value.SetParent(this);
          this.SetChildDirty(value);
        }
        break;
      case BELIST_REMOVED:
        if (value) {
          value.SetParent(null);
          this.SetChildDirty(value);
        }
        break;
      case BELIST_UNLOADSTART:
        for (const child of list) {
          if (child) {
            child.SetParent(null);
          }
        }
        break;
    }
  }

  /** m_background (PITr2SpriteObjectVector) [READ] */
  background = (_initProto(this), _init_background(this, []));

  /** m_children (PITr2SpriteObjectVector) [READ] */
  children = (_init_extra_background(this), _init_children(this, []));

  /** m_opacity (float) [READWRITE, NOTIFY] */
  opacity = (_init_extra_children(this), _init_opacity(this, 1));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dContainer as Tr2Sprite2dContainerBase };
//# sourceMappingURL=Tr2Sprite2dContainerBase.js.map
