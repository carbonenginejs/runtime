import { Tr2TextureALWebgl2 } from "../../npm/dist/trinityal/webgl2/index.js";
import { FakeWebgl2, FakeRenderContext } from "../trinityal/webgl2/fakeWebgl2.js";
import assert from "node:assert/strict";
import test from "node:test";
import { VideoPlayer } from "../../npm/dist/core/platform/index.js";
import { CjsBlueResMan, RegisterVideoPlaylists, TriTextureRes } from "../../npm/dist/resource/index.js";
import { CreateTexture, RealizeTexture } from "../../npm/dist/trinity/core/Tr2ImageIOHelpers.js";
import { Tr2TexturedPointLight, TriTextureParameter } from "../../npm/dist/trinity/index.js";
import { CjsWebgpuTextureAL } from "../../npm/dist/trinityal/webgpu/CjsWebgpuTextureAL.js";
import { Tr2TextureSubresource } from "../../npm/dist/trinityal/index.js";
import { Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

function fixture()
{
  let id = 0, now = 0;
  const raf = new Map(), timers = new Map(), videos = [], revoked = [];
  const pixels = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([255, 0, 0, 255], i);
  const counts = { allocations: 0, uploads: 0, reads: 0, destroys: 0, canvases: 0 };
  const host = {
    Blob, URL: {createObjectURL: () => "blob:" + ++id, revokeObjectURL: url => revoked.push(url)},
    performance: {now: () => now++},
    requestAnimationFrame: fn => { raf.set(++id, fn); return id; },
    cancelAnimationFrame: key => raf.delete(key),
    setTimeout: (fn, ms) => { timers.set(++id, {fn, ms}); return id; },
    clearTimeout: key => timers.delete(key),
    document: {createElement(type) {
      if (type === "canvas")
      {
        counts.canvases++;
        return { getContext: () => ({ clearRect() {}, drawImage() {},
          getImageData() { counts.reads++; return {data:pixels}; } }) };
      }
      const listeners = new Map(), frames = new Map();
      const video = { currentTime: 0, duration: 12, videoWidth: 640, videoHeight: 360, readyState: 2,
        listeners, frames, playError: null, paused: true,
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: name => listeners.delete(name),
        requestVideoFrameCallback: fn => {frames.set(++id,fn); return id;},
        cancelVideoFrameCallback: key => frames.delete(key),
        play() {this.paused=false; return this.playError ? Promise.reject(this.playError) : Promise.resolve();},
        pause() {this.paused=true;}, load() {}, removeAttribute() {},
        event(name) {listeners.get(name)?.();},
        frame(serial, time) {const fn=frames.values().next().value; frames.clear(); fn(time,{presentedFrames:serial,mediaTime:time/1000});}
      };
      videos.push(video);
      return video;
    }}
  };
  const render = { IsValid: () => true, CreateTexture(desc) {
    counts.allocations++;
    let valid = true;
    return { IsValid: () => valid, GetMemoryClass: () => 1, SetName() {},
      Destroy() {if(valid) counts.destroys++;valid=false;},
      UpdateSubresource() {counts.uploads++;return 0;}, GetDesc: () => desc };
  }};
  const player = new VideoPlayer({host, getRenderContext: () => render});
  const texture = new TriTextureRes();
  texture.Initialize("dynamic:/color/0,0,0,1", "");
  player.bgraTexture = texture;
  const flush = () => {const work=[...raf.values()];raf.clear();for(const fn of work) fn(now);};
  return {host,player,texture,render,videos,raf,timers,revoked,counts,pixels,flush};
}
const settle = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };

