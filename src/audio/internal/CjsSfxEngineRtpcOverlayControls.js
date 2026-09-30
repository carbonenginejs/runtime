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

    /**
     * Retains the post controls and object/global RTPC maps used to overlay
     * program actions.
     */
    constructor(controls, objectRtpcs, globalRtpcs)
    {
        super();
        this._controls = controls;
        this._objectRtpcs = objectRtpcs;
        this._globalRtpcs = globalRtpcs;
    }

    /** Reads the posting game object's identifier from the wrapped controls. */
    get gameObjID()
    {
        return this._controls.gameObjID;
    }

    /** Reads the post's cancellation signal from the wrapped controls. */
    get signal()
    {
        return this._controls.signal;
    }

    /**
     * Reads a program-written object RTPC when present, otherwise delegates the
     * timed query.
     */
    getRTPC(name, at)
    {
        return this._objectRtpcs.has(String(name))
            ? this._objectRtpcs.get(String(name))
            : this._controls.getRTPC(name, at);
    }

    /**
     * Reads a program-written global RTPC when present, otherwise delegates the
     * timed query.
     */
    getGlobalRTPC(name, at)
    {
        return this._globalRtpcs.has(String(name))
            ? this._globalRtpcs.get(String(name))
            : this._controls.getGlobalRTPC(name, at);
    }

    /** Delegates installation of a program to the wrapped post controls. */
    installSfxProgram(program)
    {
        return this._controls.installSfxProgram(program);
    }

    /** Delegates the switch-group query to the wrapped post controls. */
    getSwitch(group)
    {
        return this._controls.getSwitch(group);
    }

    /** Delegates the state-group query to the wrapped post controls. */
    getState(group)
    {
        return this._controls.getState(group);
    }

    /** Delegates the timed state-property blend query to the wrapped controls. */
    getStatePropertyWeights(group, at)
    {
        return this._controls.getStatePropertyWeights(group, at);
    }

    /** Delegates volume evaluation for the supplied voice target identifiers. */
    getVoiceVolumeDb(matchIds)
    {
        return this._controls.getVoiceVolumeDb(matchIds);
    }

    /** Delegates pitch evaluation for the supplied voice target identifiers. */
    getVoicePitchCents(matchIds)
    {
        return this._controls.getVoicePitchCents(matchIds);
    }

    /** Delegates timed low-pass evaluation for the supplied voice targets. */
    getVoiceLowPass(matchIds, at)
    {
        return this._controls.getVoiceLowPass(matchIds, at);
    }

    /** Delegates timed high-pass evaluation for the supplied voice targets. */
    getVoiceHighPass(matchIds, at)
    {
        return this._controls.getVoiceHighPass(matchIds, at);
    }

    /** Forwards a switch-group assignment to the wrapped post controls. */
    setSwitch(group, value)
    {
        return this._controls.setSwitch(group, value);
    }

    /** Forwards a state-group assignment to the wrapped post controls. */
    setState(group, value)
    {
        return this._controls.setState(group, value);
    }

    /**
     * Delegates the cancellation-signal lookup for the specified program batch,
     * slot, action and leaf.
     */
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
