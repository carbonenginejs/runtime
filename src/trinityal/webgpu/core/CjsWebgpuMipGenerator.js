// Not Carbon: WebGPU has no mip generator. Carbon's backends call the API's
// own - D3D11 GenerateMips, Metal's blit encoder `generateMipmaps`
// (Tr2TextureALMetal.mm:795-805, MetalWorkQueue GenerateMipMaps) - and this is
// what the WebGPU AL does in their place: each level rendered from the one
// above with a linear sampler, which is the 2x2 box those filters apply.

const SHADER = /* wgsl */ `
struct Varyings
{
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs(@builtin(vertex_index) index: u32) -> Varyings
{
    // One triangle covering the target.
    let corner = vec2<f32>(f32((index << 1u) & 2u), f32(index & 2u));
    var out: Varyings;
    out.position = vec4<f32>(corner * 2.0 - 1.0, 0.0, 1.0);
    out.uv = vec2<f32>(corner.x, 1.0 - corner.y);
    return out;
}

@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;

@fragment
fn fs(in: Varyings) -> @location(0) vec4<f32>
{
    return textureSampleLevel(source, linearSampler, in.uv, 0.0);
}
`;

/** Renders a texture's mip chain on a command encoder, one level from the one above. */
export class CjsWebgpuMipGenerator
{
  _device;

  _module = null;

  _sampler = null;

  /** Pipelines by render format. */
  _pipelines = new Map();

  /**
   * @param {GPUDevice} device The device the textures belong to.
   */
  constructor(device)
  {
    this._device = device;
  }

  /**
   * Encodes every level below the top for every layer.
   *
   * @param {GPUCommandEncoder} commandEncoder Encoder outside any pass.
   * @param {GPUTexture} texture A 2D, array or cube texture with RENDER_ATTACHMENT and TEXTURE_BINDING usage.
   * @returns {void}
   */
  Encode(commandEncoder, texture)
  {
    const pipeline = this._Pipeline(texture.format);
    const layers = texture.depthOrArrayLayers;

    for (let layer = 0; layer < layers; layer += 1)
    {
      for (let mip = 1; mip < texture.mipLevelCount; mip += 1)
      {
        const view = (level) => texture.createView({
          dimension: "2d",
          baseMipLevel: level,
          mipLevelCount: 1,
          baseArrayLayer: layer,
          arrayLayerCount: 1
        });
        const bindGroup = this._device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: view(mip - 1) },
            { binding: 1, resource: this._sampler }
          ]
        });
        const pass = commandEncoder.beginRenderPass({
          label: `Tr2TextureAL mip ${mip} layer ${layer}`,
          colorAttachments: [ { view: view(mip), loadOp: "clear", storeOp: "store", clearValue: [ 0, 0, 0, 0 ] } ]
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
      }
    }
  }

  /** The downsample pipeline for one render format, made on first use. */
  _Pipeline(format)
  {
    let pipeline = this._pipelines.get(format);

    if (pipeline) return pipeline;

    this._module ??= this._device.createShaderModule({ label: "Tr2TextureAL mip generator", code: SHADER });
    this._sampler ??= this._device.createSampler({ label: "Tr2TextureAL mip generator", minFilter: "linear", magFilter: "linear" });

    pipeline = this._device.createRenderPipeline({
      label: `Tr2TextureAL mip generator ${format}`,
      layout: "auto",
      vertex: { module: this._module, entryPoint: "vs" },
      fragment: { module: this._module, entryPoint: "fs", targets: [ { format } ] },
      primitive: { topology: "triangle-list" }
    });
    this._pipelines.set(format, pipeline);
    return pipeline;
  }
}
