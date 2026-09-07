// Source: trinity MAP_INTERFACE - Carbon's multiple-inheritance declaration,
// e.g. `BLUE_CLASS( Tr2RenderContext ) : public Tr2RenderContextBase,
// public Tr2RenderContextAL` (Tr2RenderContext.h:85-87).
//
// C++ spends multiple inheritance freely; JavaScript has ONE `extends` slot.
// The shape this replaces is the mixin tower - `withIEveTransform(
// withIEveSpaceObject2(withITr2BoundingBox(Tr2Transform)))` - where every
// wrapper mints a distinct anonymous intermediate class. Those anonymous
// classes are the only reason the Symbol-brand `hasInstance` machinery exists,
// because two towers over the same base produce two unrelated constructors.
//
// A class takes its PRIMARY Carbon base with ordinary `extends`, and declares
// each ADDITIONAL base with this decorator:
//
//   @compose.interface(Tr2RenderContextAL)
//   class Tr2RenderContext extends Tr2RenderContextBase { }
//
// which reads as Carbon's own base list. Measured 2026-09-07: of 75 tower
// sites, 42 are a single mixin over CjsModel and need no decorator at all once
// CjsModel stops occupying the slot - the contract simply becomes the base.
// 24 carry one real Carbon base plus one contract, and 9 are deeper.
//
// NO BRAND IS INSTALLED HERE, deliberately. Brands exist only where Carbon
// itself casts (the BlueCastPtr ports); capability discovery and test lineage
// checks are never a reason, and neither are typeof probes. A contract that
// genuinely needs a cast declares its own `Symbol.hasInstance`, as the
// dependency-free contracts under `global/contracts` already do.

// This module imports NOTHING, for the reason `compose/notify.js` imports
// nothing: `CjsSchema` installs these decorators onto its own namespace, so a
// schema import here is a cycle through `schema/index.js` and fails at load
// with "Cannot access 'CjsSchema' before initialization". Schema decoration of
// installed members is therefore INJECTED by the caller - see `onInstalled`.

/** Members every class already answers, which a contract must never overwrite. */
const OBJECT_MEMBERS = new Set(Object.getOwnPropertyNames(Object.prototype));


/**
 * Collects a contract's instance members, nearest declaration winning.
 *
 * Walks the prototype chain so a contract that itself extends another contract
 * contributes both, which is what a C++ base list does.
 *
 * @param {Function} Contract
 * @returns {Map<String, PropertyDescriptor>}
 */
function CollectMembers(Contract)
{
    const members = new Map();

    for (let proto = Contract.prototype; proto && proto !== Object.prototype;
        proto = Object.getPrototypeOf(proto))
    {
        for (const name of Object.getOwnPropertyNames(proto))
        {
            if (name === "constructor" || OBJECT_MEMBERS.has(name)) continue;
            if (members.has(name)) continue;

            const descriptor = Object.getOwnPropertyDescriptor(proto, name);
            if (descriptor) members.set(name, descriptor);
        }
    }

    return members;
}


/**
 * Installs a contract's members onto a class's prototype, install-if-absent.
 *
 * Install-if-absent is the same rule `installNotify` follows: a member the
 * class or its `extends` chain already answers keeps its own, so declaring a
 * contract never silently replaces a real implementation. That is also why the
 * decorator can be applied to a class that already satisfies part of its
 * contract.
 *
 * Members arriving from the contract are reported to `onInstalled`, which the
 * schema uses to decorate them `impl.abstract` - matching what the mixin
 * towers decorated them with, so an unimplemented contract member throws where
 * it is called rather than returning undefined.
 *
 * @param {Function} Constructor The class receiving the contract.
 * @param {Function} Contract The additional base.
 * @param {Function} [onInstalled] Called as `(Constructor, methodName)` for
 *   each method actually installed. Injected rather than imported; see the
 *   note at the top of this file.
 * @returns {Function} The same constructor.
 */
export function installInterface(Constructor, Contract, onInstalled = null)
{
    if (typeof Constructor !== "function")
    {
        throw new TypeError("compose.interface requires a class constructor.");
    }
    if (typeof Contract !== "function" || !Contract.prototype)
    {
        throw new TypeError("compose.interface requires a contract class.");
    }

    const installed = [];

    for (const [ name, descriptor ] of CollectMembers(Contract))
    {
        if (name in Constructor.prototype) continue;

        Object.defineProperty(Constructor.prototype, name, {
            ...descriptor,
            configurable: true
        });

        if (typeof descriptor.value === "function") installed.push(name);
    }

    if (typeof onInstalled === "function")
    {
        for (const name of installed) onInstalled(Constructor, name);
    }

    return Constructor;
}


/**
 * The `@compose.interface(X)` class decorator.
 *
 * Takes the additional base and returns the decorator, so the declaration
 * reads as Carbon's base list rather than as a wrapper call.
 *
 * @param {Function} Contract The additional base to declare.
 * @param {Function} [onInstalled] Schema decoration hook, injected by the
 *   caller that owns the namespace.
 * @returns {Function} A stage-3 class decorator.
 */
export function composeInterfaceDecorator(Contract, onInstalled = null)
{
    if (typeof Contract !== "function" || !Contract.prototype)
    {
        throw new TypeError("compose.interface requires a contract class.");
    }

    return function (value, context)
    {
        if (context && typeof context === "object" && context.kind !== "class")
        {
            throw new TypeError("compose.interface only supports classes.");
        }

        installInterface(value, Contract, onInstalled);
    };
}
