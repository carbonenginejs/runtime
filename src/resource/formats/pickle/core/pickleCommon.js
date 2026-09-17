/**
 * The parts of an inert pickle decode that do not depend on how the opcodes
 * spell themselves.
 *
 * Pickle's text protocol (0) and its binary protocols (1-4) differ in how a
 * value is written down, not in what a decoded value is allowed to be. The
 * limits, the memo, the container bookkeeping, the dictionary-key rules, the
 * JSON compatibility check and - most importantly - the closed set of globals
 * this package will rebuild are properties of the data subset, so they live
 * here and every reader shares exactly one copy of them.
 *
 * Duplicating the refusal rules per protocol was the alternative, and it is the
 * one shape guaranteed to drift: a second reader that refuses slightly less is
 * indistinguishable from one that refuses correctly until the day it matters.
 */

export const MARK = Symbol("pickle-mark");

export const PICKLE_LIMITS = {
  maxContainerItems: 1000000,
  maxInputBytes: 32 * 1024 * 1024,
  maxMemoEntries: 500000,
  maxMemoID: 1000000,
  maxOperations: 2000000,
  maxStackDepth: 100000,
  maxStringBytes: 4 * 1024 * 1024
};

export const LIMIT_NAMES = Object.keys(PICKLE_LIMITS);

/**
 * The one closed set of globals this package will name, and how each rebuilds.
 *
 * `GLOBAL` (and its protocol-4 spelling `STACK_GLOBAL`) is the opcode that makes
 * a pickle dangerous: it names a module and an attribute for the unpickler to
 * import, and `REDUCE` then calls it. The general form stays refused, and
 * nothing here imports, resolves or invokes anything. What this table does
 * instead is recognize a fixed name and build the plain data it stands for.
 *
 * `collections.OrderedDict` earns its place because it is not a behaviour, it is
 * a dictionary that remembers insertion order - and a JavaScript object already
 * does. It is also, measured across every self-describing container CCP ships,
 * **the only global any of them uses**: 25 files, one name, once each. They use
 * it because a schema's attribute order is its field order, which is exactly the
 * property an ordinary dict would lose.
 *
 * **Adding to this table is not a small change.** A name belongs here only if
 * reconstructing it is pure data with no behaviour of its own, and the entry has
 * to build that data directly rather than defer to anything callable.
 */
export const REBUILDABLE_GLOBALS = new Map([
  [ "collections.OrderedDict", RebuildOrderedDict ]
]);

const GLOBAL_NAME = Symbol("pickle-global");

/**
 * Create the decoder state every reader drives.
 *
 * @param {Uint8Array} bytes Normalized input bytes.
 * @param {object} limits Normalized limits.
 * @param {number} protocol Protocol number reported on errors.
 * @returns {object} Decoder state.
 */
export function createState(bytes, limits, protocol)
{
  return {
    bytes,
    containers: new WeakMap(),
    dictionaryKeys: new WeakMap(),
    limits,
    lists: new WeakSet(),
    marks: [],
    memo: new Map(),
    offset: 0,
    operations: 0,
    protocol,
    // Every global marker created, and separately those no REDUCE has consumed.
    // A marker is a decoding artifact, never data: it may sit on the stack and
    // in the memo on its way to a REDUCE, and it may reach nothing else.
    globalMarkers: new WeakSet(),
    pendingGlobals: new Set(),
    // Properties built by REDUCE across the WHOLE decode, not per container.
    rebuiltItems: 0,
    stack: []
  };
}

/**
 * Charge one opcode against the operation budget.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 */
