// Source: blue/src/YamlWriter.h
// Source: blue/src/YamlWriter.cpp
//
// Writes Blue objects as values bags: YamlWriter's rules, emitting a plain
// object where YamlWriter emits YAML events. With `DictReader` it is the
// values engine; CjsSchema.getValues delegates here.
//
// Carbon has no dictionary writer - DictReader reads the dictionaries Python
// builds - so this is modelled on YamlWriter rather than a port of one class:
//
// - an object writes its members, under the class name when a tag is wanted
//   (`WriteIRoot`, YamlWriter.cpp:322-345);
// - SHARED OBJECTS ARE ANCHORED ON SECOND SIGHT. YamlWriter records each
//   object's mapping as it starts it, and when the object is reached again adds
//   an anchor to that first mapping and writes an alias (:349-376). This does
//   the same with `_id` and `{ _ref }`, which also closes a cycle on itself.
//
// Where it departs, declared (see the research page `blue-values-engine.md`):
// - YamlWriter always writes `type` and always anchors. Here `_type` is written
//   when `typeTags` (only where the class differs from the declared one) or
//   `forceTypeTags` asks, and anchoring when `refs` asks - the interchange
//   contract's options; without `refs` a shared object is written each time.
import { CjsSchema, impl } from "#schema";
import { IRootWriter } from "./IRootWriter.js";
import { BeObjectMetadata } from "./BlueObjectMetadata.js";
import { BLUE_OBJECT_METADATA_KEY } from "./IBlueObjectMetadata.js";
import { getDictionaryDeclarations } from "./dictionaryDeclarations.js";


/**
 * `DictWriter` - writes an object as a plain values bag.
 */
export class DictWriter extends IRootWriter
{
  /** The containers being filled, innermost last. */
  _stack = [];

  /** The member name the next value is written under. */
  _pendingName = null;

  /** m_classEventMap: each object written, to the bag written for it. */
  _written = new Map();

  /** The member names records interrupted, restored as each record ends. */
  _recordNames = [];

  /** m_anchorNumber: the next `_id`. */
  _anchorNumber = 1;

  /** The options this write was asked with. */
  _options = {};

  /**
   * Writes an object into a bag (`WriteObjectToString`, YamlWriter.cpp:76-87).
   *
   * @param {object} instance The object.
   * @param {object} [out] The bag to fill.
   * @param {object} [options] `persistOnly`, `typeTags`, `forceTypeTags`, `refs`.
   * @returns {object} The bag.
   */
  WriteObject(instance, out = {}, options = {})
  {
    this._Cleanup();
    this._options = options;
    try
    {
      this._WriteObjectInto(instance, out, null);
      return out;
    }
    finally
    {
      this._Cleanup();
    }
  }

  /** Records a member name for the next value. */
  WriteMemberName(name)
  {
    this._pendingName = name;
  }

  /** Writes a value into the container being filled. */
  WriteValue(value)
  {
    const container = this._stack[this._stack.length - 1];
    if (Array.isArray(container)) container.push(value);
    else container[this._pendingName] = value;
  }

  /**
   * Writes an object, an alias to one already written, or null
   * (`WriteIRoot( const IRoot* )`, YamlWriter.cpp:349-376).
   *
   * @param {object|null} instance The object.
   * @param {string|null} declaredClassName The class its member declares.
   */
  WriteIRoot(instance, declaredClassName)
  {
    if (instance === null || instance === undefined)
    {
      this.WriteValue(null);
      return;
    }

    const written = this._options.refs ? this._written.get(instance) : undefined;
    if (written)
    {
      if (written._id === undefined) written._id = this._anchorNumber++;
      this.WriteValue({ _ref: written._id });
      return;
    }

    const out = {};
    this.WriteValue(out);
    this._WriteObjectInto(instance, out, declaredClassName);
  }

  /** Begins a plain record in the container being filled. */
  WriteRecordBegin()
  {
    const record = {};
    const savedName = this._pendingName;
    this.WriteValue(record);
    this._stack.push(record);
    this._recordNames.push(savedName);
  }

  /** Ends the record being filled. */
  WriteRecordEnd()
  {
    this._stack.pop();
    this._pendingName = this._recordNames.pop();
  }

  /** Begins a list in the container being filled. */
  WriteVectorBegin(_size)
  {
    const list = [];
    this.WriteValue(list);
    this._stack.push(list);
  }

  /** Ends the list being filled. */
  WriteVectorEnd(_size)
  {
    this._stack.pop();
  }

  /**
   * An object's own bag (`WriteIRoot( const IRoot&, ... )`, YamlWriter.cpp:322-345).
   * An object whose class declares no fields but writes its own values (a
   * format, a resource) is asked for them.
   */
  _WriteObjectInto(instance, out, declaredClassName)
  {
    this._written.set(instance, out);

    const className = CjsSchema.getClassName(instance.constructor);
    const options = this._options;
    if (options.forceTypeTags || (options.typeTags && className && className !== declaredClassName)) out._type = className;

    // The object's metadata, under its reserved key (YamlWriter.cpp:330-342).
    const metadata = BeObjectMetadata.GetMetadata(instance);
    if (metadata) out[BLUE_OBJECT_METADATA_KEY] = { ...metadata };

    // Fieldless custom formats retain their explicit GetValues contract.
    const fields = getDictionaryDeclarations(instance.constructor).fields;
    if (!fields.length && typeof instance.GetValues === "function")
    {
      Object.assign(out, instance.GetValues(options), out);
      return;
    }

    const savedName = this._pendingName;
    this._stack.push(out);
    this.WriteMembers(instance, options);
    this._stack.pop();
    this._pendingName = savedName;
  }


  /** `Cleanup` (YamlWriter.cpp:245-254). */
  _Cleanup()
  {
    this._stack.length = 0;
    this._recordNames.length = 0;
    this._pendingName = null;
    this._written.clear();
    this._anchorNumber = 1;
  }
}

CjsSchema.define(DictWriter, { className: "DictWriter", modelledOn: "YamlWriter" });
CjsSchema.decorateMethod(DictWriter, "WriteIRoot", impl.adapted);
CjsSchema.decorateMethod(DictWriter, "WriteObject", impl.custom);
