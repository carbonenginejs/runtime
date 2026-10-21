// Source: blue/include/ITr2DebugRenderer2.h:97-124
// Source: trinity/trinity/Tr2DebugRenderer.cpp:72-110
import { CjsSchema, meta } from "../schema/index.js";

/**
 * Names what a debug primitive belongs to: an object, and an area within it
 * (zero for the whole object). The debug renderer groups and selects
 * primitives by it.
 *
 * Carbon has no default constructor; its two constructors become `create__`
 * factories, and the JavaScript constructor leaves the reference empty.
 * Carbon's call sites convert `this` implicitly; JavaScript callers name the
 * factory. The templated constructors forward `object->GetRawRoot()`, which
 * in JavaScript is the object itself, so each pair collapses into one
 * factory.
 */
export class Tr2DebugObjectReference
{
  /** m_object (IRootPtr). */
  object = null;

  /** m_area (uint32_t). */
  area = 0;

  /**
   * Carbon's `Tr2DebugObjectReference( IRoot* object )` (h:102-107, cpp:72-76).
   * @param {object} object The owning object.
   * @returns {Tr2DebugObjectReference}
   */
  static create__Object(object)
  {
    const reference = new Tr2DebugObjectReference();
    reference.object = object;
    reference.area = 0;
    return reference;
  }

  /**
   * Carbon's `Tr2DebugObjectReference( IRoot* object, uint32_t area )` (h:109-114, cpp:78-82).
   * @param {object} object The owning object.
   * @param {number} area Area index within the object.
   * @returns {Tr2DebugObjectReference}
   */
  static create__ObjectArea(object, area)
  {
    const reference = new Tr2DebugObjectReference();
    reference.object = object;
    reference.area = area >>> 0;
    return reference;
  }

  /**
   * Carbon's `operator bool` (cpp:84-87), which JavaScript cannot overload:
   * whether an object is referenced.
   * @returns {boolean}
   */
  IsValid()
  {
    return this.object !== null;
  }

  /**
   * Carbon's `operator==` (cpp:102-105).
   * @param {Tr2DebugObjectReference} other
   * @returns {boolean}
   */
  Equals(other)
  {
    return this.object === other.object && this.area === other.area;
  }

  /**
   * Carbon's `operator!=` (cpp:107-110).
   * @param {Tr2DebugObjectReference} other
   * @returns {boolean}
   */
  NotEquals(other)
  {
    return this.object !== other.object || this.area !== other.area;
  }
}

// Carbon's operator< (cpp:89-100) orders by pointer address, which JavaScript
// objects do not have; it exists only to key std::set/std::map, so it is not
// ported. The renderer keys its containers another way.

// Declared as a call, not a decorator: global/interfaces is imported straight
// from source by tests, and raw Node cannot parse decorator syntax.
CjsSchema.decorateMethod(Tr2DebugObjectReference, "IsValid", meta.renamed("operator bool"));
CjsSchema.decorateMethod(Tr2DebugObjectReference, "Equals", meta.renamed("operator=="));
CjsSchema.decorateMethod(Tr2DebugObjectReference, "NotEquals", meta.renamed("operator!="));
CjsSchema.meta.carbon("Tr2DebugObjectReference")(Tr2DebugObjectReference);