test("decoded frames upload once for 100 consumers; media clock, cached light colour and bounded readback", () =>
{
  const f=fixture();f.player.Create(new Uint8Array([1]));
  const v=f.videos[0];assert.equal(v.muted,true);assert.equal(v.playsInline,true);
  v.currentTime=2.5;assert.equal(f.player.GetMediaTime(),2.5);
  v.frame(1,0);f.flush();
  assert.deepEqual(f.texture.GetAverageColor(),[1,0,0,1]);
  for(let i=0;i<100;i++) {RealizeTexture(f.texture,f.render);f.texture.GetAverageColor();}
  assert.equal(f.counts.uploads,1);assert.equal(f.counts.reads,1);assert.equal(f.counts.allocations,1);
  v.frame(2,40);v.frame(3,80);assert.equal(f.raf.size,0);
  v.frame(4,130);v.frame(5,270);assert.equal(f.raf.size,1);f.flush();
  assert.equal(f.counts.reads,2);assert.equal(f.counts.canvases,1);
  const light=new Tr2TexturedPointLight();light.texture=f.texture;light.Update();
  assert.equal(f.counts.reads,2,"light consumes cached colour without sampling");
  f.player.Pause();assert.equal(v.paused,true);assert.equal(f.timers.size,0);
  f.player.Resume();assert.equal(v.paused,false);
  f.player.Destroy();assert.equal(v.frames.size,0);assert.equal(v.listeners.size,0);
  assert.equal(f.timers.size,0);assert.equal(f.revoked.length,1);
});

test("dimension changes and resource recreation upload current frame without per-frame rebinding", () =>
{
  const f=fixture();let notifications=0;
  f.texture.OnEvent("texturechange",()=>notifications++);
  f.player.Create(new Uint8Array([1]));const v=f.videos[0];v.frame(1,0);
  const first=f.texture.GetTexture(), count=notifications;
  v.frame(2,40);assert.equal(f.texture.GetTexture(),first);assert.equal(notifications,count);
  v.videoWidth=1280;v.frame(3,80);assert.notEqual(f.texture.GetTexture(),first);
  assert.equal(f.texture.GetWidth(),1280);assert.equal(f.texture.GetHeight(),360);
  assert.equal(f.counts.allocations,2);assert.equal(f.counts.destroys,1);
  f.texture.ReleaseResources();RealizeTexture(f.texture,f.render);
  assert.equal(f.counts.allocations,3);assert.equal(f.counts.uploads,4);
  f.player.Destroy();
});

test("old clip callbacks and deferred samples cannot overwrite the replacement", () =>
{
  const f=fixture();f.player.Create(new Uint8Array([1]));const old=f.videos[0];
  old.frame(1,0);const sample=f.raf.values().next().value, callback=old.frames.values().next().value;
  f.texture.SetAverageColor(0,0,1,1);
  f.player.Create(new Uint8Array([2]));sample();callback(200,{presentedFrames:2});
  assert.deepEqual(f.texture.GetAverageColor(),[0,0,1,1]);assert.equal(f.counts.reads,0);
  assert.equal(old.frames.size,0);assert.equal(old.listeners.size,0);
  f.videos[1].frame(1,0);f.flush();assert.deepEqual(f.texture.GetAverageColor(),[1,0,0,1]);
  f.player.Destroy();assert.equal(f.revoked.length,2);
});

test("autoplay denial waits for host Resume and does not trigger playlist retries", async () =>
{
  const f=fixture();let errors=0;f.player.onError=()=>errors++;
  f.player.Pause();f.player.Create(new Uint8Array([1]));const v=f.videos[0];
  v.playError=Object.assign(new Error("gesture required"),{name:"NotAllowedError"});
  f.player.Resume();await settle();assert.equal(f.player.autoplayBlocked,true);
  assert.equal(f.timers.size,0);assert.equal(errors,0);
  v.playError=null;f.player.Resume();await settle();assert.equal(f.player.autoplayBlocked,false);
  f.player.Destroy();
});

test("shared playlists advance, loop, preserve identity on replacement and clean up on manager clear", async () =>
{
  const f=fixture(),paths=[];
  const manager=new CjsBlueResMan({source:{Read(path){paths.push(path);return new Uint8Array([1]);}}});
  const options={random:()=>0.999,host:f.host,createPlayer:()=>new VideoPlayer({host:f.host,getRenderContext:()=>f.render})};
  RegisterVideoPlaylists(manager,{hangarvideos:["res:/a.webm","res:/b.webm"]},options);
  const texture=manager.GetResource("dynamic:/hangarvideos");
  for(let i=0;i<100;i++) assert.equal(manager.GetResource("dynamic:/hangarvideos"),texture);
  await settle();assert.equal(f.videos.length,1);assert.deepEqual(paths,["res:/a.webm"]);
  f.videos[0].frame(1,0);f.videos[0].event("ended");await settle();assert.equal(paths[1],"res:/b.webm");
  f.videos[1].event("ended");await settle();assert.equal(paths[2],"res:/a.webm");
  RegisterVideoPlaylists(manager,{hangarvideos:["res:/c.webm"]},options);await settle();
  assert.equal(manager.GetResource("dynamic:/hangarvideos"),texture);assert.equal(paths[3],"res:/c.webm");
  manager.Clear();assert.equal(f.timers.size,0);assert.equal(f.raf.size,0);
  assert.equal(f.videos.at(-1).listeners.size,0);assert.equal(f.revoked.length,4);
});

