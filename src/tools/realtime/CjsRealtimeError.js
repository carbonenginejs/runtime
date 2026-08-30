/** Stable browser-safe failure for realtime protocol and recovery work. */
export class CjsRealtimeError extends Error
{

    /**
     * Sanitizes a failure so it is safe to hand across the wire boundary: an
     * invalid code becomes "internal_error", the message loses its newlines and
     * is cut to 256 characters, and statusCode and closeCode are dropped unless
     * they are valid.
     * @param {boolean} retryable Whether the caller may repeat the operation.
     * @param {boolean} connectionUsable False tells the client to close the socket.
     * @param {number|null} closeCode WebSocket close code used when it does.
     */
    constructor(code, message, {
        retryable = false,
        connectionUsable = true,
        statusCode = null,
        closeCode = null,
        details = null,
        cause = undefined
    } = {})
    {
        const safeCode = typeof code === "string" && /^[a-z][a-z0-9_]{0,63}$/u.test(code)
            ? code
            : "internal_error";
        const safeMessage = String(message ?? "Realtime operation failed")
            .replace(/[\r\n]+/gu, " ")
            .slice(0, 256);

        super(safeMessage, { cause });
        this.name = "CjsRealtimeError";
        this.code = safeCode;
        this.retryable = retryable === true;
        this.connectionUsable = connectionUsable !== false;
        this.statusCode = Number.isSafeInteger(statusCode) ? statusCode : null;
        this.closeCode = CjsRealtimeError.isValidCloseCode(closeCode) ? closeCode : null;
        this.details = details;
    }

    /** Returns a secret-free error-shaped record for application observers. */
    ToRecord()
    {
        return {
            code: this.code,
            message: this.message,
            retryable: this.retryable,
            connectionUsable: this.connectionUsable,
            statusCode: this.statusCode,
            closeCode: this.closeCode,
            details: CjsRealtimeError.cloneDetails(this.details)
        };
    }

    /** Converts an unknown failure without reflecting unsafe provider details. */
    static from(error, fallback = {})
    {
        if (error instanceof CjsRealtimeError)
        {
            return error;
        }

        return new CjsRealtimeError(
            fallback.code ?? "internal_error",
            fallback.message ?? "Realtime operation failed",
            { ...fallback, cause: error }
        );
    }

    /** Creates a client error from one normalized server error message. */
    static fromMessage(message)
    {
        return new CjsRealtimeError(message.code, message.message, {
            retryable: message.retryable,
            connectionUsable: message.connectionUsable,
            details: message.details ?? null
        });
    }

    /** Returns a bounded JSON clone or null for unsafe details. */
    static cloneDetails(value)
    {
        if (value === null || value === undefined)
        {
            return null;
        }

        try
        {
            const text = JSON.stringify(value);

            if (text === undefined || new TextEncoder().encode(text).byteLength > 8192)
            {
                return null;
            }

            return JSON.parse(text);
        }
        catch
        {
            return null;
        }
    }

    /** Returns true for a usable standard or private WebSocket close code. */
    static isValidCloseCode(value)
    {
        return Number.isSafeInteger(value)
            && ((value >= 1000 && value <= 1014 && ![ 1004, 1005, 1006 ].includes(value))
                || (value >= 3000 && value <= 4999));
    }

}
