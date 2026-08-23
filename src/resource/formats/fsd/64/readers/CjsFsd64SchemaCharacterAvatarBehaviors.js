import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads caller-supplied character avatar-behavior bytes. */
export class CjsFsd64SchemaCharacterAvatarBehaviors extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "characterAvatarBehaviors",
        "schemaVersion": 1,
        "path": "res:/staticdata/character_avatarbehaviors.fsdbinary",
        "schemaID": "e6bf2eb64b69285a85e658a01ea5770175c068cf899bddc0",
        "container": {
            "type": "MAP",
            "recordSize": 32,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "name",
                    "type": "STRING",
                    "offset": 8
                },
                {
                    "name": "resPathList",
                    "type": "LIST",
                    "offset": 16,
                    "itemSize": 8,
                    "maximumCount": 100,
                    "item": {
                        "type": "STRING",
                        "offset": 0
                    }
                },
                {
                    "name": "resGender",
                    "type": "UINT_8",
                    "offset": 24
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCharacterAvatarBehaviors();
