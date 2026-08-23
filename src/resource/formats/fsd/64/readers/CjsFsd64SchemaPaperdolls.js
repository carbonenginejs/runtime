import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/** Reads caller-supplied paper-doll recipe bytes. */
export class CjsFsd64SchemaPaperdolls extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "paperdolls",
        "schemaVersion": 1,
        "path": "res:/staticdata/paperdolls.fsdbinary",
        "schemaID": "3ad875d66dee66df260ad6dd67e3e3821cc5ed89917ab3ef",
        "container": {
            "type": "MAP",
            "recordSize": 352,
            "recordOffset": 8,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_64",
                "offset": 336,
                "allowedMask": 1
            },
            "fields": [
                {
                    "name": "browLeftCurl",
                    "type": "FLOAT_64",
                    "offset": 0
                },
                {
                    "name": "browLeftTighten",
                    "type": "FLOAT_64",
                    "offset": 8
                },
                {
                    "name": "browLeftUpDown",
                    "type": "FLOAT_64",
                    "offset": 16
                },
                {
                    "name": "browRightCurl",
                    "type": "FLOAT_64",
                    "offset": 24
                },
                {
                    "name": "browRightTighten",
                    "type": "FLOAT_64",
                    "offset": 32
                },
                {
                    "name": "browRightUpDown",
                    "type": "FLOAT_64",
                    "offset": 40
                },
                {
                    "name": "cameraFieldOfView",
                    "type": "FLOAT_64",
                    "offset": 48
                },
                {
                    "name": "cameraPoiX",
                    "type": "FLOAT_64",
                    "offset": 56
                },
                {
                    "name": "cameraPoiY",
                    "type": "FLOAT_64",
                    "offset": 64
                },
                {
                    "name": "cameraPoiZ",
                    "type": "FLOAT_64",
                    "offset": 72
                },
                {
                    "name": "cameraX",
                    "type": "FLOAT_64",
                    "offset": 80
                },
                {
                    "name": "cameraY",
                    "type": "FLOAT_64",
                    "offset": 88
                },
                {
                    "name": "cameraZ",
                    "type": "FLOAT_64",
                    "offset": 96
                },
                {
                    "name": "colorSelections",
                    "type": "LIST",
                    "offset": 104,
                    "itemSize": 32,
                    "maximumCount": 1000,
                    "item": {
                        "type": "OBJECT",
                        "fields": [
                            {
                                "name": "gloss",
                                "type": "FLOAT_64",
                                "offset": 0
                            },
                            {
                                "name": "weight",
                                "type": "FLOAT_64",
                                "offset": 8
                            },
                            {
                                "name": "colorID",
                                "type": "INT_32_IDENTIFIER",
                                "offset": 16
                            },
                            {
                                "name": "colorNameA",
                                "type": "INT_32_IDENTIFIER",
                                "offset": 20
                            },
                            {
                                "name": "colorNameBC",
                                "type": "INT_32_IDENTIFIER",
                                "offset": 24
                            }
                        ]
                    }
                },
                {
                    "name": "creationDate",
                    "type": "STRING",
                    "offset": 112
                },
                {
                    "name": "eyeClose",
                    "type": "FLOAT_64",
                    "offset": 120
                },
                {
                    "name": "eyesLookHorizontal",
                    "type": "FLOAT_64",
                    "offset": 128
                },
                {
                    "name": "eyesLookVertical",
                    "type": "FLOAT_64",
                    "offset": 136
                },
                {
                    "name": "frownLeft",
                    "type": "FLOAT_64",
                    "offset": 144
                },
                {
                    "name": "frownRight",
                    "type": "FLOAT_64",
                    "offset": 152
                },
                {
                    "name": "hairDarkness",
                    "type": "FLOAT_64",
                    "offset": 160
                },
                {
                    "name": "headLookTargetX",
                    "type": "FLOAT_64",
                    "offset": 168
                },
                {
                    "name": "headLookTargetY",
                    "type": "FLOAT_64",
                    "offset": 176
                },
                {
                    "name": "headLookTargetZ",
                    "type": "FLOAT_64",
                    "offset": 184
                },
                {
                    "name": "headTilt",
                    "type": "FLOAT_64",
                    "offset": 192
                },
                {
                    "name": "jawSideways",
                    "type": "FLOAT_64",
                    "offset": 200
                },
                {
                    "name": "jawUp",
                    "type": "FLOAT_64",
                    "offset": 208
                },
                {
                    "name": "lastRendered",
                    "type": "STRING",
                    "offset": 216
                },
                {
                    "name": "lastUpdate",
                    "type": "STRING",
                    "offset": 224
                },
                {
                    "name": "lightIntensity",
                    "type": "FLOAT_64",
                    "offset": 232
                },
                {
                    "name": "modifiers",
                    "type": "LIST",
                    "offset": 240,
                    "itemSize": 12,
                    "maximumCount": 10000,
                    "item": {
                        "type": "OBJECT",
                        "fields": [
                            {
                                "name": "modifierLocationID",
                                "type": "INT_32_IDENTIFIER",
                                "offset": 0
                            },
                            {
                                "name": "paperdollResourceID",
                                "type": "INT_32_IDENTIFIER",
                                "offset": 4
                            },
                            {
                                "name": "paperdollResourceVariation",
                                "type": "INT_32",
                                "offset": 8
                            }
                        ]
                    }
                },
                {
                    "name": "orientChar",
                    "type": "FLOAT_64",
                    "offset": 248
                },
                {
                    "name": "portraitPoseNumber",
                    "type": "FLOAT_64",
                    "offset": 256
                },
                {
                    "name": "puckerLips",
                    "type": "FLOAT_64",
                    "offset": 264
                },
                {
                    "name": "sculptWeights",
                    "type": "LIST",
                    "offset": 272,
                    "itemSize": 32,
                    "maximumCount": 1000,
                    "item": {
                        "type": "OBJECT",
                        "fields": [
                            {
                                "name": "weightForwardBack",
                                "type": "FLOAT_64",
                                "offset": 0
                            },
                            {
                                "name": "weightLeftRight",
                                "type": "FLOAT_64",
                                "offset": 8
                            },
                            {
                                "name": "weightUpDown",
                                "type": "FLOAT_64",
                                "offset": 16
                            },
                            {
                                "name": "sculptLocationID",
                                "type": "INT_32_IDENTIFIER",
                                "offset": 24
                            }
                        ]
                    }
                },
                {
                    "name": "smileLeft",
                    "type": "FLOAT_64",
                    "offset": 280
                },
                {
                    "name": "smileRight",
                    "type": "FLOAT_64",
                    "offset": 288
                },
                {
                    "name": "squintLeft",
                    "type": "FLOAT_64",
                    "offset": 296
                },
                {
                    "name": "squintRight",
                    "type": "FLOAT_64",
                    "offset": 304
                },
                {
                    "name": "backgroundID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 312
                },
                {
                    "name": "lightColorID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 316
                },
                {
                    "name": "lightID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 320
                },
                {
                    "name": "paperdollState",
                    "type": "INT_32",
                    "offset": 324
                },
                {
                    "name": "renderStatus",
                    "type": "INT_32",
                    "offset": 328,
                    "presenceMask": 1
                },
                {
                    "name": "neverRender",
                    "type": "INT_32",
                    "offset": 332
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaPaperdolls();
