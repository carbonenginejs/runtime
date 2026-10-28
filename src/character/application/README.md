# Paper-doll engine inputs

These classes hold the values a character build consumes. They are an approved
JavaScript application layer, not native Carbon class ports. The character
library holds content records; these inputs select what the engine builds.
Palette editing, local choices and saving belong to the UI.

`CjsPaperDoll` owns a `CjsPaperDollDefinition` and the built
`CjsPaperDollInstance` drawn as its `front`. `CjsPaperDollManager` owns the
collection of dolls. A definition holds the foundation, part inputs and bake
ordering; an instance owns prepared pass bindings, drawn objects and its last
captures. The reserved `back` instance is not built by this integration.

## Inputs and notification

Editable component values are ordinary fields decorated with
`meta.attribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)`, a storage type
and UI description. Colour-capable components declare their palette, custom
flag and colour buffers directly. There are no item-wrapper classes.
`GetColorAreas()` reads the selected option's areas; `GetControls()` filters
the component's own declarations to those areas.

Use `CjsSchema.setValues(component, values)` for notified edits. `OnModified`
only marks pending work. Assigning fields directly, or mutating a colour buffer,
requires an explicit `Rebuild()` when the instance must reconsider the inputs.
An equal schema write does not dirty a component. Components do not validate
editable input values or derive related values after a write.

`Configure(options, palettes, defaults)` retains prepared option records and
copies the supplied palette buffers. `Reset()` restores the configured option,
neutral colours, empty palette picks, enabled state and component-specific
weight or tuck defaults, then marks pending work. It does not apply a UI
palette-selection policy. `GetPaletteColors(id)` lends prepared values to a UI
that needs to write a chosen palette's colours into the explicit inputs.

The UI applies the conveniences: option-named defaults, selecting a palette,
re-picking it to leave custom mode, and enabling custom mode after a colour
edit. Primary and secondary swatch picks are independent input values. The UI
also owns remembered manual colours and initial/reset palette application.

## Capture and building

`Capture(pass)` retains `{ option, colors, colorAreas, palette }`. Colours are
copied so later edits cannot change a capture. Disabled or unselected parts
capture empty option, areas and palette; custom mode suppresses the ordinary
palette identity. Blush, eyeliner and eyeshadow append weight, zero while
unselected. Top-middle appends tuck, also zero while unselected. Lipstick's
surface capture retains its palette even with custom diffuse colours and
contains empty colour/area lists.

Call `doll.Update()` outside a render pass. Its front instance collects the
definition and invokes prepared synchronous bindings in foundation, skin,
surface, eyes, head and body order. Capture comparisons avoid rebuilding
unchanged effective inputs. Completed passes are acknowledged independently;
failed passes retry and edits made during a binding remain pending. Resource
acquisition, asynchronous preparation and texture target ownership remain in
the adapter and bindings.

`Rebuild()` requests pending work; instance `RebuildPasses()` forces specified
passes when prepared resources finish loading. The definition keeps layer-rank
overrides and orders active occluders after the contributors they cover.

## Foundation and shape

`CjsPaperDollArchetype` holds a selected prepared foundation, strength and sculpt
weights. Option notification marks foundation replacement; strength and sculpt
changes mark shape work without discarding part inputs. `Resolve()` returns an
owned snapshot of the prepared foundation plus current shape inputs.

Prepared foundation graph resolution still checks dependency cycles, closure,
part identity, model availability and required material channels. These are
construction checks, separate from the removed editable-value validation.
Source dependency weights remain evidence rather than texture opacity.
Resource decoding, role assignment and LOD selection belong to the adapter;
no filename-derived foundation is constructed here.
