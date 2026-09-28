// CarbonEngineJS extension (no Carbon counterpart): the Wwise stand-in's
// interface. Carbon Audio calls Wwise through free `AK::` functions
// (e:/carbonengine/audio/src), not a Blue interface, so this layer has no
// Carbon class to port; each method is the `AK::` function it stands for.
// The Trinity -> Carbon Audio layer is a different one: trinityaudioapi.
// Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, impl } from "#schema";

/**
 * What Carbon Audio (`AudManager`, `AudGameObjResource`, `AudGeometry` ...)
 * calls on `AudGameObjResource.backend`. Every method is required; an
 * implementation with nothing to do for one says so in its own body.
 * `CjsAudioBackend` (Web Audio) and `CjsAudioBackendStub` (headless) implement it.
 */
export class ICjsAudioBackend
{

    /**
     * Initializes the sound engine (`AK::SoundEngine::Init`).
     *
     * @returns {boolean} Whether the engine is usable.
     */
    Init()
    {
        throw new Error("ICjsAudioBackend.Init must be overridden by an audio backend.");
    }

    /**
     * Loads a sound bank (`AK::SoundEngine::LoadBank`).
     *
     * @param {string} _name - Bank name.
     * @param {Function} [_callback] - Called with whether the load succeeded.
     */
    LoadBank(_name, _callback)
    {
        throw new Error("ICjsAudioBackend.LoadBank must be overridden by an audio backend.");
    }

    /**
     * Unloads a sound bank (`AK::SoundEngine::UnloadBank`).
     *
     * @param {string} _name - Bank name.
     * @param {Function} [_callback] - Called when the unload completes.
     */
    UnloadBank(_name, _callback)
    {
        throw new Error("ICjsAudioBackend.UnloadBank must be overridden by an audio backend.");
    }

    /** Unloads every bank (`AK::SoundEngine::ClearBanks`). */
    ClearBanks()
    {
        throw new Error("ICjsAudioBackend.ClearBanks must be overridden by an audio backend.");
    }

    /**
     * Registers a game object (`AK::SoundEngine::RegisterGameObj`).
     *
     * @param {number} _gameObjID - Game object.
     */
    RegisterGameObj(_gameObjID)
    {
        throw new Error("ICjsAudioBackend.RegisterGameObj must be overridden by an audio backend.");
    }

    /**
     * Unregisters a game object (`AK::SoundEngine::UnregisterGameObj`).
     *
     * @param {number} _gameObjID - Game object.
     */
    UnregisterGameObj(_gameObjID)
    {
        throw new Error("ICjsAudioBackend.UnregisterGameObj must be overridden by an audio backend.");
    }

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
    PostEvent(_eventID, _gameObjID, _additionalFlags, _emitter, _eventName)
    {
        throw new Error("ICjsAudioBackend.PostEvent must be overridden by an audio backend.");
    }

    /**
     * Stops, pauses or resumes one playing ID (`AK::SoundEngine::ExecuteActionOnPlayingID`).
     *
     * @param {string} _action - "stop", "break", "pause" or "resume".
     * @param {number} _playingID - Playing ID.
     * @param {number} [_fadeOutDuration] - Fade in milliseconds.
     */
    ExecuteActionOnPlayingID(_action, _playingID, _fadeOutDuration)
    {
        throw new Error("ICjsAudioBackend.ExecuteActionOnPlayingID must be overridden by an audio backend.");
    }

    /**
     * Seeks a playing ID by milliseconds (`AK::SoundEngine::SeekOnEvent`).
     *
     * @returns {boolean} Whether the seek applied.
     */
    SeekOnEventMs(_playingID, _msToSeek)
    {
        throw new Error("ICjsAudioBackend.SeekOnEventMs must be overridden by an audio backend.");
    }

    /**
     * Seeks a playing ID by fraction of its duration (`AK::SoundEngine::SeekOnEvent`).
     *
     * @returns {boolean} Whether the seek applied.
     */
    SeekOnEventPercent(_playingID, _percentToSeek)
    {
        throw new Error("ICjsAudioBackend.SeekOnEventPercent must be overridden by an audio backend.");
    }

    /** Places a game object (`AK::SoundEngine::SetPosition`). */
    SetPosition(_gameObjID, _front, _top, _position)
    {
        throw new Error("ICjsAudioBackend.SetPosition must be overridden by an audio backend.");
    }

    /**
     * Places the listener (`AK::SoundEngine::SetPosition` on the listener object).
     *
     * @returns {boolean} Whether the pose was applied.
     */
    SetListenerPosition(_gameObjID, _front, _top, _position)
    {
        throw new Error("ICjsAudioBackend.SetListenerPosition must be overridden by an audio backend.");
    }

