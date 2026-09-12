// How a format's decoded record becomes JSON. Four policies, not one function.
//
// Twenty-seven formats each declared a local `toJsonValue`, and the obvious
// reading — twenty-seven copies of one helper — is wrong. They fall into four
// groups that give CONTRADICTORY output for the same input, and the contradiction
// is deliberate in every case. Collapsing them into one function with flags would
// have picked one group's answer and silently changed the other three.
//
// THE AXIS THEY DISAGREE ON IS BINARY DATA:
//
//   - A media or container reader is describing a file. Its `Uint8Array` is the
//     pixel or sample payload, often megabytes, and expanding it into a JSON
//     array produces an unreadable document nobody wanted. It reports the LENGTH.
//   - A geometry reader's typed arrays ARE the answer — vertices, indices, UVs.
//     Summarising them to a byte count throws away the document.
//
// Both are right for their own reader, which is why this file has two of them.
//
// The remaining two are the first policy's shape plus a capability its callers
// genuinely need: shader reflection carries `Map`, `Set` and `bigint`, and the
// Blue object graphs can contain cycles that must be refused rather than
// recursed into forever.
//
// TWO FORMATS DELIBERATELY KEEP THEIR OWN. `formats/fbx` renders a typed array as
// `{ type, length }` — naming the constructor, because an FBX array property's
// declared element type is a fact about the file worth reporting — and
// `formats/cmf` sits between two policies here. Neither has a second caller, so
// neither is a policy.
//
// No Carbon donor: Carbon persists through Blue, not JSON, so there is nothing
// here to port and nothing here claims to be a port.

/**
 * Convert a decoded record to JSON, reporting binary payloads by length.
 *
 * For readers whose `Uint8Array` is the file's bulk data rather than its
 * description: audio, video, images, and the Wwise containers. A byte array
 * becomes `{ byteLength }`.
 *
 * Note the check is `instanceof Uint8Array`, not `ArrayBuffer.isView` — so a
 * `Float32Array` falls through to the object branch and serialises by index.
 * That is the inherited behaviour of all fifteen callers, preserved rather than
 * quietly improved, because these records are compared in tests.
 *
 * @param {*} value Any decoded value.
 * @returns {*} A JSON-safe value.
 */
export function toJsonWithByteSummary(value)
{
    if (value instanceof Uint8Array) return { byteLength: value.byteLength };
    if (Array.isArray(value)) return value.map(toJsonWithByteSummary);
    if (value && typeof value === "object")
    {
        const output = {};
        for (const [ key, entry ] of Object.entries(value)) output[key] = toJsonWithByteSummary(entry);
        return output;
    }
    return value;
}

/**
 * Convert a decoded record to JSON, expanding typed arrays into values.
 *
 * For the geometry interchange readers, where the typed arrays are the document.
 * `DataView` is excluded because it is a window onto bytes rather than a
 * sequence of values.
 *
 * @param {*} value Any decoded value.
 * @returns {*} A JSON-safe value.
 */
export function toJsonWithArrayValues(value)
{
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;

    if (typeof value.toJSON === "function")
    {
        const next = value.toJSON();
        if (next !== value) return toJsonWithArrayValues(next);
    }

    if (Array.isArray(value)) return value.map(toJsonWithArrayValues);
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return Array.from(value);

    const out = {};
    for (const key of Object.keys(value))
    {
        out[key] = toJsonWithArrayValues(value[key]);
    }
    return out;
}

/**
 * Convert a decoded record to JSON, handling collections and big integers.
 *
 * For the shader readers, whose reflection graphs hold `Map` and `Set` and whose
 * register and hash values exceed the safe integer range. A `bigint` becomes a
 * STRING, deliberately: JSON has no integer wide enough, and a number would lose
 * digits without saying so.
 *
 * Anything it cannot represent — a function, a symbol — becomes `null` rather
 * than being passed through, so the output is always serialisable.
 *
 * @param {*} value Any decoded value.
 * @returns {*} A JSON-safe value.
 */
export function toJsonWithCollections(value)
{
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(toJsonWithCollections);
    if (value instanceof Map)
    {
        const out = {};
        for (const [ key, entry ] of value) out[key] = toJsonWithCollections(entry);
        return out;
    }
    if (value instanceof Set) return Array.from(value, toJsonWithCollections);
    if (typeof value === "object")
    {
        if (typeof value.toJSON === "function") return toJsonWithCollections(value.toJSON());
        const out = {};
        for (const key of Object.keys(value)) out[key] = toJsonWithCollections(value[key]);
        return out;
    }
    return null;
}

/**
 * Convert a decoded record to JSON, refusing a cycle.
 *
 * For the Blue graph transports, whose documents legitimately contain object
 * references and can therefore contain a loop. A cycle THROWS rather than being
 * pruned, because a silently truncated graph is indistinguishable from a graph
 * that was genuinely that shape.
 *
 * The guard is released on the way back out, so a node reachable twice by
 * different paths is not mistaken for a cycle.
 *
 * @param {*} value Any decoded value.
 * @param {string} [label] Name used in the cycle error, identifying the reader.
 * @param {WeakSet} [seen] Ancestors on the current path; supplied by recursion.
 * @returns {*} A JSON-safe value.
 * @throws {TypeError} The value contains a cycle.
 */
export function toJsonAcyclic(value, label = "Reader", seen = new WeakSet())
{
    if (value === null || typeof value !== "object") return value;

    // A typed array cannot hold a reference, so it cannot take part in a cycle
    // and needs no guard. It is tested before the guard for that reason only.
    if (ArrayBuffer.isView(value)) return Array.from(value, item => toJsonAcyclic(item, label, seen));

    // THE CYCLE CHECK MUST PRECEDE THE ARRAY BRANCH. It did not in the three
    // readers this policy replaced (black, red and gr2 were identical here): the
    // array branch returned before `seen` was ever consulted, so a cycle reached
    // through an array — `list.push(list)` — recursed until the stack overflowed
    // and raised `RangeError: Maximum call stack size exceeded` instead of the
    // intended `TypeError`. Fixed here rather than reproduced: this policy is
    // CarbonEngineJS's own (Carbon persists through Blue, not JSON), so there is
    // no donor behaviour to stay faithful to, and nothing can depend on the shape
    // of a stack overflow.
    if (seen.has(value))
    {
        throw new TypeError(`${label}.toJSON cannot convert circular data`);
    }

    if (Array.isArray(value))
    {
        seen.add(value);
        const out = value.map(item => toJsonAcyclic(item, label, seen));
        seen.delete(value);
        return out;
    }

    if (typeof value.toJSON === "function")
    {
        seen.add(value);
        const json = toJsonAcyclic(value.toJSON(), label, seen);
        seen.delete(value);
        return json;
    }

    seen.add(value);
    const out = {};
    for (const key of Object.keys(value))
    {
        out[key] = toJsonAcyclic(value[key], label, seen);
    }
    seen.delete(value);
    return out;
}
