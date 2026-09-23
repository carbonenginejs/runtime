import {
  MARK,
  PICKLE_LIMITS,
  append,
  appendItems,
  assertJSONCompatible,
  chargeOperation,
  createEmptyContainer,
  createGlobalMarker,
  createState,
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
  rejectGlobalMarker,
  requireContainerLimit,
  requireStack,
  setItem,
  setItems,
  stateError,
  stop
} from "./pickleCommon.js";

export const PICKLE_PROTOCOL_4_LIMITS = PICKLE_LIMITS;

const DEFAULT_PROTOCOL = 4;
const MAXIMUM_PROTOCOL = 4;
const UTF8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Construction-bound decoder for the inert data subset of Python pickle's
 * binary protocols, 1 through 4.
 *
 * Protocol 4 is what matters in practice - it is what CCP's localization
 * containers ship as - but the binary protocols are a strict chain of
 * additions, not four separate formats, so refusing 1 through 3 would mean
 * rejecting files this reader already knows how to spell. The declared protocol
 * is read from `PROTO` and reported on every error.
 *
 * The refusal discipline is identical to protocol 0's, because it is literally
 * the same code: `pickleCommon` owns the memo, the containers, the JSON rules
 * and the closed set of globals, so the only thing this file decides is how
 * bytes become values. Nothing here imports, resolves or invokes anything, and
 * an opcode outside the data subset fails closed at its byte offset.
 *
 * Two decoded shapes differ from protocol 0 because the protocol has types it
 * does not:
 *
 * - `BINBYTES` produces a `Uint8Array`. Bytes are not a JSON value and inventing
 *   one (an array of numbers, a base64 string) would be indistinguishable in the
 *   output from data that really was that. The payload emit carries it; the JSON
 *   emit refuses it, which is the honest answer.
 * - `BINSTRING` produces latin-1 text, matching protocol 0's `STRING`. It is
 *   Python 2's `str`, which is a byte string with no declared encoding, and
 *   latin-1 is the mapping that loses nothing.
 */
export class CjsPickleProtocol4Reader
{
  _bytes;
  _limits;

