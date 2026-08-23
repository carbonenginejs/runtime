import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied `stationservices.fsdbinary` bytes.
 *
 * `descriptionID`, `serviceNameID` are localisation label identifiers; resolve
 * them through `CjsFsdLocalization`.
 *
 * The record holds nothing but its two labels, so a caller that does not
 * resolve localisation gets identifiers and nothing else.
 */
export class CjsFsd64SchemaStationServices extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "stationServices",
        "schemaVersion": 1,
        "path": "res:/staticdata/stationservices.fsdbinary",
        "schemaID": "883e4ac257a8407999d885bd984b30b1",
        "container": {
            "type": "MAP",
            "recordSize": 16,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "presence": {
                "type": "UINT_32",
                "offset": 12,
                "allowedMask": 1
            },
            "fields": [
                {
                    "name": "descriptionID",
                    "type": "UINT_32",
                    "offset": 4,
                    "sourceName": "descriptionID",
                    "presenceMask": 1
                },
                {
                    "name": "serviceNameID",
                    "type": "UINT_32",
                    "offset": 8,
                    "sourceName": "serviceNameID"
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaStationServices();
