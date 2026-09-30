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

    /**
     * Installs a program against this post's playing identifier and backend
     * record.
     */
    installSfxProgram(program)
    {
        return this._backend._InstallSfxProgram(
            this._playingID,
            this._record,
            program,
        );
    }

    /** Reads the backend switch value for this posting game object. */
    getSwitch(group)
    {
        return this._backend.GetSwitchValue(group, this.gameObjID);
    }

    /** Reads the backend's global state for the requested group. */
    getState(group)
    {
        return this._backend.GetGlobalState(group);
    }

    /**
     * Evaluates backend state-property weights at the supplied or current audio
     * time.
     */
    getStatePropertyWeights(group, at = undefined)
    {
        return this._backend._ReadStatePropertyWeights(group, this._Now(at));
    }

    /**
     * Reads an object RTPC using the post record and game-object identifier at
     * audio time.
     */
    getRTPC(name, at = undefined)
    {
        return this._backend._ReadSfxObjectRtpc(
            this._record,
            this.gameObjID,
            name,
            this._Now(at),
        );
    }

    /** Reads a named global RTPC at the supplied or current audio time. */
    getGlobalRTPC(name, at = undefined)
    {
        return this._backend._ReadRtpcValue(
            "global",
            String(name),
            undefined,
            this._Now(at),
        );
    }

    /** Evaluates the post's matching volume targets at current audio time. */
    getVoiceVolumeDb(matchIds)
    {
        return this._backend._EvaluateSfxVoiceTargets("volume", this._record, matchIds, this._Now());
    }

    /** Evaluates the post's matching pitch targets at current audio time. */
    getVoicePitchCents(matchIds)
    {
        return this._backend._EvaluateSfxVoiceTargets("pitch", this._record, matchIds, this._Now());
    }

    /**
     * Evaluates the post's matching low-pass targets at the supplied or current
     * audio time.
     */
    getVoiceLowPass(matchIds, at = undefined)
    {
        return this._backend._EvaluateSfxVoiceTargets("lowPass", this._record, matchIds, this._Now(at));
    }

    /**
     * Evaluates the post's matching high-pass targets at the supplied or current
     * audio time.
     */
    getVoiceHighPass(matchIds, at = undefined)
    {
        return this._backend._EvaluateSfxVoiceTargets("highPass", this._record, matchIds, this._Now(at));
    }

    /** Assigns a backend switch value for this posting game object. */
    setSwitch(group, value)
    {
        return this._backend.SetSwitch(group, value, this.gameObjID);
    }

    /** Assigns the backend's global state for the requested group. */
    setState(group, value)
    {
        return this._backend.SetGlobalState(group, value);
    }

    /**
     * Reads a program signal using this post's record, cancellation signal and
     * program identifiers.
     */
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
