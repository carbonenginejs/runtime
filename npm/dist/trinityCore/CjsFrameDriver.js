// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/TriDevice.cpp:1151-1187 (TriDevice::Render - the neutral body)
//   trinity/trinity/TriDevice.cpp:805-843 (TriDevice::Update and the tick)
//   trinity/trinity/Tr2Renderer.cpp:1040-1081 (the frame and scene brackets)
//
// This has no Carbon counterpart, hence Cjs* rather than Tri*/Tr2*: in Carbon
// the neutral frame body is a method on the per-backend TriDevice, so a port
// that puts it there would have to implement a device to run a frame. Our
// TriDevice is a device-free GRAPH DESCRIPTION whose backend methods are
// deliberately explicit, so the ordering lives in its own orchestrator instead
// - the same shape as CjsBatchManager, which owns neutral batch collection
// without owning a device.
//
// WHAT THIS OWNS: the ORDER. Carbon's sequence is not obvious and two parts of
// it are load-bearing:
//
//   - the entry and exit are DELIBERATELY ASYMMETRIC. Entry is profiler,
//     BeginFrame, BeginRenderContext; exit is profiler, EndRenderContext,
//     EndFrame. EndRenderContext clears the frame pool allocator BEFORE
//     EndScene, so every transient per-object payload dies inside the scene
//     bracket that leased it.
//   - PRESENT IS NOT HERE. Carbon presents the PREVIOUS frame at the top of
//     the NEXT tick, before Render, with a source comment explaining that it
//     buys CPU/GPU overlap while the host script is pumped
//     (TriDevice.cpp:842, HandleRenderTick). The tick wrapper is engine-owned,
//     exactly as Carbon puts it in the per-backend TriDevice. A driver that
//     presents at the end of Render has the ordering wrong.
//
// WHAT AN ENGINE OWNS: every step that touches a device. Those arrive as one
// duck-typed hooks object rather than as Trinity behavior, so the order is
// preserved even though the work is not ours:
//
//   Throttle()                     - Carbon sleeps here to give the GPU a break
//                                    right after Present. A browser host paces
//                                    on requestAnimationFrame instead.
//   SyncToGpu()                    - Tr2SyncToGpu::Tick
//   BeginProfileFrame(counter)     - Tr2GpuProfiler::BeginFrame
//   EndProfileFrame()              - Tr2GpuProfiler::EndFrame
//   ReserveQuadListIndexBuffer(n)  - a shared GPU index buffer
//
// Every hook is optional. A driver with no hooks runs the whole frame and
// produces render-job intents, which is what makes a frame testable headlessly.
//
// OWNERSHIP IS OPEN. This is composition rather than graph behavior, and
// runtime-core is the package that composes engines with domain runtimes
// (docs/engine-backends-plan.md, decision 7). It sits here because decision 2
// currently assigns the neutral frame body to runtime-trinity. It imports
// NOTHING - the context, the jobs and the hooks are all injected and
// duck-typed - specifically so that relocating it is a file move rather than a
// rewrite, and so runtime-core could adopt it without acquiring a dependency
// on this package.

/** Runs Carbon's backend-neutral frame body in order, against injected engine hooks. */
class CjsFrameDriver {
  #renderContext = null;
  #renderJobs = null;
  #hooks = null;

  /**
   * @param {object} options
   * @param {object} options.renderContext - the frame's Tr2RenderContext,
   *   injected rather than constructed so this class imports nothing.
   * @param {object} [options.renderJobs] - the Tr2RenderJobs to run each frame.
   * @param {object} [options.hooks] - the engine's device-facing frame hooks.
   */
  constructor(options = {}) {
    if (!options.renderContext) {
      throw new Error("CjsFrameDriver requires a renderContext; a frame has no meaning without one");
    }
    this.#renderContext = options.renderContext;
    this.#renderJobs = options.renderJobs ?? null;
    this.#hooks = options.hooks ?? null;
  }

  /** The render context this driver runs frames against. */
  GetRenderContext() {
    return this.#renderContext;
  }

  // Carbon TriDevice::SetRenderJobs. The job list is snapshotted by the job
  // itself at the start of a run, so replacing it between frames is safe.

  /** Binds the render jobs run each frame; returns this for chaining. */
  SetRenderJobs(renderJobs) {
    this.#renderJobs = renderJobs ?? null;
    return this;
  }

  /** Installs the engine's device-facing frame hooks; returns this for chaining. */
  SetFrameHooks(hooks) {
    this.#hooks = hooks ?? null;
    return this;
  }

  // Carbon advances the frame counter and the animation clock in
  // TriDevice::Update (cpp:805/:823), which runs BEFORE HandleRenderTick, and
  // rebases the animation clock hourly so a long-running client keeps float
  // precision. Callers that already own an animation clock pass it in.

  /**
   * Advances the frame clock for the next frame: bumps the frame counter and
   * moves the animation time on by `elapsed` seconds, rebasing at Carbon's
   * hourly maximum. Returns the new animation time.
   */
  Tick(elapsed = 0, animationTimeScale = 1) {
    const context = this.#renderContext;
    let animationTime = context.GetAnimationTime() + (Number(elapsed) || 0) * animationTimeScale;

    // Carbon TriDevice.cpp:825-833: subtract rather than modulo, so the
    // fractional part is continuous across the rebase.
    if (animationTime > CjsFrameDriver.ANIMATION_TIME_MAX) {
      animationTime -= CjsFrameDriver.ANIMATION_TIME_MAX;
    }
    context.AdvanceFrame(animationTime);
    return animationTime;
  }

  // Carbon TriDevice::Render (cpp:1151-1187). The step list below is that
  // function line for line, minus the device work, which is hooked.

  /**
   * Runs one frame in Carbon's order and returns whether it ran; a frame
   * without render jobs still opens and closes its brackets, because the
   * per-frame clock and the pool reset are the frame, not the drawing.
   */
  Render(realTime = 0, simTime = 0, executor = null) {
    const context = this.#renderContext;
    const hooks = this.#hooks;
    hooks?.Throttle?.();
    hooks?.SyncToGpu?.();
    hooks?.BeginProfileFrame?.(context.GetCurrentFrameCounter());
    context.BeginFrame();
    context.BeginRenderContext();
    hooks?.ReserveQuadListIndexBuffer?.(0);
    try {
      this.#renderJobs?.Run?.(realTime, simTime, executor);
    } finally {
      // Carbon has no guard here, but a throwing job must not strand the frame
      // pool or leave the scene bracket open for the next frame to inherit.
      hooks?.EndProfileFrame?.();
      context.EndRenderContext();
      context.EndFrame();
    }
    return true;
  }

  /** Carbon's hourly animation-clock rebase point, in seconds (TriDevice.cpp). */
  static ANIMATION_TIME_MAX = 3600;
}

export { CjsFrameDriver };
//# sourceMappingURL=CjsFrameDriver.js.map
