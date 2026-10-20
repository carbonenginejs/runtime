import { CjsCarbonEffectReader } from "../carbonEffect/CjsCarbonEffectReader.js";

const headers = new WeakMap();

/**
 * Read format header facts over a canonical resource's existing byte buffer.
 *
 * The reader here is header-only. Body decoding and caching belong to
 * Tr2EffectRes, and no private reader or new resource API is involved. Reloading
 * a resource with another buffer invalidates this format-local header cache.
 * @param {object} effectRes Loaded Tr2EffectRes.
 * @returns {object} Header fields used by the effect formats.
 */
export function effectHeader(effectRes)
{
    const bytes = effectRes.GetContainerBytes();
    const payload = effectRes.GetPayload();
    const previous = headers.get(effectRes);
    if (previous?.bytes === bytes && previous.payload === payload) return previous.header;

    const reader = new CjsCarbonEffectReader(bytes);
    const versionBytes = reader.compilerVersion;
    const header = {
        bytes,
        version: reader.version,
        compilerVersion: versionBytes
            ? (versionBytes[0] | (versionBytes[1] << 8) | (versionBytes[2] << 16) | (versionBytes[3] << 24)) >>> 0
            : null,
        compilerVersionBytes: versionBytes,
        sourceHash: reader.sourceHash,
        stringTableSize: reader.stringTableSize,
        records: reader.records,
        permutations: reader.permutations.map(axis => ({
            name: axis.name.value,
            options: axis.options.map(option => option.value),
            defaultOption: axis.defaultOption,
            description: axis.description.value,
            type: axis.type
        }))
    };
    headers.set(effectRes, { bytes, payload, header });
    return header;
}
