# Character renderer adoption gates

Status: Evolving
Scope: `@carbonenginejs/runtime/character` renderer integration
Audience: Character-runtime and renderer maintainers
Summary: Defines the source-neutral evidence required before character appearance behavior becomes a maintained renderer contract.

## Purpose

The character layer produces backend-neutral documents and appearance plans.
Historical renderers can demonstrate useful outcomes, but their filename
rules, fixed fallbacks, shader identities, live assets, and fixture-specific
policies are not public runtime authority.

## Required gates

A renderer integration is ready for promotion only when it has:

- typed owner, contributor, consumer, and resource relationships;
- independent placement and sampling transforms for every texture channel;
- explicit handling of cropped inputs versus reconstructed full atlases;
- deterministic composition order, blend operations, write masks, and neutral
  target initialization;
- atomic resource readiness before changing an authored binding;
- direct reporting of missing identities, targets, or relationships rather
  than filename inference;
- focused synthetic tests for hydration, planning, composition, and failure
  rollback; and
- renderer-specific tests proving its shader inputs and consumer bindings use
  the same conventions as the maintained backend.

## Ownership boundary

The appearance plan may carry logical operations, provenance, paths, and typed
relationships. Live textures, buffers, render targets, shader programs,
pipelines, device objects, caches, and resource leases remain renderer or
resource-manager state.

An adapter may implement a labelled provisional policy while a relationship is
unproved. It must keep that policy outside source documents and must not
serialize it as an authored fact.

## Parity rule

A reviewed earlier capability is preserved, explicitly superseded, or left as
an open gate. It is never silently dropped merely because its old discovery
mechanism was heuristic.

See also [Character appearance plans](character-appearance-plans.md) and the
[CPU, GPU, and format boundary](cpu-gpu-and-format-boundary.md).
