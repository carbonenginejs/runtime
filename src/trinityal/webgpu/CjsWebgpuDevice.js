const DEVICE_BUFFERS = new WeakMap();
import { CjsSchema, meta } from "#schema";

function fail(message)
{
  throw new Error(`CjsWebgpuDevice: ${message}`);
}

function alignedBufferSize(byteLength)
{
  return Math.ceil(byteLength / 4) * 4;
}

/**
 * Engine-owned WebGPU device boundary: the `GPUDevice`, its lifetime and loss,
 * and the device buffers the abstraction layer creates. Rendering goes through
 * CjsWebgpuRenderContextAL.
 */
export class CjsWebgpuDevice
{

  /**
   * The GPU provider (`navigator.gpu` or an injected one), kept for
   * Recreate. Set by the constructor.
   * @type {GPU|null}
   */
  _gpu = null;

  /**
   * The adapter the device came from, when known. Set by the constructor.
   * @type {GPUAdapter|null}
   */
  _adapter = null;

  /**
   * The native device; null once destroyed. Set by the constructor.
   * @type {GPUDevice|null}
   */
  _device = null;

  /**
   * The adapter request options, reused by Recreate. Set by the constructor.
   * @type {object|null}
   */
  _adapterOptions = null;

  /**
   * The device descriptor, reused by Recreate. Set by the constructor.
   * @type {object|null}
   */
  _deviceDescriptor = null;

  /**
   * The `GPUBufferUsage` table. Set by the constructor.
   * @type {object|null}
   */
  _bufferUsage = null;

  /**
   * The `GPUTextureUsage` table. Set by the constructor.
   * @type {object|null}
   */
  _textureUsage = null;

  /**
   * Device generation; advances on every recreate and on destruct.
   * @type {number}
   */
  _generation = 1;

  /**
   * Lifecycle state: "ready", "lost" or "destroyed".
   * @type {string}
   */
  _state = "ready";

  /**
   * The accepted device-loss record, if any.
   * @type {GPUDeviceLostInfo|null}
   */
  _lostInfo = null;

  /**
   * Serial of the latest Recreate request; supersedes older ones.
   * @type {number}
   */
  _recreateSerial = 0;

  /**
   * Advances on destruct so an in-flight Recreate is rejected.
   * @type {number}
   */
  _lifecycleVersion = 0;

  /**
   * Requests or accepts a WebGPU adapter and device, then returns a ready
   * engine boundary.
   */
  static async Request(options = {})
  {
    const gpu = Object.prototype.hasOwnProperty.call(options, "gpu")
      ? options.gpu
      : globalThis.navigator?.gpu;
    let adapter = options.adapter ?? null;
    let device = options.device ?? null;

    if (!device)
    {
      if (!adapter)
      {
        if (!gpu || typeof gpu.requestAdapter !== "function") fail("WebGPU is unavailable");
        adapter = await gpu.requestAdapter(options.adapterOptions);
        if (!adapter) fail("requestAdapter returned null");
      }
      if (typeof adapter.requestDevice !== "function") fail("the GPUAdapter cannot request a device");
      device = await adapter.requestDevice(options.deviceDescriptor);
    }
    return new CjsWebgpuDevice({ ...options, gpu, adapter, device });
  }

  /**
   * Creates a ready engine boundary around an already-acquired GPU device.
   */
  constructor(options = {})
  {
    if (!options.device || typeof options.device.createShaderModule !== "function") fail("a GPUDevice is required");
    this._gpu = options.gpu || null;
    this._adapter = options.adapter || null;
    this._device = options.device;
    this._adapterOptions = options.adapterOptions;
    this._deviceDescriptor = options.deviceDescriptor;
    this._bufferUsage = options.bufferUsage || globalThis.GPUBufferUsage || null;
    this._textureUsage = options.textureUsage || globalThis.GPUTextureUsage || null;
    this._WatchDevice(this._device, this._generation);
  }

  /**
   * Returns the adapter associated with the boundary, when known.
   */
  GetAdapter()
  {
    return this._adapter;
  }

  /**
   * Returns the ready native GPU device.
   */
  GetDevice()
  {
    this._AssertReady();
    return this._device;
  }

  /**
   * The `GPUBufferUsage` table this device builds masks from.
   *
   * It is injectable (`options.bufferUsage`) so a test can drive buffer
   * creation without a real WebGPU global.
   *
   * @returns {object} The usage flags.
   */
  GetBufferUsage()
  {
    return this._bufferUsage;
  }

  /**
   * The `GPUTextureUsage` flags this device creates textures with; injectable
   * for the same reason as the buffer usage.
   *
   * @returns {object|null} The usage flags.
   */
  GetTextureUsage()
  {
    return this._textureUsage;
  }

  /**
   * Returns the generation used to reject objects from earlier device
   * lifecycles.
   */
  GetGeneration()
  {
    return this._generation;
  }

  /**
   * Returns the most recently accepted device-loss record, if any.
   */
  GetLostInfo()
  {
    return this._lostInfo;
  }

  /**
   * Reports whether the boundary is currently in the lost state.
   */
  IsLost()
  {
    return this._state === "lost";
  }

  /**
   * Reports whether the boundary currently has a usable device.
   */
  IsReady()
  {
    return this._state === "ready";
  }

  // A buffer Trinity owns and rewrites. Carbon's `Tr2BufferAL` is the caller;
  // see `CjsWebgpuBufferAL`. The handle is opaque and the `GPUBuffer` stays in
  // DEVICE_BUFFERS.

