import { exposure as be } from "#be";
// Source: blue/src/YamlReader.h
// Source: blue/src/YamlReader.cpp
// Source: blue/src/YamlReader_Blue.cpp
import { parseAllDocuments, isMap, isSeq, isScalar, isAlias } from "yaml";
import { CjsSchema, meta, blue, type } from "#schema";
import { IRootReaderBase } from "./IRootReaderBase.js";
import { IRootReader } from "./IRootReader.js";
import { IRootReaderException } from "./IRootReaderException.js";
import { IBlueObjectBuilder } from "./IBlueObjectBuilder.js";
import { IBlueObjectProxy } from "./IBlueObjectProxy.js";
import { ICacheable } from "./ICacheable.js";
import { IInitialize } from "./IInitialize.js";
import { INotify } from "./INotify.js";
import { IList } from "./IList.js";
import { BeObjectMetadata } from "./BlueObjectMetadata.js";
import { BLUE_OBJECT_METADATA_KEY } from "./IBlueObjectMetadata.js";
import { getClassRegistration } from "./classes/registry.js";
import { getDictionaryDeclarations, readDictionaryValue, writeDictionaryValue } from "./dictionaryDeclarations.js";
import { mappedInterfaces } from "../compose/interface.js";
import { BLUELISTEVENT } from "#consts/blue";
import * as CcpLog from "../logging/ccpLog.js";

/**
 * Carbon's class-driven Red reader. Adapted: the yaml package supplies nodes,
 * flattened into the same event ordering libyaml supplies, without toJS or
 * alias expansion. Scalar text is converted by the declared member type.
 * Object values are exported separately by the Blue values service.
 */
@blue.inherit(IRootReaderBase)
@be.mapInterface(IRootReader)
@be.mapInterface(IBlueObjectBuilder)
@be.mapInterface(ICacheable)
@be.define("YamlReader")
export class YamlReader extends IRootReaderBase
{
  _event = null;

  _eventList = [];

  _currentEvent = 0;

  _objectMarkers = [];

  _anchorClassMap = new Map();

  _hasPushedEvent = false;

  _pushedEvent = null;

  _fileName = "";

  _errorMessage = "";

  @be.mapAttribute(be.READWRITE, "isStrict")

  @type.boolean
  _isStrict = false;

  @be.mapAttribute(be.READWRITE, "doInitialize")

  @type.boolean
  _doInitialize = true;

  _timeSlice = Math.fround(0.005);

  _allowYield = false;

  _dataStream = null;

  _cached = false;

  _nativePersistence = true;

  /**
   * Reads an object, returning null on a reader error. Adapted: host Read
   * fills bytes synchronously; UTF-8 and yaml nodes replace libyaml callbacks.
   * @param {object} stream Stream implementing Read(buffer, size).
   * @returns {object|null} Last root mapping, or null on a reader failure.
   */

  @meta.adapted
  ReadFromStream(stream)
  {
    // CE-213: Carbon keeps its anchor map between streams (YamlReader.cpp:107-155).
    this._dataStream = stream;
    this._cached = false;
    let result = null;
    try
    {
      this._LoadEvents(ReadStream(stream));
      let foundStart = false;
      while (!this._IsParserExhausted())
      {
        this._GetNextEvent();
        if (this._event.type === "MAPPING_START")
        {
          foundStart = true;
          result = this._ReadIRootClassInternal();
        }
      }
      if (!foundStart) this._ReportError("mapping start event not found");
    }
    catch (error)
    {
      if (!CjsSchema.isInstanceOf("IRootReaderException", error)) throw error;
      result = null;
      this._errorMessage = error.message;
    }
    finally
    {
      this._event = null;
      this._dataStream = null;
      this._ClearCachedEvents();
    }
    return result;
  }

  /**
   * Caches parser events for repeated construction and lazy proxies. Adapted:
   * nodes are parsed once; event indices replace native list iterators.
   * @param {object} stream Stream implementing Read(buffer, size).
   * @returns {boolean} Whether a root mapping was cached.
   */

  @meta.adapted
  ReadForCachingFromStream(stream)
  {
    this._ClearCachedEvents();
    this._objectMarkers.length = 0;
    try
    {
      this._LoadEvents(ReadStream(stream));
      const marker = this._eventList.findIndex(event => event.type === "MAPPING_START");
      if (marker === -1) return false;
      this._objectMarkers.push(marker);
      this._cached = true;
      return true;
    }
    catch (error)
    {
      if (!CjsSchema.isInstanceOf("IRootReaderException", error)) throw error;
      this._errorMessage = error.message;
      this._ClearCachedEvents();
      return false;
    }
    finally { this._event = null; }
  }

