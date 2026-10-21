// CarbonEngineJS extension (no Carbon counterpart): the Wwise stand-in's
// interface. Carbon Audio calls Wwise through free `AK::` functions
// (audio/src), not a Blue interface, so this layer has no
// Carbon class to port. Methods represent `AK::` functions or explicitly
// documented CarbonEngineJS backend capabilities.
// The Trinity -> Carbon Audio layer is a different one: trinityaudioapi.

import { CjsSchema, meta } from "#schema";

/**
 * What Carbon Audio (`AudManager`, `AudGameObjResource`, `AudGeometry` ...)
 * calls on `AudGameObjResource.backend`. Every method is required; an
 * implementation with nothing to do for one says so in its own body.
 * `CjsWebAudioSoundEngine` (Web Audio) and `CjsWwiseSoundEngineStub` (headless) implement it.
 */
export class ICjsWwiseSoundEngine
{

    /**
     * Initializes the sound engine (`AK::SoundEngine::Init`).
     *
     * @returns {boolean} Whether the engine is usable.
     */
    Init() {}

    /**
     * Loads a sound bank (`AK::SoundEngine::LoadBank`).
     *
     * @param {string} _name - Bank name.
     * @param {Function} [_callback] - Called with whether the load succeeded.
     */
    LoadBank(_name, _callback) {}

    /**
     * Unloads a sound bank (`AK::SoundEngine::UnloadBank`).
     *
     * @param {string} _name - Bank name.
     * @param {Function} [_callback] - Called when the unload completes.
     */
    UnloadBank(_name, _callback) {}

    /** Unloads every bank (`AK::SoundEngine::ClearBanks`). */
    ClearBanks() {}

    /**
     * Registers a game object (`AK::SoundEngine::RegisterGameObj`).
     *
     * @param {number} _gameObjID - Game object.
     */
    RegisterGameObj(_gameObjID) {}

    /**
     * Unregisters a game object (`AK::SoundEngine::UnregisterGameObj`).
     *
     * @param {number} _gameObjID - Game object.
     */
    UnregisterGameObj(_gameObjID) {}

    /**
     * Suppresses external completion delivery for this object's current events
     * (`AK::SoundEngine::CancelEventCallbackGameObject`) without stopping them.
     * Future posts are unaffected. Already delivered callbacks and work they
     * queued in the caller cannot be retracted.
     *
     * @param {number} _gameObjID - Game object whose current callbacks are cancelled.
     * @returns {void}
     */
    CancelEventCallbackGameObject(_gameObjID) {}

    /**
     * Whether an installed authored program owns execution of an event's Stops.
     * This is a CarbonEngineJS backend capability, not a Wwise function.
     *
     * @param {string} _eventName - Event name.
     * @returns {boolean} Whether the backend owns authored Stop execution.
     */
    HandlesEventStops(_eventName) {}

    /**
     * Posts an event on a game object (`AK::SoundEngine::PostEvent`).
     *
     * @param {number} _eventID - Event.
     * @param {number} _gameObjID - Game object.
     * @param {number} [_additionalFlags] - AkCallbackType flags.
     * @param {object} [_emitter] - Receives `EventFinishedCallback(playingID)`.
     * @param {string} [_eventName] - Event name.
     * @returns {number} The playing ID, or 0 when nothing was posted.
     */
    PostEvent(_eventID, _gameObjID, _additionalFlags, _emitter, _eventName) {}

    /**
     * Stops, pauses or resumes one playing ID (`AK::SoundEngine::ExecuteActionOnPlayingID`).
     *
     * @param {string} _action - "stop", "break", "pause" or "resume".
     * @param {number} _playingID - Playing ID.
     * @param {number} [_fadeOutDuration] - Fade in milliseconds.
     */
    ExecuteActionOnPlayingID(_action, _playingID, _fadeOutDuration) {}

