import { CjsSchema } from "#schema/CjsSchema";

import { CjsByteReader } from "../../../format/CjsByteReader.js";
import { DxbcReadError } from "./DxbcReadError.js";

/**
 * Little-endian binary reader for DirectX shader bytecode.
 *
 * The implementation is `CjsByteReader` in `src/resource/format/`; this
 * subclass only supplies the error class and message this format reports.
 */
export class DxbcReader extends CjsByteReader
{
    static ReadError = DxbcReadError;

    static endOfDataMessage = "Unexpected end of effect data";
}

export default DxbcReader;

CjsSchema.meta.define(DxbcReader, { className: "DxbcReader" });
