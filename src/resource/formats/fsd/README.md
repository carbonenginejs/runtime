# FSD format

The two variants keep separate directories. `64/` reads modern cFSD, which
identifies itself by a 32-byte header whose 64-bit payload length must
match the supplied bytes. `32/` is legacy FSD: headerless, with its layout
supplied separately, so bytes cannot identify it; the caller must declare
it (`bitWidth: 32` or `variant: "fsd32"`). A failed modern probe is never
treated as legacy.

## Legacy 32-bit FSD

`32/` is a port of Carbon's open-source `fsd` loader (MIT), one JavaScript
class per Carbon class under Carbon's names, each file citing its source.
The caller supplies what Carbon's `LoadBinaryFromString(data, offset, schema,
path)` takes: the bytes, `options.offset` (default 0), `options.path`, and
the binary schema in `options.schema` as the plain-object form of Carbon's
Python schema dictionary (`type`, `size`, `attributes`,
`constantAttributeOffsets`, `endOfFixedSizeData`,
`attributesWithVariableOffsets`, `optionalValueLookups`, `keyTypes`,
`valueTypes`, `keyFooter`, `itemTypes`, `length`, `aliases`, `precision`,
`min`, `exclusiveMin`, `default`, `isOptional`). This module ships no
schemas.

`read` returns what Carbon's loader returns. Scalars, strings and vectors
without aliases decode at once; objects, lists, dicts and aliased vectors are
lazy:

- `FsdObject.GetAttr(name)` decodes one attribute (Python `obj.name`);
- `FsdList.GetLength()` and `GetIndex(i)` (Python `len`, `list[i]`);
- `FsdDict.GetValue(key)` and `Contains(key)` (Python `d[key]`, `key in d`);
- `FsdVector.GetByAttribute(alias)`, `GetByIndex(i)`, `GetLength()`.

Carbon's dict has no length, iteration or key listing, so neither has the
port, and there is no JSON or table output for legacy FSD. Loader failures
are thrown with the Python exception type as `error.name` and a
`CJS_FSD_32_<TYPE>_ERROR` code (for example `CJS_FSD_32_KEY_ERROR`).
`FsdUnsignedIntegerKeyMap` ports Carbon's standalone key/offset/size table.

Where Carbon's code differs by platform, the port follows the non-Windows
build: `unicode` values are decoded strictly and an empty one is `""`, and
integer keys convert through a 64-bit `long`. Carbon's own defects are kept
where their result is defined: an aliased double vector reads components at a
four-byte stride, `GetByIndex(length)` reads past a vector's last float, and
dicts keyed by anything but integers or `string` find no key. Where Carbon's
behaviour is undefined (reading past a list's offset table, erasing an
optional attribute that has no variable offset, a missing child schema), the
port throws instead.

Modern reads go through an explicit dataset reader: pass `options.reader`
(or `options.registry`), for example a `CjsFsd64Reader` populated by
`CjsFsd64ReaderSetCharacterStaticData.registerAll`, plus `options.path`, the
logical resource path the registry is keyed by. `emit: "json"` / `readJSON`
returns JSON-compatible data with wide identifiers as lossless decimal
strings; the default output keeps the readers' `Map` representation.

This module owns byte validation, declarative layouts, schema decoding,
exact-path reader registration and the approved dataset readers. It does no
filesystem discovery, network access, build selection, caching or
localization, and ships no `.fsdbinary` data.

Error codes (`error.code`):
- `CJS_FSD_32_UNSUPPORTED`: JSON or table output was requested for legacy
  32-bit FSD.
- `CJS_FSD_32_SCHEMA_REQUIRED`: legacy 32-bit FSD without `options.schema`.
- `CJS_FSD_32_SCHEMA_INVALID`: the root schema type is not one Carbon's
  loader reads, or an optional attribute has no variable offset.
- `CJS_FSD_32_KEY_ERROR`, `CJS_FSD_32_INDEX_ERROR`,
  `CJS_FSD_32_ATTRIBUTE_ERROR`, `CJS_FSD_32_TYPE_ERROR`,
  `CJS_FSD_32_RUNTIME_ERROR`, `CJS_FSD_32_UNICODE_DECODE_ERROR`,
  `CJS_FSD_32_OVERFLOW_ERROR`, `CJS_FSD_32_SYSTEM_ERROR`: the Python errors
  Carbon's legacy loader raises.
- `CJS_FSD_VARIANT_UNKNOWN`: neither declared legacy nor valid modern cFSD.
- `CJS_FSD_READER_REQUIRED`: modern cFSD without a reader/registry exposing
  `Read` (or `ReadJSON` for JSON output).
- `CJS_FSD_READER_NOT_FOUND`: the registry has no reader for the normalized path.
- `CJS_FSD_READER_EXISTS`, `CJS_FSD_READER_INVALID`,
  `CJS_FSD_JSON_READER_INVALID`, `CJS_FSD_PATH_INVALID`: registry misuse.
- `CJS_FSD_SCHEMA_UNSUPPORTED`: the reader does not accept the container's
  layout/schema identity.
- `CJS_FSD_HEADER_INVALID`, `CJS_FSD_LENGTH_INVALID`, `CJS_FSD_INPUT_INVALID`:
  bad envelope or input.
- `CJS_FSD_OFFSET_INVALID`, `CJS_FSD_COUNT_INVALID`,
  `CJS_FSD_RECORD_COUNT_INVALID`, `CJS_FSD_RECORD_SIZE_INVALID`,
  `CJS_FSD_UINT64_UNSAFE`, `CJS_FSD_STRING_INVALID`, `CJS_FSD_LIST_INVALID`,
  `CJS_FSD_FLAGS_UNSUPPORTED`, `CJS_FSD_DUPLICATE_KEY`,
  `CJS_FSD_BINARY_SCHEMA_INVALID`: payload or layout decode failures.
