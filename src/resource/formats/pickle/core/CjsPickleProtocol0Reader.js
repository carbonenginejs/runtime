import {
  MARK,
  PICKLE_LIMITS,
  append,
  chargeOperation,
  createGlobalMarker,
  displayOpcode,
  getMemo,
  normalizeBytes,
  normalizeLimits,
  pickleError,
  push,
  putMemo,
  readDictionary,
  readSequence,
  reduce,
  setItem,
  stateError,
  stop,
  assertJSONCompatible,
  createState
} from "./pickleCommon.js";

export const PICKLE_PROTOCOL_0_LIMITS = PICKLE_LIMITS;

const PROTOCOL = 0;

/**
 * Construction-bound decoder for the inert data subset of Python pickle
 * protocol 0.
 *
 * The reader never imports modules, resolves globals, invokes reducers, or
 * constructs Python objects. Unsupported opcodes fail closed at their byte
 * offset. Everything about what a decoded value may be - limits, memo,
 * containers, the closed set of rebuildable globals - lives in `pickleCommon`
 * and is shared with the binary-protocol reader; this file owns only how
 * protocol 0 spells its opcodes, which is as printable ASCII lines.
 */
export class CjsPickleProtocol0Reader
{
  _bytes;
  _limits;

  /**
   * Bind one byte source and its resource limits.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Pickle protocol-0 bytes.
   * @param {object} [options] Reader options containing optional limits.
   */
  constructor(input, options = {})
  {
    this._bytes = normalizeBytes(input);
    this._limits = normalizeLimits(options.limits ?? options);

    if (this._bytes.byteLength > this._limits.maxInputBytes)
    {
      throw pickleError(
        "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
        `Pickle input exceeds maxInputBytes (${this._limits.maxInputBytes}).`,
        0,
        PROTOCOL
      );
    }
  }

  /**
   * Decode an inert JavaScript value while preserving pickle memo identity.
   *
   * @returns {*} Decoded scalar, array, or plain object graph.
   */
  Read()
  {
    return decode(this._bytes, this._limits);
  }

  /**
   * Decode a value and reject cycles or values JSON cannot represent.
   *
   * @returns {*} JSON-compatible decoded graph.
   */
  ReadJSON()
  {
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
  static ToJSON(value)
  {
    assertJSONCompatible(value);
    return value;
  }
}

function decode(bytes, limits)
{
  const state = createState(bytes, limits, PROTOCOL);

  while (state.offset < bytes.byteLength)
  {
    const opcodeOffset = state.offset;
    const opcode = bytes[state.offset++];

    chargeOperation(state, opcodeOffset);

    switch (opcode)
    {
      case 0x28: // MARK
        state.marks.push(state.stack.length);
        push(state, MARK, opcodeOffset);
        break;

      case 0x2e: // STOP
        return stop(state, opcodeOffset);

      case 0x46: // FLOAT
        push(state, readFloat(state, opcodeOffset), opcodeOffset);
        break;

      case 0x49: // INT
        push(state, readInteger(state, opcodeOffset, false), opcodeOffset);
        break;

      case 0x4c: // LONG
        push(state, readInteger(state, opcodeOffset, true), opcodeOffset);
        break;

      case 0x4e: // NONE
        push(state, null, opcodeOffset);
        break;

      case 0x53: // STRING
        push(state, readString(state, opcodeOffset), opcodeOffset);
        break;

      case 0x56: // UNICODE
        push(state, readUnicode(state, opcodeOffset), opcodeOffset);
        break;

      case 0x61: // APPEND
        append(state, opcodeOffset);
        break;

      case 0x64: // DICT
        push(state, readDictionary(state, opcodeOffset), opcodeOffset);
        break;

      case 0x67: // GET
        getMemo(state, readMemoID(state, opcodeOffset), opcodeOffset);
        break;

      case 0x6c: // LIST
        push(state, readSequence(state, opcodeOffset, true), opcodeOffset);
        break;

      case 0x74: // TUPLE
        push(state, readSequence(state, opcodeOffset, false), opcodeOffset);
        break;

      case 0x70: // PUT
        putMemo(state, readMemoID(state, opcodeOffset), opcodeOffset);
        break;

      case 0x73: // SETITEM
        setItem(state, opcodeOffset);
        break;

      case 0x63: // GLOBAL
        push(state, readGlobal(state, opcodeOffset), opcodeOffset);
        break;

      case 0x52: // REDUCE
        reduce(state, opcodeOffset);
        break;

      default:
        throw stateError(
          state,
          "CJS_PICKLE_FORMAT_OPCODE_UNSUPPORTED",
          `Data-only pickle protocol 0 rejects opcode ${displayOpcode(opcode)}.`,
          opcodeOffset
        );
    }
  }

  throw stateError(
    state,
    "CJS_PICKLE_FORMAT_STOP_MISSING",
    "Pickle input ended without a STOP opcode.",
    state.offset
  );
}

function readFloat(state, offset)
{
  const value = readAsciiLine(state, state.limits.maxStringBytes, offset);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_NUMBER_INVALID",
      `Pickle FLOAT value is invalid: ${JSON.stringify(value)}.`,
      offset
    );
  }

  const result = Number(value);
  if (!Number.isFinite(result))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_NUMBER_INVALID",
      "Pickle FLOAT must be finite for JSON-compatible output.",
      offset
    );
  }
  return result;
}

