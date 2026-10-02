// CarbonEngineJS extension (no Carbon counterpart): Wwise evaluates global
// RTPCs and States inside the SDK. Our shared bus mixer and music engine
// evaluate them in JavaScript and read the backend's global values through
// this interface. Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, meta } from "#schema";

/**
 * The global RTPC and State values the shared bus mixer and the music engine
 * read. Every method is required. A consumer given no readers (null) treats
 * routes that need them as unrealizable, rather than reading a default.
 */
export class ICjsAudioGlobalReaders
{

    /**
     * A global RTPC's value.
     *
     * @param {string|number} _name - RTPC name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number|null} The value, or null when it is unset.
     */
    getGlobalRTPC(_name, _at)
    {
        throw new Error("ICjsAudioGlobalReaders.getGlobalRTPC must be overridden.");
    }

    /**
     * AudioContext times after `_from` at which a global RTPC transition changes slope.
     *
     * @param {number} _from - AudioContext time.
     * @returns {number[]}
     */
    getGlobalRTPCTransitionBoundaries(_from)
    {
        throw new Error("ICjsAudioGlobalReaders.getGlobalRTPCTransitionBoundaries must be overridden.");
    }

    /**
     * A global State group's weighted states, mid-transition included.
     *
     * @param {string|number} _group - State group name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {Array<{ state: string|number, weight: number }>}
     */
    getGlobalStatePropertyWeights(_group, _at)
    {
        throw new Error("ICjsAudioGlobalReaders.getGlobalStatePropertyWeights must be overridden.");
    }

    /**
     * AudioContext times after `_from` at which a global State transition changes slope.
     *
     * @param {number} _from - AudioContext time.
     * @returns {number[]}
     */
    getGlobalStateTransitionBoundaries(_from)
    {
        throw new Error("ICjsAudioGlobalReaders.getGlobalStateTransitionBoundaries must be overridden.");
    }

}

for (const method of Object.getOwnPropertyNames(ICjsAudioGlobalReaders.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsAudioGlobalReaders, method, meta.abstract);
}

CjsSchema.define(ICjsAudioGlobalReaders, { className: "ICjsAudioGlobalReaders", family: "audio", fields: {} });