test("failed codec and stalled video make at most one pass through playlist", async () =>
{
  const f=fixture(),manager=new CjsBlueResMan({source:{Read:()=>new Uint8Array([1])}});
  RegisterVideoPlaylists(manager,{hangarvideos:["res:/a.webm","res:/b.webm"]},
    {host:f.host,createPlayer:()=>new VideoPlayer({host:f.host,getRenderContext:()=>f.render})});
  const texture=manager.GetResource("dynamic:/hangarvideos");await settle();
  f.videos[0].event("error");const retry=[...f.timers.values()].find(x=>x.ms===1000);
  assert.ok(retry);f.timers.clear();retry.fn();await settle();
  const watchdog=[...f.timers.values()].find(x=>x.ms===15000);assert.ok(watchdog);watchdog.fn();
  assert.ok(texture.videoController.error);assert.equal(f.timers.size,0);
  manager.Clear();
});

test("unload during a byte read ignores its late completion", async () =>
{
  const f=fixture();let finish;
  const manager=new CjsBlueResMan({source:{Read:()=>new Promise(resolve=>finish=resolve)}});
  RegisterVideoPlaylists(manager,{hangarvideos:["res:/a.webm"]},
    {host:f.host,createPlayer:()=>new VideoPlayer({host:f.host,getRenderContext:()=>f.render})});
  manager.GetResource("dynamic:/hangarvideos");await settle();manager.Clear();
  finish(new Uint8Array([1]));await settle();assert.equal(f.videos.length,0);assert.equal(f.timers.size,0);
});

test("prepared texture parameters retain one texture-change listener and release it on replacement", () =>
{
  const f=fixture(),parameter=new TriTextureParameter();let dirty=0;
  parameter.OnTextureChanged=()=>dirty++;
  parameter.SetResource(f.texture);const initial=dirty;
  f.texture.EmitEvent("texturechange",f.texture);assert.equal(dirty,initial+1);
  parameter.SetResource(null);const released=dirty;
  f.texture.EmitEvent("texturechange",f.texture);assert.equal(dirty,released);
});

test("WebGPU external frame upload uses straight sRGB copy and leaves byte uploads unchanged", () =>
{
  const calls=[];const texture=new CjsWebgpuTextureAL();
  texture.m_texture={};texture.m_format="rgba8unorm";texture.m_gpuUsage=Tr2GpuUsage.RENDER_TARGET;
  texture.m_webgpu={GetGeneration:()=>1,IsReady:()=>true,GetDevice:()=>({queue:{copyExternalImageToTexture:(...args)=>calls.push(args),writeTexture:(...args)=>calls.push(args)}})};
  texture.m_desc={GetWidth:()=>640,GetHeight:()=>360,GetMipWidth:()=>640,GetMipHeight:()=>360,GetType:()=>0};
  const region=Tr2TextureSubresource.ForMipLevel(0),video={};
  assert.equal(texture.UpdateSubresource(region,video,0,0),0);
  assert.equal(calls[0][0].source,video);assert.equal(calls[0][1].premultipliedAlpha,false);
  assert.equal(calls[0][1].colorSpace,"srgb");
  const bytes=new Uint8Array(4);texture.UpdateSubresource(region,bytes,4,4);
  assert.equal(calls[1][1],bytes);
});


