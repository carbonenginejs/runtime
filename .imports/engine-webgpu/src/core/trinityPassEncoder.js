function fail(message)
{
  const error = new Error(`CjsWebgpuTrinityPassEncoder: ${message}`);
  error.code = "CJS_WEBGPU_TRINITY_PASS_INVALID";
  throw error;
}

function normalizeSelection(selection, passIndex, selectionIndex)
{
  if (!selection || typeof selection !== "object" || Array.isArray(selection))
  {
    fail(`pass ${passIndex} selection ${selectionIndex} must be an object`);
  }
  if (!selection.preparedBatchMap || typeof selection.preparedBatchMap !== "object"
    || Array.isArray(selection.preparedBatchMap))
  {
    fail(`pass ${passIndex} selection ${selectionIndex} requires preparedBatchMap`);
  }
  if (!Number.isInteger(selection.batchType) || selection.batchType < 0)
  {
    fail(`pass ${passIndex} selection ${selectionIndex} batchType must be a non-negative integer`);
  }
  return Object.freeze({
    preparedBatchMap: selection.preparedBatchMap,
    batchType: selection.batchType
  });
}

function normalizePass(entry, index)
{
  if (!entry || typeof entry !== "object" || Array.isArray(entry))
  {
    fail(`pass ${index} must be an object`);
  }
  if (!entry.descriptor || typeof entry.descriptor !== "object" || Array.isArray(entry.descriptor))
  {
    fail(`pass ${index} requires a render-pass descriptor`);
  }
  if (!Array.isArray(entry.selections))
  {
    fail(`pass ${index} selections must be an array`);
  }
  if (entry.configure !== undefined && typeof entry.configure !== "function")
  {
    fail(`pass ${index} configure must be a function when provided`);
  }
  return Object.freeze({
    descriptor: entry.descriptor,
    configure: entry.configure ?? null,
    selections: Object.freeze(entry.selections.map(
      (selection, selectionIndex) => normalizeSelection(selection, index, selectionIndex)
    ))
  });
}

/**
 * Internal encoder for caller-owned WebGPU render-pass plans over prepared
 * Trinity batch maps.
 *
 * Attachment lifetime, descriptors, pass order, batch-type order, technique
 * selection, command-buffer completion, and submission all remain external.
 */
export class CjsWebgpuTrinityPassEncoder
{
  #dispatcher;

  /**
   * Creates an encoder over a CjsWebgpuTrinityBatchDispatcher-compatible
   * boundary.
   */
  constructor(dispatcher)
  {
    if (!dispatcher || typeof dispatcher.EncodeBatchType !== "function")
    {
      fail("dispatcher requires EncodeBatchType");
    }
    this.#dispatcher = dispatcher;
  }

  /**
   * Encodes caller-ordered pass descriptors and batch-map selections into an
   * existing GPUCommandEncoder, ending every begun pass even when work fails.
   * Returns the number of encoded selections.
   */
  Encode(commandEncoder, passes)
  {
    if (!commandEncoder || typeof commandEncoder.beginRenderPass !== "function")
    {
      fail("a GPUCommandEncoder-compatible boundary is required");
    }
    if (!Array.isArray(passes)) fail("passes must be an array");
    const plan = passes.map(normalizePass);
    let encodedSelections = 0;

    for (let passIndex = 0; passIndex < plan.length; passIndex += 1)
    {
      const entry = plan[passIndex];
      const pass = commandEncoder.beginRenderPass(entry.descriptor);
      if (!pass || typeof pass.end !== "function")
      {
        fail(`pass ${passIndex} did not return a render-pass encoder`);
      }

      let error = null;
      try
      {
        if (entry.configure)
        {
          const result = entry.configure(pass, passIndex);
          if (result && typeof result.then === "function")
          {
            fail(`pass ${passIndex} configure must be synchronous`);
          }
        }
        for (const selection of entry.selections)
        {
          this.#dispatcher.EncodeBatchType(
            pass,
            selection.preparedBatchMap,
            selection.batchType
          );
          encodedSelections += 1;
        }
      }
      catch (caught)
      {
        error = caught;
      }
      try
      {
        pass.end();
      }
      catch (caught)
      {
        if (!error) error = caught;
      }
      if (error) throw error;
    }
    return encodedSelections;
  }
}
