/**
 * Hydration adapter seam - the population contract for readers that build
 * runtime objects incrementally (black/red). The ordering guarantee:
 *
 *   1. construct   - build every instance (register refs before values, so
 *                    cycles/back-references resolve)
 *   2. applyValues - apply each node's field values
 *   3. finalize    - run once per instance AFTER the whole graph is built,
 *                    so references are already resolved
 *
 * DEFAULTS (operator ruling, 2026-09-05; resource-population.md owns the
 * decision): a resolved class is populated through its own validated setter -
 * "if someone is using Object.assign, they probably should be using
 * SetValues" - and a class-owned Initialize runs once post-graph, which is
 * the incremental-reader counterpart of the reader+IInitialize handshake
 * Blue performs and CjsModel.from performs for whole-bag JSON. Plain
 * fallback carriers (unresolved kinds) keep raw assignment: that IS their
 * contract, not a bypass.
 *
 * The single escape hatch is `options.adapter`, per-hook optional. The
 * per-kind adapters map and the hydrationAdapter alias are gone - they had
 * zero consumers. Callers wanting raw assignment pass their own adapter.
 *
 * SetValues is called directly rather than through CjsSchema.setValues so a
 * reader works with only the schema layer loaded; the two are the same path
 * for every class that has the method.
 */

/**
 * Resolves a normalized adapter from hydration options. The returned object
 * always exposes construct/applyValues/finalize with the documented defaults.
 *
 * @param {Object} [options]
 * @param {Object} [options.adapter] Per-hook overrides: construct/applyValues/finalize.
 * @returns {{ construct: Function, applyValues: Function, finalize: Function }}
 */
export function resolveHydrationAdapter(options = {})
{
    const custom = options.adapter || null;

    return {
        construct(kind, ctx)
        {
            if (custom && typeof custom.construct === "function") return custom.construct(kind, ctx);
            return undefined;
        },
        applyValues(instance, values, ctx)
        {
            if (custom && typeof custom.applyValues === "function") return custom.applyValues(instance, values, ctx);
            if (instance && typeof instance.SetValues === "function")
            {
                instance.SetValues(values, ctx?.options);
                return instance;
            }
            return Object.assign(instance, values);
        },
        finalize(instance, ctx)
        {
            if (custom && typeof custom.finalize === "function")
            {
                custom.finalize(instance, ctx);
                return;
            }
            if (instance && typeof instance.Initialize === "function") instance.Initialize();
        }
    };
}
