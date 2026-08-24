# Model lifecycle

Status: Evolving
Scope: `@carbonenginejs/runtime/model` and the optional lifecycle-state subpath
Audience: Runtime authors implementing mutable schema-backed models
Summary: Defines the current dirty-settlement, traversal, initialization, resource, and optional lifecycle-state contracts.

## Runtime state

Every `CjsModel` owns one non-enumerable `__state` value. Its ordinary
`CjsModelState` contains:

- `dirty`, the one generic “a settle is owed” marker;
- `flags`, lazy invalidations cleared by the consumer that recomputes them;
- `rebuild`, work requirements cleared by the work method that succeeds;
- `updating`, the settle re-entrancy guard; and
- `suppressEvents`, the counted construction/teardown event gate.

The event emitter adds event storage only while listeners exist. Flags and
rebuild requirements are deliberately separate from `dirty`: neither makes
`IsDirty()` true, and a successful settle does not clear either set.

## Cooperative dirty settlement

`SetValues` marks the model dirty only when at least one field changes and
`markDirty !== false`. Schema-declared flag and rebuild consequences add tokens
to their respective sets; they do not independently mark the model dirty. Code
that mutates fields directly must call `MarkDirty()` or explicitly call
`UpdateValues()` to say “apply these changes.”

`UpdateValues()` always runs at least one `OnModified()` pass. It clears
`dirty` before each pass and repeats when the hook dirties the model again.
The model must settle within 32 passes.

- Returning `false` from `OnModified()` rejects the settle and retains
  `dirty`.
- Throwing or exceeding the pass limit also retains `dirty`.
- A successful settle emits one final `modified` event with `{ source }`
  unless events are suppressed.

The pipeline cannot promise a changed-property list to `OnModified()` or to
the ordinary settled event. Callers that need changed names use the
`SetValues` return value. A direct `SetValues(..., { markDirty: false })` path
may emit an immediate payload containing `properties`; that is not the normal
settled-event shape.

## Schema-backed child collections

Domain containers expose named methods such as `CreateAttachment`,
`AddAttachment`, `RemoveAttachment`, and `DeleteAttachment`. Those methods may
delegate to the programmatic static helpers `CjsModel.createChild(owner, ...)`,
`addChild`, `removeChild`, `deleteChild`, and `clearChildren`. Model instances do
not inherit generic property-string child methods; the named methods explicitly
defined by their domain class are their child-mutation API.

The helpers accept only schema `array` and `list` fields backed by ordinary
JavaScript arrays. They do not operate on typed arrays, maps, sets, or
undeclared properties. `createChild` hydrates one value using the collection's
declared item type before adding it.

A collection mutation follows the same state rules as `SetValues`:

- it marks the parent dirty unless `markDirty: false`;
- it adds that collection field's declared `@io.flag(...)` and
  `@io.rebuild(...)` tokens unless `notify: false`;
- it settles the parent unless `skipUpdate: true`; and
- it suppresses child and modified events when `skipEvents: true`.

When the parent implements Carbon-shaped `OnListModified`, insertion and
removal callbacks receive the mutated list. Clearing sends unload-start while
the list is still populated, then empties it. Generic `childadded`,
`childremoved`, `childdeleted`, and `childrencleared` events carry the property
and affected child or count; named wrappers may also supply `onAdded`,
`onRemoved`, `onDeleted`, or `onCleared` callbacks.

Remove only detaches. Delete also emits the deletion event and may run an
explicit domain-owned `delete` callback; it never guesses a generic `Destroy`
operation. JavaScript lifetime management remains ordinary garbage collection
when no teardown callback is supplied.

Child-owned flags and rebuild tokens are deliberately not interpreted by these
helpers. A child property may declare a token such as a deferred deletion
request, but the current runtime context decides whether and when to consume
it and which named parent method to call. That context must retain the exact
relationship it owns: the same child may be reached through multiple parents,
properties, or nested contexts, and graph traversal does not make those
contexts interchangeable. No global deletion queue or child-management
decorator is implied.

## Initialization

`CjsModel.from()` constructs or imports the graph, resolves references, then
initializes models created by the operation. Each initialization walk follows
owned children in post-order:

1. suppress events for the model;
2. add every declared flag/rebuild consequence and mark it dirty;
3. call an optional `Initialize()` with no arguments;
4. settle anything still dirty with events suppressed; and
5. release the event gate.

Children therefore initialize before their owning parents. Shared or cyclic
graphs use the operation's visited set and initialize each model once.

The document hydration adapter has its own `construct`, `applyValues`, and
`finalize` contract. Its exact `Initialize` argument policy is not normalized
with `CjsModel.from()` and should not be assumed interchangeable.

## Traversal and resources

`Traverse(visitor, options)` follows only schema-declared model relationships
and does not revisit cycles. It supports:

- pre-order or post-order visits;
- forward or reverse field/list order; and
- all relationships or owned relationships only.

Returning `false` from a pre-order visitor prunes that model's descendants.
Post-order return values are ignored.

`GetResources(out)` traverses the whole model graph, deduplicates resources,
and replaces the supplied output array. It collects schema-declared resource
fields and adds any iterable returned by `OnGetResources()`. A resource hook
does not prune descendants.

## Optional lifecycle state

The `./lifecycle` subpath can install `CjsLifecycleState` into
`__state.lifecycle`. Its current statuses are `alive`, `destroyPending`,
`destroying`, and `destroyed`.

Installing this state is optional. An object without it is ordinarily alive
and unmanaged. The global layer does not provide a generic lifecycle manager or
automatic transitions between these statuses.

## Asking whether a value is a model

Use `CjsSchema.isModelInstance(value)`, not `value instanceof CjsModel`.

`instanceof` asks a narrower question than it appears to: whether the value came
from *this* copy of the runtime package. Applications can install or bundle
multiple copies, so a model handed over by another copy fails the test while
being a perfectly good model. Nothing throws when
that happens — the value is silently copied into a plain object instead of
aliased, or rejected as "not a model", or exported without its `_type`.

`CjsModel` stamps every instance with a brand under `Symbol.for`, whose registry
is per realm rather than per copy, so the brand is readable from any copy.

To ask about a *particular* class, use `CjsSchema.isInstanceOf(name, value)`,
which is true for the named class and for anything descending from it. It reads
the declared names up the value's prototype chain — stamped, not derived — and
never compares constructor identity. Note what that rules out: resolving the
name through `GetConstructor` and testing `instanceof` against the result
reintroduces exactly the identity comparison being avoided, so it is not a valid
shorthand. `CjsSchema.getClassNames(Constructor)` returns that ancestry directly
when the names themselves are wanted.

Both are reachable through `CjsModel.schema` for code that already holds the
model layer. The predicates live on the schema because `CjsModel` imports
`CjsSchema` and the reverse is impossible, so the schema is the only side both a
consumer and the model class can reach.

The function `isModelInstance` remains exported from `./model` and is equivalent
to `CjsSchema.isModelInstance`; prefer the schema spelling in new code.

## Not provided by this foundation

The current model/lifecycle surface does not define:

- a generic `Destroy` operation;
- ownership-aware cloning or destruction;
- generic `SetValue` or `GetValue` methods;
- fetching;
- pre-modification events;
- property-level dirty state; or
- persistent initialization-transition management.

Domain packages may define those behaviors when they own the policy. They
must not infer them from historical lifecycle proposals.

## Related documentation

- [Carbon type and model guide](../core-types/README.md)
- [Current API reference](../reference/api.md)
