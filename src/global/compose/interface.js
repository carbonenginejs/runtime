// Source: blueexposure MAP_INTERFACE (BlueExposureMacros.h:171) - Carbon's multiple-inheritance declaration,
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
//   @meta.blue.inherit(Tr2RenderContextAL)
//   class Tr2RenderContext extends Tr2RenderContextBase { }
//
// The primary base uses the prototype chain; additional declared bases supply
// their members without replacing the class's own implementation.
//
// NO BRAND IS INSTALLED HERE, deliberately. Brands exist only where Carbon
// itself casts (the BlueCastPtr ports); capability discovery and test lineage
// checks are never a reason, and neither are typeof probes. A contract that
// genuinely needs a cast declares its own `Symbol.hasInstance`, as the
// dependency-free contracts under `global/interfaces` already do.

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
 * Members arriving from the contract are reported to `onInstalled` ALONG WITH
 * THE CONTRACT THEY CAME FROM, so the schema can carry across what the
 * interface already declared about each one. That matters because Carbon's
 * interfaces are not uniform: some methods are pure virtual and some have an
 * empty body, and marking the second kind `impl.abstract` on every consumer
 * would write "Carbon leaves this unimplemented" onto methods Carbon in fact
 * implements - a false entry in the divergence ledger, which is the one thing
 * `@impl` exists to keep honest.
 *
 * @param {Function} Constructor The class receiving the contract.
 * @param {Function} Contract The additional base.
 * @param {Function} [onInstalled] Called as
 *   `(Constructor, methodName, Contract)` for each method actually installed.
 *   Injected rather than imported; see the note at the top of this file.
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
        for (const name of installed) onInstalled(Constructor, name, Contract);
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
 * one. A deliberate non-Carbon extension.
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
 * INHERITING IS NOT MAPPING, and `@meta.blue.interface` below is the other
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
 * different questions - see `carbonInterfaceDecorator`.
 */
const MAPPED = Symbol.for("carbonenginejs.carbon.mappedInterfaces");


/**
 * Every interface the class exposes: its own entries, then each `chainTo`
 * parent's, the order `BlueClasses::QueryThisInterface` walks them. A class with
 * no own table answers with its nearest JS ancestor's. Listing a concrete class
 * as an interface never traverses that class's table.
 *
 * @param {Function} Constructor The class to ask about.
 * @returns {Set<Function>} Empty when nothing is mapped. Do not mutate.
 */
export function mappedInterfaces(Constructor)
{
    return ResolveInterfaceTable(Constructor);
}


/**
 * Only the class's own `MAP_INTERFACE` entries - its `ClassInfo::mInterfaceTable`
 * - without following `chainTo`. A class with no own table answers with its
 * nearest JS ancestor's, as `mappedInterfaces` does. Carbon's Find helpers
 * test this table alone (`blueexposure/Find.cpp:159-173`).
 *
 * @param {Function} Constructor The class to ask about.
 * @returns {Set<Function>} Empty when nothing is mapped. Do not mutate.
 */
export function ownMappedInterfaces(Constructor)
{
    if (typeof Constructor !== "function") return new Set();
    const table = Constructor[MAPPED];
    return table ? table.interfaces : new Set();
}


/**
 * The class a class's exposure chains to: Carbon's `ClassInfo::mParentClassInfo`,
 * set by `EXPOSURE_CHAINTO` (BlueExposureMacros.h:136-138). A class with no own
 * table answers with its nearest JS ancestor's, as `mappedInterfaces` does.
 *
 * @param {Function} Constructor The class to ask about.
 * @returns {Function|null} The chained class, or null at the end of the chain.
 */
export function exposureChainTo(Constructor)
{
    if (typeof Constructor !== "function") return null;
    const table = Constructor[MAPPED];
    return table ? table.chainTo : null;
}


/** Resolves an exposure table, optionally validating an unpublished replacement. */
function ResolveInterfaceTable(Constructor, visiting = null, replacement = null)
{
    if (typeof Constructor !== "function") return new Set();
    let table;
    if (replacement)
    {
        // A child with no own record would inherit the replacement too. Walking
        // the lookup here detects a chain back through such a child before the
        // new record is published.
        for (let current = Constructor; current; current = Object.getPrototypeOf(current))
        {
            if (current === replacement.Constructor)
            {
                table = replacement.table;
                break;
            }
            if (Object.hasOwn(current, MAPPED))
            {
                table = current[MAPPED];
                break;
            }
        }
    }
    else table = Constructor[MAPPED];

    if (!table) return new Set();
    visiting ??= new Set();
    if (visiting.has(table)) throw new TypeError("carbon.chainTo exposure chain contains a cycle.");
    visiting.add(table);
    const result = new Set(table.interfaces);
    if (table.chainTo)
    {
        for (const Interface of ResolveInterfaceTable(table.chainTo, visiting, replacement)) result.add(Interface);
    }
    visiting.delete(table);
    return result;
}


