// CarbonEngineJS extension (no Carbon counterpart): a headless audio backend.
// It keeps the state Wwise would - banks, game objects and their placement,
// switches, RTPCs, states, playing IDs - and makes no sound, the way the
// trinityal stub keeps AL state without a device. Node hosts and tests use it.
// Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, impl } from "#schema";
import { ICjsWwiseSoundEngine } from "./ICjsWwiseSoundEngine.js";

/** A headless `ICjsWwiseSoundEngine`: coherent state, no sound. */
export class CjsWwiseSoundEngineStub extends ICjsWwiseSoundEngine
{
    /** Whether Init has run. */
    _initialized = false;

    /** Loaded bank names. */
    _banks = new Set();

    /** Game object -> { position, scalingFactor, switches, rtpcs, obstruction, occlusion }. */
    _gameObjects = new Map();

    /** Global RTPC name -> value. */
    _globalRtpcs = new Map();

    /** Global state group -> state. */
    _globalStates = new Map();

    /** Playing ID -> { eventID, eventName, gameObjID, emitter, positionMs, paused }. */
    _playing = new Map();

    /** The next playing ID PostEvent hands out. */
    _nextPlayingID = 1;

    /** The listener's last pose, or null. */
    _listener = null;

    /** How many times RenderAudio has run. */
    _renderCount = 0;

    /** Initializes; the stub is always usable. */
    Init()
    {
        this._initialized = true;
        return true;
    }

    /** Marks the bank loaded and reports success. */
    LoadBank(name, callback)
    {
        this._banks.add(String(name));
        if (callback) callback(true);
    }

    /** Marks the bank unloaded. */
    UnloadBank(name, callback)
    {
        this._banks.delete(String(name));
        if (callback) callback();
    }

    /** Unloads every bank. */
    ClearBanks()
    {
        this._banks.clear();
    }

    /** Registers a game object once. */
    RegisterGameObj(gameObjID)
    {
        if (this._gameObjects.has(gameObjID)) return;
        this._gameObjects.set(gameObjID, {
            position: null,
            scalingFactor: 1,
            switches: new Map(),
            rtpcs: new Map(),
            obstruction: 0,
            occlusion: 0
        });
    }

    /** Unregisters a game object; like Wwise, its playing events end. */
    UnregisterGameObj(gameObjID)
    {
        for (const [ playingID, entry ] of [ ...this._playing ])
        {
            if (entry.gameObjID === gameObjID) this._End(playingID);
        }
        this._gameObjects.delete(gameObjID);
    }

    /** Starts a playing ID on a registered game object; 0 when it is not registered. */
    PostEvent(eventID, gameObjID, _additionalFlags, emitter, eventName)
    {
        if (!this._gameObjects.has(gameObjID)) return 0;
        const playingID = this._nextPlayingID++;
        this._playing.set(playingID, {
            eventID,
            eventName: eventName ?? null,
            gameObjID,
            emitter: emitter ?? null,
            positionMs: 0,
            paused: false
        });
        return playingID;
    }

    /** "stop" and "break" end the playing ID; "pause" and "resume" hold or release it. */
    ExecuteActionOnPlayingID(action, playingID, _fadeOutDuration)
    {
        const entry = this._playing.get(playingID);
        if (!entry) return;
        if (action === "stop" || action === "break") this._End(playingID);
        else if (action === "pause") entry.paused = true;
        else if (action === "resume") entry.paused = false;
    }

    /** Moves a playing ID's position. */
    SeekOnEventMs(playingID, msToSeek)
    {
        const entry = this._playing.get(playingID);
        if (!entry) return false;
        entry.positionMs = Math.max(0, Number(msToSeek) || 0);
        return true;
    }

    /** Accepts a fractional seek; with no media there is no duration to scale it by. */
    SeekOnEventPercent(playingID, _percentToSeek)
    {
        return this._playing.has(playingID);
    }

    /** Records a registered game object's placement. */
    SetPosition(gameObjID, front, top, position)
    {
        const object = this._gameObjects.get(gameObjID);
        if (!object) return;
        object.position = { front: Array.from(front), top: Array.from(top), position: Array.from(position) };
    }

