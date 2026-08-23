import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `corporationrolegroups.fsdbinary` bytes.
 *
 * `roleGroupNameID` is a localisation label identifier; resolve it through
 * `CjsFsdLocalization`.
 *
 * `roleMask` exceeds 2^53 and is read as a 64-bit value. It is not decoration:
 * it is the only place the role-to-group relation is stored. See
 * `CjsFsd64SchemaCorporationRoles` for the derivation.
 *
 * `roleMask` is a bit set over role identifiers, so a caller reading it must
 * use `BigInt` rather than `Number` to test a bit.
 */
export class CjsFsd64SchemaCorporationRoleGroups extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "corporationRoleGroups",
        "schemaVersion": 1,
        "path": "res:/staticdata/corporationrolegroups.fsdbinary",
        "schemaID": "88a96e3e9f22800c4f0c9f3f33c9dc9a",
        "container": {
            "type": "MAP",
            "recordSize": 48,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "appliesTo",
                    "type": "STRING",
                    "offset": 8,
                    "sourceName": "appliesTo"
                },
                {
                    "name": "appliesToGrantable",
                    "type": "STRING",
                    "offset": 16,
                    "sourceName": "appliesToGrantable"
                },
                {
                    "name": "roleGroupName",
                    "type": "STRING",
                    "offset": 24,
                    "sourceName": "roleGroupName"
                },
                {
                    "name": "roleMask",
                    "type": "UINT_64_IDENTIFIER",
                    "offset": 32,
                    "sourceName": "roleMask"
                },
                {
                    "name": "roleGroupNameID",
                    "type": "UINT_32",
                    "offset": 40,
                    "sourceName": "roleGroupNameID"
                },
                {
                    "name": "isDivisional",
                    "type": "BOOLEAN",
                    "offset": 44,
                    "bit": 0,
                    "sourceName": "isDivisional"
                },
                {
                    "name": "isLocational",
                    "type": "BOOLEAN",
                    "offset": 45,
                    "bit": 0,
                    "sourceName": "isLocational"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaCorporationRoleGroups();
