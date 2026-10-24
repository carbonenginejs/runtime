# PaperDoll application controls

These are application-owned editable settings, not ports of native Carbon
classes. `CjsPaperDoll` currently coordinates eyes only. It does not implement a
general appearance dependency graph or replace the library's appearance plans.

`CjsPaperDollEyes.Configure` accepts prepared option records (`id`, `colorAreas`,
`defaultPalette`, `palettes`) and a map of authored three-colour palettes.
Acquisition and verification of those records belong to the resource/composition
adapter. The application model is GPU-free and requires no character library.
Database item IDs are independent of these resource option identities.

The slot retains typed preset and manual colours across option changes. Its
`item` is an editable configuration with only the decorated properties the
selected input supports. Fixed-colour items have no colour properties; the
qualified one/two/three-area shapes declare Color1, then Color2, then Color3.
Other area layouts are rejected until an appropriate shape is qualified.
These area numbers are source identities, not claims about iris anatomy.

Use the exposed property setters, as the existing decorator UI adapter does.
They validate input and mark the slot dirty, but never mutate an effect. Direct
mutation of a returned typed vector is not an editing operation. Neither generic
schema hydration nor raw field writes replace these application setters. Item
instances constructed without a slot have independent defaults for reflection;
they are configuration data, not live bindings. Item configurations are transient
and this first integration does not define persistence or copying into a doll.

Call `doll.Update(applyEyes)` outside a render pass. It coalesces edits, compares
effective selected state, and calls the synchronous prepared binding only when
needed. Disabled edits retain values without rebuilding. A binding must build
inactive texture targets and publish completed bindings before returning. A
failed binding remains dirty; recursive updates defer without losing edits.
`doll.Rebuild()` forces the binding to run. Asynchronous acquisition must finish
before installing a binding; asynchronous apply callbacks are not supported.

The renderer adapter owns which targets need work. The first integration rebuilds
eye diffuse for colour edits and also N/S for option changes. It leaves other
components and geometry untouched. Brows, blush and shared-target dependency
ordering must be integrated explicitly rather than inferred from this eye pilot.
