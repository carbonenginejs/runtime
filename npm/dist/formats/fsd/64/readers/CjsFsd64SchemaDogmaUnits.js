import { CjsFsd64SchemaDecoder } from '../core/CjsFsd64SchemaDecoder.js';
import { CjsFsd64SchemaReader } from '../core/CjsFsd64SchemaReader.js';

/**
 * Reads caller-supplied `dogmaunits.fsdbinary` bytes.
 *
 * `descriptionID`, `displayNameID` are localisation label identifiers; resolve
 * them through `CjsFsdLocalization`.
 *
 * `name` is inline text and is the same on every publisher.
 *
 * **The exporter normalises CRLF to LF in localised text.** Two of this table's
 * descriptions differ from the export by nothing else, which is how the rule
 * was found; only the trailing-space trim was known before. Anything comparing
 * a resolved description against CCP's export must normalise line endings
 * first, or those two records read as mismatches.
 */
class CjsFsd64SchemaDogmaUnits extends CjsFsd64SchemaReader {
  static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
    "schema": "carbonenginejs.fsdBinarySchema",
    "name": "dogmaUnits",
    "schemaVersion": 1,
    "path": "res:/staticdata/dogmaunits.fsdbinary",
    "schemaID": "503dc5a2fb596cdfcbef8a8c3a6209f2",
    "container": {
      "type": "MAP",
      "recordSize": 32,
      "key": {
        "type": "UINT_32_IDENTIFIER",
        "offset": 0
      },
      "presence": {
        "type": "UINT_32",
        "offset": 24,
        "allowedMask": 3
      },
      "fields": [{
        "name": "name",
        "type": "STRING",
        "offset": 8,
        "sourceName": "name"
      }, {
        "name": "descriptionID",
        "type": "UINT_32",
        "offset": 16,
        "sourceName": "descriptionID",
        "presenceMask": 1
      }, {
        "name": "displayNameID",
        "type": "UINT_32",
        "offset": 20,
        "sourceName": "displayNameID",
        "presenceMask": 2
      }]
    }
  }));
}

export { CjsFsd64SchemaDogmaUnits };
//# sourceMappingURL=CjsFsd64SchemaDogmaUnits.js.map