function readInteger(state, offset, isLong)
{
  let value = readAsciiLine(state, 128, offset);

  if (!isLong && value === "00") return false;
  if (!isLong && value === "01") return true;
  if (isLong && value.endsWith("L")) value = value.slice(0, -1);

  if (!/^[+-]?\d+$/u.test(value))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_NUMBER_INVALID",
      `Pickle integer value is invalid: ${JSON.stringify(value)}.`,
      offset
    );
  }

  const result = BigInt(value);
  if (result >= BigInt(Number.MIN_SAFE_INTEGER)
    && result <= BigInt(Number.MAX_SAFE_INTEGER))
  {
    return Number(result);
  }
  return result.toString();
}

function readString(state, offset)
{
  const bytes = readLine(state, state.limits.maxStringBytes, offset);
  if (bytes.byteLength < 2)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_STRING_INVALID",
      "Pickle STRING must be a quoted Python string literal.",
      offset
    );
  }

  const quote = bytes[0];
  if ((quote !== 0x27 && quote !== 0x22)
    || bytes[bytes.byteLength - 1] !== quote)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_STRING_INVALID",
      "Pickle STRING must use matching single or double quotes.",
      offset
    );
  }

  const result = [];
  for (let index = 1; index < bytes.byteLength - 1; index += 1)
  {
    const byte = bytes[index];
    if (byte !== 0x5c)
    {
      result.push(String.fromCharCode(byte));
      continue;
    }

    index += 1;
    if (index >= bytes.byteLength - 1)
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_STRING_INVALID",
        "Pickle STRING ends with an incomplete escape.",
        offset
      );
    }

    const escaped = bytes[index];
    const simple = decodeSimpleEscape(escaped);
    if (simple !== null)
    {
      result.push(String.fromCharCode(simple));
    }
    else if (escaped === 0x78)
    {
      result.push(String.fromCharCode(readHex(state, bytes, index + 1, 2, offset)));
      index += 2;
    }
    else if (escaped >= 0x30 && escaped <= 0x37)
    {
      let digits = String.fromCharCode(escaped);
      while (digits.length < 3
        && index + 1 < bytes.byteLength - 1
        && bytes[index + 1] >= 0x30
        && bytes[index + 1] <= 0x37)
      {
        index += 1;
        digits += String.fromCharCode(bytes[index]);
      }
      result.push(String.fromCharCode(Number.parseInt(digits, 8)));
    }
    else
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_STRING_INVALID",
        `Pickle STRING contains unsupported escape \\${String.fromCharCode(escaped)}.`,
        offset
      );
    }
  }
  return result.join("");
}

