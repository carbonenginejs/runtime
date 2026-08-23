// Executable cross-engine seam checks. The adapter supplied by an engine's own
// test reaches its concrete classes without making this suite backend-specific.
// Shared runtime identities are nominal; raw GPU objects and plain result
// records remain structural because the organization does not own those APIs.

/** The canonical scope identity, and the two forms it takes. */
export const SCOPE_IDENTITY = Object.freeze({
  pattern: /^[a-z0-9-]+:\d+:\d+(@[a-z]+)?$/,
  examples: Object.freeze([ "uniform-buffer:0:1", "uniform-buffer:0:1@vertex" ]),
  rejects: Object.freeze([ "uniform-buffer:0", "0:1", "uniform buffer:0:1", "" ])
});


/** Builds nominal seam checks for one engine-supplied adapter. */
export function EngineContractChecks(engine)
{
  const title = (text) => `${engine.name} engine contract: ${text}`;

  return [
    {
      title: title("the scope identity is the shared binding vocabulary"),
      Run(assert)
      {
        for (const example of SCOPE_IDENTITY.examples)
        {
          assert.ok(SCOPE_IDENTITY.pattern.test(example), `${example} must be a legal scope identity`);
        }
        for (const rejected of SCOPE_IDENTITY.rejects)
        {
          assert.ok(!SCOPE_IDENTITY.pattern.test(rejected), `${rejected} must not be a legal scope identity`);
        }
      }
    },
    {
      title: title("a batch dispatcher requires the canonical resolver identity"),
      Run(assert)
      {
        assert.ok(engine.CreateDispatcher(engine.CreateResolver()));
        assert.throws(
          () => engine.CreateDispatcher({
            ResolveMaterial() {}, ResolveGeometry() {}, ResolveBindings() {}
          }),
          /resolver/i
        );
      }
    },
    {
      title: title("resource realization requires the canonical resource identity"),
      Run(assert)
      {
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
        const passed = reason(engine.CreateResource());
        assert.ok(passed === null || !engine.IsAdapterRejection(passed));
        const message = reason({
          GetPayload() {}, IsCurrent() {}, MarkLoaded() {}, MarkPreparing() {},
          MarkPrepared() {}, GetAdapterResource() {}, SetAdapterResource() {},
          DestroyAdapterResource() {}
        });
        assert.ok(message !== null);
        assert.ok(engine.IsAdapterRejection(message));
      }
    },
    {
      title: title("an accumulator requires the canonical Trinity identity"),
      async Run(assert)
      {
        await engine.PrepareAccumulator(engine.CreateAccumulator());
        await assert.rejects(
          () => engine.PrepareAccumulator({
            GetGdprBatches: () => [], GetBatches: () => [], GetBatchCount: () => 0
          }),
          /accumulator/i
        );
      }
    },
    {
      title: title("a batch map requires the canonical Trinity identity"),
      async Run(assert)
      {
        await engine.PrepareBatchMap(engine.CreateBatchMap());
        await assert.rejects(
          () => engine.PrepareBatchMap({
            GetBatchTypes: () => [], GetAccumulator: () => null, GetBatchCount: () => 0
          }),
          /batch map/i
        );
      }
    }
  ];
}
