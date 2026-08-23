// Source: trinity/trinity/Tr2DebugRenderer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Resolves which debug visualisations an object draws, from per-owner options over a default set. */
@type.define({ className: "Tr2DebugRenderer", family: "trinityCore" })
export class Tr2DebugRenderer extends CjsModel
{

  #options = new Map();

  #optionColors = new Map();

  /** m_position (Vector3) */
  @type.vec3
  position = vec3.create();

  /** m_normal (Vector3) */
  @type.vec3
  normal = vec3.create();

  /** m_object (float) */
  @type.float32
  object = 0;

  /** m_line (float) */
  @type.float32
  line = 0;

  /** m_color (uint32_t) */
  @type.uint32
  color = 0;

  /** m_zFailColor (uint32_t) */
  @type.uint32
  zFailColor = 0;

  /** m_effect (Tr2EffectPtr) */
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_pickingEffect (Tr2EffectPtr) */
  @type.objectRef("Tr2Effect")
  pickingEffect = null;

  /** m_lines (std::vector<Vertex>) */
  @type.list("Vertex")
  lines = [];

  /** m_triangles (std::vector<Vertex>) */
  @type.list("Vertex")
  triangles = [];

  /** m_defaultOptions (Tr2DebugRendererOptions) */
  @type.set("string")
  defaultOptions = new Set();

  /** m_selectedObjects (std::set<Tr2DebugObjectReference>) */
  @type.set("Tr2DebugObjectReference")
  selectedObjects = new Set();

  /** Carbon method SetDefaultOptions (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SetDefaultOptions(options)
  {
    this.defaultOptions = Tr2DebugRenderer.#ToOptionSet(options);
  }

  /** Carbon method SetSelectedObjects (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SetSelectedObjects(objects)
  {
    this.selectedObjects.clear();
    for (const value of objects ?? [])
    {
      const object = Array.isArray(value) ? value[0] : value?.object ?? value;
      if (object) this.selectedObjects.add(object);
    }
  }

  /** Carbon method SetOptions (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SetOptions(owner, options)
  {
    const values = Tr2DebugRenderer.#ToOptionSet(options);
    if (values.size) this.#options.set(owner, values);
    else this.#options.delete(owner);
  }

  /** Carbon method GetColorForOption -> PyGetColorForOption (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  GetColorForOption(option)
  {
    const color = this.#optionColors.get(String(option ?? ""));
    return color ? vec4.clone(color) : null;
  }

  /** Carbon method GetOptions (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  GetOptions(owner)
  {
    return [...(this.#options.get(owner) ?? [])];
  }

  /** Carbon method GetDefaultOptions (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  GetDefaultOptions()
  {
    return [...this.defaultOptions];
  }

  /** Carbon method SetColorForOption (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SetColorForOption(option, color)
  {
    if (!color || color.length < 4) throw new TypeError("color must contain four components");
    this.#optionColors.set(String(option ?? ""), vec4.clone(color));
  }

  /**
   * Whether an owner has a debug option enabled, falling back to the defaults.
   */
  @impl.implemented
  HasOption(owner, option)
  {
    const options = this.#options.get(owner);
    return options ? options.has(String(option ?? "")) : this.defaultOptions.has(String(option ?? ""));
  }

  /**
   * Whether an object is in the current selection.
   */
  @impl.implemented
  IsSelected(owner)
  {
    const object = owner?.object ?? owner;
    return this.selectedObjects.has(object);
  }

  /**
   * Normalises an option list or bitmask into a set.
   */
  static #ToOptionSet(options)
  {
    if (options == null) return new Set();
    if (typeof options === "string") return new Set([options]);
    return new Set(Array.from(options, option => String(option)));
  }

}
