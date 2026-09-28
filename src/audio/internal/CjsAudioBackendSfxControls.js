import { CjsSchema } from "#schema";
import { ICjsSfxControls } from "../ICjsSfxControls.js";

/**
 * Live SFX controls for one emitter's post, reading the backend's switch,
 * state, RTPC and voice-property state for that game object.
 */
export class CjsAudioBackendSfxControls extends ICjsSfxControls
{
    gameObjID = 0;

    signal = null;

    _backend = null;

    _playingID = 0;

    _record = null;

    /**
     * @param {import("../CjsWebAudioSoundEngine.js").CjsWebAudioSoundEngine} backend - Owning backend.
     * @param {number} gameObjID - Posting game object.
     * @param {AbortSignal|null} signal - The post's signal.
     * @param {number} playingID - The post's playing id.
     * @param {object|null} record - The backend's playing record.
     */
    constructor(backend, gameObjID, signal, playingID, record)
    {
        super();
        this._backend = backend;
        this.gameObjID = gameObjID;
        this.signal = signal;
        this._playingID = playingID;
        this._record = record;
    }

    /** The backend's AudioContext time, or `at` when given. */
    _Now(at)
    {
        return at ?? (Number(this._backend._context?.currentTime) || 0);
    }

    installSfxProgram(program)
    {
        return this._backend._InstallSfxProgram(
            this._playingID,
            this._record,
            program,
        );
    }

    getSwitch(group)
    {
        return this._backend.GetSwitchValue(group, this.gameObjID);
    }

    getState(group)
    {
        return this._backend.GetGlobalState(group);
    }

    getStatePropertyWeights(group, at = undefined)
    {
        return this._backend._ReadStatePropertyWeights(group, this._Now(at));
    }

    getRTPC(name, at = undefined)
    {
        return this._backend._ReadSfxObjectRtpc(
            this._record,
            this.gameObjID,
            name,
            this._Now(at),
        );
    }

    getGlobalRTPC(name, at = undefined)
    {
        return this._backend._ReadRtpcValue(
            "global",
            String(name),
            undefined,
            this._Now(at),
        );
    }

    getVoiceVolumeDb(matchIds)
    {
        return this._backend._EvaluateSfxVoiceTargets("volume", this._record, matchIds, this._Now());
    }

    getVoicePitchCents(matchIds)
    {
        return this._backend._EvaluateSfxVoiceTargets("pitch", this._record, matchIds, this._Now());
    }

    getVoiceLowPass(matchIds, at = undefined)
    {
        return this._backend._EvaluateSfxVoiceTargets("lowPass", this._record, matchIds, this._Now(at));
    }

    getVoiceHighPass(matchIds, at = undefined)
    {
        return this._backend._EvaluateSfxVoiceTargets("highPass", this._record, matchIds, this._Now(at));
    }

    setSwitch(group, value)
    {
        return this._backend.SetSwitch(group, value, this.gameObjID);
    }

    setState(group, value)
    {
        return this._backend.SetGlobalState(group, value);
    }

    getSfxProgramSignal(programSlotId, actionIndex, leafIndex, programBatchId)
    {
        return this._backend._ReadSfxProgramSignal(
            this._record,
            this.signal,
            programSlotId,
            actionIndex,
            leafIndex,
            programBatchId,
        );
    }
}

CjsSchema.define(CjsAudioBackendSfxControls, { className: "CjsAudioBackendSfxControls", family: "audio", fields: {} });
