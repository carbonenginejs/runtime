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
