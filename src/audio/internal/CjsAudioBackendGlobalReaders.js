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

    getGlobalRTPC(name, at)
    {
        return this._backend.GetGlobalRTPCValue(name, at);
    }

    getGlobalRTPCTransitionBoundaries(from)
    {
        return this._backend.GetGlobalRTPCTransitionBoundaries(from);
    }

    getGlobalStatePropertyWeights(group, at)
    {
        return this._backend.GetGlobalStatePropertyWeights(group, at);
    }

    getGlobalStateTransitionBoundaries(from)
    {
        return this._backend.GetGlobalStateTransitionBoundaries(from);
    }
}

CjsSchema.define(CjsAudioBackendGlobalReaders, { className: "CjsAudioBackendGlobalReaders", family: "audio", fields: {} });
