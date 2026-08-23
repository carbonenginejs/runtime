import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `factions.fsdbinary` bytes.
 *
 * `descriptionID`, `nameID`, `shortDescriptionID` are localisation label
 * identifiers; resolve them through `CjsFsdLocalization`.
 *
 * `flatLogo` and `flatLogoWithName` are art paths stored as inline text, so
 * they are the same on every publisher. `memberRaces` is a list of race
 * identifiers, and `uniqueName` is a bit rather than a byte-wide boolean.
 */
export class CjsFsd64SchemaFactions extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "factions",
        "schemaVersion": 1,
        "path": "res:/staticdata/factions.fsdbinary",
        "schemaID": "f4f099a0cea0e6e549c8f7a97b247ffc",
        "container": {
            "type": "MAP",
            "recordSize": 80,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 72,
                "allowedMask": 127
            },
            "fields": [
                {
                    "name": "flatLogo",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "flatLogo",
                    "presenceMask": 4
                },
                {
                    "name": "flatLogoWithName",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "flatLogoWithName",
                    "presenceMask": 8
                },
                {
                    "name": "memberRaces",
                    "type": "LIST",
                    "offset": 24,
                    "sourceName": "memberRaces",
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    }
                },
                {
                    "name": "corporationID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 32,
                    "sourceName": "corporationID",
                    "presenceMask": 1
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 36,
                    "sourceName": "descriptionID",
                    "presenceMask": 2
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 40,
                    "sourceName": "iconID"
                },
                {
                    "name": "militiaCorporationID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 44,
                    "sourceName": "militiaCorporationID",
                    "presenceMask": 16
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 48,
                    "sourceName": "nameID"
                },
                {
                    "name": "npcTag",
                    "type": "UINT_32",
                    "offset": 52,
                    "sourceName": "npcTag",
                    "presenceMask": 32
                },
                {
                    "name": "shortDescriptionID",
                    "type": "UINT_32",
                    "offset": 56,
                    "sourceName": "shortDescriptionID",
                    "presenceMask": 64
                },
                {
                    "name": "sizeFactor",
                    "type": "FLOAT_32",
                    "offset": 60,
                    "sourceName": "sizeFactor"
                },
                {
                    "name": "solarSystemID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 64,
                    "sourceName": "solarSystemID"
                },
                {
                    "name": "uniqueName",
                    "type": "BOOLEAN",
                    "offset": 68,
                    "bit": 0,
                    "sourceName": "uniqueName"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaFactions();
