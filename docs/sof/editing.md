# Authored SOF editing

Status: Evolving
Scope: CjsSOFEditManager in @carbonenginejs/runtime/sof
Audience: Editor and SOF tooling maintainers
Summary: One reusable receiver for authored SOF edits, separate from single-object DNA updates.

CjsSOFEditManager is our host-neutral receipt point for authored SOF changes.
An editor supplies one synchronous receiver. Buttons, commands, tree actions
and parameter widgets use the same manager; they do not install separate
mutation listeners on each SOF class.

## Two independent update directions

Editing a SOF definition can affect every consumer of that definition.
Changing one scene object's DNA chooses existing definitions at the time of
that change and affects only that object. CjsSOFUpdater handles the latter.
The edit manager does not route definition edits through the DNA updater or
rebuild scene objects. The receiver is the future integration point for
definition normalization, dependency filtering and propagation.

## Direct parameter edits

~~~js
const edits = new CjsSOFEditManager({ receive: change => owner.ReceiveUpdate(change) });
edits.SetValues(layer, { textureResFilePath: "res:/mask.dds" });
~~~

SetValues prevalidates declared, writable, non-runtime fields and UI readonly
metadata. It delegates conversion and native notifications to CjsSchema.setValues.
Equal writes produce no receipt. Mutated vectors keep their original backing
storage; before/after receipts hold component snapshots. Nested graph patches
are rejected: edit the actual child target so its identity remains explicit.

## Structural edits

~~~js
edits.Apply(pattern, ["projections"], () => pattern.projections.push(projection),
    draftRecord, "add");
edits.Added(newPattern, draftRecord);
~~~

Apply is for synchronous operations already admitted by a struct/list provider.
The provider retains creation, readonly, ownership, bounds and stale-selection
checks. A collection may allow insert/delete while its field is readonly as a
whole; the manager does not invent a replacement-write permission for it.
Arrays, sets and maps snapshot direct membership and order without cloning the
objects inside them. Indexed schema fields are supported.

Each receipt is {target, context, operation, changes}; each change is
{name, kind, before, after}. Context is caller-owned and passed untouched.
Added sends operation addRoot with no invented field diffs. Apply returns the
operation result. A mutation that partly succeeds and throws still reports its
actual changes, then rethrows. This is not an undo transaction. If both mutation
and receiver fail, AggregateError retains both failures. Receivers should copy
what they retain, remain synchronous and schedule expensive follow-up separately.

## Graphene integration

Graphene's SofDraftStore owns one manager and an identity index from nested
objects to owning drafts. Admission and structural edits refresh that index;
parameter edits mark only known owners dirty without walking every draft.
Shared children can belong to several drafts. SofDraftTree supplies a single
adapter per target per store to all parameter views and injects the same commit
function into Struct/StructList actions. Native schema notifications still run.

Closing an editor tab retains its draft. Actual root deletion is not implemented;
when introduced it must remove ownership and pending dirty state in the store.
Pinning and skin-line planning are editor metadata, not SOF definition edits.
Current draft persistence remains separate from the edit manager. No event bus,
GPU dependency, automatic scene propagation or animation binding is added.

## Validation

runtime-sof/edit-manager.test.js covers actual schema writes, vector identity,
indexed properties, noops, collection identity/order and partial failures.
Graphene's SofDraftStore/Struct/DecoratorAdapter tests cover parameter and
context-action routing, stale selections, empty child slots and shared owners.
These are CPU tests; they do not establish rendered update behavior.
