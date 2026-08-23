import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `categories.fsdbinary` bytes.
 *
 * Decodes item categories; `name` is a localisation label identifier, not text. Resolve the identifiers through
 * `CjsFsdLocalization` against the language table you want; this reader
 * returns them rather than pretending to text it cannot supply.
 *
 * Offsets and presence masks were solved against CCP's published export at
 * build 3466501, accepting only unanimous agreement across every record.
 */
export class CjsFsd64SchemaCategories extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "categories",
        "schemaVersion": 1,
        "path": "res:/staticdata/categories.fsdbinary",
        "schemaID": "c5de77dba3d9503eb69b6378c15dd47a",
        "container": {
            "type": "MAP",
            "recordSize": 40,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 32,
                "allowedMask": 3
            },
            "fields": [
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 20
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 24,
                    "presenceMask": 1
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 28,
                    "bit": 0
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCategories();
