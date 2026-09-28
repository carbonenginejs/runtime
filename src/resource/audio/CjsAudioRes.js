import { coerceNonNegativeInteger } from "#utils/validation";
import { CjsError } from "#utils/errors";
import { CjsResource } from "#blue";

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

    _audioInfo = {};

    _backing = null;

    _backingLocks = 0;

    _byteLength = null;

    _offset = 0;

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

        this._audioInfo = { ...values };
        return this;
    }

    /** Returns immutable media, language, source, and path metadata. */
    GetAudioInfo()
    {
        return this._audioInfo;
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

        if (this._backing && this._backing !== backing)
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
        if (this._backing
            && (this._offset !== normalizedOffset
                || this._byteLength !== normalizedByteLength))
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

        this._backing = backing;
        this._offset = normalizedOffset;
        this._byteLength = normalizedByteLength;

        if (!this.IsPrepared())
        {
            this.MarkPrepared();
        }

        return this;
    }

    /** Returns the shared physical source resource. */
    GetBackingResource()
    {
        return this._backing;
    }

    /** Returns this file's offset within the shared physical source. */
    GetSourceOffset()
    {
        return this._offset;
    }

    /** Returns the declared file length, or null when it is source-sized. */
    GetByteLength()
    {
        return this._byteLength;
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
        if (!this._backing)
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
            const source = await this._backing.GetByteView(loadOptions);
            const available = source.byteLength - this._offset;
            const totalByteLength = this._byteLength ?? available;

            if (available < 0 || totalByteLength > available)
            {
                throw new CjsError(
                    "CJS_AUDIO_SOURCE_WINDOW_INVALID",
                    `Audio source window exceeds its backing bytes: ${this.GetPath()}`,
                    {
                        details: {
                            path: this.GetPath(),
                            sourceOffset: this._offset,
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
            const start = this._offset + range.offset;
            const bytes = source.slice(start, start + range.byteLength).buffer;

            return {
                ...this._audioInfo,
                bytes,
                offset: range.offset,
                byteLength: bytes.byteLength,
                totalByteLength,
                complete: range.offset === 0
                    && bytes.byteLength === totalByteLength,
            };
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
        this._backing?.KeepAlive(options);
        return this;
    }

    /** Renews the child identity and the shared backing payload lease. */
    KeepPayloadAlive(options = {})
    {
        super.KeepAlive(options);
        this._backing?.KeepPayloadAlive(options);
        return this;
    }

    /** Locks this child and increments the shared backing lock count. */
    Lock()
    {
        const count = super.Lock();

        if (!this._backing)
        {
            return count;
        }

        try
        {
            this._backing.Lock();
            this._backingLocks += 1;
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

        if (this._backingLocks > 0)
        {
            this._backingLocks -= 1;
            this._backing?.Unlock();
        }

        return count;
    }

    /** Normalizes one safe integer used by audio byte windows. */
    static normalizeNonNegativeInteger(value, label)
    {
        // Byte-identical to the shared coercion, message included. Kept as a
        // static because callers reach it through the class.
        return coerceNonNegativeInteger(value, label);
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
