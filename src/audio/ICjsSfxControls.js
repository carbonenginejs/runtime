// CarbonEngineJS extension (no Carbon counterpart): Wwise evaluates an event's
// switches, states, RTPCs and voice properties inside the SDK. Our SFX engine
// evaluates them in JavaScript and reads the posting emitter's live values
// through this interface. Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, impl } from "#schema";

/**
 * One SFX post's live evaluation context: what `CjsSfxEngine` and
 * `CjsAudioMan` read and write while resolving and playing an event. Every
 * method is required. An implementation also carries two data members:
 * `gameObjID` (the posting game object) and `signal` (an AbortSignal for the
 * post, or null).
 */
export class ICjsSfxControls
{

    /**
     * Installs a resolved program on the post and returns what was installed.
     *
     * @param {Array<object>} _program - Resolved program.
     * @returns {Array<object>|null}
     */
    installSfxProgram(_program)
    {
        throw new Error("ICjsSfxControls.installSfxProgram must be overridden.");
    }

    /**
     * The posting game object's current switch in a group.
     *
     * @param {string|number} _group - Switch group name or id.
     * @returns {string|number|null}
     */
    getSwitch(_group)
    {
        throw new Error("ICjsSfxControls.getSwitch must be overridden.");
    }

    /**
     * The current global state in a group.
     *
     * @param {string|number} _group - State group name or id.
     * @returns {string|number|null}
     */
    getState(_group)
    {
        throw new Error("ICjsSfxControls.getState must be overridden.");
    }

    /**
     * A state group's weighted states, mid-transition included.
     *
     * @param {string|number} _group - State group name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {Array<{ state: string|number, weight: number }>}
     */
    getStatePropertyWeights(_group, _at)
    {
        throw new Error("ICjsSfxControls.getStatePropertyWeights must be overridden.");
    }

    /**
     * The posting game object's RTPC value.
     *
     * @param {string|number} _name - RTPC name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number|null|undefined} The value, or nothing when unset.
     */
    getRTPC(_name, _at)
    {
        throw new Error("ICjsSfxControls.getRTPC must be overridden.");
    }

    /**
     * A global RTPC value.
     *
     * @param {string|number} _name - RTPC name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number|null|undefined} The value, or nothing when unset.
     */
    getGlobalRTPC(_name, _at)
    {
        throw new Error("ICjsSfxControls.getGlobalRTPC must be overridden.");
    }

    /**
     * Live Voice Volume offset, in dB, for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @returns {number}
     */
    getVoiceVolumeDb(_matchIds)
    {
        throw new Error("ICjsSfxControls.getVoiceVolumeDb must be overridden.");
    }

    /**
     * Live Voice Pitch offset, in cents, for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @returns {number}
     */
    getVoicePitchCents(_matchIds)
    {
        throw new Error("ICjsSfxControls.getVoicePitchCents must be overridden.");
    }

    /**
     * Live Voice Low-pass offset for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number}
     */
    getVoiceLowPass(_matchIds, _at)
    {
        throw new Error("ICjsSfxControls.getVoiceLowPass must be overridden.");
    }

    /**
     * Live Voice High-pass offset for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number}
     */
    getVoiceHighPass(_matchIds, _at)
    {
        throw new Error("ICjsSfxControls.getVoiceHighPass must be overridden.");
    }

    /**
     * Sets a switch on the posting game object (a SetSwitch action).
     *
     * @param {string|number} _group - Switch group name or id.
     * @param {string|number} _value - Switch name or id.
     */
    setSwitch(_group, _value)
    {
        throw new Error("ICjsSfxControls.setSwitch must be overridden.");
    }

    /**
     * Sets a global state (a SetState action).
     *
     * @param {string|number} _group - State group name or id.
     * @param {string|number} _value - State name or id.
     */
    setState(_group, _value)
    {
        throw new Error("ICjsSfxControls.setState must be overridden.");
    }

    /**
     * The AbortSignal that ends one program leaf: its selection's, else its
     * program slot's, else the post's.
     *
     * @param {string|number} _programSlotId - Program slot id.
     * @param {number} _actionIndex - Action index in the program.
     * @param {number} _leafIndex - Leaf index in the action.
     * @param {string|number} [_programBatchId] - Program batch id.
     * @returns {AbortSignal|null}
     */
    getSfxProgramSignal(_programSlotId, _actionIndex, _leafIndex, _programBatchId)
    {
        throw new Error("ICjsSfxControls.getSfxProgramSignal must be overridden.");
    }

}

for (const method of Object.getOwnPropertyNames(ICjsSfxControls.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsSfxControls, method, impl.abstract);
}

CjsSchema.define(ICjsSfxControls, { className: "ICjsSfxControls", family: "audio", fields: {} });