  /**
   * Bind one byte source and its resource limits.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Binary-protocol pickle bytes.
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
        DEFAULT_PROTOCOL
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
  const state = createState(bytes, limits, DEFAULT_PROTOCOL);

  while (state.offset < bytes.byteLength)
  {
    const opcodeOffset = state.offset;
    const opcode = bytes[state.offset++];

    chargeOperation(state, opcodeOffset);

    switch (opcode)
    {
      case 0x80: // PROTO
        readProtocol(state, opcodeOffset);
        break;

      case 0x95: // FRAME
        readFrame(state, opcodeOffset);
        break;

      case 0x28: // MARK
        state.marks.push(state.stack.length);
        push(state, MARK, opcodeOffset);
        break;

      case 0x2e: // STOP
        return stop(state, opcodeOffset);

      case 0x4e: // NONE
        push(state, null, opcodeOffset);
        break;

      case 0x88: // NEWTRUE
        push(state, true, opcodeOffset);
        break;

      case 0x89: // NEWFALSE
        push(state, false, opcodeOffset);
        break;

      case 0x4b: // BININT1
        push(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset);
        break;

      case 0x4d: // BININT2
        push(state, readUnsigned(state, 2, opcodeOffset), opcodeOffset);
        break;

      case 0x4a: // BININT
        push(state, readSignedInt32(state, opcodeOffset), opcodeOffset);
        break;

      case 0x8a: // LONG1
        push(state, readLong(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x8b: // LONG4
        push(state, readLong(state, readSignedInt32(state, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x47: // BINFLOAT
        push(state, readFloat(state, opcodeOffset), opcodeOffset);
        break;

      case 0x8c: // SHORT_BINUNICODE
        push(state, readText(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x58: // BINUNICODE
        push(state, readText(state, readUnsigned(state, 4, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x8d: // BINUNICODE8
        push(state, readText(state, readLength64(state, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x55: // SHORT_BINSTRING
        push(state, readLatin1(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x54: // BINSTRING
        push(state, readLatin1(state, readSignedInt32(state, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x43: // SHORT_BINBYTES
        push(state, readBytes(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x42: // BINBYTES
        push(state, readBytes(state, readUnsigned(state, 4, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x8e: // BINBYTES8
        push(state, readBytes(state, readLength64(state, opcodeOffset), opcodeOffset), opcodeOffset);
        break;

      case 0x5d: // EMPTY_LIST
        push(state, createEmptyContainer(state, "list"), opcodeOffset);
        break;

      case 0x7d: // EMPTY_DICT
        push(state, createEmptyContainer(state, "dictionary"), opcodeOffset);
        break;

      case 0x29: // EMPTY_TUPLE
        push(state, createEmptyContainer(state, "tuple"), opcodeOffset);
        break;

      case 0x85: // TUPLE1
        push(state, readShortTuple(state, 1, opcodeOffset), opcodeOffset);
        break;

      case 0x86: // TUPLE2
        push(state, readShortTuple(state, 2, opcodeOffset), opcodeOffset);
        break;

      case 0x87: // TUPLE3
        push(state, readShortTuple(state, 3, opcodeOffset), opcodeOffset);
        break;

      case 0x74: // TUPLE
        push(state, readSequence(state, opcodeOffset, false), opcodeOffset);
        break;

      case 0x6c: // LIST
        push(state, readSequence(state, opcodeOffset, true), opcodeOffset);
        break;

      case 0x64: // DICT
        push(state, readDictionary(state, opcodeOffset), opcodeOffset);
        break;

      case 0x61: // APPEND
        append(state, opcodeOffset);
        break;

      case 0x65: // APPENDS
        appendItems(state, opcodeOffset);
        break;

      case 0x73: // SETITEM
        setItem(state, opcodeOffset);
        break;

      case 0x75: // SETITEMS
        setItems(state, opcodeOffset);
        break;

      case 0x94: // MEMOIZE
        putMemo(state, state.memo.size, opcodeOffset);
        break;

      case 0x71: // BINPUT
        putMemo(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset);
        break;

      case 0x72: // LONG_BINPUT
        putMemo(state, readUnsigned(state, 4, opcodeOffset), opcodeOffset);
        break;

      case 0x68: // BINGET
        getMemo(state, readUnsigned(state, 1, opcodeOffset), opcodeOffset);
        break;

      case 0x6a: // LONG_BINGET
        getMemo(state, readUnsigned(state, 4, opcodeOffset), opcodeOffset);
        break;

      case 0x93: // STACK_GLOBAL
        push(state, readStackGlobal(state, opcodeOffset), opcodeOffset);
        break;

      case 0x52: // REDUCE
        reduce(state, opcodeOffset);
        break;

      default:
        throw stateError(
          state,
          "CJS_PICKLE_FORMAT_OPCODE_UNSUPPORTED",
          `Data-only pickle protocol ${state.protocol} rejects opcode ${displayOpcode(opcode)}.`,
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

/**
 * Reads PROTO, which declares the protocol the rest of the stream is written
 * in. It is recorded rather than checked against the opcodes that follow: a
 * stream using an opcode its declared protocol does not have is a stream we can
 * still decode correctly, and the opcode set is what actually bounds us.
 */
function readProtocol(state, offset)
{
  const version = readUnsigned(state, 1, offset);

  if (version > MAXIMUM_PROTOCOL)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_PROTOCOL_UNSUPPORTED",
      `Pickle declares protocol ${version}, above the supported maximum of ${MAXIMUM_PROTOCOL}.`,
      offset
    );
  }

  state.protocol = version;
}

/**
 * Reads FRAME, which is a size hint for a streaming unpickler and carries no
 * data. The length is validated against what remains so a truncated file fails
 * here rather than part-way through a value.
 */
function readFrame(state, offset)
{
  const length = readLength64(state, offset);

  if (length > state.bytes.byteLength - state.offset)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_EOF",
      "Pickle frame extends past the end of the input.",
      offset
    );
  }
}

function requireBytes(state, count, offset)
{
  if (count < 0 || state.offset + count > state.bytes.byteLength)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_EOF",
      "Pickle opcode argument extends past the end of the input.",
      offset
    );
  }
}

