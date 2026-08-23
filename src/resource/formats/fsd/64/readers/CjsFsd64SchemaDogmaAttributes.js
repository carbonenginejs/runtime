import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `dogmaattributes.fsdbinary` bytes.
 *
 * Decodes attribute definitions. `name` and `description` are inline text
 * because they are internal, but `displayNameID`, `tooltipTitleID` and
 * `tooltipDescriptionID` are label identifiers: resolve them through
 * `CjsFsdLocalization`. CCP's export publishes the resolved text under
 * `displayName`, `tooltipTitle` and `tooltipDescription`, and renames
 * `categoryID` to `attributeCategoryID`; this reader keeps the client's names.
 *
 * `attributeID` repeats the record key, which the client stores rather than
 * derives. It is guarded by a presence bit that is set on every record.
 *
 * Field names and order were read from `dogmaAttributesLoader.pyd`; offsets and
 * presence masks were solved against CCP's published export at build 3466501,
 * unanimously over all 2,866 records.
 */
export class CjsFsd64SchemaDogmaAttributes extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "dogmaAttributes",
        "schemaVersion": 1,
        "path": "res:/staticdata/dogmaattributes.fsdbinary",
        "schemaID": "dd6befd76ceb8a44f54c7c5e2f69a988",
        "container": {
            "type": "MAP",
            "recordSize": 80,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 76,
                "allowedMask": 2047
            },
            "fields": [
                {
                    "name": "description",
                    "type": "STRING",
                    "offset": 8,
                    "presenceMask": 4
                },
                {
                    "name": "name",
                    "type": "STRING",
                    "offset": 16
                },
                {
                    "name": "attributeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 24,
                    "presenceMask": 16
                },
                {
                    "name": "categoryID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 28,
                    "presenceMask": 1
                },
                {
                    "name": "chargeRechargeTimeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 32,
                    "presenceMask": 2
                },
                {
                    "name": "dataType",
                    "type": "UINT_32",
                    "offset": 36
                },
                {
                    "name": "defaultValue",
                    "type": "FLOAT_32",
                    "offset": 40
                },
                {
                    "name": "displayNameID",
                    "type": "UINT_32",
                    "offset": 44,
                    "presenceMask": 8
                },
                {
                    "name": "iconID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 48,
                    "presenceMask": 32
                },
                {
                    "name": "maxAttributeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 52,
                    "presenceMask": 64
                },
                {
                    "name": "minAttributeID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 56,
                    "presenceMask": 128
                },
                {
                    "name": "tooltipDescriptionID",
                    "type": "UINT_32",
                    "offset": 60,
                    "presenceMask": 256
                },
                {
                    "name": "tooltipTitleID",
                    "type": "UINT_32",
                    "offset": 64,
                    "presenceMask": 512
                },
                {
                    "name": "unitID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 68,
                    "presenceMask": 1024
                },
                {
                    "name": "displayWhenZero",
                    "type": "BOOLEAN",
                    "offset": 72,
                    "bit": 0
                },
                {
                    "name": "highIsGood",
                    "type": "BOOLEAN",
                    "offset": 73,
                    "bit": 0
                },
                {
                    "name": "published",
                    "type": "BOOLEAN",
                    "offset": 74,
                    "bit": 0
                },
                {
                    "name": "stackable",
                    "type": "BOOLEAN",
                    "offset": 75,
                    "bit": 0
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaDogmaAttributes();
