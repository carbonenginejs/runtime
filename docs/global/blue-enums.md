# Blue enum registry

Status: Evolving
Scope: `@carbonenginejs/runtime/blue` enum registration and schema lookup
Audience: Runtime authors and UI integrators
Summary: Register domain-owned enums once and obtain Carbon-compatible value and bitmask names.

## Registration

```js
import { blue } from "@carbonenginejs/runtime/blue";

export const Mode = blue.enums.RegisterEnum("example.Widget.Mode", {
    NONE: 0,
    FIRST: 1,
    SECOND: 2,
    BOTH: 3
});
```

Register a name-to-integer object from its owning module. Registration freezes
and returns that same object. Numeric values may repeat as aliases; names must
be nonnumeric strings. Values must be signed or unsigned 32-bit integers.
Qualified names distinguish domains and nested owners while preserving native
type and member names. Importing Blue does not import or register every domain.

The optional third argument accepts `members` (ordered `{ name, value,
description }` records), `source`, `family`, `line`, and native `exposure` flags.
Listed members must match the object; any unlisted members follow in object
declaration order. The registry copies metadata and makes it read-only.
Exposure flags are provenance: they do not create Python-style module exports.
The public `EnumRegistrationType` object retains Carbon's
`ENUM_REG_VALUES_ON_MODULE` and `ENUM_REG_ENUM_OBJECT_ON_MODULE` names and values.

Native chooser labels need not match enum identifiers. Supply `chooser` as an
ordered array of `{ name, value, description }` to preserve the exact native
selection. Its values must occur in the enum, but its names can differ and it
may omit sentinels. This array is authoritative for name/bitmask lookup; entries
omitted from it are not appended. An explicit empty chooser has no matches.
Without a chooser, lookup uses the ordered enum members instead.
`exposedName` and `chooserSource` retain native exposure identity and provenance;
they do not register extra aliases.

Registering the same object, name and metadata again is harmless. Conflicting
names, a second canonical name for one object, and invalid input throw
`TypeError` before publication. Conflicts do not freeze the rejected object.
This deliberately replaces the old CjsSchema last-registration-wins behavior.

## Lookup

| Method | Result |
|---|---|
| `GetEnum(name)` | The registered named-value object. |
| `GetEnumInfo(name)` | Name, type object, ordered members and provenance. |
| `GetEnumName(values)` | Canonical registered name, or `null`. |
| `HasEnum(name)` | Whether the name is registered. |
| `GetNameFromValue(name, value)` | All exact chooser aliases joined with `" | "` (enum members when no chooser is supplied). |
| `GetNameFromBitmask(name, mask)` | First exact entry, otherwise all contained nonzero entries joined with `" | "`. |

Bitmask lookup preserves Carbon's behavior: aliases and contained composites
are included, and unknown remaining bits do not invalidate known matches.
Zero matches only an explicit zero entry. A missing enum throws `ReferenceError`;
a value or mask with no matching entry throws `RangeError`. Integer arguments
outside the supported range, fractions, strings and BigInt throw `TypeError`.
Signed and unsigned spellings of the same 32-bit pattern compare equally.

## Schema integration

`@type.enum("example.Widget.Mode")` records the qualified name and resolves it
when field/schema metadata is requested. Register before resolution. A missing
registration throws, but can be registered and resolved later; failed resolution
is not cached. Names containing a dot select registry resolution exclusively.

Existing short-name annotations continue to resolve declaring/inherited class
statics. Those statics can alias the registered object. `CjsSchema.defineEnum`,
`getEnum` and `getEnumName` use the same registry; no second enum table exists.
All 16 SOF-owned enum types in the field inventory now use this path across
28 fields. The four additional SOF fields using shared ReflectionMode/Tr2Lod
constants now use `trinity.EntityComponents.ReflectionMode` and `trinity.Tr2Lod`.
Nine Trinity reflection/LOD fields also use these shared registrations.
Consumers explicitly import the shared registration module; constants remain
dependency-free and importing Blue alone does not register these domain types. Independently declared banner Usage, pattern
ProjectionType and DisplayQualityModifier types have separate registry identities,
including where Carbon reuses a chooser between types. Schema metadata keeps
the native identifier map in `enum.members` and exposes the separate ordered
UI choices in `enum.chooser`. For example, the blink constant remains
`TYPE_BLINK`, while its native chooser name is `"Blink"`; logo's `TYPE_MAX`
remains a constant but is not offered by the chooser.
The model values transport also accepts member names and exports enum names
for qualified fields, preserving its existing first-alias serialization policy.
That serialization policy is distinct from Blue's diagnostic alias joining.

## Carbon attribution

`CjsBlueEnumRegistry` combines the enum portion of `BlueRegistration`, the
storage and registration work of `EnumRegistration<T>`/`EnumTypeRegistration`,
and `PyBlueEnumObject` (exposed as `blue.BlueEnum`). Ordinary JS module execution
replaces static registrar constructors. Plain read-only objects and registry
methods replace Python extension objects; C++ templates and Python allocation
machinery are not recreated.

This deliberately combines two native views: `GetEnum` returns C++ identifiers
for JS code, while name lookup and chooser metadata preserve Blue's exposed
names. It does not claim that Python BlueEnum's attributes use C++ spellings.

Source disposition records retain each eliminated helper's native identity.
Other BlueRegistration responsibilities and VarChooser uses are not replaced.
The core imports no schema or service modules. CjsSchema installs its adapted
method attribution after schema initialization, avoiding a bootstrap cycle.

No resource manager or composition initialization is required for registration.
Enum definitions stay with their domain; this API does not relocate constants.
