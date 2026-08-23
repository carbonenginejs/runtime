// The executable half of the engine package contract.
//
// The contract page lists five things that carry across backends, none of them
// a class. This file checks them, against an engine supplied by the caller. It
// mentions no WebGPU type, imports nothing from this package, and would run
// against `engine-webgl` unchanged.
//
// WHY IT LIVES UNDER test/ AND NOT IN A PACKAGE OF ITS OWN. The topology rule
// is explicit: do not create a repository merely to preserve a plan, and new
// ownership must be justified by a boundary that cannot be a subpath of an
// existing package. With one engine there is no such boundary — a shared
// conformance package would have exactly one consumer. It moves to a shared
// home when the second engine needs it, and the import in an engine's own test
// file is the only thing that changes.
//
// WHAT IT DELIBERATELY DOES NOT CHECK. Not pixels, not call sequences, and not
// symmetry. The divergence decision expects the two engines to differ in kind —
// WebGPU has no present call, DX11 has no indirect path, WebGL may have no
// pipeline cache — so a suite built on "both do the same thing" would encode
// the first engine's shape as the contract, which is precisely the failure the
// plan warns about. It checks the SEAMS: the names Trinity and the resource
// layer reach an engine through, and the shapes those seams accept and reject.

/** The canonical scope identity, and the two forms it takes. */
export const SCOPE_IDENTITY = Object.freeze({
  pattern: /^[a-z0-9-]+:\d+:\d+(@[a-z]+)?$/,
  examples: Object.freeze([ "uniform-buffer:0:1", "uniform-buffer:0:1@vertex" ]),
  rejects: Object.freeze([ "uniform-buffer:0", "0:1", "uniform buffer:0:1", "" ])
});


/** The eight methods an engine requires of a resource before realizing it. */
export const RESOURCE_ADAPTER_METHODS = Object.freeze([
  "GetPayload",
  "IsCurrent",
  "MarkLoaded",
  "MarkPreparing",
  "MarkPrepared",
  "GetAdapterResource",
  "SetAdapterResource",
  "DestroyAdapterResource"
]);


/** The getters an engine duck-types on a finalized accumulator. */
export const ACCUMULATOR_GETTERS = Object.freeze([ "GetGdprBatches", "GetBatches" ]);


/** The getters an engine duck-types on a batch map. */
export const BATCH_MAP_GETTERS = Object.freeze([ "GetBatchTypes", "GetAccumulator" ]);


/** The three composition hooks a batch dispatcher is constructed with. */
export const RESOLVER_HOOKS = Object.freeze([ "ResolveMaterial", "ResolveGeometry", "ResolveBindings" ]);


/**
 * Builds the contract checks for one engine.
 *
 * `engine` is supplied by the engine's own test file and describes how to reach
 * its seams without naming any backend type:
 *
 * - `name` — the backend name, used only in check titles;
 * - `CreateDispatcher(hooks)` — returns the engine's batch dispatcher, or
 *   throws if the hooks are incomplete;
 * - `AssertResourceAdapter(resource)` — throws unless the resource satisfies
 *   the eight-method adapter duck type;
 * - `IsAdapterRejection(message)` — whether an error message is that engine's
 *   way of saying the adapter duck type was not satisfied, so the check can
 *   tell an adapter rejection from an unrelated later failure;
 * - `PrepareAccumulator(accumulator)` / `PrepareBatchMap(batchMap)` — the entry
 *   points whose duck-typing is being checked. Both may reject.
 *
 * Returns `[{ title, Run(assert) }]`. The caller wraps each in its own test, so
 * this file needs no test framework of its own.
 */
