import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/** Reads caller-supplied archetype static-data bytes. */
class CjsFsd64SchemaArchetypes extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "archetypes",
    "schemaVersion": 1,
    "path": "res:/staticdata/archetypes.fsdbinary",
    "schemaID": "5bef0b64a02856aa9e436407a8a523f2",
    "container": {
      "type": "MAP",
      "recordSize": 40,
      "key": {
        "type": "UINT_64_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 32,
        "allowedMask": 15
      },
      "fields": [{
        "name": "contentTags",
        "type": "LIST",
        "offset": 8,
        "itemSize": 8,
        "maximumCount": 100,
        "item": {
          "type": "STRING",
          "offset": 0
        },
        "presenceMask": 1
      }, {
        "name": "location",
        "type": "STRING",
        "offset": 16,
        "presenceMask": 4
      }, {
        "name": "descriptionID",
        "type": "INT_32_IDENTIFIER",
        "offset": 24,
        "presenceMask": 2
      }, {
        "name": "titleID",
        "type": "INT_32_IDENTIFIER",
        "offset": 28,
        "presenceMask": 8
      }]
    }
  }));
}
var archetypesReader = new CjsFsd64SchemaArchetypes();

export { CjsFsd64SchemaArchetypes, archetypesReader as default };
//# sourceMappingURL=CjsFsd64SchemaArchetypes.js.map
