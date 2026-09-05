// Every FNV hash this runtime computes, in one module named for the algorithm.
//
// TWO FAMILIES, DIFFERENT JOBS, AND THE DIFFERENCE MATTERS:
//
//   - `fnv164` is a WIRE ABI. Its output addresses a real file on CCP's
//     servers, so its width, its byte order and its ASCII contract are fixed
//     by evidence and may never be "improved".
//   - the 32-bit family is IN-PROCESS ONLY - Carbon's `CcpHashFNV1`, used for
//     parameter content hashes and resource-set hashes. It must never be
//     persisted or compared across processes.
//
// They live together because they are the same algorithm at two widths, and
// because the alternative is what was here before: one in `resFile.js`, one on
// `CjsParameter`, no cross-reference, and a third about to be written.
//
// Per-format FNV constants elsewhere (bnk, the CMF writer, the string table,
// wwiseRoomVerb) are wire ABIs of THEIR formats and stay where they are.
//
// Source: Carbon `CcpHashFNV1` (blue).
//
// WHY THE 32-BIT FAMILY MOVED HERE. These four were statics on `CjsParameter`, which was the
// right home while the shader parameters were the only caller. The abstraction
// layer became a second caller on 2026-09-06 (`ComputeHash`), and an AL class
// importing a shader class to borrow a hash inverts the layering — the AL sits
// UNDER Trinity's shader code, not over it.
//
// `CjsParameter` keeps its four statics and delegates, so nothing that reads
// `CjsParameter.hashFnv1String` had to change.
//
// TWO DELIBERATE DIVERGENCES FROM CARBON, both forced and both already
// documented where they were: Carbon hashes interned name POINTERS and struct
// bytes; JavaScript has no address, so a string hashes by its characters and an
// object by a stable interned identity. The contract that matters — equal
// content gives an equal hash WITHIN a session — holds. The numeric values do
// not match Carbon's and are not portable across processes, so they must never
// be persisted or sent over a wire.

/** Carbon's FNV-1 offset basis. */
export const FNV1_INITIAL = 2166136261;

const PRIME = 16777619;

const scratch = new DataView(new ArrayBuffer(4));

const identities = new WeakMap();

let nextIdentity = 1;

function fold(hash, byte)
{
  return (Math.imul(hash, PRIME) ^ byte) >>> 0;
}

/**
 * FNV-1 over a string's UTF-16 code units, two bytes each, little-endian.
 *
 * @param {string} text The text to fold in.
 * @param {number} [hash] The hash so far.
 * @returns {number} An unsigned 32-bit hash.
 */
export function hashFnv1String(text, hash = FNV1_INITIAL)
{
  const value = String(text ?? "");

  for (let index = 0; index < value.length; index++)
  {
    const code = value.charCodeAt(index);

    hash = fold(hash, code & 0xff);
    hash = fold(hash, code >>> 8);
  }

  return hash >>> 0;
}

/**
 * FNV-1 over numbers encoded as little-endian float32 bytes.
 *
 * @param {Iterable<number>} values The numbers to fold in.
 * @param {number} [hash] The hash so far.
 * @returns {number} An unsigned 32-bit hash.
 */
export function hashFnv1Floats(values, hash = FNV1_INITIAL)
{
  for (const value of values)
  {
    scratch.setFloat32(0, Number(value) || 0, true);

    for (let byte = 0; byte < 4; byte++) hash = fold(hash, scratch.getUint8(byte));
  }

  return hash >>> 0;
}

/**
 * FNV-1 over a stable per-object identity - the stand-in for Carbon hashing a
 * smart-pointer address. Null and undefined hash as identity 0.
 *
 * @param {object|null} object The object to fold in.
 * @param {number} [hash] The hash so far.
 * @returns {number} An unsigned 32-bit hash.
 */
export function hashFnv1Identity(object, hash = FNV1_INITIAL)
{
  let id = 0;

  if (object !== null && object !== undefined)
  {
    id = identities.get(object);

    if (id === undefined)
    {
      id = nextIdentity++;
      identities.set(object, id);
    }
  }

  scratch.setUint32(0, id >>> 0, true);

  for (let byte = 0; byte < 4; byte++) hash = fold(hash, scratch.getUint8(byte));

  return hash >>> 0;
}


// Lazily built byte-to-hex table, for the 64-bit path hash below.
let hex = null;


/**
 * FNV-1 (64-bit) over a resource's logical path.
 *
 * FNV-**1**, not 1a: the multiply happens before the XOR. Offset basis
 * 0xcbf29ce484222325, prime 0x100000001b3, emitted as 16 lowercase hex digits.
 *
 * Verified against 1718 content-addressed entries from a real resfileindex.
 *
 * ONLY DEFINED FOR ASCII PATHS. Two implementations exist in the wild - one
 * hashing UTF-8 bytes, one hashing UTF-16 code units - and they agree on every
 * ASCII string and disagree beyond it. No real resource path has ever been
 * non-ASCII, so no evidence exists for which is correct, and guessing would
 * turn a dormant difference into a live wrong answer. A non-ASCII path
 * therefore throws rather than returning something plausible.
 *
 * @param {String} logicalPath - the prefixed path, e.g. "res:/graphics/x.dds"
 * @returns {String} 16 lowercase hex digits
 */
export function fnv164(logicalPath)
{
    const value = String(logicalPath);

    if (!hex)
    {
        hex = [];
        for (let i = 0; i < 256; i++) hex[i] = ((i >> 4) & 15).toString(16) + (i & 15).toString(16);
    }

    // 16-bit limbs, so the 64-bit multiply stays inside the safe integer range.
    let v0 = 0x2325;
    let v1 = 0x8422;
    let v2 = 0x9ce4;
    let v3 = 0xcbf2;

    for (let i = 0; i < value.length; i++)
    {
        const code = value.charCodeAt(i);

        if (code > 0x7f)
        {
            throw new RangeError(
                `Resource path hashing is only defined for ASCII: ${JSON.stringify(value)}`,
            );
        }

        // Multiply by 0x100000001b3: the low limb contributes 0x1b3 (435) to
        // every limb, and the 0x100000000 term shifts two limbs left.
        let t0 = v0 * 435;
        let t1 = v1 * 435;
        let t2 = v2 * 435 + (v0 << 8);
        const t3 = v3 * 435 + (v1 << 8);

        t1 += t0 >>> 16;
        v0 = t0 & 0xffff;
        t2 += t1 >>> 16;
        v1 = t1 & 0xffff;
        v3 = (t3 + (t2 >>> 16)) & 0xffff;
        v2 = t2 & 0xffff;

        v0 ^= code;
    }

    return hex[v3 >> 8] + hex[v3 & 255]
        + hex[v2 >> 8] + hex[v2 & 255]
        + hex[v1 >> 8] + hex[v1 & 255]
        + hex[v0 >> 8] + hex[v0 & 255];
}
