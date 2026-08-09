import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_position, _init_extra_position, _init_normal, _init_extra_normal, _init_object, _init_extra_object, _init_line, _init_extra_line, _init_color, _init_extra_color, _init_zFailColor, _init_extra_zFailColor, _init_effect, _init_extra_effect, _init_pickingEffect, _init_extra_pickingEffect, _init_lines, _init_extra_lines, _init_triangles, _init_extra_triangles, _init_defaultOptions, _init_extra_defaultOptions, _init_selectedObjects, _init_extra_selectedObjects;

/** Resolves which debug visualisations an object draws, from per-owner options over a default set. */
let _Tr2DebugRenderer;
new class extends _identity {
  static [class Tr2DebugRenderer extends CjsModel {
    static {
      ({
        e: [_init_position, _init_extra_position, _init_normal, _init_extra_normal, _init_object, _init_extra_object, _init_line, _init_extra_line, _init_color, _init_extra_color, _init_zFailColor, _init_extra_zFailColor, _init_effect, _init_extra_effect, _init_pickingEffect, _init_extra_pickingEffect, _init_lines, _init_extra_lines, _init_triangles, _init_extra_triangles, _init_defaultOptions, _init_extra_defaultOptions, _init_selectedObjects, _init_extra_selectedObjects, _initProto],
        c: [_Tr2DebugRenderer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2DebugRenderer",
        family: "trinityCore"
      })], [[[type, type.vec3], 16, "position"], [[type, type.vec3], 16, "normal"], [[type, type.float32], 16, "object"], [[type, type.float32], 16, "line"], [[type, type.uint32], 16, "color"], [[type, type.uint32], 16, "zFailColor"], [type.objectRef("Tr2Effect"), 0, "effect"], [type.objectRef("Tr2Effect"), 0, "pickingEffect"], [type.list("Vertex"), 0, "lines"], [type.list("Vertex"), 0, "triangles"], [type.set("string"), 0, "defaultOptions"], [type.set("Tr2DebugObjectReference"), 0, "selectedObjects"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDefaultOptions"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetSelectedObjects"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetOptions"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetColorForOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetOptions"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDefaultOptions"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetColorForOption"], [[impl, impl.implemented], 18, "HasOption"], [[impl, impl.implemented], 18, "IsSelected"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_selectedObjects(this);
    }
    #options = (_initProto(this), new Map());
    #optionColors = new Map();

    /** m_position (Vector3) */
    position = _init_position(this, vec3.create());

    /** m_normal (Vector3) */
    normal = (_init_extra_position(this), _init_normal(this, vec3.create()));

    /** m_object (float) */
    object = (_init_extra_normal(this), _init_object(this, 0));

    /** m_line (float) */
    line = (_init_extra_object(this), _init_line(this, 0));

    /** m_color (uint32_t) */
    color = (_init_extra_line(this), _init_color(this, 0));

    /** m_zFailColor (uint32_t) */
    zFailColor = (_init_extra_color(this), _init_zFailColor(this, 0));

    /** m_effect (Tr2EffectPtr) */
    effect = (_init_extra_zFailColor(this), _init_effect(this, null));

    /** m_pickingEffect (Tr2EffectPtr) */
    pickingEffect = (_init_extra_effect(this), _init_pickingEffect(this, null));

    /** m_lines (std::vector<Vertex>) */
    lines = (_init_extra_pickingEffect(this), _init_lines(this, []));

    /** m_triangles (std::vector<Vertex>) */
    triangles = (_init_extra_lines(this), _init_triangles(this, []));

    /** m_defaultOptions (Tr2DebugRendererOptions) */
    defaultOptions = (_init_extra_triangles(this), _init_defaultOptions(this, new Set()));

    /** m_selectedObjects (std::set<Tr2DebugObjectReference>) */
    selectedObjects = (_init_extra_defaultOptions(this), _init_selectedObjects(this, new Set()));

    /** Carbon method SetDefaultOptions (MAP_METHOD_AND_WRAP). */
    SetDefaultOptions(options) {
      this.defaultOptions = _Tr2DebugRenderer.#ToOptionSet(options);
    }

    /** Carbon method SetSelectedObjects (MAP_METHOD_AND_WRAP). */
    SetSelectedObjects(objects) {
      this.selectedObjects.clear();
      for (const value of objects ?? []) {
        const object = Array.isArray(value) ? value[0] : value?.object ?? value;
        if (object) this.selectedObjects.add(object);
      }
    }

    /** Carbon method SetOptions (MAP_METHOD_AND_WRAP). */
    SetOptions(owner, options) {
      const values = _Tr2DebugRenderer.#ToOptionSet(options);
      if (values.size) this.#options.set(owner, values);else this.#options.delete(owner);
    }

    /** Carbon method GetColorForOption -> PyGetColorForOption (MAP_METHOD). */
    GetColorForOption(option) {
      const color = this.#optionColors.get(String(option ?? ""));
      return color ? vec4.clone(color) : null;
    }

    /** Carbon method GetOptions (MAP_METHOD_AND_WRAP). */
    GetOptions(owner) {
      return [...(this.#options.get(owner) ?? [])];
    }

    /** Carbon method GetDefaultOptions (MAP_METHOD_AND_WRAP). */
    GetDefaultOptions() {
      return [...this.defaultOptions];
    }

    /** Carbon method SetColorForOption (MAP_METHOD_AND_WRAP). */
    SetColorForOption(option, color) {
      if (!color || color.length < 4) throw new TypeError("color must contain four components");
      this.#optionColors.set(String(option ?? ""), vec4.clone(color));
    }

    /**
     * Whether an owner has a debug option enabled, falling back to the defaults.
     */
    HasOption(owner, option) {
      const options = this.#options.get(owner);
      return options ? options.has(String(option ?? "")) : this.defaultOptions.has(String(option ?? ""));
    }

    /**
     * Whether an object is in the current selection.
     */
    IsSelected(owner) {
      const object = owner?.object ?? owner;
      return this.selectedObjects.has(object);
    }

    /**
     * Normalises an option list or bitmask into a set.
     */
  }];
  #ToOptionSet(options) {
    if (options == null) return new Set();
    if (typeof options === "string") return new Set([options]);
    return new Set(Array.from(options, option => String(option)));
  }
  constructor() {
    super(_Tr2DebugRenderer), _initClass();
  }
}();

export { _Tr2DebugRenderer as Tr2DebugRenderer };
//# sourceMappingURL=Tr2DebugRenderer.js.map
