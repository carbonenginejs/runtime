// Source: blueexposure/BlueClasses.cpp:266-294,429-464
// Source: blueexposure/include/BlueTypes.h:409-419
// Realm-local ClassRegistration storage shared by Blue and schema. This leaf
// imports neither facade, so declarations can register without loading Blue.
import * as CcpLog from "../../../global/logging/ccpLog.js";

/**
 * Carbon's ClassRegistrarNullFactory (BlueRegistration.cpp:94-97).
 * Adapted: null represents the failed native bool/out-pointer construction.
 * A callable refusal is distinct from the registry's nullish default factory.
 * @returns {null} No instance.
 */
export function ClassRegistrarNullFactory()
{
    return null;
}

const registrations = new Map();
let revision = 0;

/**
 * Registers a complete entry under its explicit name, keeping the first entry.
 * Native ClassRegistration supplies one type, factory and flag word atomically.
 * JavaScript uses its constructor as type information and its trimmed name as
 * the class id; no Function.name lookup or construction policy is inferred.
 * `classInfo` is Carbon's `mType`, the class's compiled ClassInfo; the schema's
 * `registerClassInfo` supplies it, and this leaf only carries it.
 * @param {{name: string, type: Function, createFn?: Function, flags?: number, classInfo?: object}} registration Entry.
 * @returns {boolean} True when registered; a duplicate logs and returns false.
 */
export function registerClass(registration)
{
    const { name, type, createFn, flags } = registration;
    if (typeof name !== "string" || !name.trim())
    {
        throw new TypeError("Class registration requires a non-empty name.");
    }
    const className = name.trim();
    if (typeof type !== "function")
    {
        throw new TypeError(`Class registration constructor ${className} must be a function.`);
    }
    if (registrations.has(className))
    {
        // Carbon logs module and name; a JavaScript registration has no module.
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("blue"), "Class %s is already registered!", className);
        return false;
    }
    registrations.set(className, {
        name: className,
        type,
        createFn: createFn ?? (() => new type()),
        flags: flags ?? 0,
        classInfo: registration.classInfo ?? null
    });
    revision += 1;
    return true;
}

/**
 * Removes exactly one registered name, without deleting aliases or metadata. The class's record
 * then holds the factory and flags of its first registration still live, or none.
 * @param {string} name Explicit class name.
 * @returns {boolean} Whether an entry was removed.
 */
export function unregisterClass(name)
{
    if (typeof name !== "string" || !name.trim()) return false;
    const entry = registrations.get(name.trim());
    if (entry === undefined) return false;
    registrations.delete(entry.name);
    revision += 1;

    const classInfo = entry.classInfo;
    if (classInfo !== null)
    {
        let first = null;
        for (const other of registrations.values())
        {
            if (other.classInfo !== classInfo) continue;
            first = other;
            break;
        }
        classInfo.createFn = first === null ? null : first.createFn;
        classInfo.flags = first === null ? 0 : first.flags;
    }
    return true;
}

/**
 * Returns a record copy so callers cannot replace authoritative entry fields.
 * @param {string} name Explicit class name.
 * @returns {{name: string, type: Function, createFn: Function, flags: number, classInfo: object|null}|null} Entry or null.
 */
export function getClassRegistration(name)
{
    if (typeof name !== "string" || !name.trim()) return null;
    const registration = registrations.get(name.trim());
    return registration ? { ...registration } : null;
}

/**
 * Returns the registered constructor without allocating a registration copy.
 * @param {string} name Explicit class name.
 * @returns {Function|null} Constructor or null.
 */
export function getRegisteredConstructor(name)
{
    if (typeof name !== "string" || !name.trim()) return null;
    return registrations.get(name.trim())?.type || null;
}

/**
 * Copies of every registration, in registration order: the walk Carbon's
 * BlueClasses makes over `m_classes` (BlueClasses_Blue.cpp:88-104, 175-189).
 * @returns {Array<{name: string, type: Function, createFn: Function, flags: number, classInfo: object|null}>} Entries.
 */
export function getClassRegistrations()
{
    return Array.from(registrations.values(), registration => ({ ...registration }));
}

/**
 * Returns the revision changed by successful additions and removals only.
 * @returns {number} Revision used by schema and default caches.
 */
export function getClassRegistrationRevision()
{
    return revision;
}

/**
 * The process's class registry, Carbon's global `IBlueClasses* BeClasses`,
 * set by `BlueClasses.initialize()`. It lives in this leaf, beside the
 * registrations it serves, so `IRoot` and the other blueexposure classes
 * reach it without importing the class that extends them.
 *
 * Carbon: BeClasses (blueexposure/BlueClasses.cpp:28)
 * @type {import("../BlueClasses.js").BlueClasses|null}
 */
export let BeClasses = null;

/**
 * Sets `BeClasses`.
 *
 * @cjs An ES module's own bindings can only be assigned inside that module,
 *   and Carbon writes the global directly in `BlueClasses::Initialize`
 *   (BlueClasses.cpp:257-260), so `BlueClasses.initialize` assigns through this.
 * @param {import("../BlueClasses.js").BlueClasses} instance The registry.
 * @returns {void}
 */
export function setBeClasses(instance)
{
    BeClasses = instance;
}
