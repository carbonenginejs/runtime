// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/Tr2RenderContext.cpp:462-537 (Tr2RenderContextBase::RenderBatchGroup)
//   trinity/Tr2RenderBatch.cpp (CanBeBinned)
//
// Carbon hoists per GROUP what does not change across a run of batches -
// standard states for the rendering mode, the shader state interface taken from
// the MATERIAL rather than the batch's own shader pointer, technique index,
// pass count, vertex declaration, both stream sources and the index buffer -
// then applies the pass, then does only material constants, per-object
// constants, topology and the draw per batch. This dispatcher did all of it per
// batch, which is what made groupCount and the GDPR partition mean nothing.
//
// TWO DELIBERATE DEVIATIONS FROM CARBON, both from the engine-backends plan's
// decision 3.
//
// 1. THE INDEX BUFFER IS PART OF THE PREDICATE. Carbon's CanBeBinned compares
//    shader, vertex declaration, index stride, both vertex streams and
//    rendering mode - and NOT the index buffer - while RenderBatchGroup then
//    binds and branches on the FIRST batch's index buffer. That is sound only
//    because all Carbon geometry is suballocated from one process-global
//    buffer, so any two binnable batches necessarily share it. An engine that
//    gives each geometry its own buffer breaks it SILENTLY, drawing the first
//    batch's indices for every batch in the run. We are that engine.
//
// 2. RUNS ARE DERIVED HERE, NOT CONSUMED FROM A PRECOMPUTED PARTITION. Carbon
//    stamps groupCount during Finalize; its split loop advances past the
//    boundary element without re-checking it, and its correctness depends on
//    the sort order and the equivalence predicate agreeing with nothing
//    validating that they do. Deriving runs from the batches actually being
//    encoded cannot disagree with itself.
//
// Ordering is never changed here. Sorting belongs to Trinity, and reordering at
// encode time would break the golden-image comparison the two engines are meant
// to be judged by. This only finds runs of ADJACENT batches that already agree.
//
// The WebGPU translation of Carbon's group key: a render pipeline already folds
// the shader program, render states, vertex layout and topology into one
// object, so pipeline identity carries most of CanBeBinned by construction.
// What it does not carry is which buffers are bound, so the vertex buffers and
// the index buffer are compared explicitly. Bind groups stay per batch: they
// are where per-object data lives, and that is exactly what varies within a
// group.

/**
 * Whether two prepared draws may share one hoisted binding run.
 *
 * Compares only what a run hoists. Anything set per batch - bind groups, draw
 * arguments - is deliberately absent, because differing there is the normal
 * case inside a group rather than a reason to split one.
 */
export function CanShareBindings(first, second)
{
  if (!first || !second) return false;
  if (first === second) return true;
  if (first.livePipeline !== second.livePipeline) return false;
  if (first.indexed !== second.indexed) return false;
  if (!sameVertexBuffers(first.vertexBuffers, second.vertexBuffers)) return false;

  // Decision 3's correction. Two batches on the same pipeline and vertex
  // streams still draw different indices, and Carbon's own predicate would
  // have said yes here.
  return sameIndexBuffer(first.indexed, first.indexBuffer, second.indexBuffer);
}


/**
 * Derives runs of adjacent prepared batches that share hoistable state.
 *
 * Returns one entry per run with its start, end and length, in encode order.
 * Every batch appears in exactly one run, and a run of one is normal - it means
 * that batch shares nothing with its neighbours, not that grouping failed.
 */
export function DeriveBatchGroups(batches, resolveDraw = handle => handle?.draw)
{
  const groups = [];
  const list = batches ?? [];
  let start = 0;

  for (let index = 1; index <= list.length; index += 1)
  {
    const isEnd = index === list.length;
    const shares = !isEnd && CanShareBindings(resolveDraw(list[index - 1]), resolveDraw(list[index]));

    if (isEnd || !shares)
    {
      if (index > start) groups.push(Object.freeze({ start, end: index, length: index - start }));
      start = index;
    }
  }

  return Object.freeze(groups);
}


/**
 * A per-pass record of what is already bound, so a run's second and later
 * batches skip the sets their first batch performed.
 *
 * Bound to ONE pass encoder and fails loudly if reused with another: WebGPU
 * pass state does not survive a pass boundary, so a state object leaking
 * across passes would silently skip a set that genuinely had to happen. That
 * failure would appear as geometry drawn with a previous pass's buffers, which
 * is exactly the class of bug this file exists to prevent.
 */
export class CjsWebgpuEncodeState
{
  #pass = null;

  #pipeline = null;

  #vertexBuffers = null;

  #indexBuffer = null;

  #bindGroups = [];

  /** Binds this state to a pass, rejecting a second one. */
  Require(pass)
  {
    if (this.#pass === null) this.#pass = pass;
    else if (this.#pass !== pass)
    {
      const error = new Error("CjsWebgpuEncodeState: encode state belongs to another render pass");
      error.code = "CJS_WEBGPU_ENCODE_STATE_INVALID";
      throw error;
    }
    return this;
  }

  /** Whether the pipeline needs setting, recording it when it does. */
  NeedsPipeline(pipeline)
  {
    if (this.#pipeline === pipeline) return false;
    this.#pipeline = pipeline;
    return true;
  }

  /** Whether the vertex buffers need setting, recording them when they do. */
  NeedsVertexBuffers(entries)
  {
    if (sameVertexBuffers(this.#vertexBuffers, entries)) return false;
    this.#vertexBuffers = entries;
    return true;
  }

  /** Whether the index buffer needs setting, recording it when it does. */
  NeedsIndexBuffer(entry)
  {
    if (sameIndexBuffer(true, this.#indexBuffer, entry)) return false;
    this.#indexBuffer = entry;
    return true;
  }

  /** Whether one bind group needs setting, recording it when it does. */
  NeedsBindGroup(index, bindGroup)
  {
    if (this.#bindGroups[index] === bindGroup) return false;
    this.#bindGroups[index] = bindGroup;
    return true;
  }
}


function sameVertexBuffers(first, second)
{
  if (first === second) return true;
  if (!first || !second || first.length !== second.length) return false;

  for (let index = 0; index < first.length; index += 1)
  {
    const a = first[index];
    const b = second[index];
    if (a.slot !== b.slot || a.buffer !== b.buffer) return false;
    if ((a.offset ?? 0) !== (b.offset ?? 0) || a.size !== b.size) return false;
  }

  return true;
}


function sameIndexBuffer(indexed, first, second)
{
  if (!indexed) return true;
  if (first === second) return true;
  if (!first || !second) return false;

  return first.buffer === second.buffer
    && first.format === second.format
    && (first.offset ?? 0) === (second.offset ?? 0)
    && first.size === second.size;
}
