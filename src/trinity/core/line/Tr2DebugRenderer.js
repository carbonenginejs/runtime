import { ITr2DebugRenderer2 } from "../../../global/interfaces/ITr2DebugRenderer2.js";
// Source: trinity/trinity/Tr2DebugRenderer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Resolves which debug visualisations an object draws, from per-owner options over a default set. */
@blue.define("Tr2DebugRenderer")
@blue.inherit(ITr2DebugRenderer2)
@blue.interface()
export class Tr2DebugRenderer
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
  @type.rootRef("Tr2Effect")
  effect = null;

  /** m_pickingEffect (Tr2EffectPtr) */
  @type.rootRef("Tr2Effect")
  pickingEffect = null;

  /** m_lines (std::vector<Vertex>) */
  @type.array({ kind: "rawStruct", className: "Tr2DebugRenderer::Vertex" })
  lines = [];

  /** m_triangles (std::vector<Vertex>) */
  @type.array({ kind: "rawStruct", className: "Tr2DebugRenderer::Vertex" })
  triangles = [];

  /** m_defaultOptions (Tr2DebugRendererOptions) */
  @type.set("string")
  defaultOptions = new Set();

  /** m_selectedObjects (std::set<Tr2DebugObjectReference>) */
  @type.set("unknown")
  selectedObjects = new Set();

  /** Carbon method SetDefaultOptions (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  SetDefaultOptions(options)
  {
    this.defaultOptions = Tr2DebugRenderer.#ToOptionSet(options);
  }

  /** Carbon method SetSelectedObjects (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  SetOptions(owner, options)
  {
    const values = Tr2DebugRenderer.#ToOptionSet(options);
    if (values.size) this.#options.set(owner, values);
    else this.#options.delete(owner);
  }

  /** Carbon method GetColorForOption -> PyGetColorForOption (MAP_METHOD). */
  @blue.method
  @meta.adapted
  GetColorForOption(option)
  {
    const color = this.#optionColors.get(String(option ?? ""));
    return color ? vec4.clone(color) : null;
  }

  /** Carbon method GetOptions (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  GetOptions(owner)
  {
    return [...(this.#options.get(owner) ?? [])];
  }

  /** Carbon method GetDefaultOptions (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  GetDefaultOptions()
  {
    return [...this.defaultOptions];
  }

  /** Carbon method SetColorForOption (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  SetColorForOption(option, color)
  {
    if (!color || color.length < 4) throw new TypeError("color must contain four components");
    this.#optionColors.set(String(option ?? ""), vec4.clone(color));
  }

  /**
   * Whether an owner has a debug option enabled, falling back to the defaults.
   */
  @meta.implemented
  HasOption(owner, option)
  {
    const options = this.#options.get(owner);
    return options ? options.has(String(option ?? "")) : this.defaultOptions.has(String(option ?? ""));
  }

  /**
   * Carbon's `IsSelected( IRoot* owner )` (Tr2DebugRenderer.cpp:157-160):
   * whether the object is in the current selection.
   *
   * Adapted: the selection holds objects, not Carbon's (object, area)
   * references, so an object counts as selected whatever area was selected.
   * @param {object} owner The object being queried.
   * @returns {boolean}
   */
  @meta.adapted
  IsSelected__Root(owner)
  {
    return this.selectedObjects.has(owner);
  }

  /**
   * Carbon's `IsSelected( Tr2DebugObjectReference owner )`
   * (Tr2DebugRenderer.cpp:162-165): whether the referenced area is selected.
   *
   * Adapted: the selection holds objects, not Carbon's (object, area)
   * references, so the area is not compared.
   * @param {Tr2DebugObjectReference} owner The object and area being queried.
   * @returns {boolean}
   */
  @meta.adapted
  IsSelected__Reference(owner)
  {
    return this.selectedObjects.has(owner.object);
  }

  /** Legacy EVE debug picking geometry/readback submission is not ported. */
  @meta.notImplemented
  Pick(_readback, _immediate, _renderContext)
  {
    throw new Error("Tr2DebugRenderer.Pick is not implemented.");
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

CjsSchema.decorateMethod(Tr2DebugRenderer, "HasOption", blue.method);
CjsSchema.decorateMethod(Tr2DebugRenderer, "IsSelected__Root", blue.method);
CjsSchema.decorateMethod(Tr2DebugRenderer, "IsSelected__Reference", blue.method);
CjsSchema.decorateMethod(Tr2DebugRenderer, "Pick", blue.method);
