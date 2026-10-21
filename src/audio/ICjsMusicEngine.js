// CarbonEngineJS extension (no Carbon counterpart): the interactive-music
// engine's interface. Wwise plays interactive music inside the SDK, behind the
// same free `AK::SoundEngine` functions as every other event, so Carbon has no
// class here. The Web Audio backend routes music events to this engine.
// Name held for the operator (docs research/audio-backend-interface.md).
import { CjsSchema, meta } from "#schema";

/**
 * What `CjsWebAudioSoundEngine` and `CjsAudioSystem` call on a music engine. Every
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
    HandlesEvent(_eventName) {}

    /**
     * Posts a music event under a playing id the backend allocated.
     *
     * @param {string} _eventName - Event name.
     * @param {number} _playingID - Playing id.
     * @param {Function} _onFinished - Called once when the id ends.
     * @param {{ busVolumeStates?: object|null, gameObjID?: number }} [_options]
     * @returns {boolean} Whether the id stays live.
     */
    PostEvent(_eventName, _playingID, _onFinished, _options) {}

    /**
     * Applies a transport action to one playing id.
     *
     * @param {string} _action - Action name, as the backend received it.
     * @param {number} _playingID - Playing id.
     * @param {number} [_fadeOutDuration] - Fade in milliseconds.
     */
    ExecuteAction(_action, _playingID, _fadeOutDuration) {}

    /**
     * Current source play position in milliseconds, or -1 when unknown.
     *
     * @param {number} _playingID - Playing id.
     * @returns {number}
     */
    GetSourcePlayPosition(_playingID) {}

    /**
     * Sets a switch. Music switches are global; the game object is advisory.
     *
     * @param {string|number} _group - Switch group name or id.
     * @param {string|number} _value - Switch name or id.
     * @param {number} [_gameObjID] - Posting game object.
     */
    SetSwitch(_group, _value, _gameObjID) {}

    /**
     * Sets a global state.
     *
     * @param {string|number} _group - State group name or id.
     * @param {string|number} _value - State name or id.
     */
    SetState(_group, _value) {}

    /**
     * Sets the music category volume (0..1).
     *
     * @param {number} _value - Linear volume.
     */
    SetMusicVolume(_value) {}

    /** Reapplies live Bus Volume and filter state to scheduled routes. */
    RefreshBusVolumeGains() {}

    /** Reapplies dynamic Bus Volume RTPCs to scheduled routes. */
    RefreshBusRtpcs() {}

    /** Reapplies Immediate Audio Bus States to scheduled routes. */
    RefreshBusStates() {}

    /** Reapplies the shared SFX/music Audio Bus ducking envelopes. */
    RefreshBusDucking() {}

    /**
     * Scheduling tick, driven once per frame by the backend's RenderAudio.
     */
    Process() {}

    /**
     * Releases one cached media source.
     *
     * @param {string} _sourceId - Media source id.
     * @returns {boolean} Whether a cached source was released.
     */
    ReleaseMedia(_sourceId) {}

    /**
     * Releases every cached media source.
     *
     * @returns {number} The number released.
     */
    ClearMedia() {}

    /** Cancels playback and releases the engine's state. */
    Dispose() {}

}

for (const method of Object.getOwnPropertyNames(ICjsMusicEngine.prototype))
{
    if (method !== "constructor") CjsSchema.decorateMethod(ICjsMusicEngine, method, meta.abstract);
}

CjsSchema.meta.define("ICjsMusicEngine")(ICjsMusicEngine);
