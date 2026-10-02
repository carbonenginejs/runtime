# Enum definitions and Blue

The dependency-free enum registry is shared by Blue and schema. A constant
definition calls `blueEnums.Create` at its definition site; higher layers reach
the same registry through `blue.enums`. Constant modules import this leaf directly
because importing the Blue holder would cycle through schema and service setup.

`Create` validates the values and chooser metadata, gives the supplied flat object
a non-enumerable name symbol, freezes it and registers that identity. `Register`
and `Set` retain checked registration of existing objects, including older frozen
definitions. A conflicting name, object or metadata record fails without replacing
the existing enum. `Get` returns the registered object. The compatibility spellings
remain available while their callers migrate.

The name symbol lets schema recognize an enum created by another registry without
changing integer field storage or JSON output. Chooser labels and order remain
separate from constant identifiers: aliases, omitted sentinels and repeated native
chooser entries are preserved by value-name and bitmask lookup.

The npm side-effect list retains defining modules and their public constant
barrels. Bundle regressions observe the registry leaf independently of Blue so
Blue's imports cannot hide a missing bare-import registration.

For class-owned enums, the class static holds the literal and the same module
calls Create after the class declaration. This keeps chooser expressions that
refer to class statics out of the initializer's temporal dead zone. Shared family
enums register in their defining module; consuming class statics remain aliases.
Do not freeze the literal before Create: it must first attach its hidden name.

The reviewed legacy generated Trinity enum modules use
`scripts/trinity/refresh-enum-registrations.mjs --check` (`--write` to install the
verified refresh). `--schema-root` chooses the schema catalog and `--tools-root`
chooses the tools-core checkout; the defaults use the sibling checkout and its
staged schema. `enum-registration-inputs.json` contains exact source-qualified
export selectors and chooser member references, never another enum value table.
Every module validates before writes begin. An ambiguous catalog identity, changed
value, missing registration or unexpected code fails for review.

These modules retain owned legacy exports used by consumers, so ordinary
`--emit-enums` is not their copy-in route: its ownership filter correctly excludes
those entries. The guarded refresh preserves all existing exports, emits Create
at each selected definition, and retains unregistered vocabularies as frozen
objects. Consumer-side registration blocks are unnecessary.
