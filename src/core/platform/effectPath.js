// Where an authored effect path resolves to, decided once, here.
//
// An engine must not care about effect paths. Carbon puts the substitution in
// Tr2Effect rather than in a backend, and the value it substitutes comes from
// Tr2PlatformInfo - the backend is never asked. Ours had drifted: engine-webgpu
// exported a rewriter carrying a hardcoded `/effect.webgpu/` default and its
// own quality table, which is the engine deciding its own configuration. It
// never called that rewriter itself; it only re-exported it. So this is the
// policy moving to the package that owns configuration, not a reimplementation.
//
// What an engine owes instead is the other half of the same rule: when it is
// handed something it cannot load, it fails LOUDLY rather than guessing or
// silently rendering nothing. Path policy in, hard failure out.
//
// STANDALONE, like the rest of this directory. A caller composing without
// CjsLibrary passes `platformName` by hand and gets the same answer, and this
// module imports nothing, so the cycle with Tr2PlatformInfo cannot form.


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
    return String(path ?? "").trim().replaceAll("\\", "/").toLowerCase();
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
