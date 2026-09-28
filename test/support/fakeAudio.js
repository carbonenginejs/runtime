// Complete stand-ins for the audio backend and manager.
//
// A fake written as an object literal carries only the methods one test
// thought of, and used to work because production hedged every call
// (`backend?.ClearBanks?.()`). Those hedges are gone - a missing method on
// our own class fails - so a fake starts from EVERY method the real class
// declares, each a no-op returning undefined (what a hedged missing call
// returned), and the test overrides the ones it observes.
import { CjsAudioBackend, AudManager } from "../../npm/dist/audio/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";

function NoOpMethods(Constructor)
{
    const methods = {};
    for (let prototype = Constructor.prototype;
        prototype && prototype !== Object.prototype && prototype !== CjsModel.prototype;
        prototype = Object.getPrototypeOf(prototype))
    {
        for (const name of Object.getOwnPropertyNames(prototype))
        {
            if (name === "constructor" || Object.hasOwn(methods, name)) continue;
            const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
            if (typeof descriptor.value === "function") methods[name] = () => undefined;
        }
    }
    return methods;
}

/** A backend with every CjsAudioBackend method, no-ops unless overridden. */
export function FakeAudioBackend(overrides = {})
{
    return Object.assign(NoOpMethods(CjsAudioBackend), overrides);
}

/** A manager with every AudManager method, no-ops unless overridden. */
export function FakeAudioManager(overrides = {})
{
    return Object.assign(NoOpMethods(AudManager), overrides);
}
