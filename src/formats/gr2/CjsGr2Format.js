/**
 * Exposed CarbonEngineJS-facing GR2/GSF format class.
 *
 * Runtime adaptation of the migrated `format-gr2` reader: the copied engine
 * under core/ keeps its donor behavior (including the legacy `CjsFormatGr2`
 * name), while this class adds the runtime-resource format-contract statics
 * ResMan uses for byte probing and async reads.
 */

import { CjsFormatGr2 } from "./core/CjsFormatGr2.js";
import { GR2_MAGICS, bytesToHex } from "./core/reader.js";

/**
 * CarbonEngineJS-facing GR2 (Granny 3D) and GSF (Granny State) reader.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary. It
 * reads `.gr2` geometry/skeleton/animation graphs and `.gsf` state profiles,
 * emitting GR2 JSON, hydrated caller classes, or CMF-shaped output.
 */
export class CjsGr2Format extends CjsFormatGr2
{
    /**
     * Cheap magic probe for GR2/GSF byte streams.
     *
     * @param {Uint8Array} bytes Candidate source bytes.
     * @returns {boolean} True when the 16-byte Granny magic is recognized.
     */
    static isSupported(bytes)
    {
        if (!bytes || bytes.length < 16) return false;
        return bytesToHex(bytes.subarray(0, 16)) in GR2_MAGICS;
    }

    /**
     * Async read entrypoint for the resource-manager contract.
     *
     * @param {Uint8Array} bytes Source bytes.
     * @param {object} [options] Read options (emit, classes, conversions).
     * @returns {Promise<object>} The emitted GR2/GSF result.
     */
    static async readAsync(bytes, options = {})
    {
        return CjsGr2Format.read(bytes, options);
    }
}

export default CjsGr2Format;