  /** Reads UTF-8 text; the native output pointer is returned, failures throw. */
  @be.mapMethodAndWrap()
  @meta.adapted
  CreateObjectFromString(text)
  {
    const bytes = new TextEncoder().encode(text);
    let offset = 0;
    return this.CreateObjectFromStream({
      Read(buffer, size)
      {
        const count = Math.min(size, bytes.length - offset);
        buffer.set(bytes.subarray(offset, offset + count));
        offset += count;
        return count;
      }
    });
  }

  /** Returns the output pointer; a failed native Result becomes a reader exception. */
  @be.mapMethodAndWrap()
  @meta.adapted
  CreateObjectFromStream(stream)
  {
    const result = this.ReadFromStream(stream);
    if (result) return result;
    throw new IRootReaderException(this.GetErrorMessage() || "Failed to create an object from YAML");
  }

  /** The synchronous native BePaths stream API is not ported; no host filesystem is invented. */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  CreateObjectFromFile(_filename)
  {
    throw new Error("YamlReader.CreateObjectFromFile requires BePaths.GetStreamFromPathW.");
  }

  /** Sets the filename included in reader diagnostics. */

  @meta.implemented
  SetFileName(name) { this._fileName = name; }

  /** Controls mapped IInitialize completion after members have been read. */

  @meta.implemented
  SetDoInitialize(value) { this._doInitialize = value; }

  /** Stores the float32 slice; JavaScript has no synchronous Stackless tasklet yield. */

  @meta.adapted
  SetTimeSlice(value) { this._timeSlice = Math.max(0, Math.fround(value)); }

  /** Returns the native string output parameter. */

  @meta.adapted
  GetErrorMessage() { return this._errorMessage; }

  /** Builds from an event marker. Garbage collection replaces native reference counting. */

  @meta.adapted
  CreateObject(objectMarker, callingProxy)
  {
    return this._CreateObjectHelper(objectMarker, callingProxy, false);
  }

  /** Builds synchronously: JavaScript cannot yield a synchronous Stackless tasklet. */

  @meta.adapted
  CreateObjectWithYield(objectMarker, callingProxy)
  {
    return this._CreateObjectHelper(objectMarker, callingProxy, true);
  }

  /** Native reports that its rough event-memory estimate is available. */
  @be.mapMethodAndWrap()
  @meta.implemented
  IsMemoryUsageKnown() { return true; }

  /** Preserves Carbon's rough estimate; this is not a JavaScript heap measurement. */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetMemoryUsage() { return 128 + this._eventList.length * 64; }

  /** Cached event indices replace native iterators; Stackless scheduling is unavailable. */

  @meta.adapted
  _CreateObjectHelper(objectMarker, _callingProxy, _yieldBehavior)
  {
    if (!this._cached || !Number.isInteger(objectMarker) || objectMarker < 0 || objectMarker >= this._objectMarkers.length)
      this._ReportError("Invalid object marker");
    if (this._allowYield) this._ReportError("Object creation is already active");
    this._allowYield = true;
    this._currentEvent = this._objectMarkers[objectMarker];
    this._hasPushedEvent = false;
    try { return this._ReadIRootClass(); }
    catch (error)
    {
      if (!CjsSchema.isInstanceOf("IRootReaderException", error)) throw error;
      this._errorMessage = error.message;
      return null;
    }
    finally
    {
      this._event = null;
      this._anchorClassMap.clear();
      this._allowYield = false;
    }
  }

  /**
   * Adapts yaml nodes to native event order; no plain values graph is constructed.
   * PoolAllocatedYamlEvent (YamlReader.h:26) supplies cached native allocation
   * only; these event records instead live with the reader and are reclaimed by GC.
   */
  _LoadEvents(text)
  {
    this._eventList = [];
    this._currentEvent = 0;
    this._hasPushedEvent = false;
    this._event = null;
    let line = 0, offset = 0;
    const add = (type, node = null) =>
    {
      const end = node?.range?.[0] ?? offset;
      while (offset < end) if (text[offset++] === "\n") ++line;
      this._eventList.push({ type, node, line });
    };
    const visit = node =>
    {
      if (isMap(node))
      {
        add("MAPPING_START", node);
        for (const pair of node.items) { visit(pair.key); visit(pair.value); }
        add("MAPPING_END");
      }
      else if (isSeq(node))
      {
        add("SEQUENCE_START", node);
        for (const item of node.items) visit(item);
        add("SEQUENCE_END");
      }
      else if (isAlias(node)) add("ALIAS", node);
      else if (isScalar(node) || node === null) add("SCALAR", node);
      else this._ReportError("Unsupported YAML node");
    };
    add("STREAM_START");
    // Libyaml passes scalar spellings through untouched, including duplicate keys.
    // Explicit YAML tags must not resolve into Buffers, numbers or dates:
    // libyaml supplies the scalar text and Carbon's member declaration converts it.
    const documents = parseAllDocuments(text, { schema: "failsafe", resolveKnownTags: false, uniqueKeys: false });
    for (const document of documents)
    {
      if (document.errors.length) this._ReportError(document.errors[0].message);
      add("DOCUMENT_START");
      visit(document.contents);
      add("DOCUMENT_END");
    }
    add("STREAM_END");
  }