export function chargeOperation(state, offset)
{
  state.operations += 1;
  if (state.operations > state.limits.maxOperations)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle operation count exceeds maxOperations (${state.limits.maxOperations}).`,
      offset
    );
  }
}

/**
 * Validate the stack at STOP and return the decoded root.
 *
 * @param {object} state Decoder state.
 * @param {number} offset STOP offset.
 * @returns {*} Decoded root value.
 */
export function stop(state, offset)
{
  // A GLOBAL that no REDUCE consumed would otherwise reach the caller as an
  // empty object, indistinguishable from an empty dictionary.
  if (state.pendingGlobals.size)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED",
      "Pickle names a global that no REDUCE consumes.",
      offset
    );
  }
  rejectGlobalMarker(state, state.stack[0], offset);
  if (state.marks.length || state.stack.length !== 1 || state.stack[0] === MARK)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_STACK_INVALID",
      "Pickle STOP requires one completed value and no open marks.",
      offset
    );
  }
  if (state.offset !== state.bytes.byteLength)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_TRAILING_DATA",
      "Pickle input contains bytes after STOP.",
      state.offset
    );
  }
  return state.stack[0];
}

/**
 * Build a list or tuple from the values above the open mark.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 * @param {boolean} isList Whether the result accepts APPEND.
 * @returns {Array} Decoded sequence.
 */
export function readSequence(state, offset, isList)
{
  const values = popMarkedValues(state, offset);
  requireContainerLimit(state, values.length, offset);
  state.containers.set(values, values.length);
  if (isList) state.lists.add(values);
  return values;
}

/**
 * Build a dictionary from the key/value pairs above the open mark.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 * @returns {object} Decoded dictionary.
 */
export function readDictionary(state, offset)
{
  const values = popMarkedValues(state, offset);
  if (values.length % 2 !== 0)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_CONTAINER_INVALID",
      "Pickle DICT requires key/value pairs.",
      offset
    );
  }

  requireContainerLimit(state, values.length / 2, offset);
  const result = {};
  let count = 0;
  state.dictionaryKeys.set(result, new Map());

  for (let index = 0; index < values.length; index += 2)
  {
    count = defineDictionaryValue(
      state,
      result,
      values[index],
      values[index + 1],
      count,
      offset
    );
  }
  state.containers.set(result, count);
  return result;
}

/**
 * Create an empty list, tuple or dictionary the binary protocols push directly.
 *
 * @param {object} state Decoder state.
 * @param {"list"|"tuple"|"dictionary"} kind Container kind.
 * @returns {Array|object} Empty container.
 */
export function createEmptyContainer(state, kind)
{
  if (kind === "dictionary")
  {
    const result = {};
    state.dictionaryKeys.set(result, new Map());
    state.containers.set(result, 0);
    return result;
  }

  const result = [];
  state.containers.set(result, 0);
  if (kind === "list") state.lists.add(result);
  return result;
}

/**
 * Append one value to a decoded list.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 */
export function append(state, offset)
{
  requireStack(state, 2, offset);
  const value = rejectGlobalMarker(state, state.stack.pop(), offset);
  appendValue(state, state.stack[state.stack.length - 1], value, offset);
}

/**
 * Append every value above the open mark to the list beneath it.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 */
export function appendItems(state, offset)
{
  const values = popMarkedValues(state, offset);
  requireStack(state, 1, offset);
  const target = state.stack[state.stack.length - 1];
  for (const value of values) appendValue(state, target, value, offset);
}

function appendValue(state, target, value, offset)
{
  if (!Array.isArray(target) || !state.lists.has(target))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_CONTAINER_INVALID",
      "Pickle APPEND target must be a list.",
      offset
    );
  }

  requireContainerLimit(state, target.length + 1, offset);
  target.push(value);
  state.containers.set(target, target.length);
}

/**
 * Store one key/value pair into the dictionary beneath them.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 */
export function setItem(state, offset)
{
  requireStack(state, 3, offset);
  const value = rejectGlobalMarker(state, state.stack.pop(), offset);
  const key = state.stack.pop();
  setItemValue(state, state.stack[state.stack.length - 1], key, value, offset);
}

/**
 * Store every key/value pair above the open mark into the dictionary beneath.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 */
export function setItems(state, offset)
{
  const values = popMarkedValues(state, offset);
  if (values.length % 2 !== 0)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_CONTAINER_INVALID",
      "Pickle SETITEMS requires key/value pairs.",
      offset
    );
  }
  requireStack(state, 1, offset);
  const target = state.stack[state.stack.length - 1];
  for (let index = 0; index < values.length; index += 2)
  {
    setItemValue(state, target, values[index], values[index + 1], offset);
  }
}

function setItemValue(state, target, key, value, offset)
{
  if (!isDictionary(target))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_CONTAINER_INVALID",
      "Pickle SETITEM target must be a dictionary.",
      offset
    );
  }

  const count = defineDictionaryValue(
    state,
    target,
    key,
    value,
    state.containers.get(target) ?? Object.keys(target).length,
    offset
  );
  requireContainerLimit(state, count, offset);
  state.containers.set(target, count);
}

/**
 * Define one decoded dictionary property, refusing keys JSON cannot separate.
 *
 * @param {object} state Decoder state.
 * @param {object} target Dictionary being built.
 * @param {*} key Decoded key.
 * @param {*} value Decoded value.
 * @param {number} count Property count so far.
 * @param {number} offset Opcode offset.
 * @returns {number} Updated property count.
 */
export function defineDictionaryValue(state, target, key, value, count, offset)
{
  const normalized = normalizeDictionaryKey(state, key, offset);
  const keyTypes = state.dictionaryKeys.get(target) ?? new Map();
  const previousType = keyTypes.get(normalized.value);
  if (previousType && previousType !== normalized.type)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_CONTAINER_INVALID",
      `Pickle dictionary keys collide after JSON normalization: ${JSON.stringify(normalized.value)}.`,
      offset
    );
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

function normalizeDictionaryKey(state, key, offset)
{
  if (typeof key === "string") return { type: "string", value: key };
  if (typeof key === "number" && Number.isSafeInteger(key))
  {
    return { type: "integer", value: String(key) };
  }
  throw stateError(
    state,
    "CJS_PICKLE_FORMAT_CONTAINER_INVALID",
    "Data-only pickle dictionaries require string or safe-integer keys.",
    offset
  );
}

/**
 * Store the value on top of the stack under a memo ID.
 *
 * @param {object} state Decoder state.
 * @param {number} id Memo ID.
 * @param {number} offset Opcode offset.
 */
export function putMemo(state, id, offset)
{
  requireStack(state, 1, offset);
  if (state.stack[state.stack.length - 1] === MARK)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_MARK_INVALID",
      "Pickle MARK cannot be stored in the memo.",
      offset
    );
  }
  requireMemoID(state, id, offset);
  if (!state.memo.has(id) && state.memo.size >= state.limits.maxMemoEntries)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle memo exceeds maxMemoEntries (${state.limits.maxMemoEntries}).`,
      offset
    );
  }
  state.memo.set(id, state.stack[state.stack.length - 1]);
}

