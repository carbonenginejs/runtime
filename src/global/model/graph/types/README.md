# Value handlers

One handler per storage kind. What differs between types is data, in `GRAPH_TYPES`
(`graphTypes.js`), and a compiled member carries that data flat: its length, its integer width
and sign, its array class. So `vec3`, `color` and `mat4` are entries on `CjsGraphTypeFloatArray`,
and `int8` and `uint32` are entries on `CjsGraphTypeLong`. A new type name exists only if it
changes a default, a widget or a meaning. Measured on real files, this is twice as fast as a
class per type.

| Handler | Storage kinds |
| --- | --- |
| `CjsGraphTypeFloat`, `CjsGraphTypeDouble` | FLOAT, DOUBLE |
| `CjsGraphTypeLong` | LONG, ULONG, BYTE, SHORT, and the signed widths |
| `CjsGraphTypeInt64` | INT64, UINT64 |
| `CjsGraphTypeBool` | BOOL |
| `CjsGraphTypeString` | STDSTRING, STDWSTRING, paths and expressions |
| `CjsGraphTypeCString` | CSTRING, WCSTRING, REFERENCE, WREFERENCE, the shared strings |
| `CjsGraphTypeFloatArray`, `CjsGraphTypeDoubleArray`, `CjsGraphTypeIntArray` | FLOATARRAY, DOUBLEARRAY, INTARRAY and the typed integer arrays |
| `CjsGraphTypeObject`, `CjsGraphTypeIRoot` | IROOTPTR, IROOTWEAKREF; IROOT and structs |
| `CjsGraphTypeList`, `CjsGraphTypeMap`, `CjsGraphTypeValues` | Lists and structure lists; Maps of objects; lists of plain values |
| `CjsGraphTypePyObject` | PYOBJECTPTR, SCRIPTCALLBACK: a reference, never equal to another |
| `CjsGraphTypeInvalid` | INVALID: describes and walks, and refuses every value operation |

Each takes the member: `Get(holder, key, member, options)`, `Set(holder, key, value, member, options)`,
`Write`, `IsEqual`, `IsUnchanged`, `IsExactEqual` and `IsValidValue`.

- `IsEqual` is equal within Carbon's tolerance, and decides "don't bother updating". `IsExactEqual`
  has no tolerance. -0 and 0 are one value in both. Both compare in any accepted form, so a plain
  array equals the typed array that holds the same values.
- `IsValidValue` asks whether a value can set this thing: a plain array passes for a vector.
  Handlers do not validate; the graph calls it.
- `Set` and `from` refuse NaN and Infinity. Readers replace them with 0, so none reaches a live
  object, and `Get` throws on one as a bug. `IsArrayEqual`'s NaN quirk stays in `IsEqual` (CE-202).
- Fixed storage keeps its identity: a write goes into it. Only a missing array, or a variable
  length that changes, allocates.
- 64-bit members hold a BigInt or a safe integer, and take a raw `[high, low]` pair.
