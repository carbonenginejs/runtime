import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads caller-supplied character color-name bytes. */
export class CjsFsd64SchemaCharacterColorNames extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "characterColorNames",
        "schemaVersion": 1,
        "path": "res:/staticdata/character_colornames.fsdbinary",
        "schemaID": "22c4717a5cbdd55822f7bceaff57b448f59cb8fba2f84b2b",
        "container": {
            "type": "MAP",
            "recordSize": 24,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "colorName",
                    "type": "STRING",
                    "offset": 8
                },
                {
                    "name": "hairColor",
                    "type": "UINT_8",
                    "offset": 16
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCharacterColorNames();
