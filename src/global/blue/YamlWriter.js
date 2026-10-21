import { exposure as be } from "#be";
// Source: blue/src/YamlWriter.h
// Source: blue/src/YamlWriter.cpp
import { Alias, Document, Pair, Scalar, YAMLMap, YAMLSeq, isSeq } from "yaml";
import { CjsSchema, meta, blue } from "#schema";
import { IRootWriter } from "./IRootWriter.js";
import { BLUE_OBJECT_METADATA_KEY } from "./IBlueObjectMetadata.js";
import * as CcpLog from "../logging/ccpLog.js";

/**
 * Authoring metadata safe to publish. Adapted from YamlWriter.cpp:333:
 * Carbon emits every key; private authoring paths can identify a person's
 * machine, so the operator requires an explicit output allow-list.
 * Reading metadata is unrestricted; this policy applies only to writing.
 */
const YAML_WRITER_METADATA_KEYS = new Set([
  "nodePosition", "typeID", "SofDna", "SofParentHullName", "sof_source_id"
]);

/** Carbon's YAML writer, using buffered yaml nodes in place of libyaml events. */

export class YamlWriter extends IRootWriter
{
  _skipDefaults = true;
  _dataStream = null;
  _anchorNumber = 0;
  _document = null;
  _events = [];

  /**
   * Emits UTF-8 through IBlueStream.Write. Adapted: yaml emits one buffered
   * string rather than calling a native output callback for each chunk.
   * Carbon's Result<void> success is represented by undefined.
   * @param {object} root Root object.
   * @param {object} stream Host IBlueStream-shaped sink with Write(bytes, size).
   * @returns {void}
   */

  WriteObjectToStream(root, stream)
  {
    const text = this.WriteObjectToString(root);
    this._dataStream = stream;
    try
    {
      const bytes = new TextEncoder().encode(text);
      // CE-201, YamlWriter.cpp:67-76 quirk: failed output is logged, but the method
      // still returns success. Do not turn a short write into an exception.
      if (!this._WriteToStream(bytes, bytes.byteLength)) this._ReportError("write error");
    }
    finally { this._Cleanup(); }
  }

  /**
   * Returns the C++ output string. Adapted: yaml owns AST nodes rather than
   * libyaml events; its flow wrapping and escaping may differ from libyaml.
   * @param {object} root Root object.
   * @returns {string} Red text.
   */

  WriteObjectToString(root)
  {
    this._Cleanup();
    try
    {
      this._document = new Document(undefined, { customTags: [
        { tag: "tag:yaml.org,2002:float", default: true, format: "CARBON",
          identify: value => typeof value === "number", test: /^(?:[-+]?(?:\d+(?:\.\d*)?|\.\d+)|[-+]?(?:inf|nan))$/,
          stringify: node => node.source },
        { tag: "tag:yaml.org,2002:str", default: true, format: "CARBON_QUOTED",
          identify: value => typeof value === "string", stringify: node => Quote(node.value) },
        { tag: "tag:yaml.org,2002:str", default: true, format: "CARBON_PLAIN",
          identify: value => typeof value === "string", stringify: node => node.value }
      ] });
      this._WriteIRoot__Reference(root, null);
      return this._document.toString({
        indent: 4, indentSeq: false, lineWidth: 80,
        flowCollectionPadding: false, directives: false
      });
    }
    finally { this._Cleanup(); }
  }

  /** Bridge to the existing base's public virtual; protected donor name is retained below. */
  WriteMemberName(name) { this._WriteMemberName(name); }
  /** Bridge to the existing base's pointer virtual. */
  WriteIRoot(instance) { this._WriteIRoot__Pointer(instance); }
  /** Bridge to the base's embedded-object overload. */
  WriteIRoot__Reference(instance, defaultInstance) { this._WriteIRoot__Reference(instance, defaultInstance); }
  /** Bridge to the existing base's sequence virtual. */
  WriteVectorBegin(size) { this._WriteVectorBegin(size); }
  /** Bridge to the existing base's sequence virtual. */
  WriteVectorEnd(size) { this._WriteVectorEnd(size); }
  /** Bridge to the existing base's custom persistence virtual. */
  WriteBinaryBlock(persist, name) { this._WriteBinaryBlock(persist, name); }
  /** Bridge to the existing base's struct-list virtual. */
  WriteStructureList(value, type) { this._WriteStructureList(value, type); }
  /** Plain records are an existing schema adaptation of native embedded data. */
  WriteRecordBegin() { this._AddMappingStartEvent(); }
  /** Ends a plain record. */
  WriteRecordEnd() { this._AddMappingEndEvent(); }
  /** The existing base's untyped bridge uses JS scalar types only when no declaration exists. */
  WriteValue(value) { this.WriteNestedValue(value); }

