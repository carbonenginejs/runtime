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
//   @carbon.inherit(Tr2RenderContextAL)
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
 * The composed-contract record, held on the CONSTRUCTOR.
 *
 * Class statics inherit, so a subclass that is never itself decorated still
 * finds its parent's record in one lookup - no constructor-chain walk. A
 * subclass that IS decorated copies the inherited set before adding to it, so
 * declaring a contract on a subclass never reaches back into its parent.
 */
const COMPOSED = Symbol.for("carbonenginejs.compose.interfaces");


/**
 * Every contract composed onto a class, including those it inherits.
 *
 * @param {Function} Constructor
 * @returns {Set<Function>} Empty when nothing was composed. Do not mutate.
 */
export function composedContracts(Constructor)
{
    return (typeof Constructor === "function" && Constructor[COMPOSED]) || new Set();
}


/**
 * Records a contract and ITS OWN BASES against a class, copying an inherited
 * record first.
 *
 * THE WHOLE CHAIN, NOT THE NAMED BASE ALONE, because `cast` ports
 * `dynamic_cast` and C++ walks the base chain: something deriving from
 * `ITriEffectTextureParameter` casts to `ITriEffectResourceParameter` and to
 * `ITriEffectParameter` too, and Carbon does exactly that at different sites
 * (`Tr2Effect.cpp:914-925`, `:1930`). `CollectMembers` already walks the chain
 * for members, so recording only the leaf made a class that HAD every
 * inherited member answer null when asked about any of them but the last -
 * silently, which is the failure mode that matters.
 *
 * Declaring each level at the call site would also work and is rejected: the
 * donor names one base and means the chain, so a base list that had to spell
 * out its own ancestors would stop matching the header it is transcribed from.
 *
 * @param {Function} Constructor
 * @param {Function} Contract
 */
function RecordContract(Constructor, Contract)
{
    if (!Object.hasOwn(Constructor, COMPOSED))
    {
        Object.defineProperty(Constructor, COMPOSED, {
            value: new Set(Constructor[COMPOSED] ?? []),
            configurable: true
        });
    }

    for (
        let base = Contract;
        typeof base === "function" && base.prototype && base !== Object;
        base = Object.getPrototypeOf(base)
    )
    {
        Constructor[COMPOSED].add(base);
    }
}


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
        throw new TypeError("carbon.inherit requires a class constructor.");
    }
    if (typeof Contract !== "function" || !Contract.prototype)
    {
        throw new TypeError("carbon.inherit requires a base class.");
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

    RecordContract(Constructor, Contract);

    if (typeof onInstalled === "function")
    {
        for (const name of installed) onInstalled(Constructor, name);
    }

    return Constructor;
}


/**
 * Carbon's `dynamic_cast` / `BlueCastPtr`, as far as JavaScript can carry it.
 *
 * Carbon branches on runtime type constantly - 143 `dynamic_cast` sites in
 * trinity, of which ~116 target an INTERFACE and ask "does this object
 * implement this optional contract?". That is contract semantics, and it is
 * the one legitimate reason to test an object's type. This is that operation:
 *
 *     const owner = cast( child, IEveInheritPropertiesOwner );
 *     if( owner ) owner.SetInheritProperties( colorSet );
 *
 * against Carbon's
 *
 *     if( auto tmp = dynamic_cast<ITr2DebugRenderable*>( m_sourceEmitter.p ) )
 *
 * C++ gets a retyped pointer the compiler then enforces; JavaScript has no
 * type to change, so this does the checking half only and returns the same
 * object. The value is that HOW the question is answered lives in one place:
 * today a composed record with an `instanceof` fallback for contracts still
 * carrying a hand-written brand, tomorrow whatever replaces both, with no
 * call site touched.
 *
 * This is an INVENTION - Carbon needs no predicate because the cast doubles as
 * one. Registered in `docs/architecture/non-carbon-extensions.md`.
 *
 * @param {*} value The object to test.
 * @param {Function} Contract The contract to test against.
 * @returns {*} `value` when it implements the contract, otherwise `null`.
 */
export function cast(value, Contract)
{
    if (value === null || value === undefined) return null;

    if (typeof Contract !== "function" || !Contract.prototype)
    {
        throw new TypeError("CjsSchema.cast requires a contract class.");
    }

    const Constructor = value.constructor;

    if (typeof Constructor === "function" && Constructor[COMPOSED]?.has(Contract))
    {
        return value;
    }

    // Contracts still carrying a hand-written `Symbol.hasInstance` brand, and
    // ordinary `extends` lineage, both answer here. Removing a brand therefore
    // never changes an answer, which is what makes the 16 of them migratable
    // one at a time.
    return value instanceof Contract ? value : null;
}


