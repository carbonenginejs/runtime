// Audio backend and manager for tests: the headless backend and the real
// manager, with a test's overrides on top. A method a test does not override
// behaves as it does for any caller - the stub keeps coherent state - instead
// of silently doing nothing.
import { AudManager, CjsAudioBackendStub } from "../../npm/dist/audio/index.js";

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
export function AudioBackendStubWith(overrides = {})
{
    return Override(new CjsAudioBackendStub(), overrides);
}

/** A real AudManager with the test's overrides. */
export function AudioManagerWith(overrides = {})
{
    return Override(new AudManager(), overrides);
}
