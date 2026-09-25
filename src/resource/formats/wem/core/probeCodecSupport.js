// Works out a WEM's real codec from its bytes, because the codec tag in the
// `fmt ` header is only a claim: a WEM can say one codec and hold another.
// Each candidate codec gets ONE bounded structural check against the actual
// container facts - no audio is decoded:
//
// - wwise-vorbis: the Wwise Vorbis sidecar must exist (vorb chunk or inline
//   fmt-0x42 layout) with a positive sample count and data payload;
// - wwise-ptadpcm: the frame layout must satisfy the decoder's own guard
//   (blockAlign = frameSize * channels, frameSize >= 6) with block-aligned
//   data;
// - pcm / pcm-extensible: 16-bit with self-consistent blockAlign/byteRate
//   and sample-aligned data.
//
// The declared codec is tried FIRST; if its check fails (a mislabelled
// header), the other candidates are tried in order. The report carries
// `declared`, `resolved` and `mismatch`, so the caller can see both what the
// file claims and what it is.
//
// `toOgg`/`toPcm` decode by the declared tag (and `wemToOgg` also rejects any
// tag other than Wwise Vorbis), so they cannot convert a file this probe
// reports with `mismatch: true`; `resolved` names the decoder its bytes need.
//
// All 8,987 embedded wems in EVE build 3435006 declared their codec correctly,
// so a mismatch is the exception; the check makes that true per file rather
// than assumed for the whole corpus.
import { inspectWithValues } from "./helpers.js";

const CANDIDATES = [ "wwise-vorbis", "wwise-ptadpcm", "pcm" ];

function validateVorbis(metadata)
{
    if (metadata.codec === "wwise-vorbis")
    {
        return metadata.vorbis !== null && metadata.sampleCount > 0 && metadata.dataBytes > 0;
    }
    // Mislabeled tag: inspect() only fills `vorbis` when the tag says so, but
    // the chunk walk always records a standalone vorb sidecar chunk.
    return (metadata.chunks ?? []).some(chunk => chunk.id === "vorb") && metadata.dataBytes > 0;
}

function validatePtadpcm(metadata)
{
    const channels = metadata.channels;
    const frameSize = channels > 0 ? Math.floor(metadata.blockAlign / channels) : 0;
    return channels >= 1
        && frameSize >= 6
        && metadata.blockAlign === frameSize * channels
        && metadata.dataBytes >= metadata.blockAlign
        && metadata.dataBytes % metadata.blockAlign === 0;
}

function validatePcm(metadata)
{
    return metadata.bitsPerSample === 16
        && metadata.channels >= 1
        && metadata.blockAlign === metadata.channels * 2
        && metadata.byteRate === metadata.sampleRate * metadata.blockAlign
        && metadata.dataBytes > 0
        && metadata.dataBytes % metadata.blockAlign === 0;
}

function validate(candidate, metadata)
{
    if (candidate === "wwise-vorbis") return validateVorbis(metadata);
    if (candidate === "wwise-ptadpcm") return validatePtadpcm(metadata);
    return validatePcm(metadata);
}

function candidateFor(codec)
{
    if (codec === "pcm-extensible") return "pcm";
    return CANDIDATES.includes(codec) ? codec : null;
}

function emitFor(candidate)
{
    if (candidate === "wwise-vorbis") return "ogg";
    if (candidate === "wwise-ptadpcm" || candidate === "pcm") return "pcm";
    return "raw";
}

/**
 * Resolve a wem's actual decode route from content, not just its fmt tag.
 *
 * @param {*} input Wem bytes.
 * @param {object} values Normalized read values.
 * @returns {object} Probe-shaped report with declared/resolved/mismatch
 *   evidence in `metadata`.
 */
export function probeCodecSupportWithValues(input, values)
{
    const metadata = inspectWithValues(input, values);
    const declared = metadata.codec || null;
    let resolved = null;
    const declaredCandidate = candidateFor(declared);
    if (declaredCandidate && validate(declaredCandidate, metadata))
    {
        resolved = declaredCandidate;
    }
    else
    {
        for (const candidate of CANDIDATES)
        {
            if (candidate === declaredCandidate) continue;
            if (validate(candidate, metadata))
            {
                resolved = candidate;
                break;
            }
        }
    }

    const preferredOutput = emitFor(resolved);
    const mismatch = resolved !== null && declaredCandidate !== resolved;
    return {
        format: "wem",
        source: values.source || "buffer",
        supported: metadata.codec ? "partial" : "none",
        confidence: resolved ? 1 : 0,
        verified: true,
        preferredOutput,
        reason: resolved
            ? (mismatch
                ? `Declared codec ${declared} failed content validation; ${resolved} validated instead.`
                : `Declared codec validated by content.`)
            : `No decodable codec validated against the content (declared ${declared ?? "none"}).`,
        metadata: { ...metadata, declared, resolved, mismatch },
        variants: [
            {
                kind: "raw",
                payloadType: "raw",
                codec: declared || "unknown",
                mimeType: "application/octet-stream",
                supported: true,
            },
            {
                kind: "ogg",
                payloadType: "raw",
                codec: "vorbis",
                mimeType: "audio/ogg",
                supported: resolved === "wwise-vorbis",
            },
            {
                kind: "pcm",
                payloadType: "pcm",
                codec: "float32",
                supported: resolved === "wwise-ptadpcm" || resolved === "pcm",
            }
        ]
    };
}
