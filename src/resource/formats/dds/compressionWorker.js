// Source: Tr2DxtCompressor.cpp:981-1066, browser worker adaptation.
// One complete encoding job uses the existing ResMan message envelope. Its
// owner terminates this dedicated worker to interrupt a synchronous block loop.
import { Message } from "#blue/worker/protocol";
import { compressBitmap, compressSurface, compressionPixelFormat } from "./core/dxtCompression.js";
import { PixelFormat as P } from "#consts/render-context";

/** Execute one clone-safe compression request without touching a live resource. */
export function executeCompression(payload)
{
    const started = performance.now();
    let result;
    if (payload.kind === "bitmap") result = compressBitmap(payload.packet, payload.format, payload.options);
    else if (payload.kind === "surface")
    {
        const format = compressionPixelFormat(payload.format);
        const blockBytes = format === P.PIXEL_FORMAT_BC1_UNORM || format === P.PIXEL_FORMAT_BC4_UNORM ? 8 : 16;
        const pitch = payload.options.outputPitch ?? Math.ceil(payload.width / 4) * blockBytes;
        if (!Number.isSafeInteger(pitch) || pitch < 1 || !Number.isSafeInteger(payload.height) || payload.height < 1)
            throw new RangeError("Invalid compression output dimensions");
        const data = new Uint8Array(pitch * Math.ceil(payload.height / 4)); // alloc: variable-sized owned worker result
        compressSurface(payload.input, payload.width, payload.height, payload.format, data, payload.options);
        result = { data };
    }
    else throw new TypeError("Unknown DDS compression operation");
    return { ...result, encodeTimeMs: performance.now() - started };
}

/** Install the existing worker protocol for this DDS-owned encoding operation. */
export function installCompressionWorker(scope)
{
    const onMessage = event =>
    {
        const message = event.data;
        if (message.type !== Message.EXECUTE) return;
        try
        {
            if (message.operation !== "dds.compress") throw new Error("Unknown DDS worker operation");
            const result = executeCompression(message.payload);
            scope.postMessage({ type: Message.RESULT, id: message.id, ok: true, result }, [result.data.buffer]);
        }
        catch (error)
        {
            scope.postMessage({ type: Message.RESULT, id: message.id, ok: false,
                error: { name: error.name, message: error.message, stack: error.stack } });
        }
    };
    scope.addEventListener("message", onMessage);
    return () => scope.removeEventListener("message", onMessage);
}

if (typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope)
    installCompressionWorker(globalThis);
