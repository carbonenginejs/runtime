import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `ship_skin_design_tier_thresholds.fsdbinary` bytes.
 *
 * A map of maps, the same shape as the point-value table: ship tree group to a
 * table of tier to the point threshold that reaches it.
 *
 * Solved against CCP's published export at build 3466501, every record.
 */
class CjsFsd64SchemaSkinrTierThresholds extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "skinrTierThresholds",
    "schemaVersion": 1,
    "path": "res:/staticdata/ship_skin_design_tier_thresholds.fsdbinary",
    "schemaID": "d81f4379a45e5f23134643ef3d279dc5",
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

export { CjsFsd64SchemaSkinrTierThresholds };
//# sourceMappingURL=CjsFsd64SchemaSkinrTierThresholds.js.map
