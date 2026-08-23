import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/** Reads caller-supplied character portrait-resource bytes. */
class CjsFsd64SchemaCharacterPortraitResources extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "characterPortraitResources",
    "schemaVersion": 1,
    "path": "res:/staticdata/character_portraitresources.fsdbinary",
    "schemaID": "3047dbf71d95f694cfc2f8adc0842194389868616e9c1c71",
    "container": {
      "type": "MAP",
      "recordSize": 32,
      "key": {
        "type": "UINT_64_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 28,
        "allowedMask": 1
      },
      "fields": [{
        "name": "resPath",
        "type": "STRING",
        "offset": 8
      }, {
        "name": "resourceCategory",
        "type": "STRING",
        "offset": 16
      }, {
        "name": "typeID",
        "type": "INT_32_IDENTIFIER",
        "offset": 24,
        "presenceMask": 1
      }]
    }
  }));
}
var characterPortraitResourcesReader = new CjsFsd64SchemaCharacterPortraitResources();

export { CjsFsd64SchemaCharacterPortraitResources, characterPortraitResourcesReader as default };
//# sourceMappingURL=CjsFsd64SchemaCharacterPortraitResources.js.map
