import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/** Reads caller-supplied race static-data bytes. */
class CjsFsd64SchemaRaces extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "races",
    "schemaVersion": 1,
    "path": "res:/staticdata/races.fsdbinary",
    "schemaID": "e34c304c76d48541af0967a885eeb554",
    "container": {
      "type": "MAP",
      "recordSize": 48,
      "key": {
        "type": "UINT_64_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 40,
        "allowedMask": 15
      },
      "fields": [{
        "name": "skills",
        "type": "MAP",
        "offset": 8,
        "recordSize": 8,
        "key": {
          "type": "INT_32_IDENTIFIER",
          "offset": 0
        },
        "value": {
          "type": "INT_32",
          "offset": 4
        },
        "presenceMask": 8
      }, {
        "name": "descriptionID",
        "type": "INT_32_IDENTIFIER",
        "offset": 24,
        "presenceMask": 1
      }, {
        "name": "iconID",
        "type": "INT_32_IDENTIFIER",
        "offset": 28,
        "presenceMask": 2
      }, {
        "name": "nameID",
        "type": "INT_32_IDENTIFIER",
        "offset": 32
      }, {
        "name": "shipTypeID",
        "type": "INT_32_IDENTIFIER",
        "offset": 36,
        "presenceMask": 4
      }]
    }
  }));
}
var racesReader = new CjsFsd64SchemaRaces();

export { CjsFsd64SchemaRaces, racesReader as default };
//# sourceMappingURL=CjsFsd64SchemaRaces.js.map
