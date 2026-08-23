import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads res:/staticdata/character_resources.fsdbinary. */
export class CjsFsd64SchemaCharacterResources extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "characterResources",
        "schemaVersion": 1,
        "path": "res:/staticdata/character_resources.fsdbinary",
        "schemaID": "fcdf867c997da51a4520f27df64bf17270f7f6f1b4ac9207",
        "container": {
            "type": "MAP",
            "recordSize": 56,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 48,
                "allowedMask": 255
            },
            "fields": [
                {
                    "name": "empireRestrictions",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 4,
                    "maximumCount": 64,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "presenceMask": 32
                },
                {
                    "name": "resPath",
                    "type": "STRING",
                    "offset": 16
                },
                {
                    "name": "clothingAlsoCoversCategory",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 24,
                    "presenceMask": 1
                },
                {
                    "name": "clothingAlsoCoversCategory2",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 28,
                    "presenceMask": 2
                },
                {
                    "name": "clothingRemovesCategory",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 32,
                    "presenceMask": 4
                },
                {
                    "name": "clothingRemovesCategory2",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 36,
                    "presenceMask": 8
                },
                {
                    "name": "typeID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 40,
                    "presenceMask": 128
                },
                {
                    "name": "clothingRuleException",
                    "type": "UINT_8",
                    "offset": 44,
                    "presenceMask": 16
                },
                {
                    "name": "resGender",
                    "type": "UINT_8",
                    "offset": 45,
                    "presenceMask": 64
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCharacterResources();
