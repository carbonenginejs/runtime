import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads caller-supplied graphic material set bytes. */
export class CjsFsd64SchemaGraphicMaterialSets extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "graphicMaterialSets",
        "schemaVersion": 1,
        "path": "res:/staticdata/graphicmaterialsets.fsdbinary",
        "schemaID": "d4be14e0ea29849f11770cb17b9f4166",
        "container": {
            "type": "MAP",
            "recordSize": 168,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 160,
                "allowedMask": 32767
            },
            "fields": [
                {
                    "name": "custommaterial1",
                    "type": "STRING",
                    "offset": 8,
                    "presenceMask": 16
                },
                {
                    "name": "custommaterial2",
                    "type": "STRING",
                    "offset": 16,
                    "presenceMask": 32
                },
                {
                    "name": "description",
                    "type": "STRING",
                    "offset": 24,
                    "presenceMask": 64
                },
                {
                    "name": "material1",
                    "type": "STRING",
                    "offset": 32,
                    "presenceMask": 128
                },
                {
                    "name": "material2",
                    "type": "STRING",
                    "offset": 40,
                    "presenceMask": 256
                },
                {
                    "name": "material3",
                    "type": "STRING",
                    "offset": 48,
                    "presenceMask": 512
                },
                {
                    "name": "material4",
                    "type": "STRING",
                    "offset": 56,
                    "presenceMask": 1024
                },
                {
                    "name": "resPathInsert",
                    "type": "STRING",
                    "offset": 64,
                    "presenceMask": 2048
                },
                {
                    "name": "sofFactionName",
                    "type": "STRING",
                    "offset": 72,
                    "presenceMask": 4096
                },
                {
                    "name": "sofPatternName",
                    "type": "STRING",
                    "offset": 80,
                    "presenceMask": 8192
                },
                {
                    "name": "sofRaceHint",
                    "type": "STRING",
                    "offset": 88,
                    "presenceMask": 16384
                },
                {
                    "name": "colorHull",
                    "type": "OBJECT",
                    "offset": 96,
                    "presenceMask": 1,
                    "fields": [
                        {
                            "name": "r",
                            "type": "FLOAT_32",
                            "offset": 0
                        },
                        {
                            "name": "g",
                            "type": "FLOAT_32",
                            "offset": 4
                        },
                        {
                            "name": "b",
                            "type": "FLOAT_32",
                            "offset": 8
                        },
                        {
                            "name": "a",
                            "type": "FLOAT_32",
                            "offset": 12
                        }
                    ]
                },
                {
                    "name": "colorPrimary",
                    "type": "OBJECT",
                    "offset": 112,
                    "presenceMask": 2,
                    "fields": [
                        {
                            "name": "r",
                            "type": "FLOAT_32",
                            "offset": 0
                        },
                        {
                            "name": "g",
                            "type": "FLOAT_32",
                            "offset": 4
                        },
                        {
                            "name": "b",
                            "type": "FLOAT_32",
                            "offset": 8
                        },
                        {
                            "name": "a",
                            "type": "FLOAT_32",
                            "offset": 12
                        }
                    ]
                },
                {
                    "name": "colorSecondary",
                    "type": "OBJECT",
                    "offset": 128,
                    "presenceMask": 4,
                    "fields": [
                        {
                            "name": "r",
                            "type": "FLOAT_32",
                            "offset": 0
                        },
                        {
                            "name": "g",
                            "type": "FLOAT_32",
                            "offset": 4
                        },
                        {
                            "name": "b",
                            "type": "FLOAT_32",
                            "offset": 8
                        },
                        {
                            "name": "a",
                            "type": "FLOAT_32",
                            "offset": 12
                        }
                    ]
                },
                {
                    "name": "colorWindow",
                    "type": "OBJECT",
                    "offset": 144,
                    "presenceMask": 8,
                    "fields": [
                        {
                            "name": "r",
                            "type": "FLOAT_32",
                            "offset": 0
                        },
                        {
                            "name": "g",
                            "type": "FLOAT_32",
                            "offset": 4
                        },
                        {
                            "name": "b",
                            "type": "FLOAT_32",
                            "offset": 8
                        },
                        {
                            "name": "a",
                            "type": "FLOAT_32",
                            "offset": 12
                        }
                    ]
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaGraphicMaterialSets();
