import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `schoolmap.fsdbinary` bytes.
 *
 * A 12-byte record relating a school to a solar system. It is keyed in its own
 * right rather than by `schoolID`, so the key is not the school.
 */
class CjsFsd64SchemaSchoolMap extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "schoolMap",
    "schemaVersion": 1,
    "path": "res:/staticdata/schoolmap.fsdbinary",
    "schemaID": "83ef52a27b97fc8bafdb9906dad10477",
    "container": {
      "type": "MAP",
      "recordSize": 12,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "fields": [{
        "name": "schoolID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 4,
        "sourceName": "schoolID"
      }, {
        "name": "solarSystemID",
        "type": "UINT_32_IDENTIFIER",
        "offset": 8,
        "sourceName": "solarSystemID"
      }]
    }
  }));
}

export { CjsFsd64SchemaSchoolMap };
//# sourceMappingURL=CjsFsd64SchemaSchoolMap.js.map
