import { CjsSchema } from "../schema/index.js";

/**
 * Hydration adapter seam.
 *
 * runtime-utils deliberately does NOT impose a runtime lifecycle
 * (SetValues / OnValueChanged / Initialize / etc. are one project's rules,
 * not a contract). The only thing the library guarantees is ORDERING:
 *
 *   1. construct   - build every instance (register refs before values, so
 *                    cycles/back-references resolve)
 *   2. applyValues - apply each node's field values
 *   3. finalize    - run once per instance AFTER the whole graph is built,
 *                    so references are already resolved
 *
 * Callers inject HOW their own classes are constructed, populated, and
 * finalized. Every hook is optional; when absent the built-in default is used
 * so plain objects / `class {}` need zero configuration.
 *
 * Adapter shape (all methods optional):
 *   construct(kind, ctx)             -> instance | undefined
 *        Return an instance, or `undefined` to fall back to the caller's
 *        built-in default construction (registry/class lookup).
 *   applyValues(instance, values, ctx) -> instance
 *        Apply `values` ({ fieldName: value }) to the instance. MUST mutate
 *        the given instance in place (returning a replacement would strip
 *        already-resolved references in cyclic graphs). Default: Object.assign.
 *   finalize(instance, ctx)          -> void
 *        Post-graph initialization. Default: no-op.
 *
 * ctx: { kind, shape?, node?, options }
 *
 * Options consumed:
 *   options.adapter  / options.hydrationAdapter : a single adapter object
 *   options.adapters : { [kind]: adapter } | Map  per-kind override (wins over
 *                      the single adapter)
 */

function adapterOwning(perKind, global, kind, name)
{
    if (perKind)
    {
        const specific = perKind instanceof Map ? perKind.get(kind) : perKind[kind];
        if (specific && typeof specific[name] === "function") return specific;
    }
    if (global && typeof global[name] === "function") return global;
    return null;
}

/**
 * Resolves a normalized adapter from hydration options. The returned object
 * always exposes construct/applyValues/finalize with the documented defaults.
 * @param {Object} [options]
 * @returns {{ construct: Function, applyValues: Function, finalize: Function }}
 */
export function resolveHydrationAdapter(options = {})
{
    const global = options.adapter || options.hydrationAdapter || null;
    const perKind = options.adapters || null;

    return {
        construct(kind, ctx)
        {
            const owner = adapterOwning(perKind, global, kind, "construct");
            return owner ? owner.construct(kind, ctx) : undefined;
        },
        applyValues(instance, values, ctx)
        {
            const owner = adapterOwning(perKind, global, ctx?.kind, "applyValues");
            if (owner) return owner.applyValues(instance, values, ctx);
            return Object.assign(instance, values);
        },
        finalize(instance, ctx)
        {
            const owner = adapterOwning(perKind, global, ctx?.kind, "finalize");
            if (owner) owner.finalize(instance, ctx);
        }
    };
}

/**
 * Optional convenience adapter for callers whose classes follow a
 * "SetValues + Initialize" convention (Carbon / ccpwgl / CjsModel style).
 *
 * This is NOT a default - opt in by passing it as `options.adapter`. Method
 * names are configurable; pass `false`/`null` to disable a phase. When
 * SetValues is enabled, applyValues throws if the populated instance does not
 * implement it; this keeps class population from silently bypassing runtime
 * validation. Finalize is skipped when the named initialize method is missing.
 *
 * @param {Object} [config]
 * @param {String|false|null} [config.setValues="SetValues"]
 * @param {String|false|null} [config.initialize="Initialize"]
 * @param {Function} [config.construct] optional construct hook
 * @returns {{ construct?: Function, applyValues: Function, finalize: Function }}
 */
export function createLifecycleAdapter(config = {})
{
    const setValuesName = config.setValues === undefined ? "SetValues" : config.setValues;
    const initializeName = config.initialize === undefined ? "Initialize" : config.initialize;
    const construct = typeof config.construct === "function" ? config.construct : null;

    const adapter = {
        applyValues(instance, values, ctx)
        {
            if (setValuesName && instance && typeof instance[setValuesName] === "function")
            {
                instance[setValuesName](values, ctx?.options);
                return instance;
            }
            if (setValuesName && instance && typeof instance === "object")
            {
                const kind = ctx?.kind ?? CjsSchema.getClassName(instance.constructor) ?? "unknown";
                throw new TypeError(`${kind} cannot be populated by createLifecycleAdapter: missing ${setValuesName}().`);
            }
            return Object.assign(instance, values);
        },
        finalize(instance, ctx)
        {
            if (initializeName && instance && typeof instance[initializeName] === "function")
            {
                instance[initializeName](ctx?.options);
            }
        }
    };

    if (construct) adapter.construct = construct;
    return adapter;
}
