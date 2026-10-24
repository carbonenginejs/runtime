const headers = new WeakMap();

/**
 * Project header facts from the existing container reader without decoding bodies.
 * @param {object} reader Carbon effect reader.
 * @returns {object} Header fields used by effect tooling.
 */
export function effectHeader(reader)
{
    const previous = headers.get(reader);
    if (previous) return previous;
    const versionBytes = reader.compilerVersion;
    const header = {
        bytes: reader.bytes,
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
    headers.set(reader, header);
    return header;
}
