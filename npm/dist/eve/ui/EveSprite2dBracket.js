import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_color, _init_extra_color, _init_icon, _init_extra_icon, _init_display, _init_extra_display, _init_translation, _init_extra_translation;

/**
 * Screen-space bracket drawn from an atlas icon, carrying its own colour, 2D
 * translation and display flag.
 */
let _EveSprite2dBracket;
class EveSprite2dBracket extends CjsModel {
  static {
    ({
      e: [_init_color, _init_extra_color, _init_icon, _init_extra_icon, _init_display, _init_extra_display, _init_translation, _init_extra_translation, _initProto],
      c: [_EveSprite2dBracket, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSprite2dBracket",
      family: "eve/ui"
    })], [[[io, io.readwrite, type, type.color], 16, "color"], [[io, io.readwrite, void 0, type.objectRef("Tr2AtlasTexture")], 16, "icon"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.readwrite, type, type.vec2], 16, "translation"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetTranslation"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetTranslation"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetIcon"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsDisplay"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_translation(this);
  }
  color = (_initProto(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));
  icon = (_init_extra_color(this), _init_icon(this, null));
  display = (_init_extra_icon(this), _init_display(this, true));
  translation = (_init_extra_display(this), _init_translation(this, vec2.create()));

  /**
   * Copies the bracket translation into caller-provided storage.
   */
  GetTranslation(out) {
    return vec2.copy(out, this.translation);
  }

  /**
   * Replaces the bracket translation while preserving field identity.
   */
  SetTranslation(value) {
    vec2.copy(this.translation, value);
  }

  /**
   * Gets the authored atlas icon.
   */
  GetIcon() {
    return this.icon;
  }

  /**
   * Gets the mutable authored color container.
   */
  GetColor() {
    return this.color;
  }

  /**
   * Sets whether the bracket is displayed.
   */
  SetDisplay(display) {
    this.display = Boolean(display);
  }

  /**
   * Gets whether the bracket is displayed.
   */
  IsDisplay() {
    return this.display;
  }
  static {
    _initClass();
  }
}

export { _EveSprite2dBracket as EveSprite2dBracket };
//# sourceMappingURL=EveSprite2dBracket.js.map
