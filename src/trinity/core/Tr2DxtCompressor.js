// Source: trinity/trinity/Tr2DxtCompressor.h:76-98; cpp:832-1066.
// Operator-approved facade: Carbon declares these as free functions; the
// shared implementation lives in the DDS format so other runtimes can use it.
import { CjsSchema, meta } from "#schema";
import { Tr2DxtCompressionFormat, Tr2DxtCompressionSquishQuality, COMPRESS_SQUISH_QUALITY_DEFAULT } from "#consts/trinity";
import { GetBlockByteSize } from "#consts/render-context";
import { CjsDdsFormat } from "#resource/formats/dds";

/** Thin namespace facade preserving Carbon's exported function and enum names. */
export class Tr2DxtCompressor
{
    /** Original header enum, shared with the DDS implementation. */
    static Tr2DxtCompressionFormat = Tr2DxtCompressionFormat;
    /** Original header enum, shared with the DDS implementation. */
    static Tr2DxtCompressionSquishQuality = Tr2DxtCompressionSquishQuality;
    /** Original default quality sentinel. */
    static COMPRESS_SQUISH_QUALITY_DEFAULT = COMPRESS_SQUISH_QUALITY_DEFAULT;

    /**
     * Carbon surface call. JavaScript cannot observe a changing volatile bool
     * during synchronous execution; pre-cancellation is honored and the async
     * call uses worker termination. Private output prevents partial publication.
     * Carbon's realtime encoder is id Software LGPL code; all native RT modes
     * therefore call the MIT libsquish port, with the required channel transforms.
     * Original exported function spelling is retained on the approved facade.
     */
    static Tr2DxtCompressSurface(format, input, width, height, output, outputPitch, cancel = false, quality = 2)
    {
        if (cancel) return false;
        try
        {
            const temporary = new Uint8Array(output.length); // alloc: transactional output, never published on failure
            CjsDdsFormat.compressSurface(input, width, height, format, temporary, { outputPitch, quality });
            copySurface(temporary, output, width, height, format, outputPitch);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /**
     * Browser worker adaptation of cpp:1009-1066, returning Promise<boolean>.
     * Approved bug fix: pre-execution cancellation returns false, never an
     * uninitialized success value. All failure paths keep output unchanged.
     * Carbon's id Software LGPL realtime encoder is replaced by MIT libsquish.
     * Worker construction options are the existing resource-loader injection.
     */
    static async Tr2DxtCompressSurfaceAsync(format, input, width, height, output, outputPitch, control, quality = -1, options = {})
    {
        if (control._abortController) throw new Error("Compression control already owns an active task");
        let succeeded = false;
        try
        {
            if (control.IsCanceling()) return false;
            control._isDone = false;
            control._abortController = new AbortController();
            const result = await CjsDdsFormat.compressSurfaceAsync(input, width, height, format,
                { ...options, outputPitch, quality, signal: control._abortController.signal });
            if (control.IsCanceling()) return false;
            copySurface(result.data, output, width, height, format, outputPitch);
            succeeded = true;
        }
        catch
        {
            succeeded = false;
        }
        finally
        {
            control._abortController = null;
            control.Done();
        }
        return succeeded;
    }
}

/** Copy only encoded rows, leaving caller pitch padding unchanged. */
function copySurface(source, destination, width, height, format, pitch)
{
    const rowBytes = Math.ceil(width / 4) * GetBlockByteSize(CjsDdsFormat.compressionPixelFormat(format));
    const rows = Math.ceil(height / 4), end = (rows - 1) * pitch + rowBytes;
    if (!Number.isSafeInteger(pitch) || pitch < rowBytes || end > source.length || end > destination.length)
        throw new RangeError("Compressed output exceeds its destination");
    for (let row = 0; row < rows; row++) destination.set(source.subarray(row * pitch, row * pitch + rowBytes), row * pitch);
}

CjsSchema.define(Tr2DxtCompressor, {
    className: "Tr2DxtCompressor",
    methods: { Tr2DxtCompressSurface: [meta.adapted], Tr2DxtCompressSurfaceAsync: [meta.adapted] }
});

/** Original Carbon free-function door, forwarded to the approved facade. */
export const Tr2DxtCompressSurface = Tr2DxtCompressor.Tr2DxtCompressSurface;
/** Original Carbon asynchronous free-function door. */
export const Tr2DxtCompressSurfaceAsync = Tr2DxtCompressor.Tr2DxtCompressSurfaceAsync;

export { Tr2DxtCompressionFormat, Tr2DxtCompressionSquishQuality, COMPRESS_SQUISH_QUALITY_DEFAULT } from "#consts/trinity";
