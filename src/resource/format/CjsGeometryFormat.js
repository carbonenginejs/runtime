import { CjsFormat } from "./CjsFormat.js";

/**
 * The base of every geometry format (gr2, cmf, fbx, obj, stl, gltf): the
 * geometry media type and the node-class registry that lets a caller hydrate a
 * read into its own constructors instead of plain JSON.
 *
 * Not Carbon: Carbon reads geometry straight into Tr2GeometryRes and has no
 * per-format class registry. The registry was copied into each format before
 * this base existed (/docs/projects/geometry-format-overlap.md).
 *
 * A subclass supplies:
 * - `static id` and `static CLASS_KEYS`, the node keys `classes` may name;
 * - `_classes`, the current map, which its `SetValues` merges `classes` into.
 */
export class CjsGeometryFormat extends CjsFormat
{

  static mediaTypes = Object.freeze([ "geometry" ]);

  /** Node key -> constructor; replaced, never mutated, so a copy handed out stays stable. */
  _classes = {};

  /**
   * Throw unless `key` is one of `classKeys`.
   *
   * @param {string} key Node class key.
   * @param {readonly string[]} classKeys The keys a format accepts.
   * @param {string} readerName Format name used in thrown errors.
   */
  static validateClassKey(key, classKeys, readerName)
  {
    if (!classKeys.includes(key))
    {
      throw new Error(`${readerName}: unknown class key ${JSON.stringify(key)}; expected one of ${classKeys.join(", ")}`);
    }
  }

  /**
   * Throw unless `key` is valid and `Class` is a constructor.
   *
   * @param {string} key Node class key.
   * @param {Function} Class Candidate constructor.
   * @param {readonly string[]} classKeys The keys a format accepts.
   * @param {string} readerName Format name used in thrown errors.
   */
  static validateClass(key, Class, classKeys, readerName)
  {
    CjsGeometryFormat.validateClassKey(key, classKeys, readerName);
    if (typeof Class !== "function")
    {
      throw new TypeError(`${readerName}: class ${JSON.stringify(key)} must be a constructor`);
    }
  }

  /**
   * Set several node-class constructors.
   *
   * @param {object} [classes] Node class key -> constructor.
   * @returns {this} This format profile.
   */
  SetClasses(classes = {})
  {
    return this.SetValues({ classes });
  }

  /**
   * Set one node-class constructor, or delete it with a nullish Class.
   *
   * @param {string} type Node class key.
   * @param {Function|null|undefined} Class Constructor, or nullish to delete.
   * @returns {this} This format profile.
   */
  SetClass(type, Class)
  {
    const { CLASS_KEYS, id } = this.constructor;
    if (Class === null || Class === undefined)
    {
      CjsGeometryFormat.validateClassKey(type, CLASS_KEYS, id);
      const classes = { ...this._classes };
      delete classes[type];
      this._classes = classes;
      return this;
    }

    CjsGeometryFormat.validateClass(type, Class, CLASS_KEYS, id);
    return this.SetValues({ classes: { [type]: Class } });
  }

  /**
   * The constructor registered for a node class key, if any.
   *
   * @param {string} type Node class key.
   * @returns {Function|undefined} The constructor.
   */
  GetClass(type)
  {
    CjsGeometryFormat.validateClassKey(type, this.constructor.CLASS_KEYS, this.constructor.id);
    return this._classes[type];
  }

  /**
   * Whether a constructor is registered for a node class key.
   *
   * @param {string} type Node class key.
   * @returns {boolean} True when one is.
   */
  HasClass(type)
  {
    return !!this.GetClass(type);
  }

}
