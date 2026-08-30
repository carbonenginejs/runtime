import { isPlainObject } from "../is.js";

const
    ERROR_CODE_PATTERN = /^CJS_[A-Z][A-Z0-9]*(?:_[A-Z][A-Z0-9]*)*$/u,
    DEFAULT_CANCELLATION_MESSAGE = "The operation was cancelled.";

export const CJS_OPERATION_CANCELLED = "CJS_OPERATION_CANCELLED";

/**
 * Represents one structured operational failure with a stable CarbonEngineJS code.
 *
 * Programmer-contract violations should continue to use native error classes
 * such as `TypeError`, `RangeError`, and `SyntaxError`.
 */
export class CjsError extends Error
{

    /**
     * Creates an operational error.
     *
     * Details are detached and deeply frozen JSON-safe data. Cause identity is
     * preserved through the native `Error` cause property when supplied.
     *
     * @param {string} code Stable uppercase `CJS_*` machine-readable code.
     * @param {string} message Human-readable failure description.
     * @param {{cause?: *, details?: object|null}} [options]
     */
    constructor(code, message, options = {})
    {
        const
            normalizedCode = CjsError.#NormalizeCode(code),
            normalizedMessage = CjsError.#NormalizeMessage(message),
            normalizedOptions = CjsError.#NormalizeOptions(options),
            errorOptions = Object.hasOwn(normalizedOptions, "cause")
                ? { cause: normalizedOptions.cause }
                : undefined;

        super(normalizedMessage, errorOptions);

        this.name = new.target.name;

        Object.defineProperties(this, {
            code: {
                value: normalizedCode,
                enumerable: true,
                configurable: false,
                writable: false
            },
            details: {
                value: CjsError.#NormalizeDetails(normalizedOptions.details),
                enumerable: true,
                configurable: false,
                writable: false
            }
        });
    }

    /**
     * Checks a structured or legacy error for an exact stable code.
     *
     * Invalid candidate codes and inaccessible error properties return false
     * so this helper remains safe inside failure handling.
     */
    static hasCode(error, code)
    {
        if (!CjsError.#IsCode(code) || error === null || error === undefined)
        {
            return false;
        }

        try
        {
            return error.code === code;
        }
        catch
        {
            return false;
        }
    }

    /** Reports whether a value is one valid stable error code. */
    static #IsCode(value)
    {
        return typeof value === "string" && ERROR_CODE_PATTERN.test(value);
    }

    /** Validates and returns one stable error code. */
    static #NormalizeCode(value)
    {
        if (!CjsError.#IsCode(value))
        {
            throw new TypeError("code must be an uppercase CJS_* identifier.");
        }

        return value;
    }

    /** Validates and returns one non-empty error message. */
    static #NormalizeMessage(value)
    {
        if (typeof value !== "string" || value.trim() === "")
        {
            throw new TypeError("message must be a non-empty string.");
        }

        return value;
    }

    /** Validates and returns one plain constructor-options record. */
    static #NormalizeOptions(value)
    {
        if (!isPlainObject(value))
        {
            throw new TypeError("options must be a plain object.");
        }

        return value;
    }

    /** Converts optional details into detached deeply frozen data. */
    static #NormalizeDetails(value)
    {
        if (value === undefined || value === null)
        {
            return null;
        }

        if (!isPlainObject(value))
        {
            throw new TypeError("details must be a JSON-safe plain object or null.");
        }

        return CjsError.#CloneDetailsValue(value, "details", new Set());
    }

    /** Clones one JSON-safe details value while detecting active cycles. */
    static #CloneDetailsValue(value, path, active)
    {
        if (value === null || typeof value === "string" || typeof value === "boolean")
        {
            return value;
        }

        if (typeof value === "number")
        {
            if (!Number.isFinite(value))
            {
                throw new TypeError(`${path} must contain only finite numbers.`);
            }

            return value;
        }

        if (!Array.isArray(value) && !isPlainObject(value))
        {
            throw new TypeError(`${path} must contain only JSON-safe values.`);
        }

        if (active.has(value))
        {
            throw new TypeError(`${path} must not contain a circular reference.`);
        }

        active.add(value);

        const clone = Array.isArray(value)
            ? CjsError.#CloneDetailsArray(value, path, active)
            : CjsError.#CloneDetailsRecord(value, path, active);

        active.delete(value);
        return clone;
    }

    /** Clones one dense JSON-safe details array. */
    static #CloneDetailsArray(value, path, active)
    {
        const clone = [];

        for (const key of Reflect.ownKeys(value))
        {
            if (key === "length")
            {
                continue;
            }

            if (typeof key !== "string"
                || !/^(?:0|[1-9]\d*)$/u.test(key)
                || Number(key) >= value.length)
            {
                throw new TypeError(`${path} arrays must contain only indexed values.`);
            }
        }

        for (let i = 0; i < value.length; i++)
        {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(i));

            if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value"))
            {
                throw new TypeError(`${path} arrays must contain dense data properties.`);
            }

            clone.push(CjsError.#CloneDetailsValue(
                descriptor.value,
                `${path}[${i}]`,
                active
            ));
        }

        return clone;
    }

    /** Clones one plain JSON-safe details record. */
    static #CloneDetailsRecord(value, path, active)
    {
        const clone = {};

        for (const key of Reflect.ownKeys(value))
        {
            if (typeof key !== "string")
            {
                throw new TypeError(`${path} must not contain symbol keys.`);
            }

            const descriptor = Object.getOwnPropertyDescriptor(value, key);

            if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value"))
            {
                throw new TypeError(`${path} must contain only enumerable data properties.`);
            }

            Object.defineProperty(clone, key, {
                value: CjsError.#CloneDetailsValue(
                    descriptor.value,
                    `${path}[${JSON.stringify(key)}]`,
                    active
                ),
                enumerable: true,
                configurable: false,
                writable: false
            });
        }

        return clone;
    }

}

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
