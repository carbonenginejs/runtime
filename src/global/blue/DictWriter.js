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
//   `forceTypeTags` asks. Anchoring is on, as YamlWriter's is, unless the
//   caller passes `refs: false` for a flat copy: then a shared object is
//   written at every reference, reads back as independent copies, and a cycle
//   never ends. A flat copy of a large shared graph can be gigabytes (the
//   mdeha01 hangar passed 12 GB).
import { CjsSchema, meta, blue } from "#schema";
import { IRootWriter } from "./IRootWriter.js";
import { getDictionaryDeclarations } from "./dictionaryDeclarations.js";
import * as CcpLog from "../logging/ccpLog.js";

/**
 * Default `sizeWarningBytes`: an export estimated past this logs a warning.
 *
 * Calibrated 2026-10-11 on EVE build 3599281. The largest real file, SOF
 * `data.black` (184.4 MB), hydrates to 892,032 objects and exports to
 * 177.1 MB of JSON (0.96x the .black); the mdeha01 hangar's 12.4 MB of DNA
 * values export to 14.0 MB. 1 GiB is about 5.7x the largest real export, so
 * only duplication - a shared graph written flat - or a hand-built scene of
 * unusual size reaches it. These measurements cover JSON bags, not Red text.
 * The running estimate came within 0.4% (data.black) and 1.5% (hangar) of the
 * real JSON length.
 */
export const DEFAULT_SIZE_WARNING_BYTES = 1024 * 1024 * 1024;


/**
 * `DictWriter` - writes an object as a plain values bag.
 *
 * Modelled on: YamlWriter (blue/src/YamlWriter.h:16)
 */
export class DictWriter extends IRootWriter
{
  /** The containers being filled, innermost last. */
  _stack = [];

  /** The member name the next value is written under. */
  _pendingName = null;


  /** The member names records interrupted, restored as each record ends. */
  _recordNames = [];

  /** m_anchorNumber: the next `_id`. */
  _anchorNumber = 1;

  /** The options this write was asked with. */
  _options = {};

  /** A running estimate of the JSON length written, for the size warning. */
  _estimatedBytes = 0;

  /**
   * Writes an object into a bag (`WriteObjectToString`, YamlWriter.cpp:76-87).
   *
   * @param {object} instance The object.
   * @param {object} [out] The bag to fill.
   * @param {object} [options] `persistOnly`, `typeTags`, `forceTypeTags`, `refs`
   *   (default true; false writes shared objects as independent copies), and
   *   `sizeWarningBytes` (default DEFAULT_SIZE_WARNING_BYTES; 0 turns the
   *   warning off).
   * @returns {object} The bag.
   */
  WriteObject(instance, out = {}, options = {})
  {
    this._Cleanup();
    this._options = options;
    try
    {
      this._WriteObjectInto(instance, out, null);
      this._WarnIfLarge(instance);
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
    this._estimatedBytes += EstimateJsonBytes(value) + (Array.isArray(container) ? 1 : this._pendingName.length + 4);
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

    const written = this._FindWrittenObject(instance, this._options.refs !== false);
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
    this._RememberWrittenObject(instance, out);
    const options = this._options;
    Object.assign(out, this._ObjectHeader(instance, declaredClassName, options, "_type"));

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


  /**
   * Writes nothing: a values bag carries no binary block.
   *
   * Adapted: YamlWriter writes the bytes as a base64 `!!binary` scalar
   * (YamlWriter.cpp:154-180), but DictReader, which reads these bags, refuses
   * a binary block (DictReader.cpp:718-721), so a bag that held one could not
   * be read back. The Copier does not copy one either (BINARYBLOCK's member
   * size is 0, so Copier.cpp:173-176 always finds it unchanged).
   *
   * @param {object} _persist The instance's ICustomPersist.
   * @param {string} _propertyName The block's member name.
   */
  WriteBinaryBlock(_persist, _propertyName)
  {
  }

  /**
   * Logs one warning when the estimated export passes `sizeWarningBytes`.
   * Real files export to well under it (see DEFAULT_SIZE_WARNING_BYTES), so
   * passing it almost always means a shared object was written at every
   * reference.
   *
   * @param {object} instance The root written.
   * @returns {void}
   */
  _WarnIfLarge(instance)
  {
    const limit = this._options.sizeWarningBytes ?? DEFAULT_SIZE_WARNING_BYTES;
    if (!limit || this._estimatedBytes <= limit) return;
    CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("blue"),
      "GetValues of %s wrote about %d MB (warning above %d MB); refs: %s",
      CjsSchema.getClassName(instance.constructor) ?? "unregistered object",
      Math.round(this._estimatedBytes / 1048576), Math.round(limit / 1048576),
      this._options.refs === false ? "false - shared objects were written at every reference" : "on");
  }

  /** `Cleanup` (YamlWriter.cpp:245-254). */
  _Cleanup()
  {
    this._stack.length = 0;
    this._recordNames.length = 0;
    this._pendingName = null;
    this._written.clear();
    this._writtenReadOnly.clear();
    this._readOnlyDepth = 0;
    this._estimatedBytes = 0;
    this._anchorNumber = 1;
  }
}

/**
 * The approximate JSON length of one written value, not counting what a
 * container holds (those are counted as they are written).
 *
 * @param {*} value The value.
 * @returns {number} Bytes.
 */
function EstimateJsonBytes(value)
{
  switch (typeof value)
  {
    case "string": return value.length + 2;
    case "number": return 8;
    case "boolean": return 5;
    case "object":
      if (value === null) return 4;
      if (Array.isArray(value)) return value.reduce((n, item) => n + EstimateJsonBytes(item) + 1, 2);
      {
        // A bag being filled is still empty here; a nested plain value is complete.
        let n = 2;
        for (const key in value) n += key.length + 4 + EstimateJsonBytes(value[key]);
        return n;
      }
    default: return 4;
  }
}

CjsSchema.meta.define(DictWriter, { className: "DictWriter" });
CjsSchema.decorateMethod(DictWriter, "WriteIRoot", blue.method, meta.adapted);
CjsSchema.decorateMethod(DictWriter, "WriteBinaryBlock", blue.method, meta.adapted);
CjsSchema.decorateMethod(DictWriter, "WriteMemberName", blue.method, meta.adapted);
CjsSchema.decorateMethod(DictWriter, "WriteVectorBegin", blue.method, meta.adapted);
CjsSchema.decorateMethod(DictWriter, "WriteVectorEnd", blue.method, meta.adapted);
CjsSchema.decorateMethod(DictWriter, "_Cleanup", blue.method, meta.adapted);
