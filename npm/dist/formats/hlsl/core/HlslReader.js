import { CjsByteReader } from '../../../format/CjsByteReader.js';
import { HlslEffectReadError } from './HlslEffectReadError.js';

/**
 * Little-endian binary reader for Carbon/Trinity compiled effect data.
 *
 * The implementation is `CjsByteReader` in `src/format/`; this subclass only
 * supplies the error class and message this format reports.
 */
class HlslReader extends CjsByteReader {
  static ReadError = HlslEffectReadError;
  static endOfDataMessage = "Unexpected end of effect data";
}

export { HlslReader };
//# sourceMappingURL=HlslReader.js.map