/**
 * Push the value stored under a memo ID.
 *
 * @param {object} state Decoder state.
 * @param {number} id Memo ID.
 * @param {number} offset Opcode offset.
 */
export function getMemo(state, id, offset)
{
  requireMemoID(state, id, offset);
  if (!state.memo.has(id))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_MEMO_INVALID",
      `Pickle memo entry ${id} does not exist.`,
      offset
    );
  }
  push(state, state.memo.get(id), offset);
}

/**
 * Reject a memo ID outside the configured bound.
 *
 * @param {object} state Decoder state.
 * @param {number} id Memo ID.
 * @param {number} offset Opcode offset.
 */
export function requireMemoID(state, id, offset)
{
  if (!Number.isSafeInteger(id) || id < 0 || id > state.limits.maxMemoID)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle memo ID exceeds maxMemoID (${state.limits.maxMemoID}).`,
      offset
    );
  }
}

/**
 * Create the inert marker a REDUCE may later consume, refusing every name
 * outside the closed set.
 *
 * @param {object} state Decoder state.
 * @param {string} name Dotted module and attribute name.
 * @param {number} offset Opcode offset.
 * @returns {object} Global marker.
 */
export function createGlobalMarker(state, name, offset)
{
  if (!REBUILDABLE_GLOBALS.has(name))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED",
      `Data-only pickle rejects the global ${JSON.stringify(name)}. `
        + "Only a closed set of pure-data containers can be rebuilt, and this is not one.",
      offset
    );
  }

  const marker = { [GLOBAL_NAME]: name };

  state.globalMarkers.add(marker);
  state.pendingGlobals.add(marker);

  return marker;
}

/** Rebuilds one allowed global from its arguments. Calls nothing. */
export function reduce(state, offset)
{
  const args = state.stack.pop();
  const callable = state.stack.pop();
  const name = callable && typeof callable === "object" ? callable[GLOBAL_NAME] : undefined;

  if (!name || !REBUILDABLE_GLOBALS.has(name))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_REDUCE_INVALID",
      "Pickle REDUCE applies only to a global this reader can rebuild.",
      offset
    );
  }

  if (!Array.isArray(args))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_REDUCE_INVALID",
      "Pickle REDUCE requires an argument tuple.",
      offset
    );
  }

  state.pendingGlobals.delete(callable);
  push(state, REBUILDABLE_GLOBALS.get(name)(args, state, offset), offset);
}

/**
 * Rebuilds `OrderedDict(pairs)` as a plain object.
 *
 * JavaScript preserves the insertion order of string keys, but NOT of keys that
 * look like array indices - those sort ahead of everything else, in ascending
 * numeric order. Refusing every numeric key was too blunt: real containers use
 * them, and where they already ascend the object's order is the source's order
 * and nothing is lost.
 *
 * So the order is checked rather than the keys. The result is compared against
 * the order it was built in, and only a dictionary JavaScript would actually
 * reorder is refused.
 */
function RebuildOrderedDict(args, state, offset)
{
  const pairs = args.length ? args[0] : [];

  if (!Array.isArray(pairs))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_REDUCE_INVALID",
      "An ordered dictionary is rebuilt from a list of key/value pairs.",
      offset
    );
  }

  requireContainerLimit(state, pairs.length, offset);

  const order = [];

  // A per-container check is not enough here. REDUCE is the only path that
  // builds N properties for a constant number of opcodes, so a memoized pair
  // list rebuilt in a loop multiplies `maxOperations` by `maxContainerItems`
  // instead of being bounded by either. A decode-wide budget is what bounds it.
  state.rebuiltItems += pairs.length;

  if (state.rebuiltItems > state.limits.maxContainerItems)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Rebuilt items exceed maxContainerItems (${state.limits.maxContainerItems}) across the decode.`,
      offset
    );
  }

  const result = {};

  for (const pair of pairs)
  {
    if (!Array.isArray(pair) || pair.length !== 2)
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_REDUCE_INVALID",
        "An ordered dictionary entry must be a key/value pair.",
        offset
      );
    }

    const key = pair[0];

    if (typeof key !== "string")
    {
      throw stateError(
        state,
        "CJS_PICKLE_FORMAT_REDUCE_INVALID",
        "An ordered dictionary key must be a string.",
        offset
      );
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
  const expected = [ ...new Set(order) ];
  const kept = Object.keys(result);

  if (kept.length !== expected.length || kept.some((key, index) => key !== expected[index])) {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_REDUCE_INVALID",
      "An ordered dictionary's key order would not survive as a JavaScript object.",
      offset
    );
  }

  return result;
}