  /** Uses the current node's source location instead of libyaml's parser mark. */

  @meta.adapted
  _ConstructMessage(message)
  {
    let prefix = this._fileName;
    if (this._event?.line) prefix += `${prefix ? ", line " : "Line "}${this._event.line}`;
    return `${prefix ? prefix + ": " : ""}${message}`;
  }

  /** Throws the native reader exception with filename and line context. */

  @meta.adapted
  _ReportError(message) { throw new IRootReaderException(this._ConstructMessage(message)); }

  /** Escalates warnings only in native strict mode. */

  @meta.implemented
  _ReportWarning(message)
  {
    if (this._isStrict) this._ReportError(message);
    CcpLog.CCP_LOGWARN(this._ConstructMessage(message));
  }

  /** Validates the event currently being consumed. */

  @meta.adapted
  _VerifyEvent(type)
  {
    if (this._event?.type !== type) this._ReportError(`Expected event ${type} but got ${this._event?.type ?? "NO_EVENT"}`);
    return true;
  }

  /** Advances the buffered node events, honoring Carbon's single-event pushback. */

  @meta.adapted
  _GetNextEvent()
  {
    if (this._hasPushedEvent)
    {
      this._hasPushedEvent = false;
      this._event = this._pushedEvent;
    }
    else
    {
      if (this._currentEvent >= this._eventList.length) this._ReportError("Unexpected end of YAML events");
      this._event = this._eventList[this._currentEvent++];
    }
  }

  /** Retains one event for the next read, as native PushEvent does. */

  @meta.implemented
  _PushEvent()
  {
    if (this._hasPushedEvent) this._ReportError("YAML event already pushed");
    this._pushedEvent = this._event;
    this._hasPushedEvent = true;
  }

  /** Buffered parsing has already checked syntax; exhaustion is the end event. */

  @meta.adapted
  _IsParserExhausted() { return this._event?.type === "STREAM_END"; }

  /** Releases native cached-event storage through JavaScript garbage collection. */

  @meta.adapted
  _ClearCachedEvents()
  {
    this._eventList = [];
    this._currentEvent = 0;
    this._hasPushedEvent = false;
    this._pushedEvent = null;
    this._cached = false;
  }

  /** Consumes a complete nested mapping or sequence, preserving native cursor behavior. */

  @meta.implemented
  _ParseUntilMatchingEnd(start, end)
  {
    let level = 1;
    while (level && !this._IsParserExhausted())
    {
      this._GetNextEvent();
      if (this._event.type === start) ++level;
      else if (this._event.type === end) --level;
    }
  }

  /** Skips the remainder of the current native mapping. */

  @meta.implemented
  _ParseUntilMatchingMappingEnd() { this._ParseUntilMatchingEnd("MAPPING_START", "MAPPING_END"); }

  /** Skips the remainder of the current native sequence. */

  @meta.implemented
  _ParseUntilMatchingSequenceEnd() { this._ParseUntilMatchingEnd("SEQUENCE_START", "SEQUENCE_END"); }

  /** Consumes one scalar, alias or entire collection. */

  @meta.implemented
  _SkipValue()
  {
    this._GetNextEvent();
    if (this._event.type === "MAPPING_START") this._ParseUntilMatchingMappingEnd();
    else if (this._event.type === "SEQUENCE_START") this._ParseUntilMatchingSequenceEnd();
  }

  /** Returns scalar text, never YAML's inferred boolean/numeric value. */

  @meta.adapted
  _ReadScalar()
  {
    this._GetNextEvent();
    this._VerifyEvent("SCALAR");
    return ScalarText(this._event.node);
  }

  /** Returns null at a mapping end; native string output becomes the result. */

  @meta.adapted
  _ReadMemberName()
  {
    this._GetNextEvent();
    return this._event.type === "SCALAR" ? ScalarText(this._event.node) : null;
  }

  /** Reads the mandatory first type key; C++'s output pointer becomes the return value. */

  @meta.adapted
  _ReadClassType() { return this._ReadScalar() === "type" ? this._ReadScalar() : null; }

  /** Exact Blue registration replaces native CLSID lookup and factory resolution. */

  @meta.adapted
  _ReadClsid()
  {
    const name = this._ReadClassType();
    if (name === null) this._ReportError("Type of object is not specified");
    const registration = getClassRegistration(name);
    if (!registration) this._ReportWarning(`Type '${name}' not found in Blue class registry`);
    return registration;
  }

  /** Preserves the native eight-byte identifier, using BigInt instead of memcpy. */

  @meta.adapted
  _ExtractAnchorFromMappingStart() { return AnchorId(this._event.node?.anchor); }

  /** Creates directly through the registered factory; no values/hydration adapter intervenes. */

