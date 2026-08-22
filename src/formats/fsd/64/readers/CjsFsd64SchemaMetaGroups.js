import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `metagroups.fsdbinary` bytes.
 *
 * `nameID` and `descriptionID` are localisation label identifiers; resolve
 * them through `CjsFsdLocalization`. `iconSuffix` is art data and is stored as
 * inline text, so it is the same on every publisher.
 *
 * **One presence assignment is inferred rather than proven.** `iconID` and
 * `iconSuffix` are guarded by bits 2 and 3, and no record anywhere distinguishes
 * them: across CCP, Serenity and Infinity - 41 records - the two bits are always
 * equal, so both fields are present together or absent together. The order here
 * follows the alphabetical pattern the other three bits obey (color 0x1,
 * description 0x2), and swapping them would decode every known record
 * identically. If a future build ever publishes one without the other, that
 * record settles it - and it is the only thing that can.
 */
export class CjsFsd64SchemaMetaGroups extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "metaGroups",
        "schemaVersion": 1,
        "path": "res:/staticdata/metagroups.fsdbinary",
        "schemaID": "8a80fda6f189657582101f6df1bb1d30",
        "container": {
            "type": "MAP",
            "recordSize": 48,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 44,
                "allowedMask": 15
            },
            "fields": [
                {
                    "name": "iconSuffix",
                    "type": "STRING",
                    "offset": 8,
                    "presenceMask": 8
                },
                {
                    "name": "color",
                    "type": "OBJECT",
                    "offset": 16,
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
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 32,
                    "presenceMask": 2
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 36,
                    "presenceMask": 4
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 40
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaMetaGroups();
