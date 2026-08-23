import { CjsError } from "#utils/errors";
import { CjsResource } from "../CjsResource.js";

import { CjsAudioBufferRes } from "./CjsAudioBufferRes.js";

/**
 * Individually addressable audio resource representing one complete file over either a complete or windowed physical source.
 *
 * The resource keeps semantic media identity independent from its ingress.
 * Loose files, prepared files, API results, and bank windows therefore expose
 * the same byte and lifetime methods.
 */
export class CjsAudioRes extends CjsResource
{

    #audioInfo = Object.freeze({});

    #backing = null;

    #backingLocks = 0;

    #byteLength = null;

    #offset = 0;

    /** Creates an unregistered semantic audio resource with optional metadata. */
    constructor(values = null)
    {
        super();

        if (values)
        {
            this.SetAudioInfo(values.info ?? values);

            if (values.backing)
            {
                this.SetBackingResource(values.backing, values);
            }
        }
    }

    /** Replaces immutable semantic metadata before the resource is registered. */
    SetAudioInfo(values = null)
    {
        if (!values || typeof values !== "object" || Array.isArray(values))
        {
            throw new TypeError("CjsAudioRes info must be an object");
        }

        this.#audioInfo = Object.freeze({ ...values });
        return this;
    }

    /** Returns immutable media, language, source, and path metadata. */
    GetAudioInfo()
    {
        return this.#audioInfo;
    }

    /** Binds the shared physical resource and this file's byte window. */
    SetBackingResource(backing, {
        offset = 0,
        byteLength = null,
    } = {})
    {
        if (!(backing instanceof CjsAudioBufferRes))
        {
            throw new TypeError(
                "CjsAudioRes backing must be a CjsAudioBufferRes",
            );
        }

        const normalizedOffset = CjsAudioRes.normalizeNonNegativeInteger(
            offset,
            "CjsAudioRes offset",
        );
        const normalizedByteLength = byteLength === null
            || byteLength === undefined
            ? null
            : CjsAudioRes.normalizeNonNegativeInteger(
                byteLength,
                "CjsAudioRes byteLength",
            );

        if (this.#backing && this.#backing !== backing)
        {
            throw new CjsError(
                "CJS_AUDIO_RESOURCE_CONFLICT",
                `Audio resource backing changed: ${this.GetPath()}`,
                {
                    details: {
                        path: this.GetPath(),
                    },
                },
            );
        }
        if (this.#backing
            && (this.#offset !== normalizedOffset
                || this.#byteLength !== normalizedByteLength))
        {
            throw new CjsError(
                "CJS_AUDIO_RESOURCE_CONFLICT",
                `Audio resource window changed: ${this.GetPath()}`,
                {
                    details: {
                        path: this.GetPath(),
                    },
                },
            );
        }

        this.#backing = backing;
        this.#offset = normalizedOffset;
        this.#byteLength = normalizedByteLength;

        if (!this.IsPrepared())
        {
            this.MarkPrepared();
        }

        return this;
    }

    /** Returns the shared physical source resource. */
    GetBackingResource()
    {
        return this.#backing;
    }

    /** Returns this file's offset within the shared physical source. */
    GetSourceOffset()
    {
        return this.#offset;
    }

    /** Returns the declared file length, or null when it is source-sized. */
    GetByteLength()
    {
        return this.#byteLength;
    }

    /**
     * Returns detached bytes and metadata for this file or one requested range.
     *
     * A temporary child/backing lock covers loading and copying. The returned
     * ArrayBuffer cannot keep a complete bank payload alive accidentally.
     */
    async GetBytes({
        offset = 0,
        byteLength = null,
        ...loadOptions
    } = {})
    {
        if (!this.#backing)
        {
            throw new CjsError(
                "CJS_AUDIO_BACKING_UNAVAILABLE",
                `Audio resource has no backing source: ${this.GetPath()}`,
                {
                    details: {
                        path: this.GetPath(),
                    },
                },
            );
        }

        this.Lock();

        try
        {
            const source = await this.#backing.GetByteView(loadOptions);
            const available = source.byteLength - this.#offset;
            const totalByteLength = this.#byteLength ?? available;

            if (available < 0 || totalByteLength > available)
            {
                throw new CjsError(
                    "CJS_AUDIO_SOURCE_WINDOW_INVALID",
                    `Audio source window exceeds its backing bytes: ${this.GetPath()}`,
                    {
                        details: {
                            path: this.GetPath(),
                            sourceOffset: this.#offset,
                            sourceByteLength: source.byteLength,
                            byteLength: totalByteLength,
                        },
                    },
                );
            }

            const range = CjsAudioRes.normalizeRange(
                offset,
                byteLength,
                totalByteLength,
            );
            const start = this.#offset + range.offset;
            const bytes = source.slice(start, start + range.byteLength).buffer;

            return Object.freeze({
                ...this.#audioInfo,
                bytes,
                offset: range.offset,
                byteLength: bytes.byteLength,
                totalByteLength,
                complete: range.offset === 0
                    && bytes.byteLength === totalByteLength,
            });
        }
        finally
        {
            this.Unlock();
        }
    }

    /** Loads this semantic resource and resolves to the resource handle. */
    async GetObject(options = {})
    {
        await this.GetBytes(options);
        return this;
    }

    /** Renews both the child identity and its shared backing identity. */
    KeepAlive(options = {})
    {
        super.KeepAlive(options);
        this.#backing?.KeepAlive(options);
        return this;
    }

    /** Renews the child identity and the shared backing payload lease. */
    KeepPayloadAlive(options = {})
    {
        super.KeepAlive(options);
        this.#backing?.KeepPayloadAlive(options);
        return this;
    }

    /** Locks this child and increments the shared backing lock count. */
    Lock()
    {
        const count = super.Lock();

        if (!this.#backing)
        {
            return count;
        }

        try
        {
            this.#backing.Lock();
            this.#backingLocks += 1;
            return count;
        }
        catch (cause)
        {
            super.Unlock();
            throw cause;
        }
    }

    /** Unlocks this child and releases one shared backing lock. */
    Unlock()
    {
        const count = super.Unlock();

        if (this.#backingLocks > 0)
        {
            this.#backingLocks -= 1;
            this.#backing?.Unlock();
        }

        return count;
    }

    /** Normalizes one safe integer used by audio byte windows. */
    static normalizeNonNegativeInteger(value, label)
    {
        const number = Number(value);

        if (!Number.isSafeInteger(number) || number < 0)
        {
            throw new TypeError(`${label} must be a non-negative integer`);
        }

        return number;
    }

    /** Normalizes a requested range within one semantic audio file. */
    static normalizeRange(offsetValue, byteLengthValue, totalByteLength)
    {
        const offset = this.normalizeNonNegativeInteger(
            offsetValue,
            "Audio byte offset",
        );
        const byteLength = byteLengthValue === null
            || byteLengthValue === undefined
            ? totalByteLength - offset
            : this.normalizeNonNegativeInteger(
                byteLengthValue,
                "Audio byte length",
            );

        if (offset > totalByteLength
            || byteLength > totalByteLength - offset)
        {
            throw new RangeError(
                `Audio byte range exceeds ${totalByteLength} bytes`,
            );
        }

        return {
            offset,
            byteLength,
        };
    }

}
