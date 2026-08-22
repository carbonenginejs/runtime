import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `schools.fsdbinary` bytes.
 *
 * `characterDescriptionID`, `descriptionID`, `nameID` are localisation label
 * identifiers; resolve them through `CjsFsdLocalization`.
 *
 * `titleID` is a localisation label as well, despite the name not saying so.
 *
 * `careerAgents` and `startingStations` are lists of identifiers. `schoolMap`
 * relates a school to a solar system separately, and is its own table.
 */
class CjsFsd64SchemaSchools extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "schools",
    "schemaVersion": 1,
    "path": "res:/staticdata/schools.fsdbinary",
    "schemaID": "7bbbd5ec836a677f23667ea1b4c0a2e8",
    "container": {
      "type": "MAP",
      "recordSize": 64,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 60,
        "allowedMask": 127
      },
      "fields": [{
        "name": "careerAgents",
        "type": "LIST",
        "offset": 8,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "sourceName": "careerAgents",
        "presenceMask": 1
      }, {
        "name": "startingStations",
        "type": "LIST",
        "offset": 16,
        "itemSize": 4,
        "item": {
          "type": "UINT_32_IDENTIFIER",
          "offset": 0
        },
        "sourceName": "startingStations",
        "presenceMask": 32
      }, {
        "name": "careerID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 24,
        "sourceName": "careerID"
      }, {
        "name": "characterDescriptionID",
        "type": "UINT_32",
        "offset": 28,
        "sourceName": "characterDescriptionID",
        "presenceMask": 2
      }, {
        "name": "corporationID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 32,
        "sourceName": "corporationID"
      }, {
        "name": "descriptionID",
        "type": "UINT_32",
        "offset": 36,
        "sourceName": "descriptionID",
        "presenceMask": 4
      }, {
        "name": "iconID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 40,
        "sourceName": "iconID",
        "presenceMask": 8
      }, {
        "name": "nameID",
        "type": "UINT_32",
        "offset": 44,
        "sourceName": "nameID"
      }, {
        "name": "raceID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 48,
        "sourceName": "raceID"
      }, {
        "name": "titleID",
        "type": "UINT_32",
        "offset": 52,
        "sourceName": "titleID",
        "presenceMask": 64
      }, {
        "name": "isStarterSpaceSchool",
        "type": "BOOLEAN",
        "offset": 56,
        "bit": 0,
        "sourceName": "is_starter_space_school",
        "presenceMask": 16
      }]
    }
  }));
}

export { CjsFsd64SchemaSchools };
//# sourceMappingURL=CjsFsd64SchemaSchools.js.map