  /**
   * Dispatches the base's JS type descriptors to Carbon's distinct primitives.
   * Adapted: schema descriptors replace Be::VARTYPE and storage-pointer casts.
   * Generic records are retained for existing rawStruct schema declarations.
   * @param {*} value Declared value.
   * @param {object|null} type Schema descriptor.
   * @returns {void}
   */

  WriteNestedValue(value, type = null)
  {
    const kind = type?.kind;
    if (value === null || value === undefined) return this._AddScalarEvent(null);
    switch (kind)
    {
      case "float32": return this._WriteFloat(value);
      case "float64": return this._WriteDouble(value);
      case "boolean": return this._WriteInt8(value ? 1 : 0);
      case "int8": return this._WriteInt8(value);
      case "int16": return this._WriteInt16(value);
      case "int32": case "enum": return this._WriteInt32(value);
      case "uint8": case "uint16": case "uint32": return this._WriteUInt32(value);
      case "int64": return this._WriteInt64(value);
      case "uint64": return this._WriteUInt64(value);
      case "wstring": case "wpath": return this._WriteWChar(value);
      case "string": case "path": case "expression": return this._WriteChar(value);
      case "rootRef": case "rootWeak": return this._WriteIRoot__Pointer(value);
      // IRootWriter.cpp:92 writes FLOATARRAY flat, including matrix storage.
      case "matrix4": case "mat4": case "matrix3": case "mat3":
      case "vector2": case "vector3": case "vector4": case "vec2": case "vec3": case "vec4":
      case "color": case "quaternion": case "quat":
        if (type.scalar === "float64")
        {
          this._WriteVectorBegin(value.length);
          this._events.at(-1).node.flow = true;
          for (const item of value) this._WriteDouble(item);
          return this._WriteVectorEnd(value.length);
        }
        return this._WriteFloatArray(value, value.length);
    }
    if (typeof value === "string") return this._WriteChar(value);
    if (typeof value === "boolean") return this._WriteInt8(value ? 1 : 0);
    if (typeof value === "bigint") return this._WriteInt64(value);
    if (typeof value === "number") return this._WriteDouble(value);
    if (ArrayBuffer.isView(value))
    {
      this._WriteVectorBegin(value.length);
      this._events.at(-1).node.flow = true;
      for (const item of value) this.WriteNestedValue(item, { kind: type?.scalar ?? TypedScalar(value) });
      return this._WriteVectorEnd(value.length);
    }
    if (Array.isArray(value) || value instanceof Set)
    {
      this.WriteList(Array.from(value), null, type?.itemType);
      return;
    }
    if (CjsSchema.getClassName(value.constructor)) return this._WriteIRoot__Pointer(value);
    if (value instanceof Map)
    {
      // IRootWriter.cpp:185-199 writes IBlueDict as alternating keys/values.
      this._WriteVectorBegin(value.size * 2);
      for (const [key, item] of value)
      {
        this._WriteChar(String(key));
        this.WriteNestedValue(item, type?.valueType);
      }
      return this._WriteVectorEnd(value.size * 2);
    }
    this._AddMappingStartEvent();
    for (const key of Object.keys(value))
    {
      if (key.startsWith("_")) continue;
      this._WriteMemberName(key);
      this.WriteNestedValue(value[key]);
    }
    this._AddMappingEndEvent();
  }

  /** Writes an unquoted member name; yaml may quote syntactically ambiguous names. */

  _WriteMemberName(key) { this._AddScalarEvent(key); }

  /** Emits a signed byte after C++ argument conversion. */

  _WriteInt8(value) { this._WriteInt32((Number(value) << 24) >> 24); }

  /** Emits a signed short after C++ argument conversion. */