  @meta.adapted
  _ReadIRootClassInternal()
  {
    const anchor = this._ExtractAnchorFromMappingStart();
    const registration = this._ReadClsid();
    if (!registration) { this._ParseUntilMatchingMappingEnd(); return null; }
    const instance = registration.createFn();
    if (!instance) this._ReportError(`Factory '${registration.name}' returned no object`);
    const proxy = QueryInterface(instance, IBlueObjectProxy);
    if (this._cached && proxy)
    {
      const name = this._ReadMemberName();
      if (name !== null)
      {
        if (name !== "object") this._ReportError(`Error handling property '${name}' - skipping it`);
        const marker = this._objectMarkers.length;
        this._objectMarkers.push(this._currentEvent);
        proxy.SetBuilder(this, marker);
        this._GetNextEvent();
        const innerAnchor = this._ExtractAnchorFromMappingStart();
        if (innerAnchor) this._anchorClassMap.set(innerAnchor, null);
        this._PushEvent();
        this._ParseUntilMatchingMappingEnd();
      }
    }
    else this._ReadMembers(instance);

    const initialize = QueryInterface(instance, IInitialize);
    if (this._doInitialize && initialize) initialize.Initialize();
    // CE-210: anchors become visible only AFTER completion (YamlReader.cpp:1033-1036).
    if (anchor) this._anchorClassMap.set(anchor, instance);
    return instance;
  }

  /** Reads null, a class mapping or an already completed object's alias. */

  @meta.adapted
  _ReadIRootClass()
  {
    this._GetNextEvent();
    if (this._event.type === "MAPPING_START") return this._ReadIRootClassInternal();
    if (this._event.type === "SCALAR")
    {
      const value = ScalarText(this._event.node);
      if (value !== "null" && value !== "~") this._ReportError(`Expected 'null' or '~' but got: ${value}`);
      return null;
    }
    if (this._event.type === "ALIAS")
    {
      const name = this._event.node.source;
      const id = AnchorId(name);
      if (!this._anchorClassMap.has(id)) this._ReportError(`Reference to anchor '${name}' that hasn't been previously defined!`);
      const instance = this._anchorClassMap.get(id);
      if (!instance) this._ReportWarning(`Reference to anchor '${name}' that hasn't been previously set - referencing inside a proxy?`);
      return instance;
    }
    this._ReportError("Expected description of class (SCALAR, MAPPING, or ALIAS) but got other event");
  }

  /** Fills an existing embedded object only when its exact registered type matches. */

  @meta.adapted
  _ReadIRoot(instance)
  {
    this._GetNextEvent();
    this._VerifyEvent("MAPPING_START");
    const registration = this._ReadClsid();
    if (!registration) { this._ParseUntilMatchingMappingEnd(); return; }
    if (instance.constructor !== registration.type)
    {
      this._ReportWarning(`Expected type '${CjsSchema.getClassName(instance.constructor)}' but got '${registration.name}' - skipping it`);
      this._ParseUntilMatchingMappingEnd();
      return;
    }
    this._ReadMembers(instance);
    const initialize = QueryInterface(instance, IInitialize);
    if (this._doInitialize && initialize) initialize.Initialize();
  }

  /** Reads metadata only in native first-member position; preserves native exception recovery. */

  @meta.adapted
  _ReadMembers(instance)
  {
    const initialize = QueryInterface(instance, IInitialize);
    const notify = initialize ? null : QueryInterface(instance, INotify);
    let first = true;
    for (let name = this._ReadMemberName(); name !== null; name = this._ReadMemberName())
    {
      if (first && name === BLUE_OBJECT_METADATA_KEY)
      {
        this._ReadMetadata(instance);
        first = false;
        continue;
      }
      first = false;
      try { this.HandleAttribute(name, instance, notify); }
      catch (error)
      {
        if (!CjsSchema.isInstanceOf("InvalidAttributeException", error)) throw error;
        // CE-208: warns but does NOT call SkipValue (YamlReader.cpp:1369-1376).
        this._ReportWarning(`Error handling attribute '${name}' - skipping it`);
      }
    }
  }

  /** JS objects are weakly addressable, so every constructed owner can have metadata. */

  @meta.adapted
  _ReadMetadata(instance)
  {
    this._GetNextEvent();
    this._VerifyEvent("MAPPING_START");
    this._GetNextEvent();
    while (this._event.type !== "MAPPING_END")
    {
      this._VerifyEvent("SCALAR");
      const key = ScalarText(this._event.node);
      BeObjectMetadata.Set(instance, key, this._ReadScalar());
      this._GetNextEvent();
    }
  }

  /** Native FindEntry searches persisted fields; dictionary transport retains its broader view. */
  @blue.method
  @meta.adapted
  FindEntry(name, Constructor)
  {
    const field = getDictionaryDeclarations(Constructor).byName.get(name);
    return field && CjsSchema.isFieldExported(field, { persistOnly: true }) ? field : null;
  }