test("GPU colour reads coalesce and discard completed results from replaced clips and storage", async () =>
{
  const f=fixture();f.player.Create(new Uint8Array([1]));const v=f.videos[0];v.frame(1,0);f.flush();
  let resolve, requests=0;
  const texture=f.texture.GetTexture();
  texture.RequestAverageColor=()=>{requests++;return new Promise(done=>{resolve=done;});};
  v.frame(2,150);v.frame(3,300);assert.equal(requests,1);
  assert.deepEqual(f.texture.GetAverageColor(),[1,0,0,1]);
  resolve(new Float32Array([0,1,0,1]));await settle();
  assert.deepEqual(f.texture.GetAverageColor(),[0,1,0,1]);assert.equal(f.counts.reads,1);
  v.frame(4,450);f.player.Create(new Uint8Array([2]));
  resolve(new Float32Array([0,0,1,1]));await settle();
  assert.deepEqual(f.texture.GetAverageColor(),[0,1,0,1]);
  const next=f.videos[1];next.frame(1,0);assert.equal(requests,3);
  f.texture.ReleaseResources();resolve(new Float32Array([1,0,1,1]));await settle();
  assert.deepEqual(f.texture.GetAverageColor(),[0,1,0,1]);f.player.Destroy();
});

test("Carbon player methods use media seconds, expose unknown alpha, clear and retarget storage", () =>
{
  const f=fixture();assert.throws(()=>f.player.GetVideoInfo(),/not yet parsed/);
  f.player.Create(new Uint8Array([1]));const v=f.videos[0];
  v.buffered={length:2,end:index=>index===1?9:3};
  assert.equal(f.player.GetDownloadedMediaTime(),9);
  assert.deepEqual(f.player.GetVideoInfo(),{width:640,height:360,hasAlpha:null});
  v.frame(1,0);f.flush();const first=f.texture.GetTexture();
  f.player.OnTick(1000000000,2000000000,null);assert.equal(f.counts.uploads,1);
  f.player.ClearTextures();assert.equal(f.texture.GetTexture(),first);
  assert.deepEqual(f.texture.GetAverageColor(),[0,0,0,0]);assert.equal(f.counts.uploads,2);
  f.player.OnModified();f.player.OnTick(0,0,null);assert.equal(f.counts.uploads,3);
  const other=new TriTextureRes();other.Initialize("dynamic:/color/0,0,0,1", "");
  f.player.SetBgraTexture(other);assert.equal(f.player.GetBgraTexture(),other);
  assert.equal(f.texture.GetPayload().frameSource,null);
  f.player.OnTick(0,0,null);assert.equal(other.GetWidth(),640);f.player.Destroy();
});


test("colour backend failures preserve playback and retry only after texture recreation", () =>
{
  const f=fixture();f.player.Create(new Uint8Array([1]));const v=f.videos[0];v.frame(1,0);f.flush();
  let requests=0;f.texture.GetTexture().RequestAverageColor=()=>{requests++;throw new Error("sampling failed");};
  v.frame(2,150);v.frame(3,300);assert.equal(requests,1);
  assert.match(f.player.averageColorError.message,/sampling failed/);assert.equal(f.player.error,null);
  assert.equal(f.player.video,v);assert.equal(f.counts.uploads,3);
  f.texture.ReleaseResources();v.frame(4,450);f.flush();
  assert.equal(f.player.averageColorError,null);assert.equal(f.counts.reads,2);f.player.Destroy();
});


test("video renderer bridge creates WebGL2-compatible storage and updates both retained views", () =>
{
  const {gl,calls}=FakeWebgl2(),context=FakeRenderContext(gl),f=fixture();
  f.player.Create(new Uint8Array([1]));f.videos[0].frame(1,0);
  context.CreateTexture=(desc,options)=>{const texture=new Tr2TextureALWebgl2();assert.equal(texture.Create(desc,options,context),0);return texture;};
  const texture=CreateTexture(f.texture,context),source=f.videos[0],region=Tr2TextureSubresource.ForMipLevel(0);
  assert.equal(texture.UpdateSubresource(region,source,0,0,context),0);
  const first=texture._texture,twin=texture._twin,allocations=calls.filter(c=>c[0]==="createTexture").length;
  assert.ok(twin);assert.equal(texture.UpdateSubresource(region,source,0,0,context),0);
  assert.equal(texture._texture,first);assert.equal(texture._twin,twin);
  assert.equal(calls.filter(c=>c[0]==="createTexture").length,allocations);
  assert.equal(calls.filter(c=>c[0]==="texSubImage2D"&&c.at(-1)===source).length,4);
  texture.Destroy();f.player.Destroy();
});
