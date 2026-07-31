# Runtime character roadmap

Status: Evolving
Scope: Planned `@carbonenginejs/runtime-character` work
Audience: Character-runtime integrators and maintainers
Summary: Separates implemented character contracts from approved but unavailable runtime work.

## Current baseline

The current package hydrates prepared libraries, resolves explicit part and
prepared-recipe selections, preserves atomic model LOD bundles, composes live
controls, exposes structural sinks, and constructs an immediate CPU skinning
palette for the bounded supported rig path.

See [architecture](architecture.md) and the
[prepared-library contract](reference/prepared-libraries.md) for the available
surface.

## Planned graph application

A future package-owned applicator may consume a resolved graph and associate
its declared dependencies with prepared runtime-resource results. It must keep
configuration and geometry from the same LOD bundle and remain independent of
a concrete GPU engine.

This applicator is not currently exported.

## Planned texture operations

Prepared character data needs typed texture-composition operations rather than
one generic normal input. The planned model preserves three independent cases:

- direct or full-normal input;
- masked-normal replacement;
- additive detail-normal contribution.

The package must not collapse these operations or infer them from filename
suffixes. Runtime-resource may provide prepared pixel data; an engine owns the
actual composition passes and texture realization.

No typed texture-operation API is currently exported.

## Planned animation-state work

The source-backed `Tr2GStateAnimation` and `Tr2GStateParameter` shapes are
available, and structural parameter sinks can receive named control values.
Authored state transitions, GState graph evaluation, cloth synchronization,
delayed palette queues, and GPU palette upload remain unavailable.

Any future state evaluator requires a legally distributable, source-backed
prepared graph. It must not treat a hydrated shell as behavioral parity.