export function EngineContractChecks(engine)
{
  const checks = [];
  const title = (text) => `${engine.name} engine contract: ${text}`;

  checks.push({
    title: title("the scope identity is the shared binding vocabulary"),
    Run(assert)
    {
      // Backend-neutral by construction: it is the D3D register identity, which
      // a GLSL binding record and a WGSL binding record both carry because both
      // were lowered from the same source.
      for (const example of SCOPE_IDENTITY.examples)
      {
        assert.ok(SCOPE_IDENTITY.pattern.test(example), `${example} must be a legal scope identity`);
      }
      for (const rejected of SCOPE_IDENTITY.rejects)
      {
        assert.ok(!SCOPE_IDENTITY.pattern.test(rejected), `${rejected} must not be a legal scope identity`);
      }
    }
  });

  if (typeof engine.CreateDispatcher === "function")
  {
    checks.push({
      title: title("a batch dispatcher requires all three resolver hooks"),
      Run(assert)
      {
        const hooks = Object.fromEntries(RESOLVER_HOOKS.map((name) => [ name, () => ({}) ]));
        assert.ok(engine.CreateDispatcher(hooks), "complete hooks must be accepted");

        // Each hook is required, so an engine cannot quietly default one and
        // resolve part of a batch itself.
        for (const missing of RESOLVER_HOOKS)
        {
          const partial = { ...hooks };
          delete partial[missing];
          assert.throws(
            () => engine.CreateDispatcher(partial),
            new RegExp(missing),
            `omitting ${missing} must be rejected by name`
          );
        }
      }
    });
  }

  if (typeof engine.AssertResourceAdapter === "function")
  {
    checks.push({
      title: title("resource realization requires the eight-method adapter"),
      Run(assert)
      {
        // A complete adapter is NOT required to realize successfully — it is
        // reached through a real entry point that goes on to want a payload,
        // and inventing one would make this a test of that backend's payloads.
        // What must hold is that the adapter gate stops complaining once all
        // eight are present, and complains for every one that is absent.
        const complete = Object.fromEntries(RESOURCE_ADAPTER_METHODS.map((name) => [ name, () => null ]));
        const reason = (resource) =>
        {
          try
          {
            engine.AssertResourceAdapter(resource);
            return null;
          }
          catch (error)
          {
            return String(error?.message ?? error);
          }
        };

        const passed = reason(complete);
        assert.ok(
          passed === null || !engine.IsAdapterRejection(passed),
          "a complete adapter must clear the adapter gate"
        );

        // Every method matters: the state calls and the adapter-slot calls are
        // how eviction and device loss stay survivable, so a resource missing
        // one is rejected rather than partially driven.
        for (const missing of RESOURCE_ADAPTER_METHODS)
        {
          const partial = { ...complete };
          delete partial[missing];
          const message = reason(partial);
          assert.ok(message !== null, `a resource without ${missing} must be rejected`);
          assert.ok(
            engine.IsAdapterRejection(message),
            `a resource without ${missing} must be rejected AS an adapter failure, not incidentally`
          );
        }
      }
    });
  }

  if (typeof engine.PrepareAccumulator === "function")
  {
    checks.push({
      title: title("an accumulator is duck-typed on its two batch vectors"),
      async Run(assert)
      {
        const accumulator = { GetGdprBatches: () => [], GetBatches: () => [] };
        await engine.PrepareAccumulator(accumulator);

        for (const missing of ACCUMULATOR_GETTERS)
        {
          const partial = { ...accumulator };
          delete partial[missing];
          await assert.rejects(
            () => engine.PrepareAccumulator(partial),
            `an accumulator without ${missing} must be rejected`
          );
        }

        // GetBatchCount is optional, but when present it is cross-checked
        // against the vectors rather than trusted.
        await assert.rejects(
          () => engine.PrepareAccumulator({ ...accumulator, GetBatchCount: () => 3 }),
          "a batch count that disagrees with the vectors must be rejected"
        );
      }
    });
  }

  if (typeof engine.PrepareBatchMap === "function")
  {
    checks.push({
      title: title("a batch map is duck-typed on its type list and accumulator lookup"),
      async Run(assert)
      {
        const batchMap = { GetBatchTypes: () => [], GetAccumulator: () => null };
        await engine.PrepareBatchMap(batchMap);

        for (const missing of BATCH_MAP_GETTERS)
        {
          const partial = { ...batchMap };
          delete partial[missing];
          await assert.rejects(
            () => engine.PrepareBatchMap(partial),
            `a batch map without ${missing} must be rejected`
          );
        }
      }
    });
  }

  return checks;
}
