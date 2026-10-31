import { CjsSchema } from "#schema/CjsSchema";

import { coerceNonNegativeInteger } from "#utils/validation";
import { CjsError } from "#utils/errors";
import { BlueAsyncRes, blue } from "#blue";

import { CjsAudioBufferRes } from "./CjsAudioBufferRes.js";

/**
 * Individually addressable audio resource representing one complete file over either a complete or windowed physical source.
 *
 * The resource keeps semantic media identity independent from its ingress.
 * Loose files, prepared files, API results, and bank windows therefore expose
 * the same byte and lifetime methods.
 */
export class CjsAudioRes extends BlueAsyncRes
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

    /**
     * Binds the shared physical resource and this file's byte window.
     *
     * @implemented
     * @param {CjsAudioBufferRes} backing Physical owner shared by logical bank windows.
     * @param {object} [options={}] Window bounds.
     * @param {number} [options.offset=0] Byte offset in the physical source.
     * @param {number|null} [options.byteLength=null] Byte length, or remaining source length.
     * @returns {CjsAudioRes} This logical resource.
     */
    SetBackingResource(backing, {
        offset = 0,
        byteLength = null,
    } = {})
    {
        if (!(CjsSchema.cast(backing, CjsAudioBufferRes)))
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
            this._isPrepared = this._isGood = true;
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

    /**
     * Renews the child identity and the shared backing payload lease.
     *
     * @implemented
     * @param {object} [options={}] Existing activity frame/time overrides.
     * @returns {CjsAudioRes} This logical resource.
     */
    KeepPayloadAlive(options = {})
    {
        super.KeepAlive(options);
        if (this._backing) this._backing.KeepAlive(options);
        return this;
    }

    /**
     * Locks this child and increments the shared backing lock count.
     *
     * @implemented
     * @returns {number} Logical resource lock count after balancing its backing lock.
     */
    Lock()
    {
        const count = blue.resMan.LockResource(this);

        if (!this._backing)
        {
            return count;
        }

        try
        {
            blue.resMan.LockResource(this._backing);
            this._backingLocks += 1;
            return count;
        }
        catch (cause)
        {
            blue.resMan.UnlockResource(this);
            throw cause;
        }
    }

    /**
     * Unlocks this child and releases one shared backing lock.
     *
     * @implemented
     * @returns {number} Logical resource lock count after balancing its backing lock.
     */
    Unlock()
    {
        const count = blue.resMan.UnlockResource(this);

        if (this._backingLocks > 0)
        {
            this._backingLocks -= 1;
            if (this._backing) blue.resMan.UnlockResource(this._backing);
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


    /**
     * Use the existing physical byte owner instead of opening the logical audio
     * identifier as a second file. This class is a browser audio adapter.
     *
     * @adapted
     * @returns {boolean} Whether a backing source is bound.
     */
    _DoOpenStream()
    {
        return this._backing !== null;
    }

    /**
     * Wait for the physical resource without retaining another bank byte view.
     *
     * @adapted
     * @returns {Promise<number>} Native asynchronous-load result.
     */
    async _DoLoad()
    {
        await this._backing.GetByteView();
        return BlueAsyncRes.LoadingResult.LR_SUCCESS;
    }

    /**
     * The logical file is usable once its backing load has completed.
     *
     * @adapted
     * @returns {boolean} Whether its backing source remains bound.
     */
    _DoPrepare()
    {
        return this._backing !== null;
    }

}

CjsSchema.meta.define("CjsAudioRes")(CjsAudioRes);

CjsSchema.decorateMethod(CjsAudioRes, "SetBackingResource", CjsSchema.meta.implemented);

CjsSchema.decorateMethod(CjsAudioRes, "KeepPayloadAlive", CjsSchema.meta.implemented);

CjsSchema.decorateMethod(CjsAudioRes, "Lock", CjsSchema.meta.implemented);

CjsSchema.decorateMethod(CjsAudioRes, "Unlock", CjsSchema.meta.implemented);

CjsSchema.decorateMethod(CjsAudioRes, "_DoOpenStream", CjsSchema.meta.adapted);

CjsSchema.decorateMethod(CjsAudioRes, "_DoLoad", CjsSchema.meta.adapted);

CjsSchema.decorateMethod(CjsAudioRes, "_DoPrepare", CjsSchema.meta.adapted);
