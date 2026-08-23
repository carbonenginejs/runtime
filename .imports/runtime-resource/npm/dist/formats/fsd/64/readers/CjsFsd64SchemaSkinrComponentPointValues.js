import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `ship_skin_design_component_point_values.fsdbinary` bytes.
 *
 * A map of maps: rarity to a table of level to point cost. The record holds a
 * nested sixteen-byte map header rather than fields, which is why its loader
 * names no fields at all.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
class CjsFsd64SchemaSkinrComponentPointValues extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "skinrComponentPointValues",
    "schemaVersion": 1,
    "path": "res:/staticdata/ship_skin_design_component_point_values.fsdbinary",
    "schemaID": "04be2c695d43ef15a714f7df1cbd1d70",
    "container": {
      "type": "MAP",
      "recordSize": 24,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "value": {
        "type": "MAP",
        "offset": 8,
        "recordSize": 8,
        "key": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "value": {
          "type": "UINT_32",
          "offset": 4
        }
      }
    }
  }));
}

export { CjsFsd64SchemaSkinrComponentPointValues };
//# sourceMappingURL=CjsFsd64SchemaSkinrComponentPointValues.js.map