  /** Dispatches schema storage descriptors in place of native Be::Var pointer casts. */
  @meta.cjs
    @meta.adapted
  _ReadMember(instance, field)
  {
    const current = readDictionaryValue(instance, field);
    const type = field.type;
    const kind = type?.kind;
    if (kind === "root")
    {
      if (!current) this._ReportError(`Embedded member '${field.name}' has no storage`);
      this._ReadIRoot(current);
    }
    else if (kind === "rootRef" || kind === "rootWeak")
    {
      const value = this._ReadIRootClass();
      if (value && type.className)
      {
        const Declared = typeof type.className === "function" ? type.className : CjsSchema.getConstructor(type.className);
        if (!Declared || !QueryInterface(value, Declared)) this._ReportError("Incorrect type for member");
      }
      writeDictionaryValue(instance, field, value);
    }
    else if (kind === "structList") this._ReadStructureList(current, type);
    else if (kind === "list" || kind === "array") this._ReadList(current);
    else if (kind === "map") this._ReadDict(current);
    else if (ArrayBuffer.isView(current) && !(current instanceof DataView))
    {
      this._ReadFloatArray(current, current.length, type?.scalar === "float64");
    }
    else writeDictionaryValue(instance, field, this._ReadDeclaredScalar(kind));
    return true;
  }

  /** Bridges the existing base's public virtual to the protected donor method. */
  ReadBinaryBlock(instance, propertyName) { this._ReadBinaryBlock(instance, propertyName); }

  /** Selects the C++ primitive overload from the declared schema kind, never the incoming value. */
  _ReadDeclaredScalar(kind)
  {
    switch (kind)
    {
      case "int8": return this._ReadValue__Int8();
      case "uint8": return this._ReadValue__UInt8();
      case "int16": return this._ReadValue__Int16();
      case "uint16": return this._ReadValue__UInt16();
      case "int32": case "enum": return this._ReadValue__Int32();
      case "uint32": return this._ReadValue__UInt32();
      case "int64": return this._ReadValue__Int64();
      case "uint64": return this._ReadValue__UInt64();
      case "boolean": return this._ReadValue__Bool();
      case "float32": return this._ReadValue__Float();
      case "float64": return this._ReadValue__Double();
      case "string": case "path": case "expression": return this._ReadString();
      case "wstring": case "wpath": return this._ReadWString();
      default: this._ReportError(`Unsupported declared member type '${kind}'`);
    }
  }

  /** atoi's decimal prefix, with explicit native signed 32-bit storage. */

  @meta.adapted
  _ReadValue__Int32() { return Number(BigInt.asIntN(32, Decimal(this._ReadScalar()))); }

  /** Windows strtoul's 32-bit saturation and unsigned sign conversion. */

  @meta.adapted
  _ReadValue__UInt32() { return Number(Unsigned(this._ReadScalar(), 32)); }

  /** Native atoi followed by uint16 storage conversion. */

  @meta.adapted
  _ReadValue__UInt16() { return this._ReadValue__Int32() & 65535; }

  /** Native atoi followed by uint8 storage conversion. */

  @meta.adapted
  _ReadValue__UInt8() { return this._ReadValue__Int32() & 255; }

  /** Native atoi followed by int16 storage conversion. */

  @meta.adapted
  _ReadValue__Int16() { return (this._ReadValue__Int32() << 16) >> 16; }

  /** Native atoi followed by int8 storage conversion. */

  @meta.adapted
  _ReadValue__Int8() { return (this._ReadValue__Int32() << 24) >> 24; }

  /** Carbon treats boolean scalar text as atoi != 0, not YAML true/false. */

  @meta.implemented
  _ReadValue__Bool() { return this._ReadValue__Int32() !== 0; }

  /** BigInt retains native signed 64-bit precision; strtoll overflow saturates. */

  @meta.adapted
  _ReadValue__Int64()
  {
    const value = Decimal(this._ReadScalar());
    return value < -(1n << 63n) ? -(1n << 63n) : value > (1n << 63n) - 1n ? (1n << 63n) - 1n : value;
  }

  /** BigInt retains native unsigned 64-bit precision. */

  @meta.adapted
  _ReadValue__UInt64() { return Unsigned(this._ReadScalar(), 64); }

  /** C locale atof decimal prefixes and nonfinite spellings, using JS binary64. */

  @meta.adapted
  _ReadValue__Double() { return NativeDouble(this._ReadScalar()); }

  /** Rounds at the native float assignment. */

  @meta.adapted
  _ReadValue__Float() { return Math.fround(this._ReadValue__Double()); }

  /** Native shared-string output is a garbage-collected JS string. */

  @meta.adapted
  _ReadValue__BlueSharedString() { return this._ReadString(); }

  /** Native output storage is supplied by the caller. */

  @meta.adapted
  _ReadValue__Vector4(value) { this._ReadFloatArray(value, 4); }

