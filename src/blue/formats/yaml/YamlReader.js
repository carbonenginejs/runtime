// Source: blue/src/YamlReader.h
// Source: blue/src/YamlReader.cpp
// Source: blue/src/YamlReader_Blue.cpp
//
// Carbon's YamlReader on Carbon's stream base (IRootReaderBase), step 7 of the Blue
// plan: members are read by the base's handlers, so a type reads as it does in Black.
// The reader it replaced is in blue/dropped.
import { exposure as be } from "#be";
import { parseAllDocuments, isMap, isSeq, isScalar, isAlias } from "yaml";
import { CjsSchema, type } from "#schema";
import { IRootReader } from "../../format/IRootReader.js";
import { IBlueObjectBuilder } from "../../interfaces/IBlueObjectBuilder.js";
import { ICacheable } from "../../interfaces/ICacheable.js";
import { IRootReaderBase } from "../black/IRootReaderBase.js";
import { getWrapperLayout } from "../black/blueMathWrappers.js";
import { InvalidAttributeException } from "../../format/InvalidAttributeException.js";
import { ClassInfo } from "../../base/ClassInfo.js";
import { IRootReaderException } from "../../format/IRootReaderException.js";
import { IBlueObjectProxy } from "../../interfaces/IBlueObjectProxy.js";
import { IInitialize } from "../../exposure/IInitialize.js";
import { IList } from "../../exposure/IList.js";
import { BeObjectMetadata } from "../../services/BlueObjectMetadata.js";
import { BLUE_OBJECT_METADATA_KEY } from "../../interfaces/IBlueObjectMetadata.js";
import { BeClasses } from "../../exposure/classes/registry.js";
import { cast, mappedInterfaces } from "../../compose/interface.js";
import { BLUELISTEVENT } from "#consts/blue";
import * as CcpLog from "../../../global/logging/ccpLog.js";

/**
 * Carbon's class-driven Red reader. Adapted: the yaml package supplies nodes,
 * flattened into the same event ordering libyaml supplies, without toJS or
 * alias expansion. Scalar text is converted by the declared member type.
 * Object values are exported separately by the Blue values service.
 */

export class YamlReader extends IRootReaderBase
{
  _event = null;

  _eventList = [];

  _currentEvent = 0;

  _objectMarkers = [];

  _anchorClassMap = new Map();

  _hasPushedEvent = false;

  _pushedEvent = null;

  _filename = "";

  _errorMessage = "";

  _isStrict = false;

  _doInitialize = true;

  _timeSlice = Math.fround(0.005);

  _allowYield = false;

  _dataStream = null;

  _cached = false;

  _nativePersistence = true;

  /**
   * Reads an object, returning null on a reader error. Adapted: host Read
   * fills bytes synchronously; UTF-8 and yaml nodes replace libyaml callbacks.
   *
   * @adapted Reads an object, returning null on a reader error. Adapted: host Read fills bytes synchronously; UTF-8 and yaml nodes replace libyaml callbacks
   * @param {object} stream Stream implementing Read(buffer, size).
   * @returns {object|null} Last root mapping, or null on a reader failure.
   */

