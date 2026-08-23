import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `typematerials.fsdbinary` bytes.
 *
 * Decodes what a type reprocesses into. Two lists, and they are alternatives
 * rather than companions: 9,541 of 9,551 types at build 3466501 carry a fixed
 * `materials` list, and the other ten carry `randomizedMaterials` instead,
 * which gives a range rather than a quantity.
 *
 * Only the randomised list is presence-guarded. An empty `materials` list is
 * an empty list, not an absent one, which is exactly the ten records above.
 *
 * Field names and order were read from `typeMaterialsLoader.pyd`; offsets were
 * solved against CCP's published export at build 3466501, unanimously over
 * 47,051 material entries and all 24 randomised ones.
 */
class CjsFsd64SchemaTypeMaterials extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "typeMaterials",
    "schemaVersion": 1,
    "path": "res:/staticdata/typematerials.fsdbinary",
    "schemaID": "988a9edbbd5a0f3dfdc5b37b067d183f",
    "container": {
      "type": "MAP",
      "recordSize": 32,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 24,
        "allowedMask": 1
      },
      "fields": [{
        "name": "materials",
        "type": "LIST",
        "offset": 8,
        "itemSize": 8,
        "item": {
          "type": "OBJECT",
          "fields": [{
            "name": "materialTypeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 0
          }, {
            "name": "quantity",
            "type": "UINT_32",
            "offset": 4
          }]
        }
      }, {
        "name": "randomizedMaterials",
        "type": "LIST",
        "offset": 16,
        "itemSize": 12,
        "presenceMask": 1,
        "item": {
          "type": "OBJECT",
          "fields": [{
            "name": "materialTypeID",
            "type": "UINT_32_IDENTIFIER",
            "offset": 0
          }, {
            "name": "quantityMax",
            "type": "UINT_32",
            "offset": 4
          }, {
            "name": "quantityMin",
            "type": "UINT_32",
            "offset": 8
          }]
        }
      }]
    }
  }));
}

export { CjsFsd64SchemaTypeMaterials };
//# sourceMappingURL=CjsFsd64SchemaTypeMaterials.js.map
