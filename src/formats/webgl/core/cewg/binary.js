import { CjsByteReader } from "../../../../format/CjsByteReader.js";
import { WebglReadError } from "../errors.js";

export { asUint8Array } from "@carbonenginejs/runtime-utils/bytes";

/**
 * Little-endian binary reader for the CEWG package container.
 *
 * The implementation is `CjsByteReader` in `src/format/`; this subclass only
 * supplies the error class and message this format reports. The CEWG container
 * has no string table, so only the raw-byte and `uint32` reads are exercised —
 * but they are now the shared ones rather than a third copy.
 */
export class WebglReader extends CjsByteReader
{
    static ReadError = WebglReadError;

    static endOfDataMessage = "Unexpected end of CEWG package data";
}

export default WebglReader;
