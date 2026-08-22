import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads caller-supplied character color-location bytes. */
export class CjsFsd64SchemaCharacterColorLocations extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "characterColorLocations",
        "schemaVersion": 1,
        "path": "res:/staticdata/character_colorlocations.fsdbinary",
        "schemaID": "b2698c67eff4d5e0b3b41c3890269900262913c296bb9516",
        "container": {
            "type": "MAP",
            "recordSize": 24,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "colorKey",
                    "type": "STRING",
                    "offset": 8
                },
                {
                    "name": "hasGloss",
                    "type": "UINT_8",
                    "offset": 16
                },
                {
                    "name": "hasWeight",
                    "type": "UINT_8",
                    "offset": 17
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCharacterColorLocations();