  /**
   * Returns native half bits. BlueStructureList.cpp:559-651's conversion is
   * inlined because its class/helper is not ported. Its 0x7fff nonfinite
   * spelling and subnormal rounding are intentionally not num.toHalfFloat's.
   */

  @meta.adapted
  _ReadFloat16()
  {
    const value = this._ReadValue__Float();
    const sign = value < 0 || Object.is(value, -0) ? 0x8000 : 0;
    if (!Number.isFinite(value)) return sign | 0x7fff;
    if (value === 0) return sign;
    let tmp = Math.abs(value), exp = 0;
    while (tmp < 1024) { tmp = Math.fround(tmp * 2); --exp; }
    while (tmp >= 2048) { tmp = Math.fround(tmp / 2); ++exp; }
    exp += 25;
    const originalExp = exp;
    let mantissa = Math.trunc(tmp);
    const fraction = Math.fround(tmp - mantissa);
    if (fraction > 0.5 || (fraction === 0.5 && (mantissa & 1))) ++mantissa;
    if (mantissa === 2048) { mantissa = 1024; ++exp; }
    let result;
    if (exp > 31) result = 0x7fff;
    else if (exp <= 0)
    {
      if (exp < -11) return sign;
      mantissa = Math.trunc(Math.fround(tmp * 8192)) >>> (1 - originalExp);
      mantissa = (mantissa - (~(mantissa >>> 13) & 1)) >>> 0;
      mantissa >>>= 12;
      const rounding = mantissa & 1;
      result = (mantissa >>> 1) + rounding;
    }
    else result = (exp << 10) | (mantissa & 1023);
    return (result | sign) & 65535;
  }

  /** Reads scalar strings only in native plain or quoted styles. */

  @meta.adapted
  _ReadString()
  {
    const text = this._ReadScalar();
    const style = this._event.node?.type;
    return style === "BLOCK_LITERAL" || style === "BLOCK_FOLDED" ? null : text;
  }

  /** JS strings already represent wide text; native allocation is garbage-collected. */

  @meta.adapted
  _ReadWString() { return this._ReadString(); }

  /**
   * CE-212: fills existing float storage; shorter sequences leave the tail unchanged.
   * Adapted: explicit float64 schema storage keeps its declared precision.
   */

  @meta.adapted
  _ReadFloatArray(values, count, doublePrecision = false)
  {
    this._GetNextEvent();
    if (this._event.type === "SEQUENCE_START")
    {
      this._GetNextEvent();
      for (let i = 0; i < count && this._event.type === "SCALAR"; ++i)
      {
        const value = NativeDouble(ScalarText(this._event.node));
        values[i] = doublePrecision ? value : Math.fround(value);
        this._GetNextEvent();
      }
      this._VerifyEvent("SEQUENCE_END");
      return;
    }
    if (count === 3 || count === 4)
    {
      const name = this._ReadClassType();
      const names = count === 3 && name === "TriVector" ? ["x", "y", "z"]
        : count === 4 && name === "TriColor" ? ["r", "g", "b", "a"]
        : count === 4 && name === "TriQuaternion" ? ["x", "y", "z", "w"] : null;
      if (!names) this._ReportError(`Expected a float sequence of ${count} floats or its legacy class`);
      values.fill(0);
      if (name === "TriQuaternion") values[3] = 1;
      for (let member = this._ReadMemberName(); member !== null; member = this._ReadMemberName())
      {
        const value = this._ReadValue__Float();
        const index = names.indexOf(member);
        if (index !== -1) values[index] = value;
      }
    }
    // CE-212: other lengths consume the event and do nothing (YamlReader.cpp:691-814).
  }

  /** Reads the native custom-persistence buffer, preserving Base64's permissive lookup. */

  @meta.adapted
  _ReadBinaryBlock(persist, name)
  {
    const text = this._ReadScalar();
    const buffer = persist.AllocateReadBuffer(name, text.length);
    // Native AllocateReadBuffer returns uint8_t*. Owners may expose wider JS
    // typed storage, so decode through its byte view without replacing it.
    const bytes = ArrayBuffer.isView(buffer)
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
    // Fixes CE-211: Carbon reads past the end; ours throws (Base64.cpp:92-100).
    if (text.length % 4) this._ReportError("Incomplete Base64 quartet would read outside the native input buffer");
    let size = 0;
    for (let index = 0; index < text.length; index += 4)
    {
      const a = Base64Digit(text[index]), b = Base64Digit(text[index + 1]);
      const c = Base64Digit(text[index + 2]), d = Base64Digit(text[index + 3]);
      bytes[size++] = ((a & 63) << 2) | ((b & 48) >> 4);
      if (c === 99) break;
      bytes[size++] = ((b & 15) << 4) | ((c & 60) >> 2);
      if (d === 99) break;
      bytes[size++] = ((c & 3) << 6) | (d & 63);
    }
    persist.SetBufferAndSize(name, buffer, size);
  }