  _WriteInt16(value) { this._WriteInt32((Number(value) << 16) >> 16); }

  /** Emits signed decimal int32. */

  _WriteInt32(value) { this._AddScalarEvent(Number(value) | 0); }

  /** Emits unsigned decimal uint32. */

  _WriteUInt32(value) { this._AddScalarEvent(Number(value) >>> 0); }

  /** BigInt replaces native int64 storage without passing through Number. */

  _WriteInt64(value) { this._AddScalarEvent(BigInt.asIntN(64, BigInt(value))); }

  /** BigInt replaces native uint64 storage without passing through Number. */

  _WriteUInt64(value) { this._AddScalarEvent(BigInt.asUintN(64, BigInt(value))); }

  /** Emits %.7f, retaining one fraction digit; BigInt arithmetic replaces printf. */

  _WriteFloat(value) { this._AddScalarEvent(Math.fround(value), "number", Fixed(Math.fround(value), 7)); }

  /** Emits %.12f, retaining one fraction digit; BigInt arithmetic replaces printf. */

  _WriteDouble(value) { this._AddScalarEvent(value, "number", Fixed(value, 12)); }

  /** JS strings already hold Unicode; output is quoted and non-ASCII escaped. */

  _WriteChar(value) { this._AddScalarEvent(String(value).split("\0", 1)[0], "quoted"); }

  /** A native null wide pointer becomes null; JS strings replace wchar_t storage. */

  _WriteWChar(value)
  {
    if (value === null) this._AddScalarEvent(null);
    else this._WriteChar(value);
  }

  /**
   * Uses runtime ICustomPersist's returned view or {buffer, byteSize} in place
   * of C++ output pointers. Base64 bytes stay one scalar, as Carbon emits them.
   * A one-byte block cannot form a yaml AST: report that native malformed-event
   * bug as an error instead of silently producing a repaired block.
   */

