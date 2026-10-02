import { CjsSchema, meta } from "#schema";

// Ours: browsers do not expose VpxDecoder's CPU BGRA frame. Reduce the already
// uploaded rgba8unorm image, then asynchronously map sixteen bytes. The unorm
// view deliberately preserves Carbon's encoded-channel (not linear-light) mean.
const pipelines = new WeakMap();
const partialShader = `
@group(0) @binding(0) var image: texture_2d<f32>;
@group(0) @binding(1) var<storage,read_write> result: array<vec4f>;
var<workgroup> sums: array<vec4f,256>;
@compute @workgroup_size(256) fn main(@builtin(local_invocation_index) id:u32, @builtin(workgroup_id) group:vec3u) {
  let size=textureDimensions(image); let count=size.x*size.y; var sum=vec4f(0.0);
  for(var i=group.x*256u+id;i<count;i+=16384u) {
    sum+=textureLoad(image,vec2i(i32(i%size.x),i32(i/size.x)),0);
  }
  sums[id]=sum; workgroupBarrier();
  for(var step=128u;step>0u;step/=2u) {
    if(id<step) { sums[id]+=sums[id+step]; } workgroupBarrier();
  }
  if(id==0u) { result[group.x]=sums[0]/f32(count); }
}`;
const finishShader = `
@group(0) @binding(0) var<storage,read> partial:array<vec4f>;
@group(0) @binding(1) var<storage,read_write> result:array<vec4f>;
@compute @workgroup_size(1) fn main() {
  var sum=vec4f(0.0);
  for(var i=0u;i<64u;i++) { sum+=partial[i]; }
  result[0]=sum;
}`;

/** Bounded asynchronous encoded-channel averaging of one persistent video texture. */
export class CjsWebgpuVideoColorSampler
{
  _pending = false;

  _destroyed = false;

  /** Allocate reusable reductions and bind groups once for this texture's lifetime. */
  constructor(device, texture)
  {
    this._device = device;
    let pipeline = pipelines.get(device);
    if (!pipeline)
    {
      pipeline = [partialShader, finishShader].map(code => device.createComputePipeline({
        layout: "auto", compute: { module: device.createShaderModule({ code }), entryPoint: "main" }
      }));
      pipelines.set(device, pipeline);
    }
    this._pipeline = pipeline;
    this._partial = device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE });
    this._result = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    this._staging = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    this._bindings = [
      device.createBindGroup({ layout: pipeline[0].getBindGroupLayout(0), entries: [
        { binding: 0, resource: texture.createView({ format: "rgba8unorm" }) },
        { binding: 1, resource: { buffer: this._partial } }
      ] }),
      device.createBindGroup({ layout: pipeline[1].getBindGroupLayout(0), entries: [
        { binding: 0, resource: { buffer: this._partial } },
        { binding: 1, resource: { buffer: this._result } }
      ] })
    ];
  }

  /** Return one pending readback, or null when busy/disposed; never queue samples. */
  Request()
  {
    if (this._pending || this._destroyed) return null;
    this._pending = true;
    try
    {
      const encoder = this._device.createCommandEncoder(), pass = encoder.beginComputePass();
      pass.setPipeline(this._pipeline[0]);
      pass.setBindGroup(0, this._bindings[0]);
      pass.dispatchWorkgroups(64);
      pass.setPipeline(this._pipeline[1]);
      pass.setBindGroup(0, this._bindings[1]);
      pass.dispatchWorkgroups(1);
      pass.end();
      encoder.copyBufferToBuffer(this._result, 0, this._staging, 0, 16);
      this._device.queue.submit([encoder.finish()]);
      return this._Read();
    }
    catch (error) { this._pending = false; throw error; }
  }

  /** Copy only the four completed channel means; destruction invalidates a pending map. */
  async _Read()
  {
    try
    {
      await this._staging.mapAsync(GPUMapMode.READ);
      if (this._destroyed) return null;
      const color = new Float32Array(this._staging.getMappedRange()).slice(); // alloc: mapped view plus owned 16-byte result surviving unmap.
      this._staging.unmap();
      return color;
    }
    finally { this._pending = false; }
  }

  /** Cancel mapping and release the three owned buffers with their texture. */
  Destroy()
  {
    this._destroyed = true;
    this._partial.destroy();
    this._result.destroy();
    this._staging.destroy();
    this._bindings = null;
  }
}

CjsSchema.define(CjsWebgpuVideoColorSampler, { className: "CjsWebgpuVideoColorSampler", methods: {
  Request: [meta.ours], Destroy: [meta.ours], _Read: [meta.ours]
} });
