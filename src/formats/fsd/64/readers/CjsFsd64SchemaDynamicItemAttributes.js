import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `dynamicitemattributes.fsdbinary` bytes.
 *
 * **One field is inferred rather than measured.** The `inputOutputMapping` item
 * stride is declared as 16 bytes and today's data cannot confirm it: all 413
 * lists hold exactly one entry, so strides of 8, 12 and 16 decode every record
 * identically. 16 is what the format's alignment rule implies, and it is a
 * guess until a build ships a list with two entries. The item's field offsets
 * within the record are measured, not inferred.
 *
 * `attributeIDs` is a 20-byte inner map, which is 4-aligned rather than
 * 8-aligned - inner records do not follow the outer record's alignment.
 */
export class CjsFsd64SchemaDynamicItemAttributes extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "dynamicItemAttributes",
        "schemaVersion": 1,
        "path": "res:/staticdata/dynamicitemattributes.fsdbinary",
        "schemaID": "b88a13882e0ee24851d44cba54c404ca",
        "container": {
            "type": "MAP",
            "recordSize": 32,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "attributeIDs",
                    "type": "MAP",
                    "offset": 8,
                    "recordSize": 20,
                    "sourceName": "attributeIDs",
                    "key": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "presence": {
                        "type": "UINT_32",
                        "offset": 16,
                        "allowedMask": 1
                    },
                    "fields": [
                        {
                            "name": "max",
                            "type": "FLOAT_32",
                            "offset": 4,
                            "sourceName": "max"
                        },
                        {
                            "name": "min",
                            "type": "FLOAT_32",
                            "offset": 8,
                            "sourceName": "min"
                        },
                        {
                            "name": "highIsGood",
                            "type": "BOOLEAN",
                            "offset": 12,
                            "bit": 0,
                            "sourceName": "highIsGood",
                            "presenceMask": 1
                        }
                    ]
                },
                {
                    "name": "inputOutputMapping",
                    "type": "LIST",
                    "offset": 24,
                    "itemSize": 16,
                    "sourceName": "inputOutputMapping",
                    "item": {
                        "type": "OBJECT",
                        "fields": [
                            {
                                "name": "applicableTypes",
                                "type": "LIST",
                                "offset": 0,
                                "itemSize": 4,
                                "sourceName": "applicableTypes",
                                "item": {
                                    "type": "UINT_32_IDENTIFIER",
                                    "offset": 0
                                }
                            },
                            {
                                "name": "resultingType",
                                "type": "UINT_32_IDENTIFIER",
                                "offset": 8,
                                "sourceName": "resultingType"
                            }
                        ]
                    }
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaDynamicItemAttributes();
