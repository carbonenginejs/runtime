import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `controltowerresources.fsdbinary` bytes.
 *
 * What each control tower consumes, as a list of resource entries. The record
 * itself carries nothing but the key and the list pointer, so it has no
 * presence word; the entries do.
 *
 * `factionID` and `minSecurityLevel` are present together on all 252 of the 339
 * entries that have either, so no measurement separates their two presence
 * bits. They are assigned in the alphabetical order every separable presence
 * word in these datasets follows.
 *
 * Field names and order were read from `controlTowerResourcesLoader.pyd`;
 * offsets were solved against CCP's published export at build 3466501,
 * unanimously over all 44 records and 339 entries.
 */
class CjsFsd64SchemaControlTowerResources extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "controlTowerResources",
    "schemaVersion": 1,
    "path": "res:/staticdata/controltowerresources.fsdbinary",
    "schemaID": "50cf6d3b2e32c017bdf66db89d42b07e",
    "container": {
      "type": "MAP",
      "recordSize": 16,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "resources",
        "type": "LIST",
        "offset": 8,
        "itemSize": 24,
        "item": {
          "type": "OBJECT",
          "presence": {
            "type": "UINT_32",
            "offset": 20,
            "allowedMask": 3
          },
          "fields": [{
            "name": "factionID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 0,
            "presenceMask": 1
          }, {
            "name": "minSecurityLevel",
            "type": "FLOAT_32",
            "offset": 4,
            "presenceMask": 2
          }, {
            "name": "purpose",
            "type": "UINT_32",
            "offset": 8
          }, {
            "name": "quantity",
            "type": "UINT_32",
            "offset": 12
          }, {
            "name": "resourceTypeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 16
          }]
        }
      }]
    }
  }));
}

export { CjsFsd64SchemaControlTowerResources };
//# sourceMappingURL=CjsFsd64SchemaControlTowerResources.js.map
