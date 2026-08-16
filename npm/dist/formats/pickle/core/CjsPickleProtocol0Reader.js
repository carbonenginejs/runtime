const MARK = Symbol("pickle-mark");
const PICKLE_PROTOCOL_0_LIMITS = {
  maxContainerItems: 1000000,
  maxInputBytes: 32 * 1024 * 1024,
  maxMemoEntries: 500000,
  maxMemoID: 1000000,
  maxOperations: 2000000,
  maxStackDepth: 100000,
  maxStringBytes: 4 * 1024 * 1024
};
const LIMIT_NAMES = Object.keys(PICKLE_PROTOCOL_0_LIMITS);

/**
 * Construction-bound decoder for the inert data subset of Python pickle
 * protocol 0.
 *
 * The reader never imports modules, resolves globals, invokes reducers, or
 * constructs Python objects. Unsupported opcodes fail closed at their byte
 * offset.
 */
class CjsPickleProtocol0Reader {
  #bytes;
  #limits;

  /**
   * Bind one byte source and its resource limits.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle protocol-0 bytes.
   * @param {object} [options] Reader options containing optional limits.
   */
  constructor(input, options = {}) {
    this.#bytes = normalizeBytes(input);
    this.#limits = normalizeLimits(options.limits ?? options);
    if (this.#bytes.byteLength > this.#limits.maxInputBytes) {
      throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle input exceeds maxInputBytes (${this.#limits.maxInputBytes}).`, 0);
    }
  }

  /**
   * Decode an inert JavaScript value while preserving pickle memo identity.
   *
   * @returns {*} Decoded scalar, array, or plain object graph.
   */
  Read() {
    return decode(this.#bytes, this.#limits);
  }

  /**
   * Decode a value and reject cycles or values JSON cannot represent.
   *
   * @returns {*} JSON-compatible decoded graph.
   */
  ReadJSON() {
    const value = this.Read();
    assertJSONCompatible(value);
    return value;
  }

  /**
   * Verify that a decoded value can cross the JSON boundary unchanged.
   *
   * @param {*} value Candidate decoded graph.
   * @returns {*} The supplied value.
   */
  static ToJSON(value) {
    assertJSONCompatible(value);
    return value;
  }
}
function decode(bytes, limits) {
  const state = {
    bytes,
    containers: new WeakMap(),
    dictionaryKeys: new WeakMap(),
    limits,
    lists: new WeakSet(),
    marks: [],
    memo: new Map(),
    offset: 0,
    operations: 0,
    // Every global marker created, and separately those no REDUCE has consumed.
    // A marker is a decoding artifact, never data: it may sit on the stack and
    // in the memo on its way to a REDUCE, and it may reach nothing else.
    globalMarkers: new WeakSet(),
    pendingGlobals: new Set(),
    // Properties built by REDUCE across the WHOLE decode, not per container.
    rebuiltItems: 0,
    stack: []
  };
  while (state.offset < bytes.byteLength) {
    const opcodeOffset = state.offset;
    const opcode = bytes[state.offset++];
    state.operations += 1;
    if (state.operations > limits.maxOperations) {
      throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle operation count exceeds maxOperations (${limits.maxOperations}).`, opcodeOffset);
    }
    switch (opcode) {
      case 0x28:
        // MARK
        state.marks.push(state.stack.length);
        push(state, MARK, opcodeOffset);
        break;
      case 0x2e:
        // STOP
        return stop(state, opcodeOffset);
      case 0x46:
        // FLOAT
        push(state, readFloat(state, opcodeOffset), opcodeOffset);
        break;
      case 0x49:
        // INT
        push(state, readInteger(state, opcodeOffset, false), opcodeOffset);
        break;
      case 0x4c:
        // LONG
        push(state, readInteger(state, opcodeOffset, true), opcodeOffset);
        break;
      case 0x4e:
        // NONE
        push(state, null, opcodeOffset);
        break;
      case 0x53:
        // STRING
        push(state, readString(state, opcodeOffset), opcodeOffset);
        break;
      case 0x56:
        // UNICODE
        push(state, readUnicode(state, opcodeOffset), opcodeOffset);
        break;
      case 0x61:
        // APPEND
        append(state, opcodeOffset);
        break;
      case 0x64:
        // DICT
        push(state, readDictionary(state, opcodeOffset), opcodeOffset);
        break;
      case 0x67:
        // GET
        getMemo(state, opcodeOffset);
        break;
      case 0x6c:
        // LIST
        push(state, readSequence(state, opcodeOffset, true), opcodeOffset);
        break;
      case 0x74:
        // TUPLE
        push(state, readSequence(state, opcodeOffset, false), opcodeOffset);
        break;
      case 0x70:
        // PUT
        putMemo(state, opcodeOffset);
        break;
      case 0x73:
        // SETITEM
        setItem(state, opcodeOffset);
        break;
      case 0x63:
        // GLOBAL
        push(state, readGlobal(state, opcodeOffset), opcodeOffset);
        break;
      case 0x52:
        // REDUCE
        reduce(state, opcodeOffset);
        break;
      default:
        throw pickleError("CJS_PICKLE_FORMAT_OPCODE_UNSUPPORTED", `Data-only pickle protocol 0 rejects opcode ${displayOpcode(opcode)}.`, opcodeOffset);
    }
  }
  throw pickleError("CJS_PICKLE_FORMAT_STOP_MISSING", "Pickle input ended without a STOP opcode.", state.offset);
}
function stop(state, offset) {
  // A GLOBAL that no REDUCE consumed would otherwise reach the caller as an
  // empty object, indistinguishable from an empty dictionary.
  if (state.pendingGlobals.size) {
    throw pickleError("CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED", "Pickle names a global that no REDUCE consumes.", offset);
  }
  rejectGlobalMarker(state, state.stack[0], offset);
  if (state.marks.length || state.stack.length !== 1 || state.stack[0] === MARK) {
    throw pickleError("CJS_PICKLE_FORMAT_STACK_INVALID", "Pickle STOP requires one completed value and no open marks.", offset);
  }
  if (state.offset !== state.bytes.byteLength) {
    throw pickleError("CJS_PICKLE_FORMAT_TRAILING_DATA", "Pickle input contains bytes after STOP.", state.offset);
  }
  return state.stack[0];
}
function readFloat(state, offset) {
  const value = readAsciiLine(state, state.limits.maxStringBytes, offset);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value)) {
    throw pickleError("CJS_PICKLE_FORMAT_NUMBER_INVALID", `Pickle FLOAT value is invalid: ${JSON.stringify(value)}.`, offset);
  }
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw pickleError("CJS_PICKLE_FORMAT_NUMBER_INVALID", "Pickle FLOAT must be finite for JSON-compatible output.", offset);
  }
  return result;
}
function readInteger(state, offset, isLong) {
  let value = readAsciiLine(state, 128, offset);
  if (!isLong && value === "00") return false;
  if (!isLong && value === "01") return true;
  if (isLong && value.endsWith("L")) value = value.slice(0, -1);
  if (!/^[+-]?\d+$/u.test(value)) {
    throw pickleError("CJS_PICKLE_FORMAT_NUMBER_INVALID", `Pickle integer value is invalid: ${JSON.stringify(value)}.`, offset);
  }
  const result = BigInt(value);
  if (result >= BigInt(Number.MIN_SAFE_INTEGER) && result <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(result);
  }
  return result.toString();
}
function readString(state, offset) {
  const bytes = readLine(state, state.limits.maxStringBytes, offset);
  if (bytes.byteLength < 2) {
    throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", "Pickle STRING must be a quoted Python string literal.", offset);
  }
  const quote = bytes[0];
  if (quote !== 0x27 && quote !== 0x22 || bytes[bytes.byteLength - 1] !== quote) {
    throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", "Pickle STRING must use matching single or double quotes.", offset);
  }
  const result = [];
  for (let index = 1; index < bytes.byteLength - 1; index += 1) {
    const byte = bytes[index];
    if (byte !== 0x5c) {
      result.push(String.fromCharCode(byte));
      continue;
    }
    index += 1;
    if (index >= bytes.byteLength - 1) {
      throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", "Pickle STRING ends with an incomplete escape.", offset);
    }
    const escaped = bytes[index];
    const simple = decodeSimpleEscape(escaped);
    if (simple !== null) {
      result.push(String.fromCharCode(simple));
    } else if (escaped === 0x78) {
      result.push(String.fromCharCode(readHex(bytes, index + 1, 2, offset)));
      index += 2;
    } else if (escaped >= 0x30 && escaped <= 0x37) {
      let digits = String.fromCharCode(escaped);
      while (digits.length < 3 && index + 1 < bytes.byteLength - 1 && bytes[index + 1] >= 0x30 && bytes[index + 1] <= 0x37) {
        index += 1;
        digits += String.fromCharCode(bytes[index]);
      }
      result.push(String.fromCharCode(Number.parseInt(digits, 8)));
    } else {
      throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", `Pickle STRING contains unsupported escape \\${String.fromCharCode(escaped)}.`, offset);
    }
  }
  return result.join("");
}
function readUnicode(state, offset) {
  const bytes = readLine(state, state.limits.maxStringBytes, offset);
  const result = [];
  for (let index = 0; index < bytes.byteLength; index += 1) {
    const byte = bytes[index];
    if (byte !== 0x5c || index + 1 >= bytes.byteLength) {
      result.push(String.fromCharCode(byte));
      continue;
    }
    const escaped = bytes[index + 1];
    if (escaped === 0x75) {
      result.push(String.fromCharCode(readHex(bytes, index + 2, 4, offset)));
      index += 5;
    } else if (escaped === 0x55) {
      const codePoint = readHex(bytes, index + 2, 8, offset);
      if (codePoint > 0x10ffff) {
        throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", `Pickle UNICODE code point is out of range: ${codePoint}.`, offset);
      }
      result.push(String.fromCodePoint(codePoint));
      index += 9;
    } else {
      result.push("\\");
    }
  }
  return result.join("");
}
function readSequence(state, offset, isList) {
  const values = popMarkedValues(state, offset);
  requireContainerLimit(state, values.length, offset);
  state.containers.set(values, values.length);
  if (isList) state.lists.add(values);
  return values;
}
function readDictionary(state, offset) {
  const values = popMarkedValues(state, offset);
  if (values.length % 2 !== 0) {
    throw pickleError("CJS_PICKLE_FORMAT_CONTAINER_INVALID", "Pickle DICT requires key/value pairs.", offset);
  }
  requireContainerLimit(state, values.length / 2, offset);
  const result = {};
  let count = 0;
  state.dictionaryKeys.set(result, new Map());
  for (let index = 0; index < values.length; index += 2) {
    count = defineDictionaryValue(state, result, values[index], values[index + 1], count, offset);
  }
  state.containers.set(result, count);
  return result;
}
function append(state, offset) {
  requireStack(state, 2, offset);
  const value = rejectGlobalMarker(state, state.stack.pop(), offset);
  const target = state.stack[state.stack.length - 1];
  if (!Array.isArray(target) || !state.lists.has(target)) {
    throw pickleError("CJS_PICKLE_FORMAT_CONTAINER_INVALID", "Pickle APPEND target must be a list.", offset);
  }
  requireContainerLimit(state, target.length + 1, offset);
  target.push(value);
  state.containers.set(target, target.length);
}
function setItem(state, offset) {
  requireStack(state, 3, offset);
  const value = rejectGlobalMarker(state, state.stack.pop(), offset);
  const key = state.stack.pop();
  const target = state.stack[state.stack.length - 1];
  if (!isDictionary(target)) {
    throw pickleError("CJS_PICKLE_FORMAT_CONTAINER_INVALID", "Pickle SETITEM target must be a dictionary.", offset);
  }
  const count = defineDictionaryValue(state, target, key, value, state.containers.get(target) ?? Object.keys(target).length, offset);
  requireContainerLimit(state, count, offset);
  state.containers.set(target, count);
}
function defineDictionaryValue(state, target, key, value, count, offset) {
  const normalized = normalizeDictionaryKey(key, offset);
  const keyTypes = state.dictionaryKeys.get(target) ?? new Map();
  const previousType = keyTypes.get(normalized.value);
  if (previousType && previousType !== normalized.type) {
    throw pickleError("CJS_PICKLE_FORMAT_CONTAINER_INVALID", `Pickle dictionary keys collide after JSON normalization: ${JSON.stringify(normalized.value)}.`, offset);
  }
  const exists = Object.hasOwn(target, normalized.value);
  Object.defineProperty(target, normalized.value, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
  keyTypes.set(normalized.value, normalized.type);
  state.dictionaryKeys.set(target, keyTypes);
  return exists ? count : count + 1;
}
function normalizeDictionaryKey(key, offset) {
  if (typeof key === "string") return {
    type: "string",
    value: key
  };
  if (typeof key === "number" && Number.isSafeInteger(key)) {
    return {
      type: "integer",
      value: String(key)
    };
  }
  throw pickleError("CJS_PICKLE_FORMAT_CONTAINER_INVALID", "Data-only pickle dictionaries require string or safe-integer keys.", offset);
}
function putMemo(state, offset) {
  requireStack(state, 1, offset);
  if (state.stack[state.stack.length - 1] === MARK) {
    throw pickleError("CJS_PICKLE_FORMAT_MARK_INVALID", "Pickle MARK cannot be stored in the memo.", offset);
  }
  const id = readMemoID(state, offset);
  if (!state.memo.has(id) && state.memo.size >= state.limits.maxMemoEntries) {
    throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle memo exceeds maxMemoEntries (${state.limits.maxMemoEntries}).`, offset);
  }
  state.memo.set(id, state.stack[state.stack.length - 1]);
}
function getMemo(state, offset) {
  const id = readMemoID(state, offset);
  if (!state.memo.has(id)) {
    throw pickleError("CJS_PICKLE_FORMAT_MEMO_INVALID", `Pickle memo entry ${id} does not exist.`, offset);
  }
  push(state, state.memo.get(id), offset);
}
function readMemoID(state, offset) {
  const value = readAsciiLine(state, 64, offset);
  if (!/^\d+$/u.test(value)) {
    throw pickleError("CJS_PICKLE_FORMAT_MEMO_INVALID", `Pickle memo ID is invalid: ${JSON.stringify(value)}.`, offset);
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result > state.limits.maxMemoID) {
    throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle memo ID exceeds maxMemoID (${state.limits.maxMemoID}).`, offset);
  }
  return result;
}

/**
 * The one closed set of globals this reader will name, and how each rebuilds.
 *
 * `GLOBAL` is the opcode that makes a pickle dangerous: it names a module and an
 * attribute for the unpickler to import, and `REDUCE` then calls it. The general
 * form stays refused, and nothing here imports, resolves or invokes anything.
 * What this table does instead is recognize a fixed name and build the plain
 * data it stands for.
 *
 * `collections.OrderedDict` earns its place because it is not a behaviour, it is
 * a dictionary that remembers insertion order — and a JavaScript object already
 * does. It is also, measured across every self-describing container CCP ships,
 * **the only global any of them uses**: 25 files, one name, once each. They use
 * it because a schema's attribute order is its field order, which is exactly the
 * property an ordinary dict would lose.
 *
 * **Adding to this table is not a small change.** A name belongs here only if
 * reconstructing it is pure data with no behaviour of its own, and the entry has
 * to build that data directly rather than defer to anything callable.
 */
const REBUILDABLE_GLOBALS = new Map([["collections.OrderedDict", RebuildOrderedDict]]);
const GLOBAL_NAME = Symbol("pickle-global");

/** Reads a GLOBAL, and refuses every name outside the closed set above. */
function readGlobal(state, offset) {
  const module = decodeAscii(readLine(state, state.limits.maxStringBytes, offset));
  const attribute = decodeAscii(readLine(state, state.limits.maxStringBytes, offset));
  const name = `${module}.${attribute}`;
  if (!REBUILDABLE_GLOBALS.has(name)) {
    throw pickleError("CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED", `Data-only pickle protocol 0 rejects the global ${JSON.stringify(name)}. ` + "Only a closed set of pure-data containers can be rebuilt, and this is not one.", offset);
  }
  const marker = {
    [GLOBAL_NAME]: name
  };
  state.globalMarkers.add(marker);
  state.pendingGlobals.add(marker);
  return marker;
}

/** Rebuilds one allowed global from its arguments. Calls nothing. */
function reduce(state, offset) {
  const args = state.stack.pop();
  const callable = state.stack.pop();
  const name = callable && typeof callable === "object" ? callable[GLOBAL_NAME] : undefined;
  if (!name || !REBUILDABLE_GLOBALS.has(name)) {
    throw pickleError("CJS_PICKLE_FORMAT_REDUCE_INVALID", "Pickle REDUCE applies only to a global this reader can rebuild.", offset);
  }
  if (!Array.isArray(args)) {
    throw pickleError("CJS_PICKLE_FORMAT_REDUCE_INVALID", "Pickle REDUCE requires an argument tuple.", offset);
  }
  state.pendingGlobals.delete(callable);
  push(state, REBUILDABLE_GLOBALS.get(name)(args, state, offset), offset);
}

/**
 * Rebuilds `OrderedDict(pairs)` as a plain object.
 *
 * JavaScript preserves the insertion order of string keys, but NOT of keys that
 * look like array indices — those sort ahead of everything else, in ascending
 * numeric order. Refusing every numeric key was too blunt: real containers use
 * them, and where they already ascend the object's order is the source's order
 * and nothing is lost.
 *
 * So the order is checked rather than the keys. The result is compared against
 * the order it was built in, and only a dictionary JavaScript would actually
 * reorder is refused.
 */
function RebuildOrderedDict(args, state, offset) {
  const pairs = args.length ? args[0] : [];
  if (!Array.isArray(pairs)) {
    throw pickleError("CJS_PICKLE_FORMAT_REDUCE_INVALID", "An ordered dictionary is rebuilt from a list of key/value pairs.", offset);
  }
  requireContainerLimit(state, pairs.length, offset);
  const order = [];

  // A per-container check is not enough here. REDUCE is the only path that
  // builds N properties for a constant number of opcodes, so a memoized pair
  // list rebuilt in a loop multiplies `maxOperations` by `maxContainerItems`
  // instead of being bounded by either. A decode-wide budget is what bounds it.
  state.rebuiltItems += pairs.length;
  if (state.rebuiltItems > state.limits.maxContainerItems) {
    throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Rebuilt items exceed maxContainerItems (${state.limits.maxContainerItems}) across the decode.`, offset);
  }
  const result = {};
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw pickleError("CJS_PICKLE_FORMAT_REDUCE_INVALID", "An ordered dictionary entry must be a key/value pair.", offset);
    }
    const key = pair[0];
    if (typeof key !== "string") {
      throw pickleError("CJS_PICKLE_FORMAT_REDUCE_INVALID", "An ordered dictionary key must be a string.", offset);
    }
    order.push(key);

    // Defined rather than assigned, as the dictionary path already does. A
    // plain assignment to `__proto__` sets the object's prototype instead of
    // storing a property: the field silently disappears from the decoded record
    // and, if its value is an object, becomes a phantom the JSON never shows.
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      value: pair[1],
      writable: true
    });
  }

  // Order is the one thing this type exists to carry, so it is checked rather
  // than assumed. A repeated key keeps its first position, which is what both
  // Python and JavaScript do.
  const expected = [...new Set(order)];
  const kept = Object.keys(result);
  if (kept.length !== expected.length || kept.some((key, index) => key !== expected[index])) {
    throw pickleError("CJS_PICKLE_FORMAT_REDUCE_INVALID", "An ordered dictionary's key order would not survive as a JavaScript object.", offset);
  }
  return result;
}

