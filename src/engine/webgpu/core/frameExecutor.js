// Driving one command encoder over a planned frame.
//
// This is the mechanical half of the recorder-to-dispatcher join. Every
// judgement call about what may share a pass already happened in framePlan.js;
// what is left is walking the regions in order, opening the right kind of
// encoder for each, and submitting once.
//
// WHAT IS INJECTED, AND WHY. Region-to-selection mapping is policy, not
// mechanism: which prepared batch types belong to a render region is Trinity's
// meaning, and an engine that decided it would be inventing scene structure.
// The same applies to compute and transfer work, which needs resources this
// module does not own. So those arrive as hooks, and this owns only the
// encoder's lifetime and the order regions run in.
//
// UNHANDLED WORK IS AN ERROR, NEVER A SKIP. A planned compute or transfer
// region with no handler means real work Trinity asked for would silently not
// happen, and the symptom - a frame that renders but is subtly wrong - is
// exactly the kind of bug that takes days. It throws instead.
//
// ONE ENCODER, ONE SUBMISSION per frame. Carbon's frame driver owns the
// backend-neutral body; this owns the WebGPU-specific encoder lifetime that
// Carbon's per-backend TriDevice owns for its API. Presentation is absent
// deliberately: the browser presents a configured canvas after the submission
// that drew into its current texture.
import { CjsWebgpuDevice } from "../CjsWebgpuDevice.js";
import { IntentClass } from "./framePlan.js";
import { CjsWebgpuRenderTarget } from "./renderTarget.js";
import { CjsWebgpuTrinityPassEncoder } from "./trinityPassEncoder.js";

function fail(message)
{
  const error = new Error(`CjsWebgpuFrameExecutor: ${message}`);
  error.code = "CJS_WEBGPU_FRAME_EXECUTOR_INVALID";
  throw error;
}


/** Drives a planned frame into one command encoder and submits it. */
export class CjsWebgpuFrameExecutor
{
  #webgpu;

  #renderTarget;

  #passEncoder;

  #resolveSelections;

  #resolveDescriptor;

  #executeRegion;

  /**
   * @param {CjsWebgpuDevice} webgpu Canonical WebGPU device.
   * @param {object} options Composition.
   * @param {CjsWebgpuRenderTarget} options.renderTarget Canonical render target.
   * @param {CjsWebgpuTrinityPassEncoder} options.passEncoder Canonical pass encoder.
   * @param {Function} options.ResolveSelections Maps a render region to
   *   `[{ preparedBatchMap, batchType }]`. Returning an empty array is a
   *   legitimate answer and skips the pass.
   * @param {Function} [options.ResolveDescriptor] Supplies a render-pass
   *   descriptor for a region; defaults to the target's own backbuffer
   *   descriptor with the region's folded clear applied.
   * @param {Function} [options.ExecuteRegion] Encodes one compute or transfer
   *   region. Required only if the plan contains them.
   */
  constructor(webgpu, options = {})
  {
    if (!(webgpu instanceof CjsWebgpuDevice))
    {
      fail("webgpu boundary must be a CjsWebgpuDevice");
    }
    if (!(options.renderTarget instanceof CjsWebgpuRenderTarget))
    {
      fail("render target must be a CjsWebgpuRenderTarget");
    }
    if (!(options.passEncoder instanceof CjsWebgpuTrinityPassEncoder))
    {
      fail("pass encoder must be a CjsWebgpuTrinityPassEncoder");
    }
    if (typeof options.ResolveSelections !== "function") fail("ResolveSelections is required");
    if (options.ResolveDescriptor !== undefined && typeof options.ResolveDescriptor !== "function")
    {
      fail("ResolveDescriptor must be a function when provided");
    }
    if (options.ExecuteRegion !== undefined && typeof options.ExecuteRegion !== "function")
    {
      fail("ExecuteRegion must be a function when provided");
    }

    this.#webgpu = webgpu;
    this.#renderTarget = options.renderTarget;
    this.#passEncoder = options.passEncoder;
    this.#resolveSelections = options.ResolveSelections;
    this.#resolveDescriptor = options.ResolveDescriptor ?? ((region, index, frame) =>
      this.#DefaultDescriptor(region, index, frame));
    this.#executeRegion = options.ExecuteRegion ?? ((_commandEncoder, region, index) =>
      fail(`region ${index} is ${region.kind} work and no ExecuteRegion handler was supplied`));
  }

  /**
   * Encodes every region of a planned frame in order and submits once.
   *
   * Returns what happened: the regions encoded, the selections encoded, and
   * whether anything was submitted. A plan with no work submits nothing rather
   * than an empty command buffer.
   */
  ExecuteFrame(plan, options = {})
  {
    if (!plan || !Array.isArray(plan.regions)) fail("a frame plan with regions is required");

    const device = this.#webgpu.GetDevice();
    if (typeof device?.createCommandEncoder !== "function")
    {
      fail("GPUDevice createCommandEncoder is required");
    }

    // Acquired once per frame. The canvas texture is only valid for this frame,
    // and every render region resolving to the backbuffer shares it.
    const frame = options.frame ?? this.#renderTarget.AcquireFrame();
    const commandEncoder = device.createCommandEncoder({ label: options.label ?? "CjsWebgpuFrameExecutor" });

    let encodedRegions = 0;
    let encodedSelections = 0;

    for (let index = 0; index < plan.regions.length; index += 1)
    {
      const region = plan.regions[index];

      if (region.kind === IntentClass.RENDER)
      {
        const selections = this.#resolveSelections(region, index);
        if (!Array.isArray(selections)) fail(`ResolveSelections must return an array for region ${index}`);
        // An empty answer is legitimate - a region whose intents map to no
        // prepared batch type - and opening a pass to draw nothing is waste.
        if (!selections.length) continue;

        this.#passEncoder.Encode(commandEncoder, [ {
          descriptor: this.#Descriptor(region, index, frame),
          configure: (pass) => this.#renderTarget.ApplyViewport(pass, region.dynamicState),
          selections
        } ]);
        encodedSelections += selections.length;
        encodedRegions += 1;
        continue;
      }

      this.#executeRegion(commandEncoder, region, index);
      encodedRegions += 1;
    }

    if (!encodedRegions) return Object.freeze({ encodedRegions: 0, encodedSelections: 0, submitted: false });

    this.#webgpu.Submit([ commandEncoder.finish() ]);
    return Object.freeze({ encodedRegions, encodedSelections, submitted: true });
  }

  /** Resolves the render-pass descriptor for one planned frame region. */
  #Descriptor(region, index, frame)
  {
    const descriptor = this.#resolveDescriptor(region, index, frame);
    if (!descriptor || typeof descriptor !== "object")
    {
      fail(`ResolveDescriptor must return a descriptor for region ${index}`);
    }
    return descriptor;
  }

  /** Builds the target-owned default descriptor for a render region. */
  #DefaultDescriptor(region, index, frame)
  {
    // The planner already folded this region's clear into its load operations,
    // so nothing here decides whether to clear - it only spells the decision.
    const clear = region.clear ?? null;
    return this.#renderTarget.CreateRenderPassDescriptor(frame, {
      label: `region ${index}`,
      clearColor: clear?.color ? colorValue(clear.color) : undefined,
      clearDepth: clear?.depth ?? undefined
    });
  }
}


function colorValue(color)
{
  if (Array.isArray(color))
  {
    return { r: color[0] ?? 0, g: color[1] ?? 0, b: color[2] ?? 0, a: color[3] ?? 1 };
  }
  return color;
}
