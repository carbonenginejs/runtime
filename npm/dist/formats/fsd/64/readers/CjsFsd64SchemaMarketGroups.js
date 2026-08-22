import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `marketgroups.fsdbinary` bytes.
 *
 * Decodes market groups; `name` and `description` are label identifiers. Resolve the identifiers through
 * `CjsFsdLocalization` against the language table you want; this reader
 * returns them rather than pretending to text it cannot supply.
 *
 * Offsets and presence masks were solved against CCP's published export at
 * build 3466501, accepting only unanimous agreement across every record.
 */
class CjsFsd64SchemaMarketGroups extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "marketGroups",
    "schemaVersion": 1,
    "path": "res:/staticdata/marketgroups.fsdbinary",
    "schemaID": "e50723b09fdf57a379271705604d57d4",
    "container": {
      "type": "MAP",
      "recordSize": 28,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 24,
        "allowedMask": 7
      },
      "fields": [{
        "name": "descriptionID",
        "type": "UINT_32",
        "offset": 4,
        "presenceMask": 1
      }, {
        "name": "iconID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 8,
        "presenceMask": 2
      }, {
        "name": "nameID",
        "type": "UINT_32",
        "offset": 12
      }, {
        "name": "parentGroupID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 16,
        "presenceMask": 4
      }, {
        "name": "hasTypes",
        "type": "BOOLEAN",
        "offset": 20,
        "bit": 0
      }]
    }
  }));
}

export { CjsFsd64SchemaMarketGroups };
//# sourceMappingURL=CjsFsd64SchemaMarketGroups.js.map
