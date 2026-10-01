// Source: blueexposure/BlueClasses.cpp:266-294,429-464
// Source: blueexposure/include/BlueTypes.h:409-419
// Realm-local ClassRegistration storage shared by Blue and schema. This leaf
// imports neither facade, so declarations can register without loading Blue.
import * as CcpLog from "../../logging/ccpLog.js";

const registrations = new Map();
let revision = 0;

/**
 * Registers a complete entry under its explicit name, keeping the first entry.
 * Native ClassRegistration supplies one type, factory and flag word atomically.
 * JavaScript uses its constructor as type information and its trimmed name as
 * the class id; no Function.name lookup or construction policy is inferred.
 * @param {{name: string, type: Function, createFn?: Function, flags?: number}} registration Entry.
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
        flags: flags ?? 0
    });
    revision += 1;
    return true;
}

/**
 * Removes exactly one registered name, without deleting aliases or metadata.
 * @param {string} name Explicit class name.
 * @returns {boolean} Whether an entry was removed.
 */
export function unregisterClass(name)
{
    if (typeof name !== "string" || !name.trim()) return false;
    const removed = registrations.delete(name.trim());
    if (removed) revision += 1;
    return removed;
}

/**
 * Returns a record copy so callers cannot replace authoritative entry fields.
 * @param {string} name Explicit class name.
 * @returns {{name: string, type: Function, createFn: Function, flags: number}|null} Entry or null.
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
 * Returns the revision changed by successful additions and removals only.
 * @returns {number} Revision used by schema and default caches.
 */
export function getClassRegistrationRevision()
{
    return revision;
}
