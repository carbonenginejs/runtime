import { CjsByteReader } from '../../../../format/CjsByteReader.js';
import { WebgpuReadError } from '../errors.js';
export { asUint8Array } from '@carbonenginejs/runtime-utils/bytes';

/**
 * Little-endian binary reader for the CEWGPU package container.
 *
 * The implementation is `CjsByteReader` in `src/format/`; this subclass only
 * supplies the error class and message this format reports. The CEWGPU
 * container has no string table, so only the raw-byte and `uint32` reads are
 * exercised — but they are now the shared ones rather than a third copy.
 */
class WebgpuReader extends CjsByteReader {
  static ReadError = WebgpuReadError;
  static endOfDataMessage = "Unexpected end of CEWGPU package data";
}

export { WebgpuReader };
//# sourceMappingURL=binary.js.map
