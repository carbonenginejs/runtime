import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/** Reads caller-supplied bloodline static-data bytes. */
class CjsFsd64SchemaBloodlines extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "bloodlines",
    "schemaVersion": 1,
    "path": "res:/staticdata/bloodlines.fsdbinary",
    "schemaID": "add33c4a6919aea07d486fd9042a3312",
    "container": {
      "type": "MAP",
      "recordSize": 48,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 44,
        "allowedMask": 3
      },
      "fields": [{
        "name": "charisma",
        "type": "INT_32",
        "offset": 4
      }, {
        "name": "corporationID",
        "type": "INT_32_IDENTIFIER",
        "offset": 8,
        "presenceMask": 1
      }, {
        "name": "descriptionID",
        "type": "INT_32_IDENTIFIER",
        "offset": 12
      }, {
        "name": "iconID",
        "type": "INT_32_IDENTIFIER",
        "offset": 16,
        "presenceMask": 2
      }, {
        "name": "intelligence",
        "type": "INT_32",
        "offset": 20
      }, {
        "name": "memory",
        "type": "INT_32",
        "offset": 24
      }, {
        "name": "nameID",
        "type": "INT_32_IDENTIFIER",
        "offset": 28
      }, {
        "name": "perception",
        "type": "INT_32",
        "offset": 32
      }, {
        "name": "raceID",
        "type": "INT_32_IDENTIFIER",
        "offset": 36
      }, {
        "name": "willpower",
        "type": "INT_32",
        "offset": 40
      }]
    }
  }));
}
var bloodlinesReader = new CjsFsd64SchemaBloodlines();

export { CjsFsd64SchemaBloodlines, bloodlinesReader as default };
//# sourceMappingURL=CjsFsd64SchemaBloodlines.js.map