  /** Native vector framing; unexpected mappings fail, other events are pushed back. */

  @meta.implemented
  _ReadVectorBegin()
  {
    this._GetNextEvent();
    if (this._event.type === "SEQUENCE_START") return true;
    if (this._event.type === "MAPPING_START") this._ReportError("Expected to read list of objects but got an object instead!");
    this._PushEvent();
    return false;
  }

  /** Looks ahead one event; items are pushed back for their typed reader. */

  @meta.implemented
  _ReadVectorNext()
  {
    this._GetNextEvent();
    if (this._event.type === "SEQUENCE_END") return false;
    this._PushEvent();
    return true;
  }

  /** Preserves native non-consuming vector-end behavior. */

  @meta.implemented
  _ReadVectorEnd()
  {
    if (this._event.type === "SEQUENCE_END") return true;
    this._PushEvent();
    return false;
  }

  /** Native IList population; ordinary object arrays adapt the same ownership rules. */

  @meta.adapted
  _ReadList(list)
  {
    const nativeList = QueryInterface(list, IList);
    if (nativeList) nativeList.Remove(-1);
    else list.length = 0;
    if (!this._ReadVectorBegin()) this._ReportError("Error reading list");
    const info = {};
    if (nativeList) { nativeList.GetInfo(info); nativeList.SetNotify(null); }
    while (this._ReadVectorNext())
    {
      const item = this._ReadIRootClass();
      if (item)
      {
        if (nativeList) nativeList.Insert(-1, item);
        else list.push(item);
      }
    }
    this._ReadVectorEnd();
    if (nativeList)
    {
      nativeList.SetNotify(info.notify);
      if (info.notify) info.notify.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, list);
    }
  }

  /** Alternating string keys and object values; Map replaces native IBlueDict storage. */

  @meta.adapted
  _ReadDict(dict)
  {
    if (!this._ReadVectorBegin()) this._ReportError("Error reading dict");
    while (this._ReadVectorNext())
    {
      const key = this._ReadString();
      const value = this._ReadIRootClass();
      if (value) dict.set(key, value);
    }
    this._ReadVectorEnd();
  }

  /** Checks native wire layouts; schema records replace native byte-offset writes. */

  @meta.adapted
  _ReadStructureList(list, type)
  {
    const itemType = type.itemType;
    const name = type.className ?? (typeof itemType === "string" ? itemType : itemType?.className);
    const Constructor = typeof name === "function" ? name : CjsSchema.getConstructor(name);
    const definition = CjsSchema.getSchema(Constructor).structureDefinition;
    if (!definition) this._ReportError("Structure list has no declared BlueStructureDefinition");
    this._GetNextEvent();
    this._VerifyEvent("MAPPING_START");
    if (this._ReadMemberName() !== "structure") this._ReportError("Expected 'structure'");
    if (!this._ReadVectorBegin()) this._ReportError("Error reading structure list");
    const wire = [];
    while (this._ReadVectorNext())
    {
      this._ReadVectorBegin();
      this._ReadVectorNext();
      const member = { name: this._ReadString(), dataType: 0, offset: 0 };
      this._ReadVectorNext();
      member.dataType = this._ReadValue__Int32();
      this._ReadVectorNext();
      member.offset = this._ReadValue__Int32();
      this._ReadVectorNext();
      this._ReadVectorEnd();
      wire.push(member);
    }
    this._ReadVectorEnd();
    if (this._ReadMemberName() !== "items") this._ReportError("Expected 'items'");
    if (!this._ReadVectorBegin()) this._ReportError("Error reading structure list");
    const matches = wire.length === definition.members.length && wire.every((member, index) =>
    {
      const native = definition.members[index];
      return member.name === native.name && member.offset === native.offset && member.dataType === StructureDataType(native.dataType);
    });
    if (!matches) CcpLog.CCP_LOGWARN("Structure list definition in the .red file does not match run-time definition. Skipping structure list.");
    while (this._ReadVectorNext())
    {
      this._ReadVectorBegin();
      this._ReadVectorNext();
      const item = matches ? new Constructor() : null;
      this._ReadStructureListItem(wire, item);
      if (item) list.push(item);
      this._ReadVectorNext();
      this._ReadVectorEnd();
    }
    this._ReadVectorEnd();
    this._GetNextEvent();
    this._VerifyEvent("MAPPING_END");
  }

  /** Type codes choose readers; typed vectors preserve numeric storage while skipping or writing rows. */

  @meta.adapted
  _ReadStructureListItem(definition, item)
  {
    for (const member of definition)
    {
      const code = member.dataType;
      const count = ((code & 0x1e0) >> 5) + 1;
      const scalar = code & 7, unsigned = (code & 8) !== 0;
      if (scalar === 6)
      {
        const vectors = new Float32Array(count * 4);
        if (count > 1) { this._ReadVectorBegin(); this._ReadVectorNext(); }
        for (let i = 0; i < count; ++i) this._ReadValue__Vector4(vectors.subarray(i * 4, i * 4 + 4));
        if (count > 1) { this._ReadVectorNext(); this._ReadVectorEnd(); }
        if (item) item[member.name] = vectors;
        continue;
      }
      let read, Storage;
      switch (scalar)
      {
        case 0: read = unsigned ? "_ReadValue__UInt8" : "_ReadValue__Int8"; Storage = unsigned ? Uint8Array : Int8Array; break;
        case 1: read = unsigned ? "_ReadValue__UInt16" : "_ReadValue__Int16"; Storage = unsigned ? Uint16Array : Int16Array; break;
        case 2: read = unsigned ? "_ReadValue__UInt32" : "_ReadValue__Int32"; Storage = unsigned ? Uint32Array : Int32Array; break;
        case 3: read = "_ReadFloat16"; Storage = Uint16Array; break;
        case 4: read = "_ReadValue__Float"; Storage = Float32Array; break;
        case 5: read = "_ReadValue__BlueSharedString"; break;
        case 7: read = "_ReadValue__Bool"; Storage = Uint8Array; break;
        default: this._ReportError("Unsupported type for structured lists");
      }
      if (count > 1) { this._ReadVectorBegin(); this._ReadVectorNext(); }
      const vector = count > 1 ? (Storage ? new Storage(count) : new Array(count)) : null;
      let value;
      for (let index = 0; index < count; ++index)
      {
        value = this[read]();
        if (vector) vector[index] = value;
      }
      if (count > 1) { this._ReadVectorNext(); this._ReadVectorEnd(); }
      if (item) item[member.name] = vector ?? value;
    }
  }
}

