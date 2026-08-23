import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `corporationroles.fsdbinary` bytes.
 *
 * `descriptionID`, `nameID` are localisation label identifiers; resolve them
 * through `CjsFsdLocalization`.
 *
 * **`roleGroupIDs` is not stored, and this reader does not invent it.** CCP's
 * export publishes it; the client derives it. Role `r` belongs to group `g` iff
 * bit `r` of `CjsFsd64SchemaCorporationRoleGroups`'s `roleMask` for `g` is set,
 * which reproduces all 55 roles exactly - including role 61, which lands in no
 * group at all and which the export publishes without the field. A caller that
 * wants `roleGroupIDs` computes it from the two tables; `roleMask` exceeds
 * 2^53, so test the bit with `BigInt`.
 */
export class CjsFsd64SchemaCorporationRoles extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "corporationRoles",
        "schemaVersion": 1,
        "path": "res:/staticdata/corporationroles.fsdbinary",
        "schemaID": "71d7046924e19a6795d747a204b2bc4a",
        "container": {
            "type": "MAP",
            "recordSize": 32,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 24,
                "allowedMask": 1
            },
            "fields": [
                {
                    "name": "roleName",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "roleName"
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 16,
                    "sourceName": "descriptionID",
                    "presenceMask": 1
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 20,
                    "sourceName": "nameID"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCorporationRoles();
