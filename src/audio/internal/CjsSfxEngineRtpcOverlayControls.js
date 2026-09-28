import { CjsSchema } from "#schema";
import { ICjsSfxControls } from "../ICjsSfxControls.js";

/**
 * A post's controls with the RTPC values a program's own Set Game Parameter
 * actions have applied so far laid over them. Those two readers answer from
 * the overlay first; every other member is the post's.
 */
export class CjsSfxEngineRtpcOverlayControls extends ICjsSfxControls
{
    _controls = null;

    _objectRtpcs = null;

    _globalRtpcs = null;

    constructor(controls, objectRtpcs, globalRtpcs)
    {
        super();
        this._controls = controls;
        this._objectRtpcs = objectRtpcs;
        this._globalRtpcs = globalRtpcs;
    }

    get gameObjID()
    {
        return this._controls.gameObjID;
    }

    get signal()
    {
        return this._controls.signal;
    }

    getRTPC(name, at)
    {
        return this._objectRtpcs.has(String(name))
            ? this._objectRtpcs.get(String(name))
            : this._controls.getRTPC(name, at);
    }

    getGlobalRTPC(name, at)
    {
        return this._globalRtpcs.has(String(name))
            ? this._globalRtpcs.get(String(name))
            : this._controls.getGlobalRTPC(name, at);
    }

    installSfxProgram(program)
    {
        return this._controls.installSfxProgram(program);
    }

    getSwitch(group)
    {
        return this._controls.getSwitch(group);
    }

    getState(group)
    {
        return this._controls.getState(group);
    }

    getStatePropertyWeights(group, at)
    {
        return this._controls.getStatePropertyWeights(group, at);
    }

    getVoiceVolumeDb(matchIds)
    {
        return this._controls.getVoiceVolumeDb(matchIds);
    }

    getVoicePitchCents(matchIds)
    {
        return this._controls.getVoicePitchCents(matchIds);
    }

    getVoiceLowPass(matchIds, at)
    {
        return this._controls.getVoiceLowPass(matchIds, at);
    }

    getVoiceHighPass(matchIds, at)
    {
        return this._controls.getVoiceHighPass(matchIds, at);
    }

    setSwitch(group, value)
    {
        return this._controls.setSwitch(group, value);
    }

    setState(group, value)
    {
        return this._controls.setState(group, value);
    }

    getSfxProgramSignal(programSlotId, actionIndex, leafIndex, programBatchId)
    {
        return this._controls.getSfxProgramSignal(
            programSlotId,
            actionIndex,
            leafIndex,
            programBatchId,
        );
    }
}

CjsSchema.define(CjsSfxEngineRtpcOverlayControls, { className: "CjsSfxEngineRtpcOverlayControls", family: "audio", fields: {} });
