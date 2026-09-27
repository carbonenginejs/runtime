# Resource-index formats

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource/formats/resfileindex` and `resource/formats/resourcegroup`  
Audience: Users and maintainers reading or writing Carbon resource indexes  
Summary: The resource-index CSV and ResourceGroup formats, and the path-keyed JSON they persist to.

`CjsResFileIndexFormat` reads and writes Carbon's comma-separated resource
index. `CjsResourceGroupFormat` reads and writes the JSON form below, with
`readYaml` and `writeYaml` for Carbon's ResourceGroup YAML. Both read supplied
text or UTF-8 bytes and return plain documents; neither fetches, caches or
opens files.

```js
import { CjsResFileIndexFormat } from "@carbonenginejs/runtime/resource/formats/resfileindex";
import { CjsResourceGroupFormat } from "@carbonenginejs/runtime/resource/formats/resourcegroup";

const document = CjsResFileIndexFormat.read(indexBytes);
const savedJSON = CjsResourceGroupFormat.write(document);
const restored = CjsResourceGroupFormat.read(savedJSON);
```

## Documents

A document has `schemaVersion: 1`, `type: "ResourceGroup"`, `documentVersion`
(Carbon's document format version, `0.0.0` or `0.1.0`, which says nothing about
a game build) and a `resources` array. Each record has `relativePath`,
`location`, `type`, `checksum` and `uncompressedSize`, and optionally
`compressedSize`, `binaryOperation` and `prefix`.

- Unsigned 64-bit values are decimal strings, so no bits are lost; a binary
  operation is a uint32 number. Optional document counts and totals are also
  decimal strings.
- An absent optional field and an explicit zero stay different. A CSV row
  with a compressed size of `0` keeps `"0"`. Carbon's resource model treats a
  zero as unset, which is a rule of the model, not of the wire.
- Writers never sort or change the document they are given.

## CSV rows

Rows follow Carbon's `ImportFromCSV` exactly, through
`CjsResFileIndexFormat.readRow`:
`prefix:/relative/path,location,checksum,uncompressedSize,compressedSize[,binaryOperation]`.
Its JSDoc lists the edge cases Carbon's reader produces, such as a path with no
`:/` and negative sizes. Columns past the sixth are ignored. CSV has no quoting,
so writing a field that contains a comma or newline is refused.

## Path-keyed JSON storage

The JSON writer stores the field names once, in `columns`, and the rows in
`values`, keyed by the full logical path (for example
`res:/textures/ship.dds`). Path and prefix are not columns, because the key
carries them. `read` expands this back into plain records.

- Duplicate full paths are refused when writing. Choose a winner before
  persisting, for example the last declaration.
- Duplicate or unknown columns, path or prefix columns, and rows of the wrong
  width are refused.
- A `null` cell is an absent optional field; `"0"` is an explicit zero.
  Required cells cannot be null.
- Object member order is not significant.

## YAML

`readYaml` and `writeYaml` handle Carbon's ResourceGroup YAML at document
versions 0.0.0 and 0.1.0, writing fields in Carbon's order. They are stricter
than Carbon's importer. A newer version is refused, where Carbon clamps it and
warns. An unknown field is refused, where Carbon ignores it. A resource
without a Type is refused, including at 0.0.0, where Carbon's own exporter
omits the Type. Use CSV for 0.0.0 interchange.

## Registering

Neither format claims an extension. A caller registers the routes it wants on
its own store, preferably one kept for indexes:

```js
formatStore.Register(CjsResFileIndexFormat, { extensions: ".txt", output: "json" });
formatStore.Register(CjsResourceGroupFormat, { extensions: ".json", output: "json" });
formatStore.Register(CjsResourceGroupFormat, { extensions: ".yaml", read: "readYaml", output: "json" });
```

Carbon's resource-group model, with Carbon's own import rules, is
`ResourceGroup` in `@carbonenginejs/runtime/tools/fileindex`. It reads CSV
through `CjsResFileIndexFormat.readRow`.
