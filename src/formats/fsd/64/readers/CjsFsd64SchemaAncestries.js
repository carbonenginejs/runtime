import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";

/** Reads caller-supplied ancestry static-data bytes. */
export class CjsFsd64SchemaAncestries extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "ancestries",
        "schemaVersion": 1,
        "path": "res:/staticdata/ancestries.fsdbinary",
        "schemaID": "b6567424ddf32c2146f126dd23e0bb99",
        "container": {
            "type": "MAP",
            "recordSize": 56,
            "key": {
                "type": "UINT_64_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 52,
                "allowedMask": 15
            },
            "fields": [
                {
                    "name": "shortDescription",
                    "type": "STRING",
                    "offset": 8,
                    "presenceMask": 8
                },
                {
                    "name": "bloodlineID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 16
                },
                {
                    "name": "charisma",
                    "type": "INT_32",
                    "offset": 20
                },
                {
                    "name": "descriptionID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 24,
                    "presenceMask": 1
                },
                {
                    "name": "iconID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 28,
                    "presenceMask": 2
                },
                {
                    "name": "intelligence",
                    "type": "INT_32",
                    "offset": 32
                },
                {
                    "name": "memory",
                    "type": "INT_32",
                    "offset": 36
                },
                {
                    "name": "nameID",
                    "type": "INT_32_IDENTIFIER",
                    "offset": 40,
                    "presenceMask": 4
                },
                {
                    "name": "perception",
                    "type": "INT_32",
                    "offset": 44
                },
                {
                    "name": "willpower",
                    "type": "INT_32",
                    "offset": 48
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaAncestries();