    /**
     * Scales a game object's attenuation (`AK::SoundEngine::SetScalingFactor`).
     *
     * @returns {boolean} Whether the factor applied.
     */
    SetScalingFactor(_gameObjID, _value)
    {
        throw new Error("ICjsAudioBackend.SetScalingFactor must be overridden by an audio backend.");
    }

    /** Sets a game object's switch (`AK::SoundEngine::SetSwitch`). */
    SetSwitch(_switchGroup, _switchState, _gameObjID)
    {
        throw new Error("ICjsAudioBackend.SetSwitch must be overridden by an audio backend.");
    }

    /**
     * Sets a game object's RTPC (`AK::SoundEngine::SetRTPCValue`).
     *
     * @returns {boolean} Whether the value applied.
     */
    SetRTPCValue(_rtpcName, _value, _gameObjID)
    {
        throw new Error("ICjsAudioBackend.SetRTPCValue must be overridden by an audio backend.");
    }

    /**
     * Sets a global RTPC (`AK::SoundEngine::SetRTPCValue` on no game object).
     *
     * @returns {boolean} Whether the value applied.
     */
    SetGlobalRTPCValue(_rtpcName, _value)
    {
        throw new Error("ICjsAudioBackend.SetGlobalRTPCValue must be overridden by an audio backend.");
    }

    /**
     * Reads a global RTPC (`AK::SoundEngine::Query::GetRTPCValue`).
     *
     * @returns {number|undefined} The value, or undefined when never set.
     */
    GetGlobalRTPCValue(_rtpcName, _at)
    {
        throw new Error("ICjsAudioBackend.GetGlobalRTPCValue must be overridden by an audio backend.");
    }

    /** Sets a global state (`AK::SoundEngine::SetState`). */
    SetGlobalState(_stateGroup, _stateName)
    {
        throw new Error("ICjsAudioBackend.SetGlobalState must be overridden by an audio backend.");
    }

    /**
     * Sets a game object's obstruction and occlusion
     * (`AK::SoundEngine::SetObjectObstructionAndOcclusion`).
     *
     * @returns {boolean} Whether the values applied.
     */
    SetObjectObstructionAndOcclusion(_gameObjID, _listenerID, _obstruction, _occlusion)
    {
        throw new Error("ICjsAudioBackend.SetObjectObstructionAndOcclusion must be overridden by an audio backend.");
    }

    /**
     * A playing ID's position in milliseconds (`AK::SoundEngine::GetSourcePlayPosition`).
     *
     * @returns {number} Milliseconds, or -1 when invalid or finished.
     */
    GetSourcePlayPosition(_playingID)
    {
        throw new Error("ICjsAudioBackend.GetSourcePlayPosition must be overridden by an audio backend.");
    }

    /** Advances the engine one tick (`AK::SoundEngine::RenderAudio`). */
    RenderAudio()
    {
        throw new Error("ICjsAudioBackend.RenderAudio must be overridden by an audio backend.");
    }

    /**
     * Initializes spatial-audio geometry (`AK::SpatialAudio::Init`).
     *
     * @returns {boolean} Whether geometry is available.
     */
    InitSpatialAudioGeometry(_settings)
    {
        throw new Error("ICjsAudioBackend.InitSpatialAudioGeometry must be overridden by an audio backend.");
    }

    /**
     * Registers a geometry set (`AK::SpatialAudio::SetGeometry`).
     *
     * @returns {boolean} Whether the set was registered.
     */
    SetGeometry(_geometrySetId, _params)
    {
        throw new Error("ICjsAudioBackend.SetGeometry must be overridden by an audio backend.");
    }

    /**
     * Places a geometry instance (`AK::SpatialAudio::SetGeometryInstance`).
     *
     * @returns {boolean} Whether the instance was placed.
     */
    SetGeometryInstance(_geometryInstanceId, _params)
    {
        throw new Error("ICjsAudioBackend.SetGeometryInstance must be overridden by an audio backend.");
    }

    /** Removes a geometry set (`AK::SpatialAudio::RemoveGeometry`). */
    RemoveGeometry(_geometrySetId)
    {
        throw new Error("ICjsAudioBackend.RemoveGeometry must be overridden by an audio backend.");
    }

    /** Removes a geometry instance (`AK::SpatialAudio::RemoveGeometryInstance`). */
    RemoveGeometryInstance(_geometryInstanceId)
    {
        throw new Error("ICjsAudioBackend.RemoveGeometryInstance must be overridden by an audio backend.");
    }

}

for (const method of Object.getOwnPropertyNames(ICjsAudioBackend.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsAudioBackend, method, impl.abstract);
}

CjsSchema.define(ICjsAudioBackend, { className: "ICjsAudioBackend", family: "audio", fields: {} });
