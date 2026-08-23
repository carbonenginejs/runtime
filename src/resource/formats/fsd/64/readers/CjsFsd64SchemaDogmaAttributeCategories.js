import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `dogmaattributecategories.fsdbinary` bytes.
 *
 * Both fields are inline text rather than label identifiers, so this table
 * needs no localisation and reads identically on every publisher.
 */
export class CjsFsd64SchemaDogmaAttributeCategories extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "dogmaAttributeCategories",
        "schemaVersion": 1,
        "path": "res:/staticdata/dogmaattributecategories.fsdbinary",
        "schemaID": "9f72a07713f5a7ef7cd664b64a8b601f",
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
                "allowedMask": 1
            },
            "fields": [
                {
                    "name": "description",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "description",
                    "presenceMask": 1
                },
                {
                    "name": "name",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "name"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaDogmaAttributeCategories();
