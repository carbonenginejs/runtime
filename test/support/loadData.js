// TEST HELPER, not a runtime API.
//
// Plain decoded data is not a resource and not an object (resman-in-the-browser.md,
// 2026-11-01): a caller reads it with ReadResource and the extension's format.
// Tests that exercise resource lifecycle load it through a test Res class
// instead (testDataRes.js); this helper reads that resource's value.

/**
 * Loads a path through its resource and returns the resource's decoded value.
 * The extension must be routed to `TestDataRes` (or another Res class with a
 * `value`).
 *
 * @param {object} resMan A CjsBlueResMan.
 * @param {string} path Resource path.
 * @param {object} [options] Identity and loader options.
 * @returns {Promise<*>} The resource's value once ready.
 */
export async function LoadData(resMan, path, options = {})
{
  const resource = resMan.GetResource(path, options);
  await resMan.Ready(resource);
  return resource.value;
}

/**
 * Reads a path's plain decoded data: the source bytes through `ReadResource`,
 * then the extension's format (`ResolveFormatDescriptor`, `ReadFormat`).
 *
 * @param {object} resMan A CjsBlueResMan.
 * @param {string} path Resource path.
 * @param {object} [options] Source and format options.
 * @returns {Promise<*>} The decoded value.
 */
export async function ReadData(resMan, path, options = {})
{
  const bytes = await resMan.ReadResource(path, options);
  const extension = options.ext || path.slice(path.lastIndexOf(".") + 1);
  const descriptor = resMan.ResolveFormatDescriptor(extension, { ...options, bytes });
  return resMan.ReadFormat(descriptor, bytes, options);
}
