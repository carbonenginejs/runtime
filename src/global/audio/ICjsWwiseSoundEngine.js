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
     * @abstract
     * @returns {boolean} Whether the engine is usable.
     */
    Init() {}

    /**
     * Loads a sound bank (`AK::SoundEngine::LoadBank`).
     *
     * @abstract
     * @param {string} _name - Bank name.
     * @param {Function} [_callback] - Called with whether the load succeeded.
     */
    LoadBank(_name, _callback) {}

    /**
     * Unloads a sound bank (`AK::SoundEngine::UnloadBank`).
     *
     * @abstract
     * @param {string} _name - Bank name.
     * @param {Function} [_callback] - Called when the unload completes.
     */
    UnloadBank(_name, _callback) {}

    /**
     * Unloads every bank (`AK::SoundEngine::ClearBanks`).
     *
     * @abstract
     */
    ClearBanks() {}

    /**
     * Registers a game object (`AK::SoundEngine::RegisterGameObj`).
     *
     * @abstract
     * @param {number} _gameObjID - Game object.
     */
    RegisterGameObj(_gameObjID) {}

    /**
     * Unregisters a game object (`AK::SoundEngine::UnregisterGameObj`).
     *
     * @abstract
     * @param {number} _gameObjID - Game object.
     */
    UnregisterGameObj(_gameObjID) {}

    /**
     * Suppresses external completion delivery for this object's current events
     * (`AK::SoundEngine::CancelEventCallbackGameObject`) without stopping them.
     * Future posts are unaffected. Already delivered callbacks and work they
     * queued in the caller cannot be retracted.
     *
     * @abstract
     * @param {number} _gameObjID - Game object whose current callbacks are cancelled.
     * @returns {void}
     */
    CancelEventCallbackGameObject(_gameObjID) {}

    /**
     * Whether an installed authored program owns execution of an event's Stops.
     * This is a CarbonEngineJS backend capability, not a Wwise function.
     *
     * @abstract
     * @param {string} _eventName - Event name.
     * @returns {boolean} Whether the backend owns authored Stop execution.
     */
    HandlesEventStops(_eventName) {}

    /**
     * Posts an event on a game object (`AK::SoundEngine::PostEvent`).
     *
     * @abstract
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
     * @abstract
     * @param {string} _action - "stop", "break", "pause" or "resume".
     * @param {number} _playingID - Playing ID.
     * @param {number} [_fadeOutDuration] - Fade in milliseconds.
     */
    ExecuteActionOnPlayingID(_action, _playingID, _fadeOutDuration) {}

    /**
     * Seeks a playing ID by milliseconds (`AK::SoundEngine::SeekOnEvent`).
     *
     * @abstract
     * @returns {boolean} Whether the seek applied.
     */
    SeekOnEventMs(_playingID, _msToSeek) {}

    /**
     * Seeks a playing ID by fraction of its duration (`AK::SoundEngine::SeekOnEvent`).
     *
     * @abstract
     * @returns {boolean} Whether the seek applied.
     */
    SeekOnEventPercent(_playingID, _percentToSeek) {}

    /**
     * Places a game object (`AK::SoundEngine::SetPosition`).
     *
     * @abstract
     */
    SetPosition(_gameObjID, _front, _top, _position) {}

    /**
     * Places the listener (`AK::SoundEngine::SetPosition` on the listener object).
     *
     * @abstract
     * @returns {boolean} Whether the pose was applied.
     */
    SetListenerPosition(_gameObjID, _front, _top, _position) {}

    /**
     * Scales a game object's attenuation (`AK::SoundEngine::SetScalingFactor`).
     *
     * @abstract
     * @returns {boolean} Whether the factor applied.
     */
    SetScalingFactor(_gameObjID, _value) {}

    /**
     * Sets a game object's switch (`AK::SoundEngine::SetSwitch`).
     *
     * @abstract
     */
    SetSwitch(_switchGroup, _switchState, _gameObjID) {}

    /**
     * Sets a game object's RTPC (`AK::SoundEngine::SetRTPCValue`).
     *
     * @abstract
     * @returns {boolean} Whether the value applied.
     */
    SetRTPCValue(_rtpcName, _value, _gameObjID) {}

    /**
     * Sets a global RTPC (`AK::SoundEngine::SetRTPCValue` on no game object).
     *
     * @abstract
     * @returns {boolean} Whether the value applied.
     */
    SetGlobalRTPCValue(_rtpcName, _value) {}

    /**
     * Reads a global RTPC (`AK::SoundEngine::Query::GetRTPCValue`).
     *
     * @abstract
     * @returns {number|undefined} The value, or undefined when never set.
     */
    GetGlobalRTPCValue(_rtpcName, _at) {}

    /**
     * Sets a global state (`AK::SoundEngine::SetState`).
     *
     * @abstract
     */
    SetGlobalState(_stateGroup, _stateName) {}

    /**
     * Sets a game object's obstruction and occlusion
     * (`AK::SoundEngine::SetObjectObstructionAndOcclusion`).
     *
     * @abstract
     * @returns {boolean} Whether the values applied.
     */
    SetObjectObstructionAndOcclusion(_gameObjID, _listenerID, _obstruction, _occlusion) {}

    /**
     * A playing ID's position in milliseconds (`AK::SoundEngine::GetSourcePlayPosition`).
     *
     * @abstract
     * @returns {number} Milliseconds, or -1 when invalid or finished.
     */
    GetSourcePlayPosition(_playingID) {}

    /**
     * Advances the engine one tick (`AK::SoundEngine::RenderAudio`).
     *
     * @abstract
     */
    RenderAudio() {}

    /**
     * Initializes spatial-audio geometry (`AK::SpatialAudio::Init`).
     *
     * @abstract
     * @returns {boolean} Whether geometry is available.
     */
    InitSpatialAudioGeometry(_settings) {}

    /**
     * Registers a geometry set (`AK::SpatialAudio::SetGeometry`).
     *
     * @abstract
     * @returns {boolean} Whether the set was registered.
     */
    SetGeometry(_geometrySetId, _params) {}

    /**
     * Places a geometry instance (`AK::SpatialAudio::SetGeometryInstance`).
     *
     * @abstract
     * @returns {boolean} Whether the instance was placed.
     */
    SetGeometryInstance(_geometryInstanceId, _params) {}

    /**
     * Removes a geometry set (`AK::SpatialAudio::RemoveGeometry`).
     *
     * @abstract
     */
    RemoveGeometry(_geometrySetId) {}

    /**
     * Removes a geometry instance (`AK::SpatialAudio::RemoveGeometryInstance`).
     *
     * @abstract
     */
    RemoveGeometryInstance(_geometryInstanceId) {}

}

for (const method of Object.getOwnPropertyNames(ICjsWwiseSoundEngine.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsWwiseSoundEngine, method, meta.abstract);
}

CjsSchema.meta.define("ICjsWwiseSoundEngine")(ICjsWwiseSoundEngine);
