/**
 * Selects the demo environment from the authored SOF hull category.
 * Hangar scenes use the indexed sibling of their geometry; this naming rule
 * is demo policy, not a SOF scene API. Missing hangar scenes stay neutral.
 * @param {object|null} hull The loaded SOF hull record.
 * @param {string} universe Default exterior scene resource path.
 * @param {(path: string) => boolean} exists The build's resource index lookup.
 * @returns {{interior: boolean, path: string|null}} Environment selection.
 */
export function selectDemoScene(hull, universe, exists)
{
  const interior = hull?.category === "hangar" || hull?.category === "hangar4k";
  if (!interior) return { interior, path: universe };
  const geometry = String(hull.geometryResFilePath ?? "").toLowerCase();
  const candidate = geometry.endsWith(".gr2") ? geometry.slice(0, -4) + "_scene.black" : null;
  return { interior, path: candidate && exists(candidate) ? candidate : null };
}

/**
 * Preserves explicit viewing overrides without adding an outdoor sun to a hangar.
 * @param {object} scene Selected environment.
 * @param {object} options Current sun/flare defaults and explicit query flags.
 * @returns {{post: string, flare: string}} Initial viewing options.
 */
export function demoSceneLighting(scene, { post, flare, explicitPost = false, explicitFlare = false })
{
  return {
    post: scene.interior && !explicitPost ? "" : post,
    flare: scene.interior && !explicitFlare ? "off" : flare
  };
}