  /**
   * Creates a buffer whose contents the caller rewrites.
   *
   * @param {object} options `{ label, size, usage }` - usage is a raw
   *   `GPUBufferUsage` mask; COPY_DST is added because writes arrive through
   *   `WriteDeviceBuffer`.
   * @returns {object} An opaque handle carrying `size` and `Destroy`.
   */
  CreateDeviceBuffer({ label = "device-buffer", size, usage })
  {
    const device = this.GetDevice();

    if (!Number.isInteger(size) || size <= 0) fail("a device buffer needs a positive integer size");
    if (!Number.isInteger(usage) || usage <= 0) fail("a device buffer needs a usage mask");

    // WebGPU requires a multiple of 4, and writeBuffer requires the same of
    // every write. Rounding up here means the shadow copy and the GPU buffer
    // always agree on length.
    const aligned = alignedBufferSize(size);
    const buffer = device.createBuffer({ label, size: aligned, usage: usage | this._bufferUsage.COPY_DST });

    const handle = {
      size: aligned,
      requestedSize: size,
      Destroy: () =>
      {
        const record = DEVICE_BUFFERS.get(handle);
        if (!record) return false;
        DEVICE_BUFFERS.delete(handle);
        record.buffer.destroy();
        return true;
      }
    };

    DEVICE_BUFFERS.set(handle, { buffer, size: aligned, generation: this.GetGeneration() });

    return handle;
  }

  /**
   * Uploads bytes into a device buffer.
   *
   * @param {object} handle A `CreateDeviceBuffer` handle.
   * @param {ArrayBufferView} bytes The bytes to write.
   * @param {number} [offset] Byte offset into the buffer.
   * @returns {object} The handle.
   */
  WriteDeviceBuffer(handle, bytes, offset = 0)
  {
    const record = DEVICE_BUFFERS.get(handle);

    if (!record) fail("that is not a live device buffer");
    if (!ArrayBuffer.isView(bytes)) fail("device buffer data must be an ArrayBufferView");
    if (offset % 4 !== 0) fail("a device buffer write must start on a four-byte boundary");
    if (bytes.byteLength % 4 !== 0) fail("a device buffer write must be a whole number of four-byte words");
    if (offset + bytes.byteLength > record.size) fail("that write runs past the end of the device buffer");

    this.GetDevice().queue.writeBuffer(record.buffer, offset, bytes);

    return handle;
  }

  /**
   * The `GPUBuffer` behind a handle, for binding it to a draw.
   *
   * @param {object} handle A `CreateDeviceBuffer` handle.
   * @returns {GPUBuffer} The buffer.
   */
  GetDeviceBuffer(handle)
  {
    const record = DEVICE_BUFFERS.get(handle);

    if (!record) fail("that is not a live device buffer");

    return record.buffer;
  }

  /**
   * Submits command buffers to the ready device queue.
   */
  Submit(commandBuffers)
  {
    this.GetDevice().queue.submit(commandBuffers);
  }

  /**
   * Acquires or accepts a replacement adapter/device and advances the device
   * generation.
   */
  async Recreate(options = {})
  {
    if (this._state === "destroyed") fail("cannot recreate a destroyed device");
    const requestSerial = ++this._recreateSerial;
    const lifecycleVersion = this._lifecycleVersion;
    const previous = this._device;
    const gpu = options.gpu || this._gpu;
    if (!gpu || typeof gpu.requestAdapter !== "function") fail("recreation requires the original GPU provider");
    const adapterOptions = Object.hasOwn(options, "adapterOptions") ? options.adapterOptions : this._adapterOptions;
    const deviceDescriptor = Object.hasOwn(options, "deviceDescriptor") ? options.deviceDescriptor : this._deviceDescriptor;
    const adapter = options.adapter || await gpu.requestAdapter(adapterOptions);
    if (!adapter) fail("requestAdapter returned null during recreation");
    const device = options.device || await adapter.requestDevice(deviceDescriptor);
    if (this._state === "destroyed" || this._lifecycleVersion !== lifecycleVersion || this._recreateSerial !== requestSerial)
    {
      if (device !== previous && device !== this._device) device.destroy();
      fail("recreation was superseded by another lifecycle change");
    }
    this._gpu = gpu;
    this._adapter = adapter;
    this._device = device;
    this._adapterOptions = adapterOptions;
    this._deviceDescriptor = deviceDescriptor;
    this._generation += 1;
    this._state = "ready";
    this._lostInfo = null;
    this._WatchDevice(device, this._generation);
    if (previous && previous !== device) previous.destroy();
    return this;
  }

  /**
   * Transitions the boundary to destroyed, invalidates its generation, and
   * destroys the native device.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    if (this._state === "destroyed") return;
    const device = this._device;
    this._lifecycleVersion += 1;
    this._recreateSerial += 1;
    this._state = "destroyed";
    this._generation += 1;
    this._device = null;
    if (device) device.destroy();
  }

  /**
   * Throws unless the boundary has a ready native device.
   */
  _AssertReady()
  {
    if (this._state !== "ready" || !this._device) fail(`device is ${this._state}`);
  }

  /**
   * Tracks loss for one device generation and accepts only a still-current
   * loss event. `GPUDevice.lost` is a spec member that resolves once, with a
   * `GPUDeviceLostInfo`, and never rejects.
   *
   * Nothing is called back: the abstraction layer pulls the state through
   * IsLost, as Carbon's TriDevice pulls `GetDeviceRemovedReason()` each tick
   * (TriDevice12.cpp:290-304).
   *
   * @param {GPUDevice} device The device to watch.
   * @param {number} generation Its generation.
   * @returns {void}
   */
  _WatchDevice(device, generation)
  {
    device.lost.then(info =>
    {
      if (this._device !== device || this._generation !== generation || this._state !== "ready") return;
      this._state = "lost";
      this._lostInfo = info;
    });
  }
}


CjsSchema.meta.define(CjsWebgpuDevice, { className: "CjsWebgpuDevice" });
