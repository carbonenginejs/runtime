import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `ship_skin_design_component_categories.fsdbinary` bytes.
 *
 * A key and an internal name, and nothing else. Three SKINR datasets share this
 * layout exactly - the two slot-name tables are the others - so all three carry
 * the same layout identity and differ only in which file they are read from.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
class CjsFsd64SchemaSkinrComponentCategories extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "skinrComponentCategories",
    "schemaVersion": 1,
    "path": "res:/staticdata/ship_skin_design_component_categories.fsdbinary",
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

export { CjsFsd64SchemaSkinrComponentCategories };
//# sourceMappingURL=CjsFsd64SchemaSkinrComponentCategories.js.map
