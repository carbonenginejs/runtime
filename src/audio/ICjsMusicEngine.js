// CarbonEngineJS extension (no Carbon counterpart): the interactive-music
// engine's interface. Wwise plays interactive music inside the SDK, behind the
// same free `AK::SoundEngine` functions as every other event, so Carbon has no
// class here. The Web Audio backend routes music events to this engine.
// Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, impl } from "#schema";

/**
 * What `CjsAudioBackend` and `CjsAudioSystem` call on a music engine. Every
 * method is required; an engine with nothing to do for one says so in its own
 * body. `CjsMusicEngine` implements it, and a host-injected engine must too.
 */
export class ICjsMusicEngine
{

    /**
     * Whether this engine owns an event.
     *
     * @param {string} _eventName - Event name.
     * @returns {boolean}
     */
    HandlesEvent(_eventName)
    {
        throw new Error("ICjsMusicEngine.HandlesEvent must be overridden by a music engine.");
    }

    /**
     * Posts a music event under a playing id the backend allocated.
     *
     * @param {string} _eventName - Event name.
     * @param {number} _playingID - Playing id.
     * @param {Function} _onFinished - Called once when the id ends.
     * @param {{ busVolumeStates?: object|null, gameObjID?: number }} [_options]
     * @returns {boolean} Whether the id stays live.
     */
    PostEvent(_eventName, _playingID, _onFinished, _options)
    {
        throw new Error("ICjsMusicEngine.PostEvent must be overridden by a music engine.");
    }

    /**
     * Applies a transport action to one playing id.
     *
     * @param {string} _action - Action name, as the backend received it.
     * @param {number} _playingID - Playing id.
     * @param {number} [_fadeOutDuration] - Fade in milliseconds.
     */
    ExecuteAction(_action, _playingID, _fadeOutDuration)
    {
        throw new Error("ICjsMusicEngine.ExecuteAction must be overridden by a music engine.");
    }

    /**
     * Current source play position in milliseconds, or -1 when unknown.
     *
     * @param {number} _playingID - Playing id.
     * @returns {number}
     */
    GetSourcePlayPosition(_playingID)
    {
        throw new Error("ICjsMusicEngine.GetSourcePlayPosition must be overridden by a music engine.");
    }

    /**
     * Sets a switch. Music switches are global; the game object is advisory.
     *
     * @param {string|number} _group - Switch group name or id.
     * @param {string|number} _value - Switch name or id.
     * @param {number} [_gameObjID] - Posting game object.
     */
    SetSwitch(_group, _value, _gameObjID)
    {
        throw new Error("ICjsMusicEngine.SetSwitch must be overridden by a music engine.");
    }

    /**
     * Sets a global state.
     *
     * @param {string|number} _group - State group name or id.
     * @param {string|number} _value - State name or id.
     */
    SetState(_group, _value)
    {
        throw new Error("ICjsMusicEngine.SetState must be overridden by a music engine.");
    }

    /**
     * Sets the music category volume (0..1).
     *
     * @param {number} _value - Linear volume.
     */
    SetMusicVolume(_value)
    {
        throw new Error("ICjsMusicEngine.SetMusicVolume must be overridden by a music engine.");
    }

    /** Reapplies live Bus Volume and filter state to scheduled routes. */
    RefreshBusVolumeGains()
    {
        throw new Error("ICjsMusicEngine.RefreshBusVolumeGains must be overridden by a music engine.");
    }

    /** Reapplies dynamic Bus Volume RTPCs to scheduled routes. */
    RefreshBusRtpcs()
    {
        throw new Error("ICjsMusicEngine.RefreshBusRtpcs must be overridden by a music engine.");
    }

    /** Reapplies Immediate Audio Bus States to scheduled routes. */
    RefreshBusStates()
    {
        throw new Error("ICjsMusicEngine.RefreshBusStates must be overridden by a music engine.");
    }

    /** Reapplies the shared SFX/music Audio Bus ducking envelopes. */
    RefreshBusDucking()
    {
        throw new Error("ICjsMusicEngine.RefreshBusDucking must be overridden by a music engine.");
    }

    /**
     * Scheduling tick, driven once per frame by the backend's RenderAudio.
     */
    Process()
    {
        throw new Error("ICjsMusicEngine.Process must be overridden by a music engine.");
    }

    /**
     * Releases one cached media source.
     *
     * @param {string} _sourceId - Media source id.
     * @returns {boolean} Whether a cached source was released.
     */
    ReleaseMedia(_sourceId)
    {
        throw new Error("ICjsMusicEngine.ReleaseMedia must be overridden by a music engine.");
    }

    /**
     * Releases every cached media source.
     *
     * @returns {number} The number released.
     */
    ClearMedia()
    {
        throw new Error("ICjsMusicEngine.ClearMedia must be overridden by a music engine.");
    }

    /** Cancels playback and releases the engine's state. */
    Dispose()
    {
        throw new Error("ICjsMusicEngine.Dispose must be overridden by a music engine.");
    }

}

for (const method of Object.getOwnPropertyNames(ICjsMusicEngine.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsMusicEngine, method, impl.abstract);
}

CjsSchema.define(ICjsMusicEngine, { className: "ICjsMusicEngine", family: "audio", fields: {} });
