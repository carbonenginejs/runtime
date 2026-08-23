import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads caller-supplied character modifier-location bytes. */
export class CjsFsd64SchemaCharacterModifierLocations extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "characterModifierLocations",
        "schemaVersion": 1,
        "path": "res:/staticdata/character_modifierlocations.fsdbinary",
        "schemaID": "1d4ee45d137adf6eb7509f944ab091df76001f5ff62ceb9e",
        "container": {
            "type": "MAP",
            "recordSize": 24,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "modifierKey",
                    "type": "STRING",
                    "offset": 8
                },
                {
                    "name": "variationKey",
                    "type": "STRING",
                    "offset": 16
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCharacterModifierLocations();
