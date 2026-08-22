import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `ship_cosmetic_slot_categories.fsdbinary` bytes.
 *
 * Internal slot-category names such as `Material_slot`. Shares its layout with
 * the component-category and slot-name tables.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
class CjsFsd64SchemaSkinrSlotCategories extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "skinrSlotCategories",
    "schemaVersion": 1,
    "path": "res:/staticdata/ship_cosmetic_slot_categories.fsdbinary",
    "schemaID": "cd2521438d1b750a28a532a11743a248",
    "container": {
      "type": "MAP",
      "recordSize": 16,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "name",
        "type": "STRING",
        "offset": 8,
        "sourceName": "name"
      }]
    }
  }));
}

export { CjsFsd64SchemaSkinrSlotCategories };
//# sourceMappingURL=CjsFsd64SchemaSkinrSlotCategories.js.map