/**
 * The `@carbon.inherit(X, Y, ...)` class decorator.
 *
 * Takes the additional bases and returns the decorator, so the declaration
 * reads as Carbon's base list rather than as a wrapper call. Several at once
 * because Carbon declares several at once - `TriDevice` has three
 * (`TriDevice.h:33-36`) - and one decorator per base would read as three
 * unrelated facts rather than one base list.
 *
 * ORDER IS CARBON'S BASE ORDER AND IT MATTERS. Installation is if-absent, so
 * the first base declaring a member is the one that supplies it, exactly as
 * C++ resolves an unqualified name against the base list left to right.
 *
 * INHERITING IS NOT MAPPING, and `@carbon.mapInterface` below is the other
 * half. This one is Carbon's base list: it decides which members a class has
 * and what `dynamic_cast` accepts. Mapping is the separate `_Blue.cpp`
 * exposure that `BlueCastPtr` reads, and it decides real behaviour - see that
 * decorator for the case that proves the two cannot be collapsed.
 *
 * @param {...Function} Contracts The additional bases, in Carbon's order. The
 *   schema injects its decoration hook as the last argument.
 * @returns {Function} A stage-3 class decorator.
 */
export function carbonInheritDecorator(Contracts, onInstalled = null)
{
    const bases = Array.isArray(Contracts) ? Contracts : [ Contracts ];

    if (!bases.length)
    {
        throw new TypeError("carbon.inherit requires at least one base class.");
    }

    for (const Contract of bases)
    {
        if (typeof Contract !== "function" || !Contract.prototype)
        {
            throw new TypeError("carbon.inherit requires a base class.");
        }
    }

    return function (value, context)
    {
        if (context && typeof context === "object" && context.kind !== "class")
        {
            throw new TypeError("carbon.inherit only supports classes.");
        }

        for (const Contract of bases) installInterface(value, Contract, onInstalled);
    };
}


/**
 * The classes `_Blue.cpp` maps for a given class, held on the CONSTRUCTOR.
 *
 * Separate from the composed-base record above because the two answer
 * different questions - see `carbonMapInterfaceDecorator`.
 */
const MAPPED = Symbol.for("carbonenginejs.carbon.mappedInterfaces");


/**
 * Every interface Carbon's exposure layer maps onto a class, inherited ones
 * included.
 *
 * @param {Function} Constructor The class to ask about.
 * @returns {Set<Function>} Empty when nothing is mapped. Do not mutate.
 */
export function mappedInterfaces(Constructor)
{
    return (typeof Constructor === "function" && Constructor[MAPPED]) || new Set();
}


/**
 * The `@carbon.mapInterface(X, Y, ...)` class decorator: Carbon's
 * `MAP_INTERFACE` entries, from the class's `EXPOSURE_BEGIN` block.
 *
 * WHY THIS IS NOT THE SAME FACT AS THE BASE LIST, with the case that settles
 * it. `MAP_INTERFACE` pushes an `InterfaceEntry` of IID and offset onto
 * `s_interfaces` (`BlueExposureMacros.h:171-175`) - a QueryInterface table -
 * and `BlueCastPtr` reads that table. It is NOT script-only; `blue/src` uses
 * it throughout. The black-file reader branches on it:
 *
 *     IInitializePtr init( BlueCastPtr( instance ) );
 *     if( !init ) { notify = BlueCastPtr( instance ); }
 *                                       // BlackReader.cpp:410-421
 *
 * A class that MAPS `IInitialize` is hydrated by reading every member and
 * then calling `Initialize()` once, with NO per-property notification. One
 * that does not map it gets `OnModified` per property instead. Inheriting
 * `IInitialize` does not put it in that table, so a class can implement
 * `Initialize` and still take the notify branch - which is why method
 * presence is the wrong test and this record is the right one.
 *
 * IT DESCRIBES AND DOES NOT INSTALL. Nothing is added to the prototype, and
 * `cast` deliberately does not read it: `cast` ports `dynamic_cast`, which
 * answers to the base list. A consumer wanting Carbon's exposure semantics
 * asks `mappedInterfaces` explicitly, so the two casts can never be confused
 * for one another.
 *
 * @param {...Function} Interfaces The mapped interfaces, as `_Blue.cpp` lists
 *   them.
 * @returns {Function} A stage-3 class decorator.
 */
export function carbonMapInterfaceDecorator(Interfaces)
{
    const mapped = Array.isArray(Interfaces) ? Interfaces : [ Interfaces ];

    if (!mapped.length)
    {
        throw new TypeError("carbon.mapInterface requires at least one interface class.");
    }

    for (const Interface of mapped)
    {
        if (typeof Interface !== "function" || !Interface.prototype)
        {
            throw new TypeError("carbon.mapInterface requires an interface class.");
        }
    }

    return function (value, context)
    {
        if (context && typeof context === "object" && context.kind !== "class")
        {
            throw new TypeError("carbon.mapInterface only supports classes.");
        }

        // Copied before adding, for the reason the composed record is: a
        // subclass declaring its own mapping must never reach back into its
        // parent's.
        const inherited = value[MAPPED];
        const own = new Set(inherited ?? []);
        for (const Interface of mapped) own.add(Interface);

        Object.defineProperty(value, MAPPED, { value: own, configurable: true });
    };
}
