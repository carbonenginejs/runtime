import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `typelist.fsdbinary` bytes.
 *
 * Named sets of types, expressed as six lists of includes and excludes over
 * types, groups and categories. The lists hold bare identifiers rather than
 * objects.
 *
 * **The file is `typelist` and the export's table is `typeLists`.** That one
 * letter is why the table sat in the "no same-named client file" column and was
 * assumed to have no source: a name match was doing the searching. The map
 * holds 462 records against the export's 462 rows, every key shared.
 *
 * Only the two label identifiers are presence-guarded. An empty list is empty
 * rather than absent, and `description` is an internal string the export does
 * not publish at all - it publishes `displayDescription`, resolved from
 * `displayDescriptionID`, which is a different field.
 *
 * Field names and order were read from `typeListLoader.pyd`; offsets were
 * solved against CCP's published export at build 3466501, unanimously over
 * every record of every list.
 */
class CjsFsd64SchemaTypeLists extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "typeLists",
    "schemaVersion": 1,
    "path": "res:/staticdata/typelist.fsdbinary",
    "schemaID": "72f87d9a7bdaad1533852559a2afcc02",
    "container": {
      "type": "MAP",
      "recordSize": 88,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 80,
        "allowedMask": 3
      },
      "fields": [{
        "name": "description",
        "type": "STRING",
        "offset": 8
      }, {
        "name": "excludedCategoryIDs",
        "type": "LIST",
        "offset": 16,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "excludedGroupIDs",
        "type": "LIST",
        "offset": 24,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "excludedTypeIDs",
        "type": "LIST",
        "offset": 32,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "includedCategoryIDs",
        "type": "LIST",
        "offset": 40,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "includedGroupIDs",
        "type": "LIST",
        "offset": 48,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "includedTypeIDs",
        "type": "LIST",
        "offset": 56,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        }
      }, {
        "name": "name",
        "type": "STRING",
        "offset": 64
      }, {
        "name": "displayDescriptionID",
        "type": "UINT_32",
        "offset": 72,
        "presenceMask": 1
      }, {
        "name": "displayNameID",
        "type": "UINT_32",
        "offset": 76,
        "presenceMask": 2
      }]
    }
  }));
}

export { CjsFsd64SchemaTypeLists };
//# sourceMappingURL=CjsFsd64SchemaTypeLists.js.map
