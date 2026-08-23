import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `npccorporationdivisions.fsdbinary` bytes.
 *
 * `descriptionID`, `leaderTypeNameID`, `nameID` are localisation label
 * identifiers; resolve them through `CjsFsdLocalization`.
 *
 * **The field the client calls `description` is what CCP's export publishes as
 * `displayName`.** The name here follows the loader, which names it
 * `description` - checked in the string run, where it sits immediately before
 * `internalName` and `descriptionID`. The export then publishes the *localised*
 * `descriptionID` under the name `description`, so the two meanings collide and
 * a projection that passes `description` through unchanged silently publishes
 * the wrong one. Confirmed on build 3466501: division 18 stores
 * `"Research and development division"`, which the export publishes as
 * `displayName`.
 */
export class CjsFsd64SchemaNpcCorporationDivisions extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "npcCorporationDivisions",
        "schemaVersion": 1,
        "path": "res:/staticdata/npccorporationdivisions.fsdbinary",
        "schemaID": "c3a40dc4a42d5ccbbc8e252e9e8ef38f",
        "container": {
            "type": "MAP",
            "recordSize": 40,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 36,
                "allowedMask": 3
            },
            "fields": [
                {
                    "name": "description",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "description",
                    "presenceMask": 1
                },
                {
                    "name": "internalName",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "internalName"
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 24,
                    "sourceName": "descriptionID",
                    "presenceMask": 2
                },
                {
                    "name": "leaderTypeNameID",
                    "type": "UINT_32",
                    "offset": 28,
                    "sourceName": "leaderTypeNameID"
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 32,
                    "sourceName": "nameID"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaNpcCorporationDivisions();
