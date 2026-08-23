import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `corporationactivities.fsdbinary` bytes.
 *
 * `nameID` is a localisation label identifier; resolve it through
 * `CjsFsdLocalization`.
 *
 * An 8-byte record carrying one label and nothing else. `npcCorporations`
 * references it through `mainActivityID` and `secondaryActivityID`.
 */
class CjsFsd64SchemaCorporationActivities extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "corporationActivities",
    "schemaVersion": 1,
    "path": "res:/staticdata/corporationactivities.fsdbinary",
    "schemaID": "682b3a00388dd009443aa1c2e32e89c6",
    "container": {
      "type": "MAP",
      "recordSize": 8,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "nameID",
        "type": "UINT_32",
        "offset": 4,
        "sourceName": "nameID"
      }]
    }
  }));
}

export { CjsFsd64SchemaCorporationActivities };
//# sourceMappingURL=CjsFsd64SchemaCorporationActivities.js.map
