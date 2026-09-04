// Source: trinity/trinityal/ALResult.h
//
// Carbon's abstraction layer answers with an HRESULT, and the DISTINCTION
// between its failure codes is load-bearing rather than decorative: the texture
// stub alone chooses between three of them thirteen times, and a caller reads
// `E_INVALIDARG` ("you described something impossible") differently from
// `E_INVALIDCALL` ("the resource cannot do this right now").
//
// So this ports the codes rather than collapsing them into a boolean. The
// values are Carbon's own, and `Failed` reproduces the `FAILED` macro exactly:
// an HRESULT fails when its top bit is set, which in JavaScript means reading
// the number as a signed 32-bit integer.


/** `ALResult` codes (`ALResult.h:20-33`). */
export const ALResult = Object.freeze({
    /** Succeeded. */
    S_OK: 0,

    /** Succeeded, but did nothing. */
    S_FALSE: 1,

    /** Failed for a reason with no better code. */
    E_FAIL: 0x80004005,

    /** An argument describes something the backend cannot represent. */
    E_INVALIDARG: 0x80070057,

    /** The call is not legal against this resource in its current state. */
    E_INVALIDCALL: 0x8876086c,

    /** Allocation failed. */
    E_OUTOFMEMORY: 0x8007000e,

    /** The device went away. */
    E_DEVICELOST: 0x88760868
});


/**
 * Whether a result succeeded.
 *
 * @param {number} result An `ALResult` value.
 * @returns {boolean} True when the top bit is clear.
 */
export function Succeeded(result)
{
    return (result | 0) >= 0;
}

/**
 * Whether a result failed.
 *
 * @param {number} result An `ALResult` value.
 * @returns {boolean} True when the top bit is set.
 */
export function Failed(result)
{
    return (result | 0) < 0;
}
