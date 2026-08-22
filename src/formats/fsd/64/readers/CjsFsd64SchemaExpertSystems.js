import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `expertsystems.fsdbinary` bytes.
 *
 * **A presence bit here does not mean the export publishes the field.**
 * `associatedShipTypes` splits 47 present to 8 absent, where CCP's export shows
 * 43 to 12: four records carry the bit and hold an empty list, and the exporter
 * drops an empty list exactly as it drops an absent one. Do not use a presence
 * bit to predict export presence - decode the list and check its length.
 * `CjsFsd64SchemaStationOperations.stationTypes` has the same property.
 */
export class CjsFsd64SchemaExpertSystems extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "expertSystems",
        "schemaVersion": 1,
        "path": "res:/staticdata/expertsystems.fsdbinary",
        "schemaID": "2399822518a3717c660fefd1b18ad80e",
        "container": {
            "type": "MAP",
            "recordSize": 56,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 48,
                "allowedMask": 1
            },
            "fields": [
                {
                    "name": "associatedShipTypes",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 4,
                    "sourceName": "associatedShipTypes",
                    "presenceMask": 1,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    }
                },
                {
                    "name": "internalName",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "internalName"
                },
                {
                    "name": "skillsGranted",
                    "type": "MAP",
                    "offset": 24,
                    "recordSize": 8,
                    "sourceName": "skillsGranted",
                    "key": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "value": {
                        "type": "UINT_32",
                        "offset": 4
                    }
                },
                {
                    "name": "durationDays",
                    "type": "UINT_32",
                    "offset": 40,
                    "sourceName": "durationDays"
                },
                {
                    "name": "esHidden",
                    "type": "BOOLEAN",
                    "offset": 44,
                    "bit": 0,
                    "sourceName": "esHidden"
                },
                {
                    "name": "esRetired",
                    "type": "BOOLEAN",
                    "offset": 45,
                    "bit": 0,
                    "sourceName": "esRetired"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaExpertSystems();