/** Decodes a GLOBAL's module or attribute line, which is always ASCII. */
function decodeAscii(bytes) {
  let result = "";
  for (const byte of bytes) result += String.fromCharCode(byte);
  return result.trim();
}

/**
 * Refuses a global marker anywhere a decoded value is stored or returned.
 *
 * Consuming a marker with REDUCE is the only thing it is for. Appended to a
 * list, set as a dictionary value or left as the result, it would reach the
 * caller as `{}` - indistinguishable from an empty dictionary, and buryable
 * anywhere in the graph through the memo.
 */
function rejectGlobalMarker(state, value, offset) {
  if (value && typeof value === "object" && state.globalMarkers.has(value)) {
    throw pickleError("CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED", "A pickle global is only usable as the target of a REDUCE.", offset);
  }
  return value;
}
function popMarkedValues(state, offset) {
  if (!state.marks.length) {
    throw pickleError("CJS_PICKLE_FORMAT_MARK_INVALID", "Pickle container has no matching MARK.", offset);
  }
  const mark = state.marks.pop();
  if (state.stack[mark] !== MARK) {
    throw pickleError("CJS_PICKLE_FORMAT_MARK_INVALID", "Pickle MARK stack is inconsistent.", offset);
  }
  const values = state.stack.slice(mark + 1);
  state.stack.length = mark;
  for (const value of values) rejectGlobalMarker(state, value, offset);
  return values;
}
function push(state, value, offset) {
  if (state.stack.length >= state.limits.maxStackDepth) {
    throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle stack exceeds maxStackDepth (${state.limits.maxStackDepth}).`, offset);
  }
  state.stack.push(value);
}
function requireStack(state, count, offset) {
  if (state.stack.length < count) {
    throw pickleError("CJS_PICKLE_FORMAT_STACK_INVALID", `Pickle opcode requires ${count} stack values.`, offset);
  }
}
function requireContainerLimit(state, count, offset) {
  if (count > state.limits.maxContainerItems) {
    throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle container exceeds maxContainerItems (${state.limits.maxContainerItems}).`, offset);
  }
}
function readAsciiLine(state, limit, offset) {
  const bytes = readLine(state, limit, offset);
  let result = "";
  for (const byte of bytes) {
    if (byte > 0x7f) {
      throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", "Pickle control line must contain ASCII bytes.", offset);
    }
    result += String.fromCharCode(byte);
  }
  return result;
}
function readLine(state, limit, offset) {
  const start = state.offset;
  while (state.offset < state.bytes.byteLength && state.bytes[state.offset] !== 0x0a) {
    state.offset += 1;
    if (state.offset - start > limit) {
      throw pickleError("CJS_PICKLE_FORMAT_LIMIT_EXCEEDED", `Pickle line exceeds its ${limit}-byte limit.`, offset);
    }
  }
  if (state.offset >= state.bytes.byteLength) {
    throw pickleError("CJS_PICKLE_FORMAT_EOF", "Pickle line is missing its newline terminator.", offset);
  }
  const result = state.bytes.subarray(start, state.offset);
  state.offset += 1;
  return result;
}
function readHex(bytes, start, length, offset) {
  if (start + length > bytes.byteLength) {
    throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", "Pickle escape sequence is truncated.", offset);
  }
  let result = 0;
  for (let index = 0; index < length; index += 1) {
    const value = hexValue(bytes[start + index]);
    if (value === -1) {
      throw pickleError("CJS_PICKLE_FORMAT_STRING_INVALID", "Pickle escape sequence contains a non-hexadecimal digit.", offset);
    }
    result = result * 16 + value;
  }
  return result;
}
function hexValue(byte) {
  if (byte >= 0x30 && byte <= 0x39) return byte - 0x30;
  if (byte >= 0x41 && byte <= 0x46) return byte - 0x41 + 10;
  if (byte >= 0x61 && byte <= 0x66) return byte - 0x61 + 10;
  return -1;
}
function decodeSimpleEscape(byte) {
  const values = {
    0x22: 0x22,
    0x27: 0x27,
    0x5c: 0x5c,
    0x61: 0x07,
    0x62: 0x08,
    0x66: 0x0c,
    0x6e: 0x0a,
    0x72: 0x0d,
    0x74: 0x09,
    0x76: 0x0b
  };
  return Object.hasOwn(values, byte) ? values[byte] : null;
}
function assertJSONCompatible(value) {
  const active = new WeakSet();
  const verified = new WeakSet();
  const pending = [{
    exit: false,
    value
  }];
  while (pending.length) {
    const item = pending.pop();
    const current = item.value;
    if (current === null || typeof current === "string" || typeof current === "boolean") {
      continue;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        throw pickleError("CJS_PICKLE_FORMAT_JSON_INVALID", "Pickle output contains a non-finite number.", null);
      }
      continue;
    }
    if (!current || typeof current !== "object") {
      throw pickleError("CJS_PICKLE_FORMAT_JSON_INVALID", `Pickle output contains unsupported ${typeof current} data.`, null);
    }
    if (item.exit) {
      active.delete(current);
      verified.add(current);
      continue;
    }
    if (verified.has(current)) continue;
    if (active.has(current)) {
      throw pickleError("CJS_PICKLE_FORMAT_JSON_INVALID", "Pickle output contains a cyclic reference.", null);
    }
    active.add(current);
    pending.push({
      exit: true,
      value: current
    });
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        pending.push({
          exit: false,
          value: current[index]
        });
      }
    } else if (Object.getPrototypeOf(current) === Object.prototype) {
      const keys = Object.keys(current);
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        pending.push({
          exit: false,
          value: current[keys[index]]
        });
      }
    } else {
      throw pickleError("CJS_PICKLE_FORMAT_JSON_INVALID", "Pickle output contains a non-plain object.", null);
    }
  }
}
function normalizeBytes(input) {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw pickleError("CJS_PICKLE_FORMAT_INPUT_INVALID", "Pickle input must be an ArrayBuffer or an ArrayBuffer view.", 0);
}
function normalizeLimits(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw pickleError("CJS_PICKLE_FORMAT_LIMIT_INVALID", "Pickle limits must be an object.", 0);
  }
  for (const name of Object.keys(options)) {
    if (!LIMIT_NAMES.includes(name)) {
      throw pickleError("CJS_PICKLE_FORMAT_LIMIT_INVALID", `Pickle limits contain unknown value ${JSON.stringify(name)}.`, 0);
    }
  }
  const result = {};
  for (const name of LIMIT_NAMES) {
    const value = options[name] ?? PICKLE_PROTOCOL_0_LIMITS[name];
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw pickleError("CJS_PICKLE_FORMAT_LIMIT_INVALID", `Pickle ${name} must be a positive safe integer.`, 0);
    }
    result[name] = value;
  }
  return result;
}
function isDictionary(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);
}
function displayOpcode(value) {
  if (value >= 0x20 && value <= 0x7e) {
    return JSON.stringify(String.fromCharCode(value));
  }
  return `0x${value.toString(16).padStart(2, "0")}`;
}
function pickleError(code, message, offset) {
  const error = new Error(message);
  error.code = code;
  error.protocol = 0;
  if (offset !== null) error.offset = offset;
  return error;
}

export { CjsPickleProtocol0Reader, PICKLE_PROTOCOL_0_LIMITS };
//# sourceMappingURL=CjsPickleProtocol0Reader.js.map