function readUnicode(state, offset)
{
  const bytes = readLine(state, state.limits.maxStringBytes, offset);
  const result = [];

  for (let index = 0; index < bytes.byteLength; index += 1)
  {
    const byte = bytes[index];
    if (byte !== 0x5c || index + 1 >= bytes.byteLength)
    {
      result.push(String.fromCharCode(byte));
      continue;
    }

    const escaped = bytes[index + 1];
    if (escaped === 0x75)
    {
      result.push(String.fromCharCode(readHex(state, bytes, index + 2, 4, offset)));
      index += 5;
    }
    else if (escaped === 0x55)
    {
      const codePoint = readHex(state, bytes, index + 2, 8, offset);
      if (codePoint > 0x10ffff)
      {
        throw stateError(
          state,
          "CJS_PICKLE_FORMAT_STRING_INVALID",
          `Pickle UNICODE code point is out of range: ${codePoint}.`,
          offset
        );
      }
      result.push(String.fromCodePoint(codePoint));
      index += 9;
    }
    else
    {
      result.push("\\");
    }
  }
  return result.join("");
}

function readMemoID(state, offset)
{
  const value = readAsciiLine(state, 64, offset);
  if (!/^\d+$/u.test(value))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_MEMO_INVALID",
      `Pickle memo ID is invalid: ${JSON.stringify(value)}.`,
      offset
    );
  }
  return Number(value);
}

/** Reads a GLOBAL, and refuses every name outside the closed set. */
function readGlobal(state, offset)
{
  const module = decodeAscii(readLine(state, state.limits.maxStringBytes, offset));
  const attribute = decodeAscii(readLine(state, state.limits.maxStringBytes, offset));

  return createGlobalMarker(state, `${module}.${attribute}`, offset);
}

/** Decodes a GLOBAL's module or attribute line, which is always ASCII. */
function decodeAscii(bytes)
{
  let result = "";

  for (const byte of bytes) result += String.fromCharCode(byte);

  return result.trim();
}

function readAsciiLine(state, limit, offset)
{
  const bytes = readLine(state, limit, offset);
  let result = "";
  for (const byte of bytes)
  {
    if (byte > 0x7f)
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_STRING_INVALID",
        "Pickle control line must contain ASCII bytes.",
        offset
      );
    }
    result += String.fromCharCode(byte);
  }
  return result;
}

function readLine(state, limit, offset)
{
  const start = state.offset;
  while (state.offset < state.bytes.byteLength && state.bytes[state.offset] !== 0x0a)
  {
    state.offset += 1;
    if (state.offset - start > limit)
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
        `Pickle line exceeds its ${limit}-byte limit.`,
        offset
      );
    }
  }

  if (state.offset >= state.bytes.byteLength)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_EOF",
      "Pickle line is missing its newline terminator.",
      offset
    );
  }

  const result = state.bytes.subarray(start, state.offset);
  state.offset += 1;
  return result;
}

function readHex(state, bytes, start, length, offset)
{
  if (start + length > bytes.byteLength)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_STRING_INVALID",
      "Pickle escape sequence is truncated.",
      offset
    );
  }

  let result = 0;
  for (let index = 0; index < length; index += 1)
  {
    const value = hexValue(bytes[start + index]);
    if (value === -1)
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_STRING_INVALID",
        "Pickle escape sequence contains a non-hexadecimal digit.",
        offset
      );
    }
    result = result * 16 + value;
  }
  return result;
}

function hexValue(byte)
{
  if (byte >= 0x30 && byte <= 0x39) return byte - 0x30;
  if (byte >= 0x41 && byte <= 0x46) return byte - 0x41 + 10;
  if (byte >= 0x61 && byte <= 0x66) return byte - 0x61 + 10;
  return -1;
}

function decodeSimpleEscape(byte)
{
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

export default CjsPickleProtocol0Reader;
