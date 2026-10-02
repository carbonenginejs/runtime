// Audio backend and manager for tests: the headless backend and the real
// manager, with a test's overrides on top. A method a test does not override
// behaves as it does for any caller - the stub keeps coherent state - instead
// of silently doing nothing.
import { AudManager, CjsWwiseSoundEngineStub, ICjsAudioGlobalReaders, ICjsMusicEngine, ICjsSfxControls } from "../../npm/dist/audio/index.js";

/** Puts each override on the instance as its own property, shadowing a method or an accessor. */
function Override(instance, overrides)
{
    for (const [ name, value ] of Object.entries(overrides))
    {
        Object.defineProperty(instance, name, { value, writable: true, configurable: true, enumerable: true });
    }
    return instance;
}

/** A headless audio backend with the test's overrides. */
export function WwiseSoundEngineStubWith(overrides = {})
{
    return Override(new CjsWwiseSoundEngineStub(), overrides);
}

/**
 * A real AudManager with the test's overrides. `enabled: true` sets the
 * manager's real state rather than shadowing its derived `enabled` getter, so
 * every state reader (enabled, GetState, GetStateValue) agrees.
 */
export function AudioManagerWith(overrides = {})
{
    const { enabled, ...rest } = overrides;
    const manager = Override(new AudManager(), rest);
    if (enabled === true) manager._state = "enabled";
    return manager;
}

/**
 * A music engine that owns no event and plays nothing. Each method says what
 * an engine with no music does, so a test overrides only what it observes.
 */
class NullMusicEngine extends ICjsMusicEngine
{
    HandlesEvent() { return false; }

    PostEvent() { return false; }

    ExecuteAction() {}

    GetSourcePlayPosition() { return -1; }

    SetSwitch() {}

    SetState() {}

    SetMusicVolume() {}

    RefreshBusVolumeGains() {}

    RefreshBusRtpcs() {}

    RefreshBusStates() {}

    RefreshBusDucking() {}

    Process() {}

    ReleaseMedia() { return false; }

    ClearMedia() { return 0; }

    Dispose() {}
}

/** A music engine with the test's overrides over NullMusicEngine. */
export function MusicEngineWith(overrides = {})
{
    return Override(new NullMusicEngine(), overrides);
}

/**
 * Global readers for a backend with no global RTPC or State set: every value
 * is unset and nothing is transitioning.
 */
class NullGlobalReaders extends ICjsAudioGlobalReaders
{
    getGlobalRTPC() { return null; }

    getGlobalRTPCTransitionBoundaries() { return []; }

    getGlobalStatePropertyWeights() { return []; }

    getGlobalStateTransitionBoundaries() { return []; }
}

/** Global readers with the test's overrides over NullGlobalReaders. */
export function GlobalReadersWith(overrides = {})
{
    return Override(new NullGlobalReaders(), overrides);
}

/**
 * SFX controls that answer nothing, as an empty controls record did before
 * the interface: every reader returns undefined and every setter does nothing.
 */
class NullSfxControls extends ICjsSfxControls
{
    gameObjID = 0;

    signal = null;

    installSfxProgram() { return undefined; }

    getSwitch() { return undefined; }

    getState() { return undefined; }

    getStatePropertyWeights() { return undefined; }

    getRTPC() { return undefined; }

    getGlobalRTPC() { return undefined; }

    getVoiceVolumeDb() { return undefined; }

    getVoicePitchCents() { return undefined; }

    getVoiceLowPass() { return undefined; }

    getVoiceHighPass() { return undefined; }

    setSwitch() {}

    setState() {}

    getSfxProgramSignal() { return undefined; }
}

/** SFX controls with the test's overrides (members or data) over NullSfxControls. */
export function SfxControlsWith(overrides = {})
{
    return Override(new NullSfxControls(), overrides);
}
