/**
 * Tiled-lighting resource stubbing helpers for `--stub-light-resources`.
 *
 * Lighting is unsupported on the CEWG WebGL2 path, and its pixel-stage
 * resources (two structured light buffers + a light-profile sampler array) push
 * some `_depth` permutations past `MAX_TEXTURE_IMAGE_UNITS`. These helpers let
 * the packager DROP those resources instead of lowering them: it resolves their
 * `t#` registers from the Carbon reflection (DXBC RDEF is stripped, so names
 * live only there) and strips them from the manifest, while the emitter
 * (via `stubResourceRegisters`) drops their declarations and zeroes their reads.
 *
 * Kept as a standalone module (not inline in the CLI script) so it is unit
 * testable without invoking the packager's `main()`.
 */

/**
 * Names of the tiled-lighting resources dropped by `--stub-light-resources`:
 * the light index/data structured buffers and the light-profile sampler array.
 * @type {Set<string>}
 */
export const LIGHT_STUB_RESOURCE_NAMES = new Set([ "LightBuffer", "LightIndexBuffer", "LightProfileArray" ]);

/**
 * Optional material resource dropped to free one sampler unit on packed local
 * light builds. Kept separate from the light set so the removal is reversible
 * with a packager flag.
 * @type {Set<string>}
 */
export const DETAIL3_STUB_RESOURCE_NAMES = new Set([ "Detail3Map" ]);

/**
 * Resolves the `t#` register indices of named resources from a shader record's
 * Carbon reflection contracts.
 *
 * @param {object} record Shader record carrying per-technique `contracts`.
 * @param {Set<string>} resourceNames Carbon resource names to resolve.
 * @returns {number[]} Distinct resource register indices, ascending.
 */
export function resolveStubResourceRegisters(record, resourceNames)
{
  const registers = new Set();
  for (const entry of record?.contracts || [])
  {
    for (const resource of entry.contract?.resources || [])
    {
      const register = resource?.register ?? resource?.registerIndex;
      if (resource && resourceNames.has(resource.name) && Number.isInteger(register))
      {
        registers.add(register);
      }
    }
  }
  return [ ...registers ].sort((a, b) => a - b);
}

/**
 * Resolves the `t#` register indices of a shader's tiled-lighting resources from
 * its Carbon reflection contracts. The registers vary per permutation (a shader
 * may bind them at t11/t12/t13, another at t13/t14/t15), so this is name-driven,
 * not a fixed register set. The emitter drops/zeroes exactly these registers
 * when they are passed as `stubResourceRegisters`.
 *
 * @param {object} record Shader record carrying per-technique `contracts`.
 * @returns {number[]} Distinct light-resource register indices, ascending.
 */
export function resolveStubLightRegisters(record)
{
  return resolveStubResourceRegisters(record, LIGHT_STUB_RESOURCE_NAMES);
}

/**
 * Resolves the tiled-lighting resource registers by semantic name for the
 * constant-buffer local-light lowering. Returns null unless both structured
 * buffers are present; the profile sampler is optional because some shaders do
 * not sample it for the selected permutation.
 *
 * @param {object} record Shader record carrying per-technique `contracts`.
 * @param {object} [options]
 * @param {number} [options.registerIndex=6] Constant-buffer slot to emit.
 * @param {number} [options.capacity=40] Maximum local lights in the cb payload.
 * @returns {object|null} Emitter `lightConstantBuffer` profile, or null.
 */
export function resolveLightConstantBufferProfile(record, options = {})
{
  const byName = new Map();
  for (const entry of record?.contracts || [])
  {
    for (const resource of entry.contract?.resources || [])
    {
      const register = resource?.register ?? resource?.registerIndex;
      if (resource?.name && Number.isInteger(register) && !byName.has(resource.name))
      {
        byName.set(resource.name, register);
      }
    }
  }

  if (!byName.has("LightIndexBuffer") || !byName.has("LightBuffer")) return null;
  const registerIndex = Number.isInteger(options.registerIndex) ? options.registerIndex : 6;
  return {
    indexRegister: byName.get("LightIndexBuffer"),
    dataRegister: byName.get("LightBuffer"),
    profileRegister: byName.has("LightProfileArray") ? byName.get("LightProfileArray") : null,
    registerIndex,
    name: `cb${registerIndex}`,
    capacity: Number.isInteger(options.capacity) ? options.capacity : 40
  };
}

/**
 * Resolves the tiled-lighting resource registers by semantic name for the
 * packed local-light texture lowering. Returns null unless both structured
 * buffers are present; the profile sampler is optional and lowers to neutral
 * attenuation when present.
 *
 * @param {object} record Shader record carrying per-technique `contracts`.
 * @param {object} [options]
 * @param {number} [options.dataTexelBase=131072] Fixed texel offset where packed Buffer B begins.
 * @returns {object|null} Emitter `lightPackedTexture` profile, or null.
 */
export function resolveLightPackedTextureProfile(record, options = {})
{
  const byName = new Map();
  for (const entry of record?.contracts || [])
  {
    for (const resource of entry.contract?.resources || [])
    {
      const register = resource?.register ?? resource?.registerIndex;
      if (resource?.name && Number.isInteger(register) && !byName.has(resource.name))
      {
        byName.set(resource.name, register);
      }
    }
  }

  if (!byName.has("LightIndexBuffer") || !byName.has("LightBuffer")) return null;
  return {
    indexRegister: byName.get("LightIndexBuffer"),
    dataRegister: byName.get("LightBuffer"),
    profileRegister: byName.has("LightProfileArray") ? byName.get("LightProfileArray") : null,
    registerIndex: byName.get("LightIndexBuffer"),
    name: "cewgLocalLightTexture",
    dataTexelBase: Number.isInteger(options.dataTexelBase) ? options.dataTexelBase : 131072
  };
}

/**
 * Drops the tiled-lighting `resource` bindings from a manifest JSON so the CEWG
 * runtime (`Tw2CewgReader.buildTexturesAndSamplers`) does not synthesize texture
 * definitions for the light buffers the emitter no longer declares. Without this
 * the runtime tries to build a sampler for LightBuffer/LightIndexBuffer and
 * throws "Invalid shader texture definition" (glType 0). Mutates in place.
 *
 * @param {object} manifestJson Serialized `Tr2EffectBindingManifest`.
 * @returns {object} The same manifest JSON, light resources removed.
 */
export function stripLightResourcesFromManifest(manifestJson)
{
  return stripResourcesFromManifest(manifestJson, LIGHT_STUB_RESOURCE_NAMES);
}

/**
 * Drops named `resource` bindings from a manifest JSON. Mutates in place.
 *
 * @param {object} manifestJson Serialized `Tr2EffectBindingManifest`.
 * @param {Set<string>} resourceNames Carbon/metadata resource names to remove.
 * @returns {object} The same manifest JSON, named resources removed.
 */
export function stripResourcesFromManifest(manifestJson, resourceNames)
{
  for (const stage of manifestJson?.stages || [])
  {
    stage.bindings = (stage.bindings || []).filter((binding) => {
      if (binding?.kind !== "resource") return true;
      const name = binding.metadataName || binding.carbon?.name;
      return !resourceNames.has(name);
    });
  }
  return manifestJson;
}