  _WriteBinaryBlock(persist, propertyName)
  {
    const result = persist.GetWriteBufferAndSize(propertyName);
    const buffer = ArrayBuffer.isView(result) ? result : result?.buffer;
    const size = ArrayBuffer.isView(result) ? result.byteLength : result?.byteSize ?? 0;
    // CE-200, YamlWriter.cpp:159-162 quirk: empty buffers are not released.
    if (!size) return;
    try
    {
      // Fixes CE-199: Carbon's YamlWriter.cpp:167 / Base64.cpp:39 bug allocates
      // two bytes for four base64 characters and emits a key without a value;
      // ours throws explicitly because yaml's AST cannot emit that broken stream.
      if (size === 1) throw new Error("YamlWriter: Carbon's one-byte binary block produces malformed YAML.");
      const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, size); // alloc: variable-sized view of the caller-owned binary buffer.
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      this._WriteMemberName(propertyName);
      // YamlWriter.cpp:176 sets plain_implicit=1: the !!binary tag is omitted
      // when the encoded value can be emitted in plain style.
      this._AddScalarEvent(btoa(binary), "raw");
    }
    finally { persist.ReleaseWriteBuffer(buffer); }
  }

  /** Begins a block sequence using an AST node in place of a sequence-start event. */

  _WriteVectorBegin(_size)
  {
    const node = new YAMLSeq(this._document.schema);
    this._AddEvent(node);
    this._events.push({ node, key: null });
  }

  /** Ends the current sequence; AST ownership replaces the native end event. */

  _WriteVectorEnd(_size) { this._events.pop(); }

  /** Flow scalar sequence, with each value rounded as a native float. */

  _WriteFloatArray(values, numValues)
  {
    this._WriteVectorBegin(numValues);
    this._events.at(-1).node.flow = true;
    for (let i = 0; i < numValues; ++i) this._WriteFloat(values[i]);
    this._WriteVectorEnd(numValues);
  }

  /** Emits rows without allocating numeric scratch; JS indexes replace pointer increments. */

  _WriteFloatMatrix(values, numRows, numColumns)
  {
    this._WriteVectorBegin(numRows);
    for (let row = 0; row < numRows; ++row)
    {
      this._WriteVectorBegin(numColumns);
      this._events.at(-1).node.flow = true;
      for (let column = 0; column < numColumns; ++column) this._WriteFloat(values[row * numColumns + column]);
      this._WriteVectorEnd(numColumns);
    }
    this._WriteVectorEnd(numRows);
  }

  /** Native %g six-significant-digit spelling for packed FLOAT32x4 values. */

  _WriteFloatSequence(values, count)
  {
    this._WriteVectorBegin(count);
    this._events.at(-1).node.flow = true;
    for (let i = 0; i < count; ++i)
    {
      const value = Math.fround(values[i]);
      this._AddScalarEvent(value, "number", General(value));
    }
    this._WriteVectorEnd(count);
  }

  /**
   * Records a mapping before its children. Shared base helpers own reference
   * bookkeeping and the type/metadata header, also used by DictWriter.
   * Adapted: metadata output is restricted to YAML_WRITER_METADATA_KEYS to
   * avoid publishing machine-identifying authoring paths.
   */

  _WriteIRoot__Reference(instance, defaultInstance)
  {
    const mapping = this._AddMappingStartEvent();
    this._RememberWrittenObject(instance, mapping);
    const header = this._ObjectHeader(instance, null, { forceTypeTags: true }, "type");
    this._WriteMemberName("type");
    this._AddScalarEvent(header.type);
    const metadata = header[BLUE_OBJECT_METADATA_KEY];
    if (metadata)
    {
      const keys = Object.keys(metadata).filter(key => YAML_WRITER_METADATA_KEYS.has(key)).sort();
      if (keys.length)
      {
        this._WriteMemberName(BLUE_OBJECT_METADATA_KEY);
        this._AddMappingStartEvent();
        for (const key of keys)
        {
          this._WriteChar(key);
          this._WriteChar(metadata[key]);
        }
        this._AddMappingEndEvent();
      }
    }
    this.WriteMembers(instance, { persistOnly: true, skipDefaults: this._skipDefaults, defaultInstance });
    this._AddMappingEndEvent();
  }

  /** JS object identity replaces QueryInterface(IRoot); anchors are retrofitted on second sight. */

  _WriteIRoot__Pointer(instance)
  {
    if (instance === null || instance === undefined) return this._AddScalarEvent(null);
    const written = this._FindWrittenObject(instance);
    if (written)
    {
      written.anchor ??= "ID" + this._anchorNumber++;
      this._AddAliasEvent(written.anchor);
    }
    else this._WriteIRoot__Reference(instance, null);
  }

  /**
   * Emits BlueStructureDefinition and rows. Adapted: schema layouts and record
   * fields replace native byte offsets; offsets/type codes remain on the wire.
   * Only layouts supported by the runtime's meta.struct can be instantiated.
   */

  _WriteStructureList(list, type)
  {
    const itemType = type.itemType;
    const name = type.className ?? (typeof itemType === "string" ? itemType : itemType?.className);
    const Constructor = typeof name === "function" ? name : CjsSchema.getConstructor(name);
    const definition = CjsSchema.getSchema(Constructor).structureDefinition;
    if (!definition) throw new Error("YamlWriter: struct list has no declared BlueStructureDefinition.");
    this._AddMappingStartEvent();
    this._WriteMemberName("structure");
    this._WriteVectorBegin(definition.members.length);
    this._events.at(-1).node.flow = true;
    for (const member of definition.members)
    {
      this._WriteVectorBegin(3);
      this._events.at(-1).node.flow = true;
      this._WriteChar(member.name);
      this._WriteInt32(StructureDataType(member.dataType));
      this._WriteInt32(member.offset);
      this._WriteVectorEnd(3);
    }
    this._WriteVectorEnd(definition.members.length);
    this._WriteMemberName("items");
    this._WriteVectorBegin(list.length);
    for (const item of list)
    {
      this._WriteVectorBegin(definition.members.length);
      this._events.at(-1).node.flow = true;
      for (const member of definition.members) this.WriteNestedValue(item[member.name], { kind: member.type });
      this._WriteVectorEnd(definition.members.length);
    }
    this._WriteVectorEnd(list.length);
    this._AddMappingEndEvent();
  }

  /** Releases AST and reference state; garbage collection replaces event deletion. */

  _Cleanup()
  {
    this._dataStream = null;
    this._document = null;
    this._anchorNumber = 0;
    this._events.length = 0;
    this._written.clear();
    this._writtenReadOnly.clear();
    this._readOnlyDepth = 0;
  }

  /** Appends a node; AST parent/key state replaces libyaml's event stream. */

  _AddEvent(node)
  {
    const parent = this._events.at(-1);
    if (!parent) this._document.contents = node;
    else if (isSeq(parent.node)) parent.node.items.push(node);
    else if (parent.key === null) parent.key = node;
    else
    {
      parent.node.items.push(new Pair(parent.key, node));
      parent.key = null;
    }
    return node;
  }

  /** Scalar AST node; custom formats preserve printf lexemes and forced quoting. */

  _AddScalarEvent(value, style = "plain", source = null)
  {
    const node = new Scalar(value);
    if (style === "quoted") node.format = "CARBON_QUOTED";
    if (style === "raw") node.format = "CARBON_PLAIN";
    if (style === "number")
    {
      node.format = "CARBON";
      node.source = source;
    }
    return this._AddEvent(node);
  }

  /** Begins a block mapping; AST node replaces the native event pointer. */

  _AddMappingStartEvent()
  {
    const node = this._AddEvent(new YAMLMap(this._document.schema));
    this._events.push({ node, key: null });
    return node;
  }

  /** Ends a mapping; AST ownership replaces the native event. */

  _AddMappingEndEvent() { this._events.pop(); }

  /** Emits an alias AST node in place of a native alias event. */

  _AddAliasEvent(anchor) { this._AddEvent(new Alias(anchor)); }

  /** Routes the native callback shape to the member using a JS receiver. */

  static _writeToStreamStatic(data, buffer, size) { return data._WriteToStream(buffer, size); }

  /** The host supplies IBlueStream.Write; no filesystem policy is introduced. */

  _WriteToStream(buffer, size) { return Number(this._dataStream.Write(buffer, size) === size); }

  /** Logs through the runtime's Carbon logging port; filenames are not held by this base yet. */

  _ReportError(message) { CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("blue"), "%s", message); }
}

