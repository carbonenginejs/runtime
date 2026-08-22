import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/** Reads caller-supplied character sculpting-location bytes. */
class CjsFsd64SchemaCharacterSculptingLocations extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "characterSculptingLocations",
    "schemaVersion": 1,
    "path": "res:/staticdata/character_sculptinglocations.fsdbinary",
    "schemaID": "daf7add2b24fe2aefbb11ead40e6bf719a2c5b81861265c6",
    "container": {
      "type": "MAP",
      "recordSize": 24,
      "key": {
        "type": "UINT_64_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "weightKeyCategory",
        "type": "STRING",
        "offset": 8
      }, {
        "name": "weightKeyPrefix",
        "type": "STRING",
        "offset": 16
      }]
    }
  }));
}
var characterSculptingLocationsReader = new CjsFsd64SchemaCharacterSculptingLocations();

export { CjsFsd64SchemaCharacterSculptingLocations, characterSculptingLocationsReader as default };
//# sourceMappingURL=CjsFsd64SchemaCharacterSculptingLocations.js.map
