// Which backend a library commits to, decided in one place.
//
// STANDALONE ON PURPOSE. The runtime core is the default composition and is
// expected to be what almost everyone uses, but a caller must be able to reach
// the same answer without it. So the policy is a plain function over injected
// values: it constructs nothing, imports no engine, holds no state, and a
// caller with its own composition root calls it directly and gets the identical
// decision. `CjsLibrary.SelectBackendAsync` is its default caller, not its
// owner.
//
// This implements the four-stage flow accepted in the core roadmap:
//
//   1. cheap support reports          <- Tr2PlatformInfo / CjsWebGLProbe
//   2. an engine-owned asynchronous proof of the required device or context
//   3. application policy ranking the proven candidates
//   4. commitment of one backend
//
// Stage 2 is the one that must NOT move here. "Runtime core records and applies
// the result. It does not create a GPU device, test format-specific bytes, or
// implement WebGL/WebGPU realization itself." A candidate therefore supplies
// its own `Prove`, and this awaits it. Constructing a device here would also
// require importing an engine, which would break the no-dependency rule in both
// directions.
//
// It commits to exactly ONE backend, per the divergence decision: a library has
// one active renderer, and there is no registry of simultaneously active
// backends. Candidates are an ARGUMENT rather than a stored registration for
// the same reason - nothing here outlives the decision except the answer.
import { CjsBackendCandidate } from "#contracts";
import { Tr2PlatformInfo } from "./Tr2PlatformInfo.js";


/**
 * The order backends are preferred in when a caller states no preference.
 *
 * WebGPU first because it needs no lowering: it binds Carbon's structured
 * buffers natively and keeps the light-profile array as a real texture array,
 * where WebGL2 must fold both to fit inside sixteen texture units. See the
 * organization's WebGL2 texture-budget contract.
 */
export const CjsBackendPreference = Object.freeze([ "webgpu", "webgl" ]);


/** Why a candidate was not committed to. */
export const CjsBackendRejection = Object.freeze({
    /** The platform report says the API is absent.  */
    UNSUPPORTED: "unsupported",
    /** The candidate's own proof declined or threw. */
    UNPROVEN: "unproven",
    /** Supported and proven, but another candidate ranked higher. */
    NOT_PREFERRED: "not-preferred",
    /** Ranked below a committed candidate and never evaluated. */
    NOT_REACHED: "not-reached"
});


/** The capability key stating that a backend's API is present. */
const SUPPORT_KEY = Object.freeze({
    webgpu: "webgpu",
    webgl: "webgl2"
});


/**
 * Chooses one backend from the candidates a caller offers, given a platform
 * report, and returns what was chosen and why every other option was not.
 *
 * Every candidate must extend `CjsBackendCandidate` and supply:
 *
 * - `name` — the backend it is a candidate for;
 * - `Prove(context)` — the asynchronous proof that it can really
 *   acquire its device or context. It receives `{name, capabilities, platform,
 *   descriptor, unsatisfiedLimits}` and returns a truthy value, or `false`/a
 *   throw to decline;
 * - `limits` / `features` — what its content needs, resolved against the probed
 *   adapter into the `deviceDescriptor` it is handed.
 *
 * A `preference` list is application policy and outranks the default order. It
 * is also the fallback chain: the first supported, proven candidate wins.
 *
 * FAILS CLOSED, matching resource-behavior selection: an unknown explicit name
 * throws rather than silently falling back to something the caller did not ask
 * for, and exhausting every candidate throws rather than returning a library
 * with no renderer. The error carries the per-candidate reasons, because "no
 * backend" and "WebGPU was present but its device proof failed" need different
 * responses from a caller.
 */
