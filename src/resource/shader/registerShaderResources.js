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
 * The compiled shader-model extensions Carbon routes to `Tr2EffectRes`.
 *
 * Nine, not three. The `sm_2_0_*`/`sm_3_0_*`/`sm_1_1` forms are older compiled
 * tiers that a shipped tree can still contain; `ShaderModelSuffixes` only ever
 * produces the modern three, so the rest are inbound-only.
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
  "sm_1_1"
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
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterShaderResources(resourceManager)
{
  if (typeof resourceManager?.RegisterExtension !== "function"
    || typeof resourceManager?.RegisterObjectLoader !== "function")
  {
    throw new TypeError("RegisterShaderResources requires a CjsResMan.");
  }

  for (const extension of ShaderResourceExtensions)
  {
    resourceManager.RegisterObjectLoader(extension, bytes => bytes);
    resourceManager.RegisterExtension(extension, Tr2EffectRes);
  }

  return resourceManager;
}