/** CE-209: UTF-8 anchor bytes truncate as memcpy into uint64 (YamlReader.cpp:929-948). */
function AnchorId(anchor)
{
  const bytes = new TextEncoder().encode(anchor ?? "");
  let result = 0n;
  for (let i = 0; i < Math.min(8, bytes.length); ++i) result |= BigInt(bytes[i]) << BigInt(i * 8);
  return result;
}

/** Libyaml's char* readers stop at the first embedded NUL. */
function ScalarText(node) { return String(node?.value ?? "").split("\0", 1)[0]; }

/** Decimal prefix conversion used by native atoi/strto*; no YAML number inference. */
function Decimal(text)
{
  const match = /^[\t\n\v\f\r ]*([+-]?\d+)/.exec(text);
  return match ? BigInt(match[1]) : 0n;
}

/** Windows unsigned strto* saturation followed by native unsigned negation. */
function Unsigned(text, bits)
{
  const value = Decimal(text), max = (1n << BigInt(bits)) - 1n;
  const magnitude = value < 0n ? -value : value;
  return magnitude > max ? max : BigInt.asUintN(bits, value);
}

/** C-locale atof accepts decimal prefixes, infinity and nan; invalid input becomes zero. */
function NativeDouble(text)
{
  if (/^[\t\n\v\f\r ]*[+-]?inf/i.test(text)) return /^\s*-/.test(text) ? -Infinity : Infinity;
  if (/^[\t\n\v\f\r ]*[+-]?nan/i.test(text)) return NaN;
  const value = Number.parseFloat(text);
  return Number.isNaN(value) ? 0 : value;
}

/** Base64.cpp's table maps invalid bytes to zero and padding to 99. */
function Base64Digit(character)
{
  if (character === "=") return 99;
  const index = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(character);
  return index < 0 ? 0 : index;
}

/** Schema-supported subset of IBlueStructureList.h's numeric type codes. */
function StructureDataType(name)
{
  const split = name.lastIndexOf("_");
  const base = { BYTE: 0, SHORT: 1, INT32: 2, FLOAT16: 3, FLOAT32: 4, SHAREDSTRING: 5, BOOL8: 7, UBYTE: 8, USHORT: 9, UINT32: 10 }[name.slice(0, split)];
  return base === undefined ? -1 : base | ((Number(name.slice(split + 1)) - 1) << 5);
}

/** Buffers a host synchronous stream without exposing a second Red decoding path. */
function ReadStream(stream)
{
  const buffer = new Uint8Array(16384);
  const decoder = new TextDecoder();
  let text = "";
  for (;;)
  {
    const count = stream.Read(buffer, buffer.length);
    if (!Number.isInteger(count) || count < 0 || count > buffer.length) throw new IRootReaderException("Invalid stream read count");
    if (!count) break;
    text += decoder.decode(buffer.subarray(0, count), { stream: true });
  }
  return text + decoder.decode();
}

/** Native QueryInterface uses the exposed IID table, not C++ dynamic_cast lineage. */
function QueryInterface(value, Interface)
{
  return value && mappedInterfaces(value.constructor).has(Interface) ? value : null;
}
