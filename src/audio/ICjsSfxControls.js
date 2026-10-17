// CarbonEngineJS extension (no Carbon counterpart): Wwise evaluates an event's
// switches, states, RTPCs and voice properties inside the SDK. Our SFX engine
// evaluates them in JavaScript and reads the posting emitter's live values
// through this interface. Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, meta } from "#schema";

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
    installSfxProgram(_program) {}

    /**
     * The posting game object's current switch in a group.
     *
     * @param {string|number} _group - Switch group name or id.
     * @returns {string|number|null}
     */
    getSwitch(_group) {}

    /**
     * The current global state in a group.
     *
     * @param {string|number} _group - State group name or id.
     * @returns {string|number|null}
     */
    getState(_group) {}

    /**
     * A state group's weighted states, mid-transition included.
     *
     * @param {string|number} _group - State group name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {Array<{ state: string|number, weight: number }>}
     */
    getStatePropertyWeights(_group, _at) {}

    /**
     * The posting game object's RTPC value.
     *
     * @param {string|number} _name - RTPC name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number|null|undefined} The value, or nothing when unset.
     */
    getRTPC(_name, _at) {}

    /**
     * A global RTPC value.
     *
     * @param {string|number} _name - RTPC name or id.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number|null|undefined} The value, or nothing when unset.
     */
    getGlobalRTPC(_name, _at) {}

    /**
     * Live Voice Volume offset, in dB, for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @returns {number}
     */
    getVoiceVolumeDb(_matchIds) {}

    /**
     * Live Voice Pitch offset, in cents, for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @returns {number}
     */
    getVoicePitchCents(_matchIds) {}

    /**
     * Live Voice Low-pass offset for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number}
     */
    getVoiceLowPass(_matchIds, _at) {}

    /**
     * Live Voice High-pass offset for the matched voices.
     *
     * @param {Array<string|number>} _matchIds - Authored object ids.
     * @param {number} [_at] - AudioContext time; now when omitted.
     * @returns {number}
     */
    getVoiceHighPass(_matchIds, _at) {}

    /**
     * Sets a switch on the posting game object (a SetSwitch action).
     *
     * @param {string|number} _group - Switch group name or id.
     * @param {string|number} _value - Switch name or id.
     */
    setSwitch(_group, _value) {}

    /**
     * Sets a global state (a SetState action).
     *
     * @param {string|number} _group - State group name or id.
     * @param {string|number} _value - State name or id.
     */
    setState(_group, _value) {}

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
    getSfxProgramSignal(_programSlotId, _actionIndex, _leafIndex, _programBatchId) {}

}

for (const method of Object.getOwnPropertyNames(ICjsSfxControls.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsSfxControls, method, meta.abstract);
}

CjsSchema.meta.define(ICjsSfxControls, { className: "ICjsSfxControls", fields: {} });