// Explicit registration keeps the public Blue source importable without a decorator transform.
meta.adapted(YamlWriter, "_writeToStreamStatic");
CjsSchema.decorateMethod(YamlWriter, "WriteObjectToStream", meta.adapted, be.mapMethodAndWrap());
CjsSchema.decorateMethod(YamlWriter, "WriteObjectToString", meta.adapted, be.mapMethodAndWrap());
CjsSchema.decorateMethod(YamlWriter, "WriteNestedValue", meta.adapted, meta.cjs);
CjsSchema.decorateMethod(YamlWriter, "_WriteMemberName", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteInt8", meta.implemented);
CjsSchema.decorateMethod(YamlWriter, "_WriteInt16", meta.implemented);
CjsSchema.decorateMethod(YamlWriter, "_WriteInt32", meta.implemented);
CjsSchema.decorateMethod(YamlWriter, "_WriteUInt32", meta.implemented);
CjsSchema.decorateMethod(YamlWriter, "_WriteInt64", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteUInt64", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteFloat", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteDouble", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteChar", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteWChar", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteBinaryBlock", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteVectorBegin", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteVectorEnd", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteFloatArray", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteFloatMatrix", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteFloatSequence", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteIRoot__Reference", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteIRoot__Pointer", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteStructureList", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_Cleanup", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_AddEvent", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_AddScalarEvent", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_AddMappingStartEvent", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_AddMappingEndEvent", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_AddAliasEvent", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_WriteToStream", meta.adapted);
CjsSchema.decorateMethod(YamlWriter, "_ReportError", meta.adapted);
be.define("YamlWriter")(YamlWriter);
blue.inherit(IRootWriter)(YamlWriter);

/**
 * Exact binary64 -> fixed decimal, rounding ties to even as modern printf.
 * This typed scratch holds bit representation only; no numeric plain arrays.
 */
const FLOAT_BITS = new DataView(new ArrayBuffer(8));
function Fixed(value, digits)
{
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "nan" : value < 0 ? "-inf" : "inf";
  const negative = value < 0 || Object.is(value, -0);
  const rounded = RoundScaled(value, digits);
  const text = rounded.toString().padStart(digits + 1, "0");
  const result = text.slice(0, -digits) + "." + text.slice(-digits).replace(/0+$/, "").padEnd(1, "0");
  // YamlWriter.cpp:191 uses a 64-byte printf buffer. JS cannot reproduce a
  // native invalid-parameter abort; do not quietly emit an oversized number.
  if (result.length + Number(negative) >= 64) throw new RangeError("YamlWriter: native printf buffer exceeded.");
  return (negative ? "-" : "") + result;
}

/** Rounds abs(value) * 10^digits exactly, including negative decimal scales. */
function RoundScaled(value, digits)
{
  FLOAT_BITS.setFloat64(0, Math.abs(value), false);
  const bits = FLOAT_BITS.getBigUint64(0, false);
  const exponent = Number((bits >> 52n) & 2047n);
  const mantissa = (bits & ((1n << 52n) - 1n)) | (exponent ? 1n << 52n : 0n);
  const power = (exponent ? exponent - 1023 : -1022) - 52;
  let numerator = mantissa;
  let denominator = 1n;
  if (digits >= 0) numerator *= 10n ** BigInt(digits);
  else denominator *= 10n ** BigInt(-digits);
  if (power >= 0) numerator <<= BigInt(power);
  else denominator <<= BigInt(-power);
  let rounded = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n > denominator || (remainder * 2n === denominator && (rounded & 1n))) ++rounded;
  return rounded;
}

/** %g is used only by Carbon's packed float4 structure members. */
function General(value)
{
  if (!Number.isFinite(value)) return Number.isNaN(value) ? "nan" : value < 0 ? "-inf" : "inf";
  if (value === 0) return Object.is(value, -0) ? "-0" : "0";
  let power = Math.floor(Math.log10(Math.abs(value)));
  let rounded = RoundScaled(value, 5 - power);
  if (rounded >= 1000000n) { ++power; rounded /= 10n; }
  const digits = rounded.toString().padStart(6, "0");
  const sign = value < 0 ? "-" : "";
  if (power < -4 || power >= 6)
  {
    const fraction = digits.slice(1).replace(/0+$/, "");
    return sign + digits[0] + (fraction ? "." + fraction : "") +
      "e" + (power < 0 ? "-" : "+") + String(Math.abs(power)).padStart(2, "0");
  }
  const point = power + 1;
  let text = point <= 0 ? "0." + "0".repeat(-point) + digits
    : point >= digits.length ? digits + "0".repeat(point - digits.length)
    : digits.slice(0, point) + "." + digits.slice(point);
  if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
  return sign + text;
}

/** libyaml's default unicode=false escapes non-ASCII code points. */
function Quote(value)
{
  return JSON.stringify(value).replace(/[\u007f-\u{10ffff}]/gu, character => {
    const code = character.codePointAt(0);
    return code <= 0xff ? "\\x" + code.toString(16).toUpperCase().padStart(2, "0")
      : code <= 0xffff ? "\\u" + code.toString(16).toUpperCase().padStart(4, "0")
      : "\\U" + code.toString(16).toUpperCase().padStart(8, "0");
  });
}

/** Uses platform typed-array tags, never names of runtime classes. */
function TypedScalar(value)
{
  switch (Object.prototype.toString.call(value))
  {
    case "[object Float32Array]": return "float32";
    case "[object Float64Array]": return "float64";
    case "[object BigInt64Array]": return "int64";
    case "[object BigUint64Array]": return "uint64";
    case "[object Uint32Array]": return "uint32";
    default: return "int32";
  }
}

/** Numeric Be::BlueStructureDataType codes for the schema's supported layouts. */
function StructureDataType(name)
{
  // blueexposure/include/IBlueStructureList.h:17-110.
  const split = name.lastIndexOf("_");
  const size = Number(name.slice(split + 1));
  const base = { BYTE: 0, SHORT: 1, INT32: 2, FLOAT16: 3, FLOAT32: 4,
    SHAREDSTRING: 5, BOOL8: 7, UBYTE: 8, USHORT: 9, UINT32: 10 }[name.slice(0, split)];
  if (base === undefined || !Number.isInteger(size)) throw new Error("YamlWriter: unsupported structure data type.");
  return base | ((size - 1) << 5);
}
