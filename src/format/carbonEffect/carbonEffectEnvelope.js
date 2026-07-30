import { CjsFormatReadError, CjsFormatWriteError } from "../CjsFormatError.js";
import { CARBON_EFFECT_DATA_VERSION } from "./carbonEffectRecords.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: false });

/** Envelope byte count: `magic(4) | u32 containerVersion | u32 payloadKind`. */
export const CARBON_EFFECT_ENVELOPE_BYTES = 12;

/**
 * Payload kinds. One header field, never per stage: Carbon demonstrably has no
 * per-stage language tag — `EffectCompilerMetal.cpp:5155-5156` stores compiled
 * AIR through the same `StageInput::Save` slot as DXBC with no language field,
 * and the platform is recovered from the resource path instead
 * (`Tr2Effect::ConvertEffectPath`, `Tr2Effect.cpp:320-340`).
 */
export const CARBON_EFFECT_PAYLOAD_KIND = Object.freeze({
    DXBC: 0,
    WGSL: 1,
    GLSL: 2,
    AIR: 3
});

/**
 * Writes the twelve-byte envelope that precedes Carbon's layout in our own
 * containers.
 *
 * The envelope is the one deliberate divergence from Carbon, and it is provably
 * disjoint from a Carbon file rather than merely unlikely to collide. A Carbon
 * file's first dword is its version, constrained to 2..15
 * (`Tr2EffectRes.cpp:209`), so byte 0 is at most `0x0f` and bytes 1..3 are zero.
 * Any printable-ASCII magic has every byte at or above `0x20`. No Carbon file
 * can be mistaken for an enveloped one in either direction, and no version bump
 * inside Carbon's `u32` can change that.
 *
 * @param {import("../CjsByteWriter.js").CjsByteWriter} writer Target writer.
 * @param {object} envelope Envelope fields.
 * @param {string} envelope.magic Four printable-ASCII characters.
 * @param {number} envelope.containerVersion Our container version.
 * @param {number} envelope.payloadKind Value from `CARBON_EFFECT_PAYLOAD_KIND`.
 */
export function writeCarbonEffectEnvelope(writer, envelope)
{
    const magic = textEncoder.encode(String(envelope.magic ?? ""));
    if (magic.length !== 4)
    {
        throw new CjsFormatWriteError("Container magic must be exactly 4 bytes", {
            magic: envelope.magic
        });
    }
    for (const byte of magic)
    {
        if (byte < 0x20 || byte > 0x7e)
        {
            throw new CjsFormatWriteError(
                "Container magic must be printable ASCII so it cannot collide with a Carbon version dword",
                { magic: envelope.magic }
            );
        }
    }
    writer.bytes(magic);
    writer.u32(envelope.containerVersion);
    writer.u32(envelope.payloadKind);
}

/**
 * Reads and validates the envelope, leaving the reader positioned at Carbon's
 * version dword.
 *
 * @param {import("../CjsByteReader.js").CjsByteReader} reader Source reader.
 * @param {object} expected Expected envelope.
 * @param {string} expected.magic Four printable-ASCII characters.
 * @param {number} expected.containerVersion Supported container version.
 * @returns {{magic:string, containerVersion:number, payloadKind:number}} Envelope fields.
 */
export function readCarbonEffectEnvelope(reader, expected)
{
    const magic = textDecoder.decode(reader.readRaw(4));
    if (magic !== expected.magic)
    {
        throw new CjsFormatReadError(`Unexpected container magic "${magic}"`, {
            source: reader.source,
            magic,
            expected: expected.magic
        });
    }
    const containerVersion = reader.readUint32();
    if (expected.containerVersion !== undefined && containerVersion !== expected.containerVersion)
    {
        throw new CjsFormatReadError(
            `Unsupported container version ${containerVersion}; expected ${expected.containerVersion}`,
            { source: reader.source, containerVersion, expected: expected.containerVersion }
        );
    }
    return { magic, containerVersion, payloadKind: reader.readUint32() };
}

/**
 * Reports whether bytes begin with a bare Carbon container rather than an
 * enveloped one.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when the first dword is a Carbon effect version.
 */
export function looksLikeBareCarbonEffect(bytes)
{
    if (bytes.length < 4) return false;
    return bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 0
        && bytes[0] >= 2 && bytes[0] <= CARBON_EFFECT_DATA_VERSION;
}
