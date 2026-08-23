# Writing an engine adapter

Status: Stable
Scope: `@carbonenginejs/runtime/resource`, `@carbonenginejs/runtime/trinity`, and `@carbonenginejs/runtime/engine/*`
Audience: Anyone adding or extending a renderer engine
Summary: Defines dependency direction, nominal runtime contracts, resource realization, and reflection ownership for renderer engines.

## Dependency direction

An engine is a leaf renderer inside the combined runtime. It may import the
GPU-free resource and Trinity classes it consumes, plus shared contracts from
`@carbonenginejs/runtime/contracts`. It must not import `core`, because core is the composition
root that selects engines and wires the application.

Use the identities we own:

- resources presented for realization are `CjsResource` instances;
- constant-buffer uploads are `CjsConstantPayload` instances;
- effect reflection comes from `Tr2Shader` and its owned reflection classes;
- render batches, accumulators, and batch maps use their Trinity classes;
- injected material and geometry resolution extends the Trinity resolver base;
- backend selection candidates extend `CjsBackendCandidate`.

Validate those identities once when composing or accepting a public operation,
then call required methods directly. A required base method throws until a
concrete engine implements it. Repeated `typeof value.Method === "function"`
checks and optional calls are not compatibility features for contracts owned by
this runtime; they hide incomplete composition and add work to hot paths.

Structural checks remain correct at boundaries we do not own, such as WebGPU
browser objects, host callbacks, decoded plain records, and caller-authored
WebGPU descriptors.

## Resource realization

The resource layer owns identity, caching, CPU payload lifetime, format
selection, and adapter-resource publication. The engine owns native GPU
allocation and destruction.

An engine realization method accepts a canonical `CjsResource`, reads its CPU
payload, creates a complete backend candidate, checks that the resource is still
current, and publishes the candidate with `SetAdapterResource`. It does not
recreate a resource-shaped method bag or a second lifecycle state machine.

Long-lived update queues remain resource-owned. For example, a texture-array
resource owns its requested revision and the engine consumes and commits that
revision. This preserves one lifecycle while keeping GPU calls in the engine.

## Reflection and topology

Carbon reflection belongs to `Tr2Shader`. Backend binding topology belongs to
the lowered backend package:

| Ask `Tr2Shader` | Ask the backend package |
|---|---|
| constant name, offset, and size | bind group and binding |
| resource type and `isSRGB` | generated symbol and resource kind |
| parameter annotations | register index and register space |
| effect description and stages | backend view dimension and visibility |

Do not read Carbon constant reflection from a format-package record. Do not
reimplement effect permutation selection in an engine; resource-owned effects
already select and cache permutations. Pipeline and bind-group creation remain
engine work.

A format reader may still be injected into a one-shot package decoder. That is
a data-acquisition seam, not permission to make runtime objects structural.

## Checklist

- the engine imports only downward layers and never `core`;
- every runtime-owned contract has one nominal base or canonical class;
- required base methods throw and concrete engine methods are called directly;
- structural validation is limited to external APIs and plain boundary data;
- resource lifecycle and effect selection stay in their owning layers;
- shader reflection comes from `Tr2Shader`;
- backend topology and native objects remain engine-owned;
- importing the engine subpath does not load `core` or another engine.
