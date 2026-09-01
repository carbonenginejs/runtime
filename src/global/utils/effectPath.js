import { normalizeResourcePath } from "#utils/path";

// Where an authored effect path resolves to, decided once, here.
//
// An engine must not care about effect paths. Carbon puts the substitution in
// Tr2Effect rather than in a backend, and the value it substitutes comes from
// Tr2PlatformInfo - the backend is never asked. Ours had drifted: the former
// `engine-webgpu` donor exported a rewriter carrying a hardcoded
// `/effect.webgpu/` default and its
// own quality table, which is the engine deciding its own configuration. It
// never called that rewriter itself; it only re-exported it. So this is the
// policy moving to the package that owns configuration, not a reimplementation.
//
// What an engine owes instead is the other half of the same rule: when it is
// handed something it cannot load, it fails LOUDLY rather than guessing or
// silently rendering nothing. Path policy in, hard failure out.
//
// STANDALONE. A caller composing without CjsLibrary passes `platformName` by
// hand and gets the same answer, and this module imports nothing but path
// normalization, so the cycle with Tr2PlatformInfo cannot form.
//
// It lives in global/utils rather than in core because Carbon substitutes in
// `Tr2Effect`, and Trinity may not import core. Moving the pure transform down
// does not move the policy: the VALUES it substitutes - platform name and
// quality tier - are still configuration, still owned by core's
// `Tr2PlatformInfo`, and still passed in. An engine is handed a resolved path
// and is never asked which one it wants.


/**
 * Quality tokens to Carbon's compiled shader suffix.
 *
 * The tier names are the organization's shader-tier policy and are NOT
 * self-evident from the suffixes: `.sm_depth` is HIGH, `.sm_hi` is MEDIUM and
 * `.sm_lo` is LOW. `.sm_depth` does not mean a depth-only shader - it is the
 * top tier, and it is the variant that carries the local lights. Reading it as
 * "depth" is the mistake that makes a texture-budget measurement describe the
 * wrong thing.
 */
export const ShaderModelSuffixes = Object.freeze({
    low: "sm_lo",
    lo: "sm_lo",
    medium: "sm_hi",
    med: "sm_hi",
    hi: "sm_hi",
    high: "sm_depth",
    depth: "sm_depth",
    sm_lo: "sm_lo",
    sm_hi: "sm_hi",
    sm_depth: "sm_depth"
});


/** Lowercases and slash-normalizes a resource path for routing. */
export function NormalizeResourcePath(path)
{
    return normalizeResourcePath(path);
}


/** The compiled suffix for a quality token, throwing on one it cannot map. */
export function ShaderModelSuffix(quality = "high")
{
    const normalized = NormalizeResourcePath(quality);
    const suffix = ShaderModelSuffixes[normalized];

    if (!suffix)
    {
        throw new RangeError(`runtime/core: unknown shader quality ${JSON.stringify(quality)}`);
    }

    return suffix;
}


/**
 * Resolves an authored `/effect/*.fx` path to the compiled path a backend
 * loads, substituting the platform name exactly as Carbon does.
 *
 * Substitution touches `/effect/` alone, so a path that already names a tree -
 * `/effect.webgpu/`, or one of CCP's own trees while testing - passes through
 * untouched. That is what lets a qualified path override the configured
 * default without a second mechanism.
 *
 * Fails loudly rather than degrading: an authored path with no platform name to
 * substitute would silently resolve to something no backend can load, and the
 * failure would surface much later as a missing resource.
 */
export function ResolveEffectPath(path, options = {})
{
    const normalized = NormalizeResourcePath(path);

    if (!normalized) return normalized;
    if (!normalized.endsWith(".fx")) return normalized;

    const base = normalized.slice(0, -3);
    const suffix = ShaderModelSuffix(options.shaderModel ?? "high");

    if (!base.includes("/effect/")) return `${base}.${suffix}`;

    const platformName = options.platformName;

    if (!platformName)
    {
        throw new Error(
            `runtime/core: cannot resolve ${JSON.stringify(path)} without a platform name; `
            + "no backend is committed, so there is no compiled effect tree to resolve into"
        );
    }

    return `${base.replace("/effect/", `/effect.${platformName}/`)}.${suffix}`;
}

// The values Carbon reads from globals when it substitutes: the platform name
// (`TRINITY_PLATFORM_NAME`) and the quality tier (`Tr2Renderer::GetShaderModel`).
// `Tr2Effect` needs them at the moment it converts a path, and it cannot reach
// core to ask, so they are installed here by whoever owns configuration and
// read at call time. Same shape as the global variable store, and the same
// reason: an installer that swaps them must be seen by effects already built.
//
// Nothing is defaulted. A platform name that is absent means no backend is
// committed, which is a real state and not a value to guess.
let defaults = { platformName: null, shaderModel: "high" };


/**
 * Installs the platform name and quality tier path conversion substitutes.
 *
 * Configuration owns these. Passing null clears them, which returns the module
 * to its uncommitted state rather than to a guess.
 *
 * @param {object|null} values `{ platformName, shaderModel }`.
 * @returns {void}
 */
export function SetEffectPathDefaults(values = null)
{
    defaults = {
        platformName: values?.platformName ?? null,
        shaderModel: values?.shaderModel ?? "high"
    };
}


/**
 * The installed platform name and quality tier.
 *
 * @returns {object} `{ platformName, shaderModel }`.
 */
export function GetEffectPathDefaults()
{
    return { ...defaults };
}
