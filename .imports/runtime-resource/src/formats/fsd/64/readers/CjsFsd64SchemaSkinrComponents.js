import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `ship_skin_design_components.fsdbinary` bytes.
 *
 * The SKINR design components - the materials, patterns and finishes a design
 * is assembled from - with the resource and icon each one paints with.
 *
 * This record refined the field-order rule the other datasets follow. Its
 * fields are not alphabetical by offset outright: they are grouped by storage
 * class first - the eight pointer fields, then the five four-byte scalars, then
 * the embedded object and the boolean - and alphabetical *within* each group.
 * Reading it as one alphabetical run puts every scalar in the wrong place.
 *
 * `projectionTypeU` and `projectionTypeV` are stored as `Clamp`, `Repeat`
 * and `Border`, and **the stored value is wrong**: `Clamp` means
 * `clamp-to-border` and `Border` means `clamp-to-edge`. The published export
 * and the API carry the corrected values, so they are authoritative and this
 * container is not. This reader returns what the file says, unaltered, because
 * that is its job; correcting it belongs to whatever builds an export.
 *
 * Applying the correction in the intuitive direction mismatches 514 of the 544
 * records, which is how it was caught before it was explained.
 *
 * Solved against CCP's published export at build 3466501: all 544 records and
 * every one of their 928 associated-type entries.
 */
export class CjsFsd64SchemaSkinrComponents extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "skinrComponents",
        "schemaVersion": 1,
        "path": "res:/staticdata/ship_skin_design_components.fsdbinary",
        "schemaID": "7d1bb9431be0bae657e4764fa25dd0ef",
        "container": {
            "type": "MAP",
            "recordSize": 112,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 104,
                "allowedMask": 5
            },
            "fields": [
                {
                    "name": "associatedTypeIds",
                    "type": "LIST",
                    "offset": 8,
                    "itemSize": 8,
                    "item": {
                        "type": "OBJECT",
                        "fields": [
                            {
                                "name": "licenseUsesGranted",
                                "type": "INT_32",
                                "offset": 0,
                                "sourceName": "license_uses_granted"
                            },
                            {
                                "name": "typeID",
                                "type": "UINT_32_IDENTIFIER",
                                "offset": 4,
                                "sourceName": "type_id"
                            }
                        ]
                    },
                    "sourceName": "associated_type_ids"
                },
                {
                    "name": "disallowedSlots",
                    "type": "LIST",
                    "offset": 16,
                    "itemSize": 4,
                    "item": {
                        "type": "UINT_32_IDENTIFIER",
                        "offset": 0
                    },
                    "sourceName": "disallowed_slots"
                },
                {
                    "name": "finish",
                    "type": "STRING",
                    "offset": 24,
                    "sourceName": "finish"
                },
                {
                    "name": "iconFile",
                    "type": "STRING",
                    "offset": 32,
                    "sourceName": "icon_file"
                },
                {
                    "name": "internalName",
                    "type": "STRING",
                    "offset": 40,
                    "sourceName": "internal_name"
                },
                {
                    "name": "projectionTypeU",
                    "type": "STRING",
                    "offset": 48,
                    "sourceName": "projection_type_u"
                },
                {
                    "name": "projectionTypeV",
                    "type": "STRING",
                    "offset": 56,
                    "sourceName": "projection_type_v"
                },
                {
                    "name": "resourceFile",
                    "type": "STRING",
                    "offset": 64,
                    "sourceName": "resource_file"
                },
                {
                    "name": "category",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 72,
                    "sourceName": "category"
                },
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 76,
                    "sourceName": "description",
                    "renamed": true
                },
                {
                    "name": "nameID",
                    "type": "UINT_32",
                    "offset": 80,
                    "sourceName": "name",
                    "renamed": true
                },
                {
                    "name": "originEvent",
                    "type": "UINT_32",
                    "offset": 84,
                    "sourceName": "origin_event"
                },
                {
                    "name": "rarity",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 88,
                    "sourceName": "rarity"
                },
                {
                    "name": "sequenceBinder",
                    "type": "OBJECT",
                    "offset": 92,
                    "fields": [
                        {
                            "name": "count",
                            "type": "UINT_32",
                            "offset": 0,
                            "sourceName": "count"
                        },
                        {
                            "name": "itemTypeID",
                            "type": "UINT_32_IDENTIFIER",
                            "offset": 4,
                            "sourceName": "item_type_id"
                        }
                    ],
                    "sourceName": "sequence_binder"
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 100,
                    "bit": 0,
                    "sourceName": "published"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaSkinrComponents();
