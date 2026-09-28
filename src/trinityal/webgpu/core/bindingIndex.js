// Which cached bind groups bind a given GPU object.
//
// CjsWebgpuRenderContextAL caches bind groups by the objects they bind (views,
// samplers, buffers), so a destroyed texture or buffer must take its groups
// with it, or the cache keeps them alive. The texture and buffer ALs call
// ForgetBindingResource from Destroy; the context registers each group it
// caches under every object in its key. The index is weak on the objects, so
// an object nobody destroys still leaves once it is collected. It lives here,
// not on the context, because the ALs cannot import the context (it imports
// them).

/** @type {WeakMap<object, Set<[Map<string, object>, string]>>} */
const uses = new WeakMap();

/**
 * Records that the cache entry `key` in `cache` binds `object`.
 *
 * @param {object} object A GPUTextureView, GPUSampler or GPUBuffer.
 * @param {Map<string, object>} cache The context's bind-group cache.
 * @param {string} key The entry's key.
 */
export function RegisterBindingUse(object, cache, key)
{
  let entries = uses.get(object);
  if (!entries)
  {
    entries = new Set();
    uses.set(object, entries);
  }
  entries.add([ cache, key ]);
}

/**
 * Drops every cached bind group that binds `object`.
 *
 * @param {object|null} object A GPUTextureView, GPUSampler or GPUBuffer being destroyed.
 * @returns {number} How many cache entries were dropped.
 */
export function ForgetBindingResource(object)
{
  if (!object) return 0;
  const entries = uses.get(object);
  if (!entries) return 0;
  let dropped = 0;
  for (const [ cache, key ] of entries)
  {
    if (cache.delete(key)) dropped += 1;
  }
  uses.delete(object);
  return dropped;
}
