import { CjsSchema } from "#schema/CjsSchema";

import { CjsError } from "#utils/errors";
import { BlueAsyncRes, blue } from "#blue";

/**
 * Physical audio byte-owner resource whose payload may back one complete file or several logical audio files.
 *
 * BlueResMan owns asynchronous attempts and cached identity. This resource
 * owns the physical byte view without interpreting BNK or media semantics;
 * logical audio resources borrow windows instead of retaining duplicate banks.
 */
export class CjsAudioBufferRes extends BlueAsyncRes
{

    _audioInfo = {};

    /** Creates an unregistered physical audio resource with optional metadata. */
    constructor(values = null)
    {
        super();
        this.SetAudioInfo(values);
    }

    /** Replaces immutable physical-source metadata before the resource loads. */
    SetAudioInfo(values = null)
    {
        if (values === null || values === undefined)
        {
            this._audioInfo = {};
            return this;
        }
        if (!values || typeof values !== "object" || Array.isArray(values))
        {
            throw new TypeError("CjsAudioBufferRes info must be an object");
        }

        this._audioInfo = { ...values };
        return this;
    }

    /** Returns immutable physical-source metadata supplied by an audio library. */
    GetAudioInfo()
    {
        return this._audioInfo;
    }

    /**
     * Returns a view of this resource's physical bytes while the caller holds a lock.
     *
     * The returned view may retain a complete bank buffer. Public media reads
     * should use CjsAudioRes.GetBytes(), which copies only the requested window.
     *
     * @implemented
     * @param {object} [options={}] Set reload to explicitly refresh the physical source.
     * @returns {Promise<Uint8Array>} Borrowed byte view; callers must pin its owner while using it.
     */
    async GetByteView(options = {})
    {
        if (options.reload === true) this.Reload();
        await blue.resMan.Ready(this);
        this.KeepAlive();

        return CjsAudioBufferRes.toUint8Array(
            this._bytes,
            this.GetPath(),
        );
    }

    /**
     * Returns a detached copy of the complete physical source.
     *
     * @implemented
     * @param {object} [options={}] Physical source read/reload options.
     * @returns {Promise<ArrayBuffer>} Detached copy, safe after the backing resource is released.
     */
    async GetBytes(options = {})
    {
        blue.resMan.LockResource(this);

        try
        {
            const view = await this.GetByteView(options);

            return view.slice().buffer;
        }
        finally
        {
            blue.resMan.UnlockResource(this);
        }
    }

    /** Extracts bytes from raw reader payloads used by registered audio formats. */
    static toUint8Array(value, path = "")
    {
        if (value instanceof Uint8Array)
        {
            return value;
        }
        if (value instanceof ArrayBuffer)
        {
            return new Uint8Array(value);
        }
        if (ArrayBuffer.isView(value))
        {
            return new Uint8Array(
                value.buffer,
                value.byteOffset,
                value.byteLength,
            );
        }
        if (value && typeof value === "object" && "bytes" in value)
        {
            return this.toUint8Array(value.bytes, path);
        }

        throw new CjsError(
            "CJS_AUDIO_BYTES_UNAVAILABLE",
            `Audio resource did not produce bytes: ${path}`,
            {
                details: {
                    path: String(path ?? ""),
                },
            },
        );
    }


    /** The physical source's decoded byte view. */
    _bytes = null;

    /**
     * Adopt the audio reader's bytes after cancellation checks.
     *
     * @adapted
     * @returns {Promise<number>} Native success code after adopting the physical bytes.
     */
    async _DoLoad()
    {
        const value = await blue.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
        this._bytes = CjsAudioBufferRes.toUint8Array(value, this.GetPath());
        return BlueAsyncRes.LoadingResult.LR_SUCCESS;
    }

    /**
     * Audio decoding is performed by its consuming playback layer.
     *
     * @adapted
     * @returns {boolean} Whether physical bytes are resident.
     */
    _DoPrepare()
    {
        return this._bytes !== null;
    }

    /**
     * Release the physical byte window at final teardown.
     *
     * @adapted explicit JS teardown replaces native destruction; the existing
     *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
     * @param {object} [options={}] Existing MotherLode cleanup policy.
     * @param {boolean} [options.releasePayload=true] Release owned family data.
     * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
     * @returns {void}
     */
    _OnShutdown(options = {})
    {
    if (options.releasePayload === false) return;
        this._bytes = null;
    }
}

CjsSchema.meta.define("CjsAudioBufferRes")(CjsAudioBufferRes);





