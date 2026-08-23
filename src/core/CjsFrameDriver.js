// Source: trinity/trinity/TriDevice.cpp:1151-1187
// Source: trinity/trinity/TriDevice.cpp:805-843
// Source: trinity/trinity/Tr2Renderer.cpp:1040-1081
//
// Carbon places this neutral frame body on each backend TriDevice. The combined
// runtime keeps its ordering in core composition while the concrete engine
// supplies the nominal device-facing lifecycle. Presentation is deliberately
// absent: Carbon presents the previous frame at the top of the next engine tick
// to overlap CPU and GPU work.
import { CjsFrameLifecycle } from "#contracts";
import { Tr2RenderContext } from "../trinity/core/context/Tr2RenderContext.js";
import { Tr2RenderJobs } from "../trinity/renderJob/Tr2RenderJobs.js";


/** Runs Carbon's backend-neutral frame body against exact runtime identities. */
export class CjsFrameDriver
{
    #renderContext;

    #renderJobs;

    #frameLifecycle;

    /**
     * Creates a driver from the context, jobs, and engine lifecycle required by
     * every frame.
     */
    constructor({ renderContext, renderJobs, frameLifecycle } = {})
    {
        if (!(renderContext instanceof Tr2RenderContext))
        {
            throw new TypeError("CjsFrameDriver renderContext must be a Tr2RenderContext.");
        }
        this.#renderContext = renderContext;
        this.SetRenderJobs(renderJobs);
        this.SetFrameLifecycle(frameLifecycle);
    }

    /** Returns the exact render context this driver brackets. */
    GetRenderContext()
    {
        return this.#renderContext;
    }

    /** Binds the exact render-job scheduler run each frame. */
    SetRenderJobs(renderJobs)
    {
        if (!(renderJobs instanceof Tr2RenderJobs))
        {
            throw new TypeError("CjsFrameDriver renderJobs must be a Tr2RenderJobs.");
        }
        this.#renderJobs = renderJobs;
        return this;
    }

    /** Binds the exact engine lifecycle used for device-facing frame work. */
    SetFrameLifecycle(frameLifecycle)
    {
        if (!(frameLifecycle instanceof CjsFrameLifecycle))
        {
            throw new TypeError("CjsFrameDriver frameLifecycle must be a CjsFrameLifecycle.");
        }
        this.#frameLifecycle = frameLifecycle;
        return this;
    }

    /**
     * Advances the frame counter and animation time, applying Carbon's hourly
     * rebase, and returns the new animation time.
     */
    Tick(elapsed = 0, animationTimeScale = 1)
    {
        const context = this.#renderContext;
        let animationTime = context.GetAnimationTime() + (Number(elapsed) || 0) * animationTimeScale;
        if (animationTime > CjsFrameDriver.ANIMATION_TIME_MAX)
        {
            animationTime -= CjsFrameDriver.ANIMATION_TIME_MAX;
        }
        context.AdvanceFrame(animationTime);
        return animationTime;
    }

    /**
     * Executes one requested frame in Carbon order and closes every opened
     * bracket even when rendering or an earlier closer fails.
     */
    Render(realTime = 0, simTime = 0)
    {
        const context = this.#renderContext;
        const lifecycle = this.#frameLifecycle;
        const errors = [];
        let profileOpen = false;
        let frameOpen = false;
        let renderContextOpen = false;

        try
        {
            lifecycle.Throttle();
            lifecycle.SyncToGpu();
            context.SetViewport(lifecycle.GetViewport());

            lifecycle.BeginProfileFrame(context.GetCurrentFrameCounter());
            profileOpen = true;

            context.BeginFrame();
            frameOpen = true;
            context.BeginRenderContext();
            renderContextOpen = true;

            lifecycle.ReserveQuadListIndexBuffer(0);
            this.#renderJobs.Run(realTime, simTime, context);
        }
        catch (error)
        {
            errors.push(error);
        }

        if (profileOpen) CloseRequired(errors, () => lifecycle.EndProfileFrame());
        if (renderContextOpen) CloseRequired(errors, () => context.EndRenderContext());
        if (frameOpen) CloseRequired(errors, () => context.EndFrame());

        if (errors.length === 1) throw errors[0];
        if (errors.length > 1)
        {
            throw new AggregateError(errors, "CjsFrameDriver frame execution and cleanup failed.");
        }
        return true;
    }

    /** Carbon's hourly animation-clock rebase point, in seconds. */
    static ANIMATION_TIME_MAX = 3600;
}

function CloseRequired(errors, close)
{
    try
    {
        close();
    }
    catch (error)
    {
        errors.push(error);
    }
}