/**
 * Refuses a global marker anywhere a decoded value is stored or returned.
 *
 * Consuming a marker with REDUCE is the only thing it is for. Appended to a
 * list, set as a dictionary value or left as the result, it would reach the
 * caller as `{}` - indistinguishable from an empty dictionary, and buryable
 * anywhere in the graph through the memo.
 */
export function rejectGlobalMarker(state, value, offset)
{
  if (value && typeof value === "object" && state.globalMarkers.has(value))
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_GLOBAL_UNSUPPORTED",
      "A pickle global is only usable as the target of a REDUCE.",
      offset
    );
  }

  return value;
}

/**
 * Pop every value above the most recent open mark.
 *
 * @param {object} state Decoder state.
 * @param {number} offset Opcode offset.
 * @returns {Array} Popped values.
 */
export function popMarkedValues(state, offset)
{
  if (!state.marks.length)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_MARK_INVALID",
      "Pickle container has no matching MARK.",
      offset
    );
  }

  const mark = state.marks.pop();
  if (state.stack[mark] !== MARK)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_MARK_INVALID",
      "Pickle MARK stack is inconsistent.",
      offset
    );
  }

  const values = state.stack.slice(mark + 1);
  state.stack.length = mark;
  for (const value of values) rejectGlobalMarker(state, value, offset);
  return values;
}

/**
 * Push one decoded value, bounded by the stack-depth limit.
 *
 * @param {object} state Decoder state.
 * @param {*} value Value to push.
 * @param {number} offset Opcode offset.
 */
