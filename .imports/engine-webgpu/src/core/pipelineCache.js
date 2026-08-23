// The Stage B pipeline cache, which this engine did not have.
//
// The engine-backends plan splits effect realization the way Carbon splits it.
// Stage A is program identity and dedup, backend-independent, and
// runtime-resource already has it in `passUnitSignature` and `unit.sha256`.
// Stage B is the pipeline object itself, backend-owned, and its key differs per
// backend: DX12 keys an ID3D12PipelineState on a dirty-tracked PSODescription,
// Metal on a combined hash of device, functions, vertex descriptor and
// attachments, and DX11 has no monolithic object but four caches including an
// input-layout cache keyed on the vertex shader's input signature.
//
// This device had none. Every PreparePipeline call created fresh shader
// modules, bind-group layouts and a pipeline layout, and recorded the result in
// a WeakMap keyed by the handle object it had just made - which caches nothing,
// because a fresh handle never hits.
//
// KEYS ARE EXACT, NOT HASHED. Carbon's Metal cache is keyed on a hash value
// with no equality recheck, so a collision silently returns the WRONG pipeline;
// DX12 rechecks. Rather than hash and recheck, the key here is the canonical
// serialization itself, so two different pipelines cannot collide in the first
// place and there is nothing to recheck. That is only affordable because a
// recipe is a small POD block; it is why the program half is named by the
// caller instead.
//
// A CALLER THAT CANNOT NAME ITS PROGRAM GETS NO CACHE. Shader source is far too
// large to serialize into a key on every call, and this package has no
// dependency to hash it with. So the identity is supplied - the composed path
// already has one from runtime-resource - and an unnamed pipeline is prepared
// uncached, which is never wrong, only slower. Guessing an identity from the
// descriptor's `key` would be worse than no cache: "Main.pass0" is the most
// common pass name in the corpus and never dedupes across effects, so it would
// hand back another effect's pipeline.
//
// EVERYTHING IS GENERATION-BOUND. Carbon's registry handles are indices that go
// stale wholesale on device reset. Ours are garbage-collected objects, so a
// stale entry would keep a dead device's pipeline alive and hand it out; each
// entry records the generation it was built for and a mismatch misses.

function fail(message)
{
  const error = new Error(`CjsWebgpuPipelineCache: ${message}`);
  error.code = "CJS_WEBGPU_PIPELINE_CACHE_INVALID";
  throw error;
}


/**
 * Canonically serializes a value so two structurally equal inputs produce the
 * same string regardless of property order.
 *
 * Object key order is normalized because a recipe assembled by different code
 * paths is the same recipe, and treating `{topology, cullMode}` as different
 * from `{cullMode, topology}` would miss every such hit.
 */
export function CanonicalKey(value)
{
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return `${typeof value}:${String(value)}`;
  if (Array.isArray(value)) return `[${value.map(CanonicalKey).join(",")}]`;

  const entries = Object.keys(value)
    .filter(name => value[name] !== undefined)
    .sort()
    .map(name => `${name}=${CanonicalKey(value[name])}`);

  return `{${entries.join(",")}}`;
}


/**
 * A generation-bound cache of asynchronously built pipeline objects.
 *
 * In-flight builds are cached as promises, so two callers racing for the same
 * pipeline share one build rather than each creating a GPU object and one
 * silently winning. That matters more here than in Carbon: pipeline creation is
 * asynchronous on this backend and a frame legitimately prepares many at once.
 */
export class CjsWebgpuPipelineCache
{
  #entries = new Map();

  /** How many entries are held, for diagnostics and tests. */
  get size()
  {
    return this.#entries.size;
  }

  /**
   * Returns the cached value for a key, building it when absent.
   *
   * `key` must be a stable exact identity; `null` or `undefined` bypasses the
   * cache entirely and simply builds, which is what an unnamed pipeline gets.
   * A failed build is not retained, so a transient device error does not
   * poison the key forever.
   */
  async Resolve(key, generation, build)
  {
    if (typeof build !== "function") fail("a build function is required");
    if (key === null || key === undefined) return build();

    const entry = this.#entries.get(key);
    if (entry)
    {
      if (entry.generation === generation) return entry.value;
      // A pipeline built for a device that is gone is not repairable, and
      // handing it back would use a dead GPU object.
      this.#entries.delete(key);
    }

    const value = build();
    this.#entries.set(key, { generation, value });

    try
    {
      return await value;
    }
    catch (error)
    {
      if (this.#entries.get(key)?.value === value) this.#entries.delete(key);
      throw error;
    }
  }

  /** Drops entries not built for the given generation. */
  Prune(generation)
  {
    for (const [ key, entry ] of this.#entries)
    {
      if (entry.generation !== generation) this.#entries.delete(key);
    }
    return this;
  }

  /** Drops every entry, as a device reset requires. */
  Clear()
  {
    this.#entries.clear();
    return this;
  }
}


/**
 * The Stage B key for a render pipeline: the prepared program's identity plus
 * the recipe's POD block.
 *
 * Returns null when the program has no identity, which is how an unnamed
 * pipeline declines the cache rather than being keyed on its recipe alone -
 * two different programs share a recipe constantly.
 */
export function RenderPipelineKey(programIdentity, recipe)
{
  if (programIdentity === null || programIdentity === undefined) return null;
  return `${CanonicalKey(programIdentity)}|${CanonicalKey(recipe ?? null)}`;
}