    /**
     * Seeks a playing ID by milliseconds (`AK::SoundEngine::SeekOnEvent`).
     *
     * @returns {boolean} Whether the seek applied.
     */
    SeekOnEventMs(_playingID, _msToSeek) {}

    /**
     * Seeks a playing ID by fraction of its duration (`AK::SoundEngine::SeekOnEvent`).
     *
     * @returns {boolean} Whether the seek applied.
     */
    SeekOnEventPercent(_playingID, _percentToSeek) {}

    /** Places a game object (`AK::SoundEngine::SetPosition`). */
    SetPosition(_gameObjID, _front, _top, _position) {}

    /**
     * Places the listener (`AK::SoundEngine::SetPosition` on the listener object).
     *
     * @returns {boolean} Whether the pose was applied.
     */
    SetListenerPosition(_gameObjID, _front, _top, _position) {}

    /**
     * Scales a game object's attenuation (`AK::SoundEngine::SetScalingFactor`).
     *
     * @returns {boolean} Whether the factor applied.
     */
    SetScalingFactor(_gameObjID, _value) {}

    /** Sets a game object's switch (`AK::SoundEngine::SetSwitch`). */
    SetSwitch(_switchGroup, _switchState, _gameObjID) {}

    /**
     * Sets a game object's RTPC (`AK::SoundEngine::SetRTPCValue`).
     *
     * @returns {boolean} Whether the value applied.
     */
    SetRTPCValue(_rtpcName, _value, _gameObjID) {}

    /**
     * Sets a global RTPC (`AK::SoundEngine::SetRTPCValue` on no game object).
     *
     * @returns {boolean} Whether the value applied.
     */
    SetGlobalRTPCValue(_rtpcName, _value) {}

    /**
     * Reads a global RTPC (`AK::SoundEngine::Query::GetRTPCValue`).
     *
     * @returns {number|undefined} The value, or undefined when never set.
     */
    GetGlobalRTPCValue(_rtpcName, _at) {}

    /** Sets a global state (`AK::SoundEngine::SetState`). */
    SetGlobalState(_stateGroup, _stateName) {}

    /**
     * Sets a game object's obstruction and occlusion
     * (`AK::SoundEngine::SetObjectObstructionAndOcclusion`).
     *
     * @returns {boolean} Whether the values applied.
     */
    SetObjectObstructionAndOcclusion(_gameObjID, _listenerID, _obstruction, _occlusion) {}

    /**
     * A playing ID's position in milliseconds (`AK::SoundEngine::GetSourcePlayPosition`).
     *
     * @returns {number} Milliseconds, or -1 when invalid or finished.
     */
    GetSourcePlayPosition(_playingID) {}

    /** Advances the engine one tick (`AK::SoundEngine::RenderAudio`). */
    RenderAudio() {}

    /**
     * Initializes spatial-audio geometry (`AK::SpatialAudio::Init`).
     *
     * @returns {boolean} Whether geometry is available.
     */
    InitSpatialAudioGeometry(_settings) {}

    /**
     * Registers a geometry set (`AK::SpatialAudio::SetGeometry`).
     *
     * @returns {boolean} Whether the set was registered.
     */
    SetGeometry(_geometrySetId, _params) {}

    /**
     * Places a geometry instance (`AK::SpatialAudio::SetGeometryInstance`).
     *
     * @returns {boolean} Whether the instance was placed.
     */
    SetGeometryInstance(_geometryInstanceId, _params) {}

    /** Removes a geometry set (`AK::SpatialAudio::RemoveGeometry`). */
    RemoveGeometry(_geometrySetId) {}

    /** Removes a geometry instance (`AK::SpatialAudio::RemoveGeometryInstance`). */
    RemoveGeometryInstance(_geometryInstanceId) {}

}

for (const method of Object.getOwnPropertyNames(ICjsWwiseSoundEngine.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsWwiseSoundEngine, method, meta.abstract);
}

CjsSchema.meta.define("ICjsWwiseSoundEngine")(ICjsWwiseSoundEngine);