    /** Records the listener's pose. */
    SetListenerPosition(gameObjID, front, top, position)
    {
        this._listener = { gameObjID, front: Array.from(front), top: Array.from(top), position: Array.from(position) };
        return true;
    }

    /** Records a registered game object's attenuation scaling. */
    SetScalingFactor(gameObjID, value)
    {
        const object = this._gameObjects.get(gameObjID);
        if (!object) return false;
        object.scalingFactor = Number(value);
        return true;
    }

    /** Records a registered game object's switch. */
    SetSwitch(switchGroup, switchState, gameObjID)
    {
        const object = this._gameObjects.get(gameObjID);
        if (object) object.switches.set(String(switchGroup), String(switchState));
    }

    /** Records a registered game object's RTPC. */
    SetRTPCValue(rtpcName, value, gameObjID)
    {
        const object = this._gameObjects.get(gameObjID);
        if (!object) return false;
        object.rtpcs.set(String(rtpcName), Number(value));
        return true;
    }

    /** Records a global RTPC. */
    SetGlobalRTPCValue(rtpcName, value)
    {
        this._globalRtpcs.set(String(rtpcName), Number(value));
        return true;
    }

    /** A global RTPC's last value, or undefined. */
    GetGlobalRTPCValue(rtpcName, _at)
    {
        return this._globalRtpcs.get(String(rtpcName));
    }

    /** Records a global state. */
    SetGlobalState(stateGroup, stateName)
    {
        this._globalStates.set(String(stateGroup), String(stateName));
    }

    /** Records a registered game object's obstruction and occlusion. */
    SetObjectObstructionAndOcclusion(gameObjID, _listenerID, obstruction, occlusion)
    {
        const object = this._gameObjects.get(gameObjID);
        if (!object) return false;
        object.obstruction = Number(obstruction);
        object.occlusion = Number(occlusion);
        return true;
    }

    /** A playing ID's position, or -1 when it is not playing. */
    GetSourcePlayPosition(playingID)
    {
        const entry = this._playing.get(playingID);
        return entry ? entry.positionMs : -1;
    }

    /** Counts the tick; the stub renders nothing. */
    RenderAudio()
    {
        this._renderCount++;
    }

    /**
     * Not implemented, as on the Web Audio backend: Carbon added spatial-audio
     * geometry after the backend was ported. Reports failure.
     */
    InitSpatialAudioGeometry(_settings)
    {
        return false;
    }

    /** Not implemented (spatial-audio geometry, not ported). */
    SetGeometry(_geometrySetId, _params)
    {
        return false;
    }

    /** Not implemented (spatial-audio geometry, not ported). */
    SetGeometryInstance(_geometryInstanceId, _params)
    {
        return false;
    }

    /** Not implemented (spatial-audio geometry, not ported). */
    RemoveGeometry(_geometrySetId)
    {
    }

    /** Not implemented (spatial-audio geometry, not ported). */
    RemoveGeometryInstance(_geometryInstanceId)
    {
    }

    /** Whether a bank is loaded. */
    IsBankLoaded(name)
    {
        return this._banks.has(String(name));
    }

    /** A registered game object's recorded state, or null. */
    GetGameObject(gameObjID)
    {
        return this._gameObjects.get(gameObjID) ?? null;
    }

    /** A global state group's current state, or null. */
    GetGlobalState(stateGroup)
    {
        return this._globalStates.get(String(stateGroup)) ?? null;
    }

    /** The playing IDs still playing. */
    GetPlayingIDs()
    {
        return [ ...this._playing.keys() ];
    }

    /** Ends a playing ID and tells its emitter, as an end-of-event callback does. */
    _End(playingID)
    {
        const entry = this._playing.get(playingID);
        if (!entry) return;
        this._playing.delete(playingID);
        if (entry.emitter !== null) entry.emitter.EventFinishedCallback(playingID);
    }
}

CjsSchema.define(CjsWwiseSoundEngineStub, { className: "CjsWwiseSoundEngineStub", family: "audio", fields: {} });
for (const method of [ "InitSpatialAudioGeometry", "SetGeometry", "SetGeometryInstance", "RemoveGeometry", "RemoveGeometryInstance" ])
{
    CjsSchema.decorateMethod(CjsWwiseSoundEngineStub, method, impl.notImplemented);
}