  ReadFromStream(stream)
  {
    this._loggedNonFinite = false;
    // CE-213: Carbon keeps its anchor map between streams (YamlReader.cpp:107-155).
    this._dataStream = stream;
    this._cached = false;
    let result = null;
    try
    {
      this._LoadEvents(YamlReader._ReadStream(stream));
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
      if (cast(error, IRootReaderException) === null) throw error;
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
   *
   * @adapted Caches parser events for repeated construction and lazy proxies. Adapted: nodes are parsed once; event indices replace native list iterators
   * @param {object} stream Stream implementing Read(buffer, size).
   * @returns {boolean} Whether a root mapping was cached.
   */

  ReadForCachingFromStream(stream)
  {
    this._loggedNonFinite = false;
    this._ClearCachedEvents();
    this._objectMarkers.length = 0;
    try
    {
      this._LoadEvents(YamlReader._ReadStream(stream));
      const marker = this._eventList.findIndex(event => event.type === "MAPPING_START");
      if (marker === -1) return false;
      this._objectMarkers.push(marker);
      this._cached = true;
      return true;
    }
    catch (error)
    {
      if (cast(error, IRootReaderException) === null) throw error;
      this._errorMessage = error.message;
      this._ClearCachedEvents();
      return false;
    }
    finally { this._event = null; }
  }

  /**
   * Reads UTF-8 text; the native output pointer is returned, failures throw.
   *
   * @adapted Reads UTF-8 text; the native output pointer is returned, failures throw
   */

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

  /**
   * Returns the output pointer; a failed native Result becomes a reader exception.
   *
   * @adapted Returns the output pointer; a failed native Result becomes a reader exception
   */

  CreateObjectFromStream(stream)
  {
    const result = this.ReadFromStream(stream);
    if (result) return result;
    throw new IRootReaderException(this.GetErrorMessage() || "Failed to create an object from YAML");
  }

  /**
   * The synchronous native BePaths stream API is not ported; no host filesystem is invented.
   *
   * @notImplemented
   */

  CreateObjectFromFile(_filename)
  {
    throw new Error("YamlReader.CreateObjectFromFile requires BePaths.GetStreamFromPathW.");
  }

  /**
   * Sets the filename included in reader diagnostics.
   *
   * @implemented
   */

  SetFileName(name) { this._filename = name; }

  /**
   * Controls mapped IInitialize completion after members have been read.
   *
   * @implemented
   */

  SetDoInitialize(value) { this._doInitialize = value; }

  /**
   * Stores the float32 slice; JavaScript has no synchronous Stackless tasklet yield.
   *
   * @adapted Stores the float32 slice; JavaScript has no synchronous Stackless tasklet yield
   */

  SetTimeSlice(value) { this._timeSlice = Math.max(0, Math.fround(value)); }

  /**
   * Returns the native string output parameter.
   *
   * @adapted Returns the native string output parameter
   */

  GetErrorMessage() { return this._errorMessage; }

  /**
   * Builds from an event marker. Garbage collection replaces native reference counting.
   *
   * @adapted Builds from an event marker. Garbage collection replaces native reference counting
   */

  CreateObject(objectMarker, callingProxy)
  {
    return this._CreateObjectHelper(objectMarker, callingProxy, false);
  }

  /**
   * Builds synchronously: JavaScript cannot yield a synchronous Stackless tasklet.
   *
   * @adapted Builds synchronously: JavaScript cannot yield a synchronous Stackless tasklet
   */

  CreateObjectWithYield(objectMarker, callingProxy)
  {
    return this._CreateObjectHelper(objectMarker, callingProxy, true);
  }

  /**
   * Native reports that its rough event-memory estimate is available.
   *
   * @implemented
   */

  IsMemoryUsageKnown() { return true; }

  /**
   * Preserves Carbon's rough estimate; this is not a JavaScript heap measurement.
   *
   * @adapted Preserves Carbon's rough estimate; this is not a JavaScript heap measurement
   */

  GetMemoryUsage() { return 128 + this._eventList.length * 64; }

  /**
   * Cached event indices replace native iterators; Stackless scheduling is unavailable.
   *
   * @adapted Cached event indices replace native iterators; Stackless scheduling is unavailable
   */

  _CreateObjectHelper(objectMarker, _callingProxy, _yieldBehavior)
  {
    if (!this._cached || !Number.isInteger(objectMarker) || objectMarker < 0 || objectMarker >= this._objectMarkers.length)
      this._ReportError("Invalid object marker");
    if (this._allowYield) this._ReportError("Object creation is already active");
    this._allowYield = true;
    this._currentEvent = this._objectMarkers[objectMarker];
    this._hasPushedEvent = false;
    try { return this.ReadIRootClass(); }
    catch (error)
    {
      if (cast(error, IRootReaderException) === null) throw error;
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

  /**
   * Uses the current node's source location instead of libyaml's parser mark.
   *
   * @adapted Uses the current node's source location instead of libyaml's parser mark
   */

  _ConstructMessage(message)
  {
    let prefix = this._filename;
    if (this._event?.line) prefix += `${prefix ? ", line " : "Line "}${this._event.line}`;
    return `${prefix ? prefix + ": " : ""}${message}`;
  }

  /**
   * Throws the native reader exception with filename and line context.
   *
   * @adapted Throws the native reader exception with filename and line context
   */

  _ReportError(message) { throw new IRootReaderException(this._ConstructMessage(message)); }

  /**
   * Escalates warnings only in native strict mode.
   *
   * @implemented
   */

  _ReportWarning(message)
  {
    if (this._isStrict) this._ReportError(message);
    CcpLog.CCP_LOGWARN(this._ConstructMessage(message));
  }

  /**
   * Validates the event currently being consumed.
   *
   * @adapted Validates the event currently being consumed
   */

  _VerifyEvent(type)
  {
    if (this._event?.type !== type) this._ReportError(`Expected event ${type} but got ${this._event?.type ?? "NO_EVENT"}`);
    return true;
  }

  /**
   * Advances the buffered node events, honoring Carbon's single-event pushback.
   *
   * @adapted Advances the buffered node events, honoring Carbon's single-event pushback
   */

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

  /**
   * Retains one event for the next read, as native PushEvent does.
   *
   * @implemented
   */

  _PushEvent()
  {
    if (this._hasPushedEvent) this._ReportError("YAML event already pushed");
    this._pushedEvent = this._event;
    this._hasPushedEvent = true;
  }

  /**
   * Buffered parsing has already checked syntax; exhaustion is the end event.
   *
   * @adapted Buffered parsing has already checked syntax; exhaustion is the end event
   */

  _IsParserExhausted() { return this._event?.type === "STREAM_END"; }

  /**
   * Releases native cached-event storage through JavaScript garbage collection.
   *
   * @adapted Releases native cached-event storage through JavaScript garbage collection
   */

  _ClearCachedEvents()
  {
    this._eventList = [];
    this._currentEvent = 0;
    this._hasPushedEvent = false;
    this._pushedEvent = null;
    this._cached = false;
  }

  /**
   * Consumes a complete nested mapping or sequence, preserving native cursor behavior.
   *
   * @implemented
   */

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

  /**
   * Skips the remainder of the current native mapping.
   *
   * @implemented
   */

  _ParseUntilMatchingMappingEnd() { this._ParseUntilMatchingEnd("MAPPING_START", "MAPPING_END"); }

  /**
   * Skips the remainder of the current native sequence.
   *
   * @implemented
   */

  _ParseUntilMatchingSequenceEnd() { this._ParseUntilMatchingEnd("SEQUENCE_START", "SEQUENCE_END"); }

  /**
   * Consumes one scalar, alias or entire collection.
   *
   * @implemented
   */

  _SkipValue()
  {
    this._GetNextEvent();
    if (this._event.type === "MAPPING_START") this._ParseUntilMatchingMappingEnd();
    else if (this._event.type === "SEQUENCE_START") this._ParseUntilMatchingSequenceEnd();
  }

  /**
   * Returns scalar text, never YAML's inferred boolean/numeric value.
   *
   * @adapted Returns scalar text, never YAML's inferred boolean/numeric value
   */

  _ReadScalar()
  {
    this._GetNextEvent();
    this._VerifyEvent("SCALAR");
    return YamlReader._ScalarText(this._event.node);
  }

  /**
   * Returns null at a mapping end; native string output becomes the result.
   *
   * @adapted Returns null at a mapping end; native string output becomes the result
   */

  _ReadMemberName()
  {
    this._GetNextEvent();
    return this._event.type === "SCALAR" ? YamlReader._ScalarText(this._event.node) : null;
  }

  /**
   * Reads the mandatory first type key; C++'s output pointer becomes the return value.
   *
   * @adapted Reads the mandatory first type key; C++'s output pointer becomes the return value
   */

  _ReadClassType() { return this._ReadScalar() === "type" ? this._ReadScalar() : null; }

  /**
   * Exact Blue registration replaces native CLSID lookup and factory resolution.
   *
   * @adapted Exact Blue registration replaces native CLSID lookup and factory resolution
   */

  _ReadClsid()
  {
    const name = this._ReadClassType();
    if (name === null) this._ReportError("Type of object is not specified");
    const registration = BeClasses.GetClassRegistration(name);
    if (!registration) this._ReportWarning(`Type '${name}' not found in Blue class registry`);
    return registration;
  }

  /**
   * Preserves the native eight-byte identifier, using BigInt instead of memcpy.
   *
   * @adapted Preserves the native eight-byte identifier, using BigInt instead of memcpy
   */

  _ExtractAnchorFromMappingStart() { return YamlReader._AnchorId(this._event.node?.anchor); }

  /**
   * Creates directly through the registered factory; no values/hydration adapter intervenes.
   *
   * @adapted Creates directly through the registered factory; no values/hydration adapter intervenes
   */

  _ReadIRootClassInternal()
  {
    const anchor = this._ExtractAnchorFromMappingStart();
    const registration = this._ReadClsid();
    if (!registration) { this._ParseUntilMatchingMappingEnd(); return null; }
    const instance = registration.createFn();
    if (!instance) this._ReportError(`Factory '${registration.name}' returned no object`);
    const proxy = YamlReader._QueryInterface(instance, IBlueObjectProxy);
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

    const initialize = YamlReader._QueryInterface(instance, IInitialize);
    if (this._doInitialize && initialize) initialize.Initialize();
    // CE-210: anchors become visible only AFTER completion (YamlReader.cpp:1033-1036).
    if (anchor) this._anchorClassMap.set(anchor, instance);
    return instance;
  }

  /**
   * Reads null, a class mapping or an already completed object's alias.
   *
   * @adapted Reads null, a class mapping or an already completed object's alias
   */

  ReadIRootClass()
  {
    this._GetNextEvent();
    if (this._event.type === "MAPPING_START") return this._ReadIRootClassInternal();
    if (this._event.type === "SCALAR")
    {
      const value = YamlReader._ScalarText(this._event.node);
      if (value !== "null" && value !== "~") this._ReportError(`Expected 'null' or '~' but got: ${value}`);
      return null;
    }
    if (this._event.type === "ALIAS")
    {
      const name = this._event.node.source;
      const id = YamlReader._AnchorId(name);
      if (!this._anchorClassMap.has(id)) this._ReportError(`Reference to anchor '${name}' that hasn't been previously defined!`);
      const instance = this._anchorClassMap.get(id);
      if (!instance) this._ReportWarning(`Reference to anchor '${name}' that hasn't been previously set - referencing inside a proxy?`);
      return instance;
    }
    this._ReportError("Expected description of class (SCALAR, MAPPING, or ALIAS) but got other event");
  }

  /**
   * Fills an existing embedded object only when its exact registered type matches.
   *
   * @adapted Fills an existing embedded object only when its exact registered type matches
   */

  ReadIRoot(instance)
  {
    this._GetNextEvent();
    this._VerifyEvent("MAPPING_START");
    const registration = this._ReadClsid();
    if (!registration) { this._ParseUntilMatchingMappingEnd(); return; }
    if (instance.constructor !== registration.type)
    {
      this._ReportWarning(`Expected type '${ClassInfo.exposeToBlue(instance.constructor).classId}' but got '${registration.name}' - skipping it`);
      this._ParseUntilMatchingMappingEnd();
      return;
    }
    this._ReadMembers(instance);
    const initialize = YamlReader._QueryInterface(instance, IInitialize);
    if (this._doInitialize && initialize) initialize.Initialize();
  }

  /**
   * Reads metadata only in native first-member position; preserves native exception recovery.
   *
   * @adapted Reads metadata only in native first-member position; preserves native exception recovery
   */

  _ReadMembers(instance)
  {
    // instance->ClassType(), as BlackReader.CreateObject explains.
    const definition = ClassInfo.exposeToBlue(instance.constructor);
    const notify = !definition.isInitialize && definition.isNotify ? instance : null;
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
      try { this.HandleAttribute(name, instance, definition, notify); }
      catch (error)
      {
        if (cast(error, InvalidAttributeException) === null) throw error;
        // CE-208: warns but does NOT call SkipValue (YamlReader.cpp:1369-1376).
        this._ReportWarning(`Error handling attribute '${name}' - skipping it`);
      }
    }
  }

  /**
   * JS objects are weakly addressable, so every constructed owner can have metadata.
   *
   * @adapted JS objects are weakly addressable, so every constructed owner can have metadata
   */

  _ReadMetadata(instance)
  {
    this._GetNextEvent();
    this._VerifyEvent("MAPPING_START");
    this._GetNextEvent();
    while (this._event.type !== "MAPPING_END")
    {
      this._VerifyEvent("SCALAR");
      const key = YamlReader._ScalarText(this._event.node);
      BeObjectMetadata.Set(instance, key, this._ReadScalar());
      this._GetNextEvent();
    }
  }

  /**
   * atoi's decimal prefix, with explicit native signed 32-bit storage.
   *
   * @adapted atoi's decimal prefix, with explicit native signed 32-bit storage
   */

  ReadValue__Int32() { return Number(BigInt.asIntN(32, YamlReader._Decimal(this._ReadScalar()))); }

  /**
   * Windows strtoul's 32-bit saturation and unsigned sign conversion.
   *
   * @adapted Windows strtoul's 32-bit saturation and unsigned sign conversion
   */

  ReadValue__UInt32() { return Number(YamlReader._Unsigned(this._ReadScalar(), 32)); }

  /**
   * Native atoi followed by uint16 storage conversion.
   *
   * @adapted Native atoi followed by uint16 storage conversion
   */

  ReadValue__UInt16() { return this.ReadValue__Int32() & 65535; }

  /**
   * Native atoi followed by uint8 storage conversion.
   *
   * @adapted Native atoi followed by uint8 storage conversion
   */

  ReadValue__UInt8() { return this.ReadValue__Int32() & 255; }

  /**
   * Native atoi followed by int16 storage conversion.
   *
   * @adapted Native atoi followed by int16 storage conversion
   */

  ReadValue__Int16() { return (this.ReadValue__Int32() << 16) >> 16; }

  /**
   * Native atoi followed by int8 storage conversion.
   *
   * @adapted Native atoi followed by int8 storage conversion
   */

  ReadValue__Int8() { return (this.ReadValue__Int32() << 24) >> 24; }

  /**
   * Carbon treats boolean scalar text as atoi != 0, not YAML true/false.
   *
   * @implemented
   */

  ReadValue__Bool() { return this.ReadValue__Int32() !== 0; }

  /**
   * BigInt retains native signed 64-bit precision; strtoll overflow saturates.
   *
   * @adapted BigInt retains native signed 64-bit precision; strtoll overflow saturates
   */

  ReadValue__Int64()
  {
    const value = YamlReader._Decimal(this._ReadScalar());
    return value < -(1n << 63n) ? -(1n << 63n) : value > (1n << 63n) - 1n ? (1n << 63n) - 1n : value;
  }

  /**
   * BigInt retains native unsigned 64-bit precision.
   *
   * @adapted BigInt retains native unsigned 64-bit precision
   */

  ReadValue__UInt64() { return YamlReader._Unsigned(this._ReadScalar(), 64); }

  /**
   * C locale atof decimal prefixes and nonfinite spellings, using JS binary64.
   *
   * @adapted C locale atof decimal prefixes and nonfinite spellings, using JS binary64
   */

  ReadValue__Double() { return YamlReader._NativeDouble(this._ReadScalar()); }

  /**
   * Rounds at the native float assignment.
   *
   * @adapted Rounds at the native float assignment
   */

  ReadValue__Float() { return Math.fround(this.ReadValue__Double()); }

  /**
   * Native shared-string output is a garbage-collected JS string.
   *
   * @adapted Native shared-string output is a garbage-collected JS string
   */

  _ReadValue__BlueSharedString() { return this.ReadString(); }

  /**
   * Native output storage is supplied by the caller.
   *
   * @adapted Native output storage is supplied by the caller
   */

  _ReadValue__Vector4(value) { this.ReadFloatArray(value, 4); }

  /**
   * Returns native half bits. BlueStructureList.cpp:559-651's conversion is
   * inlined because its class/helper is not ported. Its 0x7fff nonfinite
   * spelling and subnormal rounding are intentionally not num.toHalfFloat's.
   *
   * @adapted Returns native half bits. BlueStructureList.cpp:559-651's conversion is inlined because its class/helper is not ported. Its 0x7fff nonfinite spelling and subnormal roundi
   */

  _ReadFloat16()
  {
    const value = this.ReadValue__Float();
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

  /**
   * Reads scalar strings only in native plain or quoted styles.
   *
   * @adapted Reads scalar strings only in native plain or quoted styles
   */

  ReadString()
  {
    const text = this._ReadScalar();
    const style = this._event.node?.type;
    return style === "BLOCK_LITERAL" || style === "BLOCK_FOLDED" ? null : text;
  }

  /**
   * JS strings already represent wide text; native allocation is garbage-collected.
   *
   * @adapted JS strings already represent wide text; native allocation is garbage-collected
   */

  ReadWString() { return this.ReadString(); }

  /**
   * CE-212: fills existing float storage; shorter sequences leave the tail unchanged.
   *
   * @adapted CE-212: fills existing float storage; shorter sequences leave the tail unchanged
   */

  ReadFloatArray(values, count)
  {
    this._GetNextEvent();
    if (this._event.type === "SEQUENCE_START")
    {
      this._GetNextEvent();
      for (let i = 0; i < count && this._event.type === "SCALAR"; ++i)
      {
        const value = YamlReader._NativeDouble(YamlReader._ScalarText(this._event.node));
        values[i] = Math.fround(value);
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
        const value = this.ReadValue__Float();
        const index = names.indexOf(member);
        if (index !== -1) values[index] = value;
      }
    }
    // CE-212: other lengths consume the event and do nothing (YamlReader.cpp:691-814).
  }

  /**
   * Reads the native custom-persistence buffer, preserving Base64's permissive lookup.
   *
   * @adapted Reads the native custom-persistence buffer, preserving Base64's permissive lookup
   */

  ReadBinaryBlock(persist, name)
  {
    const text = this._ReadScalar();
    const buffer = persist.AllocateReadBuffer(name, text.length);
    // Native AllocateReadBuffer returns uint8_t*. Owners may expose wider JS
    // typed storage, so decode through its byte view without replacing it.
    const bytes = ArrayBuffer.isView(buffer)
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) // alloc: byte view
      : new Uint8Array(buffer); // alloc: byte view
    // Fixes CE-211: Carbon reads past the end; ours throws (Base64.cpp:92-100).
    if (text.length % 4) this._ReportError("Incomplete Base64 quartet would read outside the native input buffer");
    let size = 0;
    for (let index = 0; index < text.length; index += 4)
    {
      const a = YamlReader._Base64Digit(text[index]), b = YamlReader._Base64Digit(text[index + 1]);
      const c = YamlReader._Base64Digit(text[index + 2]), d = YamlReader._Base64Digit(text[index + 3]);
      bytes[size++] = ((a & 63) << 2) | ((b & 48) >> 4);
      if (c === 99) break;
      bytes[size++] = ((b & 15) << 4) | ((c & 60) >> 2);
      if (d === 99) break;
      bytes[size++] = ((c & 3) << 6) | (d & 63);
    }
    persist.SetBufferAndSize(name, buffer, size);
  }

  /**
   * Native vector framing; unexpected mappings fail, other events are pushed back.
   *
   * @implemented
   */

  _ReadVectorBegin()
  {
    this._GetNextEvent();
    if (this._event.type === "SEQUENCE_START") return true;
    if (this._event.type === "MAPPING_START") this._ReportError("Expected to read list of objects but got an object instead!");
    this._PushEvent();
    return false;
  }

  /**
   * Looks ahead one event; items are pushed back for their typed reader.
   *
   * @implemented
   */

  _ReadVectorNext()
  {
    this._GetNextEvent();
    if (this._event.type === "SEQUENCE_END") return false;
    this._PushEvent();
    return true;
  }

  /**
   * Preserves native non-consuming vector-end behavior.
   *
   * @implemented
   */

  _ReadVectorEnd()
  {
    if (this._event.type === "SEQUENCE_END") return true;
    this._PushEvent();
    return false;
  }

  /**
   * Native IList population.
   *
   * @adapted Native IList population
   */

  ReadList(list)
  {
    list.Remove(-1);
    if (!this._ReadVectorBegin()) this._ReportError("Error reading list");
    const info = {};
    list.GetInfo(info);
    list.SetNotify(null);
    while (this._ReadVectorNext())
    {
      const item = this.ReadIRootClass();
      if (item) list.Insert(-1, item);
    }
    this._ReadVectorEnd();
    list.SetNotify(info.notify);
    if (info.notify) info.notify.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, list);
  }

  /**
   * A list member that holds a plain array, adapting the same ownership rules.
   *
   * @cjs Carbon's list members are all IList
   */

  ReadArray(holder, key, entry)
  {
    const list = holder[key];
    list.length = 0;
    if (!this._ReadVectorBegin()) this._ReportError("Error reading list");
    while (this._ReadVectorNext())
    {
      const item = this.ReadIRootClass();
      if (item) list.push(item);
    }
    this._ReadVectorEnd();
    if (entry.isProperty) holder[key] = list;
  }

  /**
   * Red has no sets: only members declared as Black sets arrive here.
   *
   * @notImplemented
   */

  ReadSet(holder, key, entry)
  {
    this._ReportError(`Unsupported declared member type 'set' for ${entry.name}`);
  }

  /**
   * A math member's array; the file holds a sequence.
   *
   * @cjs Carbon's member is a TriMatrix or similar object
   */

  ReadWrapper(value, entry)
  {
    this.ReadFloatArray(value, getWrapperLayout(entry.wrapperClass, entry.wrapperKind).elements.length);
  }

  /**
   * Alternating string keys and object values; Map replaces native IBlueDict storage.
   *
   * @adapted Alternating string keys and object values; Map replaces native IBlueDict storage
   */

  ReadDict(holder, key, entry)
  {
    const dict = holder[key];
    if (!this._ReadVectorBegin()) this._ReportError("Error reading dict");
    while (this._ReadVectorNext())
    {
      const key = this.ReadString();
      const value = this.ReadIRootClass();
      if (value) dict.set(key, value);
    }
    this._ReadVectorEnd();
    if (entry.isProperty) holder[key] = dict;
  }

  /**
   * Checks native wire layouts; schema records replace native byte-offset writes.
   *
   * @adapted Checks native wire layouts; schema records replace native byte-offset writes
   */

  ReadStructureList(holder, key, entry)
  {
    const list = holder[key];
    const Constructor = entry.structure.Item;
    const definition = entry.structure.definition;
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
      const member = { name: this.ReadString(), dataType: 0, offset: 0 };
      this._ReadVectorNext();
      member.dataType = this.ReadValue__Int32();
      this._ReadVectorNext();
      member.offset = this.ReadValue__Int32();
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
      return member.name === native.name && member.offset === native.offset && member.dataType === YamlReader._StructureDataType(native.dataType);
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
    if (entry.isProperty) holder[key] = list;
  }

  /**
   * Type codes choose readers; typed vectors preserve numeric storage while skipping or writing rows.
   *
   * @adapted Type codes choose readers; typed vectors preserve numeric storage while skipping or writing rows
   */

  _ReadStructureListItem(definition, item)
  {
    for (const member of definition)
    {
      const code = member.dataType;
      const count = ((code & 0x1e0) >> 5) + 1;
      const scalar = code & 7, unsigned = (code & 8) !== 0;
      if (scalar === 6)
      {
        const vectors = new Float32Array(count * 4); // alloc: retained by the record
        if (count > 1) { this._ReadVectorBegin(); this._ReadVectorNext(); }
        for (let i = 0; i < count; ++i) this._ReadValue__Vector4(vectors.subarray(i * 4, i * 4 + 4));
        this._ReplaceNonFiniteElements(vectors, vectors.length, member.name);
        if (count > 1) { this._ReadVectorNext(); this._ReadVectorEnd(); }
        if (item) item[member.name] = vectors;
        continue;
      }
      let read, Storage;
      switch (scalar)
      {
        case 0: read = unsigned ? "ReadValue__UInt8" : "ReadValue__Int8"; Storage = unsigned ? Uint8Array : Int8Array; break;
        case 1: read = unsigned ? "ReadValue__UInt16" : "ReadValue__Int16"; Storage = unsigned ? Uint16Array : Int16Array; break;
        case 2: read = unsigned ? "ReadValue__UInt32" : "ReadValue__Int32"; Storage = unsigned ? Uint32Array : Int32Array; break;
        case 3: read = "_ReadFloat16"; Storage = Uint16Array; break;
        case 4: read = "ReadValue__Float"; Storage = Float32Array; break;
        case 5: read = "_ReadValue__BlueSharedString"; break;
        case 7: read = "ReadValue__Bool"; Storage = Uint8Array; break;
        default: this._ReportError("Unsupported type for structured lists");
      }
      if (count > 1) { this._ReadVectorBegin(); this._ReadVectorNext(); }
      const vector = count > 1 ? (Storage ? new Storage(count) : new Array(count)) : null; // alloc: retained by the record
      let value;
      for (let index = 0; index < count; ++index)
      {
        value = this[read]();
        if (typeof value === "number" && value - value !== 0) value = this._ReplaceNonFinite(member.name);
        if (vector) vector[index] = value;
      }
      if (count > 1) { this._ReadVectorNext(); this._ReadVectorEnd(); }
      if (item) item[member.name] = vector ?? value;
    }
  }

  /** CE-209: UTF-8 anchor bytes truncate as memcpy into uint64 (YamlReader.cpp:929-948). */
  static _AnchorId(anchor)
  {
    const bytes = new TextEncoder().encode(anchor ?? "");
    let result = 0n;
    for (let i = 0; i < Math.min(8, bytes.length); ++i) result |= BigInt(bytes[i]) << BigInt(i * 8);
    return result;
  }

  /** Libyaml's char* readers stop at the first embedded NUL. */
  static _ScalarText(node)
  { return String(node?.value ?? "").split("\0", 1)[0]; }

  /** Decimal prefix conversion used by native atoi/strto*; no YAML number inference. */
  static _Decimal(text)
  {
    const match = /^[\t\n\v\f\r ]*([+-]?\d+)/.exec(text);
    return match ? BigInt(match[1]) : 0n;
  }

  /** Windows unsigned strto* saturation followed by native unsigned negation. */
  static _Unsigned(text, bits)
  {
    const value = YamlReader._Decimal(text), max = (1n << BigInt(bits)) - 1n;
    const magnitude = value < 0n ? -value : value;
    return magnitude > max ? max : BigInt.asUintN(bits, value);
  }

  /** C-locale atof accepts decimal prefixes, infinity and nan; invalid input becomes zero. */
  static _NativeDouble(text)
  {
    if (/^[\t\n\v\f\r ]*[+-]?inf/i.test(text)) return /^\s*-/.test(text) ? -Infinity : Infinity;
    if (/^[\t\n\v\f\r ]*[+-]?nan/i.test(text)) return NaN;
    const value = Number.parseFloat(text);
    return Number.isNaN(value) ? 0 : value;
  }

  /** Base64.cpp's table maps invalid bytes to zero and padding to 99. */
  static _Base64Digit(character)
  {
    if (character === "=") return 99;
    const index = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(character);
    return index < 0 ? 0 : index;
  }

  /** Schema-supported subset of IBlueStructureList.h's numeric type codes. */
  static _StructureDataType(name)
  {
    const split = name.lastIndexOf("_");
    const base = { BYTE: 0, SHORT: 1, INT32: 2, FLOAT16: 3, FLOAT32: 4, SHAREDSTRING: 5, BOOL8: 7, UBYTE: 8, USHORT: 9, UINT32: 10 }[name.slice(0, split)];
    return base === undefined ? -1 : base | ((Number(name.slice(split + 1)) - 1) << 5);
  }

  /** Buffers a host synchronous stream without exposing a second Red decoding path. */
  static _ReadStream(stream)
  {
    const buffer = new Uint8Array(16384); // alloc: one read buffer per stream
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
  static _QueryInterface(value, Interface)
  {
    return value && mappedInterfaces(value.constructor).has(Interface) ? value : null;
  }
}

// Explicit registration keeps the public Blue source importable without a decorator transform (YamlReader_Blue.cpp:11-60).
CjsSchema.decorateField(YamlReader, "_isStrict", type.boolean, be.mapAttribute(be.READWRITE, "isStrict"));
CjsSchema.decorateField(YamlReader, "_doInitialize", type.boolean, be.mapAttribute(be.READWRITE, "doInitialize"));
CjsSchema.decorateMethod(YamlReader, "CreateObjectFromString", be.mapMethodAndWrap());
CjsSchema.decorateMethod(YamlReader, "CreateObjectFromStream", be.mapMethodAndWrap());
CjsSchema.decorateMethod(YamlReader, "CreateObjectFromFile", be.mapMethodAndWrap());
CjsSchema.exposure.mapICacheableMethods()(YamlReader);
be.define("YamlReader")(YamlReader);
be.mapInterface(IRootReader)(YamlReader);
be.mapInterface(IBlueObjectBuilder)(YamlReader);
be.mapInterface(ICacheable)(YamlReader);
