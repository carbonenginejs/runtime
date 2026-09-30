import { CjsSchema } from "#schema";
import { ICjsAudioGlobalReaders } from "../ICjsAudioGlobalReaders.js";

/** Reads global RTPC and State values from one `CjsWebAudioSoundEngine`. */
export class CjsAudioBackendGlobalReaders extends ICjsAudioGlobalReaders
{
    _backend = null;

    /** @param {import("../CjsWebAudioSoundEngine.js").CjsWebAudioSoundEngine} backend */
    constructor(backend)
    {
        super();
        this._backend = backend;
    }

    /** Delegates a timed global RTPC value query to the sound-engine backend. */
    getGlobalRTPC(name, at)
    {
        return this._backend.GetGlobalRTPCValue(name, at);
    }

    /**
     * Delegates collection of global RTPC transition boundaries from the
     * supplied time.
     */
    getGlobalRTPCTransitionBoundaries(from)
    {
        return this._backend.GetGlobalRTPCTransitionBoundaries(from);
    }

    /**
     * Delegates a timed global state-property weight query to the sound-engine
     * backend.
     */
    getGlobalStatePropertyWeights(group, at)
    {
        return this._backend.GetGlobalStatePropertyWeights(group, at);
    }

    /**
     * Delegates collection of global state transition boundaries from the
     * supplied time.
     */
    getGlobalStateTransitionBoundaries(from)
    {
        return this._backend.GetGlobalStateTransitionBoundaries(from);
    }
}

CjsSchema.define(CjsAudioBackendGlobalReaders, { className: "CjsAudioBackendGlobalReaders", family: "audio", fields: {} });