function readUnsigned(state, size, offset)
{
  requireBytes(state, size, offset);

  let result = 0;
  for (let index = 0; index < size; index += 1)
  {
    result += state.bytes[state.offset + index] * 2 ** (8 * index);
  }
  state.offset += size;
  return result;
}

function readSignedInt32(state, offset)
{
  const value = readUnsigned(state, 4, offset);
  return value >= 0x80000000 ? value - 0x100000000 : value;
}

/**
 * Reads an 8-byte length. Bounded by `maxInputBytes` rather than by the
 * integer's own range, because a length beyond the input cannot be honoured
 * whatever it says.
 */
function readLength64(state, offset)
{
  requireBytes(state, 8, offset);

  const view = new DataView(state.bytes.buffer, state.bytes.byteOffset + state.offset, 8);
  const value = view.getBigUint64(0, true);
  state.offset += 8;

  if (value > BigInt(state.limits.maxInputBytes))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle length exceeds maxInputBytes (${state.limits.maxInputBytes}).`,
      offset
    );
  }
  return Number(value);
}

function readFloat(state, offset)
{
  requireBytes(state, 8, offset);

  const view = new DataView(state.bytes.buffer, state.bytes.byteOffset + state.offset, 8);
  const result = view.getFloat64(0, false);
  state.offset += 8;

  if (!Number.isFinite(result))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_NUMBER_INVALID",
      "Pickle BINFLOAT must be finite for JSON-compatible output.",
      offset
    );
  }
  return result;
}

/**
 * Reads a little-endian two's-complement integer of arbitrary width, returning
 * a decimal string once it leaves the safe-integer range - the same fallback
 * protocol 0's LONG uses, so a long is spelled identically whichever protocol
 * carried it.
 */
function readLong(state, size, offset)
{
  if (size === 0) return 0;
  requireBytes(state, size, offset);

  let result = 0n;
  for (let index = size - 1; index >= 0; index -= 1)
  {
    result = (result << 8n) | BigInt(state.bytes[state.offset + index]);
  }
  if (state.bytes[state.offset + size - 1] & 0x80)
  {
    result -= 1n << BigInt(8 * size);
  }
  state.offset += size;

  if (result >= BigInt(Number.MIN_SAFE_INTEGER) && result <= BigInt(Number.MAX_SAFE_INTEGER))
  {
    return Number(result);
  }
  return result.toString();
}

function requireStringLength(state, length, offset)
{
  if (length > state.limits.maxStringBytes)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle string exceeds maxStringBytes (${state.limits.maxStringBytes}).`,
      offset
    );
  }
  requireBytes(state, length, offset);
}

function readText(state, length, offset)
{
  requireStringLength(state, length, offset);

  const bytes = state.bytes.subarray(state.offset, state.offset + length);
  state.offset += length;

  try
  {
    return UTF8.decode(bytes);
  }
  catch
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_STRING_INVALID",
      "Pickle unicode string is not valid UTF-8.",
      offset
    );
  }
}

function readLatin1(state, length, offset)
{
  requireStringLength(state, length, offset);

  let result = "";
  for (let index = 0; index < length; index += 1)
  {
    result += String.fromCharCode(state.bytes[state.offset + index]);
  }
  state.offset += length;
  return result;
}

function readBytes(state, length, offset)
{
  requireStringLength(state, length, offset);

  const result = state.bytes.slice(state.offset, state.offset + length);
  state.offset += length;
  return result;
}

function readShortTuple(state, size, offset)
{
  requireStack(state, size, offset);
  requireContainerLimit(state, size, offset);

  const values = state.stack.splice(state.stack.length - size, size);
  for (const value of values) rejectGlobalMarker(state, value, offset);
  state.containers.set(values, values.length);
  return values;
}

/** Reads a STACK_GLOBAL, and refuses every name outside the closed set. */
function readStackGlobal(state, offset)
{
  requireStack(state, 2, offset);

  const attribute = state.stack.pop();
  const module = state.stack.pop();

  if (typeof module !== "string" || typeof attribute !== "string")
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED",
      "Pickle STACK_GLOBAL requires a module and attribute name.",
      offset
    );
  }

  return createGlobalMarker(state, `${module}.${attribute}`, offset);
}

export default CjsPickleProtocol4Reader;
