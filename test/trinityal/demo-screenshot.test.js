import assert from "node:assert/strict";
import test from "node:test";
import { CjsPngFormat } from "../../npm/dist/resource/formats/png/CjsPngFormat.js";
import { packViewportPixels, encodeViewportPng, createViewportCapture } from "./webgpu/demo/screenshot.js";

test("odd-width padded BGRA PNG decodes to exact top-down RGBA including alpha",async()=>
{
  const width=3,height=2,stride=256,bytes=new Uint8Array(stride*height).fill(99);
  const rgba=new Uint8Array([10,20,30,0,40,50,60,64,70,80,90,255,100,110,120,128,130,140,150,200,160,170,180,1]);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=y*stride+x*4,b=(y*width+x)*4;bytes.set([rgba[b+2],rgba[b+1],rgba[b],rgba[b+3]],a);
  }
  assert.deepEqual(packViewportPixels(bytes,width,height,stride,"bgra8unorm"),rgba);
  const png=await encodeViewportPng(bytes,width,height,stride,"bgra8unorm");
  assert.deepEqual(Array.from(png.subarray(0,8)),[137,80,78,71,13,10,26,10]);
  const decoded=await CjsPngFormat.readAsync(png,{emit:"rgba"});
  assert.equal(decoded.width,width);assert.equal(decoded.height,height);assert.deepEqual(decoded.data,rgba);
  assert.deepEqual(packViewportPixels(rgba,width,height,width*4,"rgba8unorm-srgb"),rgba);
  assert.throws(()=>packViewportPixels(bytes,0,height,stride,"rgba8unorm"),/Invalid/);
  assert.throws(()=>packViewportPixels(bytes,width,height,8,"rgba8unorm"),/Invalid/);
  assert.throws(()=>packViewportPixels(bytes.subarray(0,256),width,height,stride,"rgba8unorm"),/Invalid/);
  assert.throws(()=>packViewportPixels(bytes,width,height,stride,"rgba16float"),/Unsupported/);
});

function setup()
{
  globalThis.GPUBufferUsage={COPY_DST:8,MAP_READ:1};globalThis.GPUMapMode={READ:1};
  const trace=[],buffers=[];let copied,releaseMap;
  const device={limits:{maxBufferSize:1000000},queue:{submit:()=>trace.push("submit")},
    createBuffer:({size})=>{
      const data=new Uint8Array(size);data.set([30,20,10,255]);
      const buffer={destroyed:0,mapAsync:()=>{trace.push("map");return new Promise(resolve=>{releaseMap=resolve;});},getMappedRange:()=>data.buffer,destroy(){this.destroyed++;}};
      buffers.push(buffer);return buffer;
    },createCommandEncoder:()=>({copyTextureToBuffer(source,target,size){copied={source,target,size};trace.push("copy");},finish(){return {};}})};
  const downloads=[],capture=createViewportCapture({device,download:bytes=>downloads.push(bytes)});
  return {device,capture,trace,buffers,downloads,copied:()=>copied,release:()=>releaseMap()};
}
test("capture submits the rendered texture synchronously once, then encodes and releases",async()=>
{
  const h=setup(),texture={frame:42};const pending=h.capture.request();assert.equal(h.capture.request(),pending);
  h.capture.afterFrame(texture,3,2,"bgra8unorm");
  assert.deepEqual(h.trace,["copy","submit","map"]);assert.equal(h.copied().source.texture,texture);assert.equal(h.copied().target.bytesPerRow,256);
  h.capture.afterFrame({frame:43},3,2,"bgra8unorm");assert.equal(h.buffers.length,1);
  h.release();const result=await pending;assert.equal(result.width,3);assert.equal(h.downloads.length,1);assert.equal(h.buffers[0].destroyed,1);
  const decoded=await CjsPngFormat.readAsync(h.downloads[0],{emit:"rgba"});assert.deepEqual(Array.from(decoded.data.subarray(0,4)),[10,20,30,255]);h.capture.dispose();
});
test("capture failure/cancellation frees buffers and permits recovery without late downloads",async()=>
{
  const h=setup();const pending=h.capture.request();h.capture.afterFrame({},1,1,"rgba8unorm");
  h.capture.fail(new Error("lost device"));await assert.rejects(pending,/lost device/);assert.equal(h.buffers[0].destroyed,1);
  h.release();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.downloads.length,0);
  const next=h.capture.request();h.capture.afterFrame(null,1,1,"rgba8unorm");await assert.rejects(next,/No valid/);
  const huge=h.capture.request();h.capture.afterFrame({},1000000,1000000,"rgba8unorm");await assert.rejects(huge,/limit/);
  const last=h.capture.request();h.capture.dispose();await assert.rejects(last,/cancelled/);await assert.rejects(h.capture.request(),/disposed/);
});
