// Source: trinity/trinity/Resources/Tr2EffectRes.cpp:25-34
//   BLUE_REGISTER_RESOURCE_EXTENSION for each compiled shader-model extension.
//
// Carbon registers at static-initialisation time, inside the class's own
// translation unit. We do not self-register at module scope: nothing else in
// this codebase does, a module-scope side effect fires on import rather than on
// composition, and it would make the registration untestable in isolation. So
// this is an explicit call, made by whoever composes a manager.
import { Tr2EffectRes } from "./Tr2EffectRes.js";


/**
 * The compiled shader extensions routed to `Tr2EffectRes`: Carbon's nine, and
 * Incarna's `fxt`.
 *
 * Nine, not three. The `sm_2_0_*`/`sm_3_0_*`/`sm_1_1` forms are older compiled
 * tiers that a shipped tree can still contain; `ShaderModelSuffixes` only ever
 * produces the modern three, so the rest are inbound-only.
 *
 * `fxt` is not registered by current Carbon. Incarna's compiled shaders
 * (`graphics/shaders/compiled/<platform>/*.fxt`, effect containers at versions
 * 3 and 4) use it, and `Tr2EffectRes` still reads those versions
 * (`Tr2EffectRes.cpp:215-243`), so it is registered here as an Incarna-era
 * extension (operator decision, 2026-10-25). `ResolveEffectPath` leaves an
 * `.fxt` path unchanged.
 *
 * These are true extensions rather than suffixes: `ResolveEffectPath` replaces
 * `.fx`, so a resolved path ends `.sm_hi` and extension routing keys on it.
 */
export const ShaderResourceExtensions = Object.freeze([
  "sm_hi",
  "sm_lo",
  "sm_depth",
  "sm_3_0_hi",
  "sm_3_0_lo",
  "sm_3_0_depth",
  "sm_2_0_hi",
  "sm_2_0_lo",
  "sm_1_1",
  "fxt"
]);


/**
 * Routes every compiled shader extension to `Tr2EffectRes` on one manager.
 *
 * The loader hands the container bytes through unchanged. `Tr2EffectRes`
 * derives its payload from bytes it must go on holding - the retained reader
 * decodes one permutation body at a time - so it takes the bytes through
 * `SetPayload` and calls `DoLoad` itself. A loader that decoded here instead
 * would produce a payload whose reader the publish step then discarded.
 *
 * Translation for a browser backend is not done here: the orchestrator commits
 * the source tree, target and translator once (`Tr2EffectRes.CommitBackend`),
 * and `Tr2EffectRes.DoLoad` translates a container whose path is in the source
 * tree.
 *
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterShaderResources(resourceManager)
{
  for (const extension of ShaderResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, ReadShaderResource);
    resourceManager.RegisterExtension(extension, Tr2EffectRes);
  }
  return resourceManager;
}

/**
 * Passes retained container bytes to Tr2EffectRes, which decodes its own payload.
 *
 * @param {Uint8Array|ArrayBuffer} bytes The compiled shader container.
 * @returns {Uint8Array|ArrayBuffer} The same container bytes.
 */
export function ReadShaderResource(bytes)
{
  return bytes;
}
