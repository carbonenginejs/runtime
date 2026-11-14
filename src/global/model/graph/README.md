# Independent graph foundation

This subtree imports only its own modules. Blue may use it; it does not load Blue,
CjsSchema, formats, Trinity or the legacy model barrel.

CjsGraph.define(Constructor, definition) registers a stable name and the class's own
member declarations. Each member compiles once to one flat object: a `GRAPH_TYPES` entry's data,
then name, flags, edge and a slot for anything rare. Every walk, reader and writer reads that one
shape. The class's `ClassInfo` retains the compiled members in `declared` and the last derived record in
`compiled`: the members, `byName`, `persistByName` (derived first, PERSIST only), `memberNames` and
`notifyNames` (each name once, member order, for notification) and the class's
facts, among them `bases`, its C++ base list, and `chainTo`, the class its exposure table continues
into. Member lookup walks `chainTo`, as Carbon's walks `mParentClassInfo`; the prototype chain is the bases. Default values are not cloned or instantiated, and must not later be assigned as shared
mutable instance storage.

A compiled member is a `VarEntry` row, listed in every table and never copied. The graph sets `name`,
`key` (a field), `index` (-1 for none), `role`, `kind` (the type name), `type` (the VARTYPE),
`handler`, `direct`, `length`, `bits`, `signed`, `ctor`, `item`, `flags`, `wrapped`, `options`,
`edgeKind`, `edgeType`, `collection` and `owner`. `flags` is one integer: Carbon's `EDITFLAGS` from
`global/consts`, and above `EDMASK` `GraphMemberFlags.BINARY` and `RUNTIMEONLY`, which are ours and which
no value operation reads. A member takes a value through WRITE, PERSIST or RPERSIST, or when it has no
access flags; READ alone refuses one.
`edgeType` is always a list, the declared class first; empty is dynamic. A definition's member may name
`row`, a row the record already holds (Blue's own, from its member table): the graph fills its fields on
that row and leaves `name`, `key`, `index`, `type`, `signed` and `owner` as its maker set them.

A class with `ownValues` holds values that are not members, through `GetOwnValues`, `SetOwnValues`
and `IsOwnValues`: its bags carry those names beside its members.

A member with no type uses CjsGraphTypeInvalid. Registration and traversal can describe it;
any value operation throws. Give it a type by replacing the definition through CjsGraph.define.

`define` builds the whole record: `compiled` and the class's teardown exist when it returns, and
CjsGraph.getClassInfo(ConstructorOrName) only looks the record up. Defining a class again builds it again, and
every class whose exposure chains to it or that lists it as a base, so a retained `compiled` can be out of
date; a new class changes no other class's record. A base given by a name must be defined first. Neither
snapshot may be mutated (immutability.md: nothing but enums is frozen). Replacing a definition retains class-info identity.

Compiled members preserve derived-first order, including same-name alternatives.
`byName[name]` contains those alternatives in that order. Filtering by flags must
precede choosing one: Carbon's HIDDEN derived member can leave a base member visible.
No Blue flags are interpreted by the compiler itself.

Registration snapshots member containers and validates names before
publication. Nested metadata/default values
are borrowed declaration data and must not be mutated behind registration; replace
the definition to change them. Compilation never constructs instances or reads their
properties. Generic decorators are still pending.

`CjsGraph.get`, `set` and `from` are one engine, options last, and `copy` and `clone`
are presets over them: get then set, get then from. Set returns a values bag of what
changed, or false: a nested object read in place is a nested bag, a replaced reference
is the live object, and a changed list is its whole new plain array, so the record can
be replayed through set. The graph validates with each handler's IsValidValue and tracks
changes; handlers do neither. One options record runs through a whole operation, and
nothing is allocated per member.

There is no policy class or option: Blue's rules are the graph's own behaviour, and variations
are plain options (`persistOnly`, `roundTrip`, `skipEquality`, `skipEvents`, `validate`, `idMap`,
`initializeHeld`, `copyOverride`). The graph imports nothing from Blue: `Initialize`, `OnModified`
and `OnListModified` are methods on objects, and flags are data: a member carries `flags`, and a
definition says `initialize`, `notify` and `listNotify`.
Member tables are cached per class and choice of flags on the compiled record.

- **Set on a live object:** IsEqual, then commitValues(changedNames), children first and once
  references resolve. It never calls Initialize unless `initializeHeld` is true.
- **from:** writes every value with no comparison and no change tracking, then Initialize once
  if the class has it, otherwise OnModified per NOTIFY member. Never both.
- **copy:** Carbon's Copier. IsExactEqual skips what matches, a reference gets a new object, and a
  list is rebuilt. Initialize at the end if the target has it, even an existing one, with no
  OnModified; otherwise OnModified per changed member.
- **Lists:** a mapped list goes through its ReplaceItems, even on a fresh load, because ReadList
  sends LOADFINISHED (`DictReader.cpp:472-475`). An ordinary array on a live list-notified owner
  gets UNLOADSTART and INSERTED from the owner, with the old items still in place. Structure lists
  are silent. `skipEvents` writes everything raw.
`get` leaves out what a new instance holds, by Carbon's `AreEqual` tolerance, and `full: true` keeps
everything. Defaults come from the first object a door creates, straight after its constructor,
or from one spare instance. `diff(object, values)` returns what `set` would change and writes
nothing; a list is one whole value. Object metadata travels as `__bluemetadata__` through the store
given to `setMetadataStore`, and `copy` leaves it. `getClassUIInfo` builds a class's presentation on
first ask, and `defineUI` layers a host's over it. No value operation reads either.

`_type` names resolve through
`CjsGraph.registerLibrary(library)`, newest first, ending in the graph's own definitions.
A library has `Get(typeName)` and `Create(typeName)`. A failed operation completes
nothing and rolls nothing back.

A definition lists its class's own members; the rest come along `chainTo`. It may name
`interfaces`, the classes an instance also counts as without inheriting from them.

`CjsGraph.commitValues(object, names, options)` only touches its own object: OnModified per NOTIFY
member in member-table order, for those named or, with no names, all. Unknown names throw unless
`skipValidation`. It keeps no baseline and compares nothing.

ICjsGraphRoot is the optional base class: thin forwards and `__cjs`, which is null until
`CjsGraph.getState(object)` creates its CjsGraphState (`state`, `prepared`, `guid`). The state
is never a member, so no value operation reads or copies it. `IsDestructed()` is true once
`state` is above ALIVE, and false for an object with no state. Its Destruct
forwards to `CjsGraph.destruct(object, options)`, which runs once and returns whether it ran.
An object already being destructed, or destructed, answers false. Otherwise its `OnDestruct(options)`
runs, one method found by ordinary dispatch, while the object still reads as alive; an answer of
false refuses, and nothing else happens. Then the state is DESTRUCTING, `finalDelete` runs, and
the state is DESTRUCTED. It does not traverse members or clear references. An `OnDestruct` ends
with `return super.OnDestruct(options)`, or `return true` in a class with no parent that has one.

`CjsGraph.finalDelete(object)` runs an object's C++ destruction: each level's own
`destructor` (the class's `_Destructor`, the body of its Carbon destructor), derived first,
including bases, once per owning level. A `_Destructor` never calls super or another
level's. It reads and sets no state, checks no capability and enters no member; an object
whose class has no lifetime record has nothing to run.

A class declares what its instances can do in its definition: `capabilities`, a list of
`CjsGraph.Capability` names (`values`, `destruct`, `events`). `CjsGraph.destruct` throws, naming
the class, unless the class or one in its base list declares `destruct`; the exposure chain
passes none. The root declares `values` and `destruct` once. Nothing reads `values` or
`events` yet.

`defineLifetime(ctor, { name, bases, destructor, capabilities })` registers constructor-based ancestry
on the same class record without claiming a value definition. `isDefined` remains
false until `define` supplies the member definition; later value registration
preserves the separately registered lifetime facts. Blue supplies these facts at
class registration, without importing object readers into the graph.
Blue's side is `blue/formats/graph/CjsBlueGraph.js`, which supplies definitions and flags.

`CjsGraph.traverse(root, visit, options)` follows declared object edges, once per
object, depth-first in declaration/list order. A member's `edge` declares `kind`
(`embed`, `ref`, `refWeak`, `weak`), optional child `type` (constructor or registered name), and
`collection: true` for an array of children. Without an edge, the member is a leaf
and traversal does not read its value. `key` selects storage and optional `index`
selects an array slot. Missing/undefined edges, invalid slots and unknown dynamic
classes fail; explicit null object edges are absent. Plain structs use their declared
type; class instances resolve their actual registered type from the prototype.

The default follows embed/ref, what an object owns; `options.edges` may also include
weak and refWeak. A `refWeak` edge keeps its target alive without owning it
(`@type.object.ref.weak`), so a walk over everything reachable names it, and an ownership
walk does not.
`options.acceptMember(member, classInfo)` filters candidates before inherited name
resolution, once per encountered class. Eligibility must be class-level and stable
for the call. A selected leaf shadows a same-name base edge. The synchronous visitor
receives `(object, classInfo)` and may return false to skip its descendants. Traversal
returns the visited count. Callbacks must not change declarations or graph topology;
registration changes fail rather than continue with a mixture of descriptions.

Nested traversals use separate reusable stacks and weak pass-mark tables by active
call depth. This supports plain registered instances without adding `__cjs` fields,
and avoids nested passes overwriting outer marks. Completed/failed frames release
graph references; weak keys do not retain visited objects. These enumeration marks
are not the reference/update tables required by future Set and serialization.

## Cached selection

`CjsGraph.compileSelection({ matchClass, acceptMember?, edges? }, diagnostics?)`
snapshots a selection description and compiles its eligible members and class
reachability. Matchers and member filters are class-only predicates, stable for the
selection lifetime. If their meaning changes, create a new selection. Registration
and definition replacement automatically invalidate derived selection tables.
Prototype inheritance must also remain stable until the class is registered again.

`CjsGraph.select(root, selection, output, options?)` appends matching identities to
the caller's array in DFS order and returns that array. It does not fetch resources
or assume a particular resource base class; the supplied matcher identifies those
classes. Both full and pruned selection run through the same traversal engine.
Set `options.prune: false` for the full reference walk. A matching object can itself
contain further matches, so it does not stop descent. Failure leaves partial output
intact and releases traversal state; there is no transactional rollback.

Reachability includes registered subclasses of a declared target. Dynamic and
unregistered target types remain conservative, including through class cycles.
An optional diagnostics array receives class/member/reason records during explicit
compilation, or via `options.diagnostics` during a registration-triggered rebuild.
No diagnostic records are created by default. Optional `options.stats` is reset per
call with visited/matched counts, skipped declared edges and compiledClasses (zero
on warm calls). Compilation's dependency lists are discarded after the table is built.

The selection contract requires valid declared storage. Typed object edges must be
assignable to their declared class. A shared plain struct must have one canonical
declared class across all incoming edges; it cannot represent two class views.
Full traversal checks these constraints even for identities already visited.
Pruning deliberately does not read excluded branches, so it is not a graph validator.
Use full traversal when validating declared edge storage. Neither path permits topology or
declaration mutation during a walk. There is no global traversal policy yet.

The optional `test/resource/graph-selection-real-scenes.test.js` qualifies four
hash-pinned authored environment graphs through an external, traversal-only schema
adapter. Set `CJS_GRAPH_SCENE_CORPUS` to the service-fetched corpus directory;
`CJS_GRAPH_SELECTION_BENCH=1` enables warmed timing batches. Untouched hydration
compares texture parameters; a separate fixture attaches unloaded real resource
objects to test nonempty handle selection and sharing. This does not qualify resource
loading, GPU preparation, general Blue interface adaptation or populated scene graphs.

`test/resource/graph-selection-populated-scene.test.js` adds assemblies of independently
hydrated Rifter, Merlin and Omen ships plus explosion and missile effects in a real
EveSpaceScene. Set `CJS_GRAPH_POPULATED_CORPUS` to the six hash-pinned external assets;
the same benchmark flag enables timing. It independently inventories persisted storage
before adapting it, preserves assigned particle instance providers, and compares
full/cached identity and order with path-shared unloaded geometry, texture and effect
handles. These are static assembled graphs, not running combat scenes. External child
and controller references remain unexpanded; dynamically created runtime content and
GPU preparation are not covered. Production schemas and resource enumeration are unchanged.

graphTypes.js exports the sole Carbon VARTYPE enum with unchanged names and values.
The handlers are under types/. ICjsGraphRoot provides operation forwards.