export async function SelectBackend(options = {})
{
    const platform = options.platform ?? null;
    if (platform !== null && !(platform instanceof Tr2PlatformInfo))
    {
        throw new TypeError("CjsLibrary backend platform must be a Tr2PlatformInfo.");
    }
    const capabilities = platform ? platform.GetCapabilities() : options.capabilities ?? {};
    const candidates = NormalizeCandidates(options.candidates);
    const preference = options.preference ?? null;

    // An explicit request is a statement, not a hint. Asking for a backend
    // nothing offers is a composition mistake and says so here rather than
    // quietly rendering through something else.
    if (preference)
    {
        for (const name of preference)
        {
            if (!candidates.some(candidate => candidate.name === name))
            {
                const error = new TypeError(`CjsLibrary backend preference ${JSON.stringify(name)} has no candidate.`);
                error.code = "CJS_LIBRARY_BACKEND_UNKNOWN";
                throw error;
            }
        }
    }

    const ranked = RankCandidates(candidates, preference);
    const evaluated = [];
    let committed = null;

    for (const candidate of ranked)
    {
        if (committed)
        {
            evaluated.push({ name: candidate.name, rejected: CjsBackendRejection.NOT_REACHED });
            continue;
        }

        const supportKey = SUPPORT_KEY[candidate.name];
        const supported = supportKey === undefined
            // A backend this package does not probe for is the caller's to
            // vouch for; its proof is the only evidence there is.
            ? true
            : capabilities[supportKey] === true;

        if (!supported)
        {
            evaluated.push({ name: candidate.name, rejected: CjsBackendRejection.UNSUPPORTED });
            continue;
        }

        const requirement = ResolveCandidateRequirement(candidate, platform);
        const proof = await ProveCandidate(candidate, {
            name: candidate.name,
            capabilities,
            platform,
            ...requirement
        });

        if (!proof.proven)
        {
            evaluated.push({
                name: candidate.name,
                rejected: CjsBackendRejection.UNPROVEN,
                error: proof.error
            });
            continue;
        }

        committed = {
            name: candidate.name,
            proof: proof.value,
            proven: true,
            ...requirement
        };
        evaluated.push({ name: candidate.name, committed: true });
    }

    if (!committed)
    {
        const error = new Error("CjsLibrary found no backend it could commit to.");
        error.code = "CJS_LIBRARY_BACKEND_UNAVAILABLE";
        error.candidates = evaluated.map(entry => ({ ...entry }));
        throw error;
    }

    // Requested and effective stay separately inspectable, so a preference that
    // is temporarily unavailable can become effective again when capabilities
    // change rather than being overwritten by discovery.
    return {
        requested: preference ? [ ...preference ] : null,
        effective: committed.name,
        backend: committed,
        candidates: evaluated.map(entry => ({ ...entry }))
    };
}


/** Requires exact nominal candidates and rejects duplicate backend names. */
function NormalizeCandidates(candidates)
{
    if (candidates === undefined)
    {
        throw new TypeError("CjsLibrary backend candidates are required.");
    }
    const list = Array.isArray(candidates) ? candidates : [ candidates ];
    const seen = new Set();

    return list.map(entry =>
    {
        const candidate = entry;
        if (!(candidate instanceof CjsBackendCandidate) || typeof candidate.name !== "string" || !candidate.name)
        {
            throw new TypeError("CjsLibrary backend candidate must extend CjsBackendCandidate and have a name.");
        }

        if (seen.has(candidate.name))
        {
            throw new TypeError(`CjsLibrary duplicate backend candidate ${JSON.stringify(candidate.name)}.`);
        }

        seen.add(candidate.name);
        return candidate;
    });
}


/** Orders candidates by application policy, then by the default preference. */
function RankCandidates(candidates, preference)
{
    const order = preference ?? CjsBackendPreference;
    const rank = name =>
    {
        const index = order.indexOf(name);
        return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };

    return candidates
        .map((candidate, index) => ({ candidate, index }))
        .sort((first, second) =>
            rank(first.candidate.name) - rank(second.candidate.name) || first.index - second.index)
        .map(entry => entry.candidate);
}


/** The device requirement a candidate is handed, resolved against the adapter. */
function ResolveCandidateRequirement(candidate, platform)
{
    if (candidate.limits == null && candidate.features == null)
    {
        return { descriptor: null, unsatisfiedLimits: [], unavailableFeatures: [] };
    }

    const info = platform instanceof Tr2PlatformInfo ? platform : null;
    const resolved = info
        ? info.ResolveDeviceRequirements(candidate)
        : { descriptor: {}, unsatisfiedLimits: [], unavailableFeatures: [] };

    return {
        descriptor: resolved.descriptor,
        unsatisfiedLimits: resolved.unsatisfiedLimits,
        unavailableFeatures: resolved.unavailableFeatures
    };
}


/**
 * Runs a candidate's own proof. A throw is a declined candidate, not a failed
 * selection: the whole point of a fallback chain is that the next candidate
 * gets its turn, and the reason is carried so a caller can report it.
 */
async function ProveCandidate(candidate, context)
{
    try
    {
        const value = await candidate.Prove(context);
        return value === false || value === null || value === undefined
            ? { proven: false, value: null, error: null }
            : { proven: true, value, error: null };
    }
    catch (error)
    {
        return {
            proven: false,
            value: null,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