/**
 * Whether a class declares its own exposure table (`interface`/`chainTo`), as
 * every exposed class does, rather than being a listed interface.
 *
 * @param {Function} Constructor The class to ask about.
 * @returns {boolean} True when the class carries its own table.
 */
export function hasOwnInterfaceTable(Constructor)
{
    return typeof Constructor === "function" && Object.hasOwn(Constructor, MAPPED);
}


/**
 * The class's own exposure table, created on first use with the class itself as
 * its first entry - `EXPOSURE_BEGIN` pushes the class's own IID before any
 * `MAP_INTERFACE` line runs (BlueExposureMacrosPython.h:39-42).
 *
 * @param {Function} Constructor The class being declared.
 * @param {string} decoratorName For the error message.
 * @returns {{interfaces: Set<Function>, chainTo: Function|null}} The own table.
 */
function OwnInterfaceTable(Constructor, decoratorName)
{
    if (typeof Constructor !== "function" || !Constructor.prototype)
        throw new TypeError(`carbon.${decoratorName} requires a class constructor.`);
    if (Object.hasOwn(Constructor, MAPPED)) return Constructor[MAPPED];
    const table = { interfaces: new Set([ Constructor ]), chainTo: null };
    Object.defineProperty(Constructor, MAPPED, { value: table, configurable: true });
    return table;
}


/**
 * The `@meta.blue.interface(X, Y, ...)` class decorator: Carbon's
 * `MAP_INTERFACE` lines (BlueExposureMacros.h:171-175). The class itself is
 * always the first entry, as `EXPOSURE_BEGIN` adds it, so it is never listed.
 * Without `chainTo` the table ends here, as `EXPOSURE_END()` does. Called with
 * no interfaces it declares a table holding only the class itself.
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
 * answers to the base list. Exposure is asked through
 * `be.classes.QueryThisInterface`, so the two casts can never be confused.
 *
 * @param {Function[]} Interfaces The mapped interfaces, in `_Blue.cpp` order.
 * @returns {Function} A Stage-3 or imperative class decorator.
 */
export function carbonInterfaceDecorator(Interfaces)
{
    const mapped = Array.isArray(Interfaces) ? Interfaces : [ Interfaces ];
    for (const Interface of mapped)
    {
        if (typeof Interface !== "function" || !Interface.prototype)
            throw new TypeError("carbon.interface requires interface classes.");
    }
    return function (value, context)
    {
        if (context && typeof context === "object" && context.kind !== "class")
            throw new TypeError("carbon.interface only supports classes.");
        const table = OwnInterfaceTable(value, "interface");
        for (const Interface of mapped) table.interfaces.add(Interface);
    };
}


/**
 * The `@meta.blue.chainTo(Parent)` class decorator: Carbon's
 * `EXPOSURE_CHAINTO( Parent )` (BlueExposureMacros.h:136-138). After the
 * class's own entries, QueryInterface continues into `Parent`'s table
 * (BlueClasses.cpp:388-400). The chain is declared, not taken from `extends`.
 *
 * @param {Function} Parent The class whose table follows this one.
 * @returns {Function} A Stage-3 or imperative class decorator.
 */
export function carbonChainToDecorator(Parent)
{
    if (typeof Parent !== "function" || !Parent.prototype)
        throw new TypeError("carbon.chainTo requires a class constructor.");
    return function (value, context)
    {
        if (context && typeof context === "object" && context.kind !== "class")
            throw new TypeError("carbon.chainTo only supports classes.");
        const table = OwnInterfaceTable(value, "chainTo");
        if (table.chainTo) throw new TypeError("carbon.chainTo may be declared once per class.");
        ResolveInterfaceTable(value, new Set(), { Constructor: value, table: { interfaces: table.interfaces, chainTo: Parent } });
        table.chainTo = Parent;
    };
}

