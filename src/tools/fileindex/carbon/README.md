# Carbon's resources library

A port of CarbonResources (`resources/` in Carbon): resource groups, their
records, and the document versions they are read and written at. The main
classes are `ResourceGroup` and its `ResourceGroupImpl`, `ResourceInfo`, and
`ParameterInfo`, the table of which document versions carry which field.

## Shared adaptations

Each method's JSDoc states its own divergences. These apply to the whole
family:

- **Results and output references.** Carbon returns a `Result`. Where it fills
  a reference argument, the caller passes a `{ value }` box.
- **Sizes and counts** are `uintmax_t` in Carbon, and BigInt here. They wrap
  modulo 2^64 as Carbon's do.
- **Operators** become the methods `Equals`, `LessThan`, `GreaterThan` and so
  on, because JavaScript cannot overload them. An unset `std::optional` is
  `undefined`.
- **CSV rows** are split by `CjsResFileIndexFormat.readRow`, the one spelling
  of Carbon's column rules. `ResourceGroupImpl.ImportFromCSV` applies the
  model's rules on top: a zero compressed size or operation is unset.
- **YAML** is parsed with every scalar kept as its source text, as yaml-cpp
  holds it until `as<T>()` converts it. It is written through the `yaml`
  package, so formatting is not byte-identical to yaml-cpp.
- **Files.** `ImportFromFile` and `ExportToFile` are asynchronous and use the
  host's injected `read(filename)` and `write(filename, text)`. Runtime opens
  no files itself.
- **Status scopes** end with `Dispose()` in a `finally`, where Carbon relies on
  its destructor.

## Carbon defects reproduced

- CE-40: YAML import without a compressed total throws on the first
  compressed resource.
- CE-41: VersionInternal's `>` and `<` are true when any one component is.

Both are in `docs/research/carbon-known-defects.md` in the organization docs.

## Not ported

Resource data streams, hashing and compression of file contents, building a
group from a directory or a filter, bundles, patches and the full `Diff`. Each
of these throws "is not implemented" and names what it needs.
