import { CjsError } from "./CjsError.js";


const DEFAULT_CANCELLATION_MESSAGE = "The operation was cancelled.";

export const CJS_OPERATION_CANCELLED = "CJS_OPERATION_CANCELLED";



/** Represents one cancelled operation using Web-compatible abort identity. */
export class CjsCancellationError extends CjsError
{

    /**
     * Creates a cancellation error with stable code `CJS_OPERATION_CANCELLED`.
     *
     * @param {string} [message]
     * @param {{cause?: *, details?: object|null}} [options]
     */
    constructor(message = DEFAULT_CANCELLATION_MESSAGE, options = {})
    {
        super(CJS_OPERATION_CANCELLED, message, options);
        this.name = "AbortError";
    }

    /**
     * Checks for this cancellation type, its stable code, or a platform
     * `AbortError` name.
     */
    static is(error)
    {
        if (CjsError.hasCode(error, CJS_OPERATION_CANCELLED))
        {
            return true;
        }

        try
        {
            return error?.name === "AbortError";
        }
        catch
        {
            return false;
        }
    }

}