export function push(state, value, offset)
{
  if (state.stack.length >= state.limits.maxStackDepth)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle stack exceeds maxStackDepth (${state.limits.maxStackDepth}).`,
      offset
    );
  }
  state.stack.push(value);
}

/**
 * Require a minimum stack depth for an opcode.
 *
 * @param {object} state Decoder state.
 * @param {number} count Required depth.
 * @param {number} offset Opcode offset.
 */
export function requireStack(state, count, offset)
{
  if (state.stack.length < count)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_STACK_INVALID",
      `Pickle opcode requires ${count} stack values.`,
      offset
    );
  }
}

/**
 * Bound one container's item count.
 *
 * @param {object} state Decoder state.
 * @param {number} count Item count.
 * @param {number} offset Opcode offset.
 */
export function requireContainerLimit(state, count, offset)
{
  if (count > state.limits.maxContainerItems)
  {
    throw stateError(
      state,
      "CJS_PICKLE_FORMAT_LIMIT_EXCEEDED",
      `Pickle container exceeds maxContainerItems (${state.limits.maxContainerItems}).`,
      offset
    );
  }
}

/**
 * Verify that a decoded value can cross the JSON boundary unchanged.
 *
 * @param {*} value Candidate decoded graph.
 */
export function assertJSONCompatible(value)
{
  const active = new WeakSet();
  const verified = new WeakSet();
  const pending = [ { exit: false, value } ];

  while (pending.length)
  {
    const item = pending.pop();
    const current = item.value;
    if (current === null
      || typeof current === "string"
      || typeof current === "boolean")
    {
      continue;
    }
    if (typeof current === "number")
    {
      if (!Number.isFinite(current))
      {
        throw pickleError(
          "CJS_PICKLE_FORMAT_JSON_INVALID",
          "Pickle output contains a non-finite number.",
          null
        );
      }
      continue;
    }
    if (!current || typeof current !== "object")
    {
      throw pickleError(
        "CJS_PICKLE_FORMAT_JSON_INVALID",
        `Pickle output contains unsupported ${typeof current} data.`,
        null
      );
    }
    if (item.exit)
    {
      active.delete(current);
      verified.add(current);
      continue;
    }
    if (verified.has(current)) continue;
    if (active.has(current))
    {
      throw pickleError(
        "CJS_PICKLE_FORMAT_JSON_INVALID",
        "Pickle output contains a cyclic reference.",
        null
      );
    }

    active.add(current);
    pending.push({ exit: true, value: current });

    if (Array.isArray(current))
    {
      for (let index = current.length - 1; index >= 0; index -= 1)
      {
        pending.push({ exit: false, value: current[index] });
      }
    }
    else if (Object.getPrototypeOf(current) === Object.prototype)
    {
      const keys = Object.keys(current);
      for (let index = keys.length - 1; index >= 0; index -= 1)
      {
        pending.push({ exit: false, value: current[keys[index]] });
      }
    }
    else
    {
      throw pickleError(
        "CJS_PICKLE_FORMAT_JSON_INVALID",
        "Pickle output contains a non-plain object.",
        null
      );
    }
  }
}

/**
 * Normalize an input byte source.
 *
 * @param {ArrayBuffer|ArrayBufferView} input Pickle bytes.
 * @returns {Uint8Array} Byte view.
 */
export function normalizeBytes(input)
{
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input))
  {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw pickleError(
    "CJS_PICKLE_FORMAT_INPUT_INVALID",
    "Pickle input must be an ArrayBuffer or an ArrayBuffer view.",
    0
  );
}

/**
 * Normalize decoder limits, rejecting unknown names.
 *
 * @param {object} options Partial limits.
 * @returns {object} Complete limits.
 */
export function normalizeLimits(options)
{
  if (!options || typeof options !== "object" || Array.isArray(options))
  {
    throw pickleError(
      "CJS_PICKLE_FORMAT_LIMIT_INVALID",
      "Pickle limits must be an object.",
      0
    );
  }

  for (const name of Object.keys(options))
  {
    if (!LIMIT_NAMES.includes(name))
    {
      throw pickleError(
        "CJS_PICKLE_FORMAT_LIMIT_INVALID",
        `Pickle limits contain unknown value ${JSON.stringify(name)}.`,
        0
      );
    }
  }

  const result = {};
  for (const name of LIMIT_NAMES)
  {
    const value = options[name] ?? PICKLE_LIMITS[name];
    if (!Number.isSafeInteger(value) || value <= 0)
    {
      throw pickleError(
        "CJS_PICKLE_FORMAT_LIMIT_INVALID",
        `Pickle ${name} must be a positive safe integer.`,
        0
      );
    }
    result[name] = value;
  }
  return result;
}

/**
 * Whether a decoded value is one of this reader's dictionaries.
 *
 * @param {*} value Candidate value.
 * @returns {boolean} True for a plain decoded dictionary.
 */
export function isDictionary(value)
{
  return Boolean(value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype);
}

/**
 * Render an opcode byte for an error message.
 *
 * @param {number} value Opcode byte.
 * @returns {string} Printable opcode.
 */
export function displayOpcode(value)
{
  if (value >= 0x20 && value <= 0x7e)
  {
    return JSON.stringify(String.fromCharCode(value));
  }
  return `0x${value.toString(16).padStart(2, "0")}`;
}

/**
 * Build a decode error carrying its offset and protocol.
 *
 * @param {string} code Stable error code.
 * @param {string} message Human-readable message.
 * @param {number|null} offset Byte offset, or null when not byte-addressed.
 * @param {number} [protocol] Protocol number.
 * @returns {Error} Decode error.
 */
export function pickleError(code, message, offset, protocol = 0)
{
  const error = new Error(message);
  error.code = code;
  error.protocol = protocol;
  if (offset !== null) error.offset = offset;
  return error;
}

/**
 * Build a decode error for the protocol the state is decoding.
 *
 * @param {object} state Decoder state.
 * @param {string} code Stable error code.
 * @param {string} message Human-readable message.
 * @param {number|null} offset Byte offset.
 * @returns {Error} Decode error.
 */
export function stateError(state, code, message, offset)
{
  return pickleError(code, message, offset, state.protocol);
}
