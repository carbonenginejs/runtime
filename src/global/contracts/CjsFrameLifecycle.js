import { CjsSchema, impl } from "../schema/index.js";

/**
 * Dependency-free engine lifecycle required to execute one runtime frame.
 *
 * Presentation and the outer tick remain engine-owned. Every required method
 * throws until a concrete engine lifecycle overrides it.
 */
export class CjsFrameLifecycle
{
    /** Applies engine-owned frame pacing before GPU synchronization. */
    Throttle()
    {
        throw new Error("CjsFrameLifecycle.Throttle must be overridden by a concrete engine lifecycle.");
    }

    /** Synchronizes queued CPU work to the engine before frame recording. */
    SyncToGpu()
    {
        throw new Error("CjsFrameLifecycle.SyncToGpu must be overridden by a concrete engine lifecycle.");
    }

    /** Returns the viewport the render context must publish for this frame. */
    GetViewport()
    {
        throw new Error("CjsFrameLifecycle.GetViewport must be overridden by a concrete engine lifecycle.");
    }

    /** Opens engine profiling for the supplied runtime frame counter. */
    BeginProfileFrame(_frameCounter)
    {
        throw new Error("CjsFrameLifecycle.BeginProfileFrame must be overridden by a concrete engine lifecycle.");
    }

    /** Closes engine profiling for the current runtime frame. */
    EndProfileFrame()
    {
        throw new Error("CjsFrameLifecycle.EndProfileFrame must be overridden by a concrete engine lifecycle.");
    }

    /** Reserves the shared quad-list index capacity requested for this frame. */
    ReserveQuadListIndexBuffer(_count)
    {
        throw new Error("CjsFrameLifecycle.ReserveQuadListIndexBuffer must be overridden by a concrete engine lifecycle.");
    }
}

CjsSchema.decorateMethod(CjsFrameLifecycle, "Throttle", impl.abstract);
CjsSchema.decorateMethod(CjsFrameLifecycle, "SyncToGpu", impl.abstract);
CjsSchema.decorateMethod(CjsFrameLifecycle, "GetViewport", impl.abstract);
CjsSchema.decorateMethod(CjsFrameLifecycle, "BeginProfileFrame", impl.abstract);
CjsSchema.decorateMethod(CjsFrameLifecycle, "EndProfileFrame", impl.abstract);
CjsSchema.decorateMethod(CjsFrameLifecycle, "ReserveQuadListIndexBuffer", impl.abstract);
