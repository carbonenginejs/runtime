import { CjsPngFormat } from "../../../../npm/dist/resource/formats/png/CjsPngFormat.js";

/** Converts padded WebGPU RGBA/BGRA rows to tightly packed top-down RGBA. */
export function packViewportPixels(bytes, width, height, bytesPerRow, format)
{
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0 ||
    !Number.isSafeInteger(bytesPerRow) || bytesPerRow < width * 4 || bytes.length < bytesPerRow * height)
    throw new RangeError("Invalid viewport readback dimensions or row data");
  if (!["rgba8unorm","bgra8unorm","rgba8unorm-srgb","bgra8unorm-srgb"].includes(format))
    throw new RangeError(`Unsupported viewport format ${format}`);
  const pixels = new Uint8Array(width * height * 4), bgra = format.startsWith("bgra");
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
  {
    const source = y * bytesPerRow + x * 4, target = (y * width + x) * 4;
    pixels[target] = bytes[source + (bgra ? 2 : 0)];
    pixels[target + 1] = bytes[source + 1];
    pixels[target + 2] = bytes[source + (bgra ? 0 : 2)];
    pixels[target + 3] = bytes[source + 3];
  }
  return pixels;
}

/** Encodes a viewport PNG using the runtime's existing PNG writer. */
export function encodeViewportPng(bytes, width, height, bytesPerRow, format)
{
  return CjsPngFormat.writeAsync({ width, height, data: packViewportPixels(bytes, width, height, bytesPerRow, format), origin: "top-left" });
}

/** Saves viewport-only PNG bytes through the browser's download link mechanism. */
export function downloadViewportPng(bytes)
{
  const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  const link = document.createElement("a");
  link.href = url; link.download = `carbon-viewport-${new Date().toISOString().replace(/[:.]/gu,"-")}.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One requested capture of the next completed frame; never acquires a swap-chain texture. */
export function createViewportCapture({ device, download = downloadViewportPng })
{
  let pending = null, disposed = false;
  function fail(error)
  {
    const job = pending;
    if (!job) return;
    pending = null; job.cancelled = true;
    if (job.buffer) { job.buffer.destroy(); job.buffer = null; }
    job.reject(error);
  }
  return {
    request()
    {
      if (disposed) return Promise.reject(new Error("Viewport capture is disposed"));
      if (pending) return pending.promise;
      const job = { copied: false, cancelled: false, buffer: null };
      job.promise = new Promise((resolve,reject) => { job.resolve=resolve;job.reject=reject; });
      pending=job; return job.promise;
    },
    afterFrame(texture, width, height, format)
    {
      const job=pending;
      if (!job || job.copied) return;
      job.copied=true;
      try
      {
        if (!texture || !Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0)
          throw new RangeError("No valid rendered viewport to capture");
        const bytesPerRow=Math.ceil(width*4/256)*256, size=bytesPerRow*height;
        if (!Number.isSafeInteger(size) || size > device.limits.maxBufferSize) throw new RangeError("Viewport exceeds readback buffer limit");
        const buffer=device.createBuffer({label:"Viewport PNG readback",size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
        job.buffer=buffer;
        const encoder=device.createCommandEncoder();
        encoder.copyTextureToBuffer({texture},{buffer,bytesPerRow},{width,height});
        // Called immediately after EndScene: submit before yielding so this is
        // the rendered texture, not a newly acquired or expired canvas image.
        device.queue.submit([encoder.finish()]);
        (async () => {
          try
          {
            await buffer.mapAsync(GPUMapMode.READ);
            if (job.cancelled) return;
            const png=await encodeViewportPng(new Uint8Array(buffer.getMappedRange()),width,height,bytesPerRow,format);
            if (job.cancelled) return;
            download(png);job.resolve({width,height,bytes:png.length});
          }
          catch(error) { job.reject(error); }
          finally
          {
            if(job.buffer){job.buffer.destroy();job.buffer=null;}
            if(pending===job)pending=null;
          }
        })();
      }
      catch(error) { fail(error); }
    },
    fail,
    dispose() { disposed=true;fail(new Error("Viewport capture cancelled")); }
  };
}
