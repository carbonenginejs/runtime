// TEST HELPER, not a runtime API.
//
// Plain decoded data is a resource's payload, not an object: LoadObject answers
// objects only (a Target or Identify class, or a registered object builder;
// operator ruling 2026-09-28), so tests that load data read it the way a
// caller must - GetResource, Ready, then GetPayload.

/**
 * Loads a path's decoded data through its resource.
 *
 * @param {object} resMan A CjsBlueResMan.
 * @param {string} path Resource path.
 * @param {object} [options] Identity and loader options, as LoadObject took them.
 * @returns {Promise<*>} The resource's payload once ready.
 */
export async function LoadData(resMan, path, options = {})
{
  const resource = resMan.GetResource(path, options);
  await resource.Ready(options);
  return resource.GetPayload();
}
