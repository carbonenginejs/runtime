import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `compressibletypes.fsdbinary` bytes.
 *
 * Maps a type to the type it compresses into, and that is the whole record: an
 * eight-byte pair with no object around it. `compressibleTypesLoader.pyd` names
 * no fields at all, which is how a scalar-valued map announces itself - every
 * other loader lists its record's fields between `_items_` and `__dir__`.
 *
 * So this returns `Map<number, number>` rather than a map of objects. CCP's
 * export wraps the value as `compressedTypeID`; that name is the exporter's,
 * not the file's.
 *
 * Verified against CCP's published export at build 3466501: 212 of 212 records.
 */
class CjsFsd64SchemaCompressibleTypes extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "compressibleTypes",
    "schemaVersion": 1,
    "path": "res:/staticdata/compressibletypes.fsdbinary",
    "schemaID": "2911d83924a3b7720f9e92b7a6c37a0f",
    "container": {
      "type": "MAP",
      "recordSize": 8,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "value": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 4
      }
    }
  }));
}

export { CjsFsd64SchemaCompressibleTypes };
//# sourceMappingURL=CjsFsd64SchemaCompressibleTypes.js.map
