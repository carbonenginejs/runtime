import { CjsFsd64SchemaDecoder } from "../core/CjsFsd64SchemaDecoder.js";
import { CjsFsd64SchemaReader } from "../core/CjsFsd64SchemaReader.js";


/**
 * Reads caller-supplied graphic identifier bytes.
 *
 * The container stores an absent optional value as an empty string or a zero
 * identifier rather than clearing a presence bit, so this reader returns those
 * empties verbatim. A consumer matching the official export's shape drops them;
 * the file itself does not distinguish "absent" from "empty".
 *
 * The record carries further fields this schema does not claim, including the
 * colour vectors and the animation and explosion identifiers. They are absent
 * from the official export, so nothing independent proves their offsets yet.
 */
export class CjsFsd64SchemaGraphicIds extends CjsFsd64SchemaReader
{
    static getFsdSchema = CjsFsd64SchemaReader.bindFsdSchema(CjsFsd64SchemaDecoder.defineSchema({
        "schema": "carbonenginejs.fsdBinarySchema",
        "name": "graphicIDs",
        "schemaVersion": 1,
        "path": "res:/staticdata/graphicids.fsdbinary",
        "schemaID": "64e409a5a9c5dafb6437287eeff318e5",
        "container": {
            "type": "MAP",
            "recordSize": 160,
            "key": {
                "type": "UINT_32_IDENTIFIER",
                "offset": 0
            },
            "fields": [
                {
                    "name": "graphicFile",
                    "type": "STRING",
                    "offset": 40
                },
                {
                    "name": "iconFolder",
                    "type": "STRING",
                    "offset": 48
                },
                {
                    "name": "sofFactionName",
                    "type": "STRING",
                    "offset": 64
                },
                {
                    "name": "sofHullName",
                    "type": "STRING",
                    "offset": 72
                },
                {
                    "name": "sofLayout",
                    "type": "LIST",
                    "offset": 80,
                    "itemSize": 8,
                    "maximumCount": 256,
                    "item": {
                        "type": "STRING",
                        "offset": 0
                    }
                },
                {
                    "name": "sofRaceName",
                    "type": "STRING",
                    "offset": 88
                },
                {
                    "name": "sofMaterialSetID",
                    "type": "UINT_32_IDENTIFIER",
                    "offset": 152
                }
            ]
        }
    }));

}

export default new CjsFsd64SchemaGraphicIds();
