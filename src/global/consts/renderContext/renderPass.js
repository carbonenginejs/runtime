// Source: trinity/trinityal/include/Tr2RenderPassAL.h (Tr2LoadAction, Tr2StoreAction)
//
// What a render pass does with an attachment at its two edges.
//
// THIS IS THE PART OF CARBON THAT WEBGPU NEEDS AND D3D DOES NOT. Trinity
// DECLARES these actions through `Tr2RenderContextAL::RenderPassHint` before
// the work that needs them; DX11 and DX12 implement the verb as an empty
// function, and Metal turns the declaration into its pass descriptor's load and
// store actions. A tile-based or command-encoder backend is the reason the verb
// exists at all, so a WebGPU backend consumes it exactly as Metal does.

/** What an attachment's existing contents are worth at the start of a pass. */
export const Tr2LoadAction = Object.freeze({
    /** The previous contents are not needed and need not be fetched. */
    DONT_CARE: 0,
    /** The previous contents must survive into this pass. */
    LOAD: 1,
    /** The attachment starts at the clear value, which costs no fetch. */
    CLEAR: 2
});

/** Whether an attachment's contents survive the end of a pass. */
export const Tr2StoreAction = Object.freeze({
    /** Nothing reads this attachment afterwards; the result may be dropped. */
    DONT_CARE: 0,
    /** The result must be written back. */
    STORE: 1
});
