import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `groups.fsdbinary` bytes.
 *
 * Decodes item groups; carries `categoryID` and a `name` label identifier. Resolve the identifiers through
 * `CjsFsdLocalization` against the language table you want; this reader
 * returns them rather than pretending to text it cannot supply.
 *
 * Offsets and presence masks were solved against CCP's published export at
 * build 3466501, accepting only unanimous agreement across every record.
 */
export class CjsFsd64SchemaGroups extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "groups",
        "schemaVersion": 1,
        "path": "res:/staticdata/groups.fsdbinary",
        "schemaID": "122e735a97700cf0466ace3d16063643",
        "container": {
            "type": "MAP",
            "recordSize": 32,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 28,
                "allowedMask": 63
            },
            "fields": [
                {
                    "name": "categoryID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 4
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 12
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 16,
                    "presenceMask": 8
                },
                {
                    "name": "anchorable",
                    "type": "BOOLEAN",
                    "offset": 20,
                    "bit": 0
                },
                {
                    "name": "anchored",
                    "type": "BOOLEAN",
                    "offset": 21,
                    "bit": 0
                },
                {
                    "name": "fittableNonSingleton",
                    "type": "BOOLEAN",
                    "offset": 22,
                    "bit": 0
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 23,
                    "bit": 0
                },
                {
                    "name": "useBasePrice",
                    "type": "BOOLEAN",
                    "offset": 24,
                    "bit": 0
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaGroups();
