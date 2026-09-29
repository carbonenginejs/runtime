import assert from "node:assert/strict";
import test from "node:test";
import { Tr2MainWindow } from "../../npm/dist/input/index.js";
import { createDemoInput } from "./webgpu/demo/input.js";
import { createDemoActions } from "./webgpu/demo/demoActions.js";

class Host
{
  listeners=new Map(); options=new Map(); clientHeight=500; tagName="CANVAS"; capture=new Set();
  addEventListener(type,callback,options){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list);this.options.set(type,options);}
  removeEventListener(type,callback){this.listeners.set(type,(this.listeners.get(type)??[]).filter(item=>item!==callback));}
  emit(type,values={}){const event={target:this,code:"",key:"",pointerId:1,clientX:0,clientY:0,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...values};for(const callback of this.listeners.get(type)??[])callback(event);return event;}
  setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
}
function setup()
{
  const window=new Host(),document=new Host(),canvas=new Host(),calls=[];
  document.activeElement=canvas;document.hidden=false;canvas.focus=()=>{document.activeElement=canvas;};
  const mainWindow=new Tr2MainWindow({window,document,target:canvas});
  const controls=Object.fromEntries(["cancel","frame","reset","orbit","pan","dolly","adjustFieldOfView"].map(name=>[name,(...args)=>calls.push([name,...args])]));
  let ship={GetControllerVariables:()=>({})},post=false,cloakCalls=0,resolveCloak;
  const actions=createDemoActions({getShip:()=>ship,getShipStates:()=>[],readState:()=>({post,cloaked:false,speed:0}),operations:{post:value=>{post=value;},cloak:()=>{cloakCalls++;return new Promise(resolve=>{resolveCloak=resolve;});}}});
  const errors=[],input=createDemoInput({mainWindow,canvas,document,controls,actions,onError:error=>errors.push(error)});
  return {window,document,canvas,calls,input,mainWindow,actions,errors,cloakCalls:()=>cloakCalls,resolveCloak:()=>resolveCloak(),replace:()=>{ship={GetControllerVariables:()=>({})};actions.refresh();}};
}
test("focused physical chords consume synchronously, dispatch once, and ignore editors/browser keys",()=>
{
  const h=setup();
  assert.equal(h.window.emit("keydown",{code:"KeyP"}).defaultPrevented,true);assert.equal(h.actions.getState().post,false);
  h.window.emit("keydown",{code:"KeyP",repeat:true});h.input.update(.016);assert.equal(h.actions.getState().post,true);
  for(const event of [{code:"KeyP",ctrlKey:true},{code:"KeyP",altKey:true},{code:"KeyP",metaKey:true},{code:"KeyP",shiftKey:true},{code:"KeyP",isComposing:true},{code:"F1"},{code:"Tab"},{code:"KeyW"},{code:"KeyP",composedPath:()=>[{tagName:"INPUT"}]}]) assert.equal(h.window.emit("keydown",event).defaultPrevented,false);
  h.document.activeElement={};assert.equal(h.window.emit("keydown",{code:"KeyP"}).defaultPrevented,false);
  h.input.dispose();
});
test("held keys use bounded frame dt; keyup, blur, IME, replacement and hidden cancel queued motion",()=>
{
  const h=setup();h.window.emit("keydown",{code:"ArrowRight"});h.input.update(10);
  assert.deepEqual(h.calls.find(call=>call[0]==="orbit"),["orbit",15,0]);
  h.window.emit("keyup",{code:"ArrowRight",shiftKey:true});h.calls.length=0;h.input.update(.02);assert.equal(h.calls.length,0);
  for(const cancel of [()=>h.canvas.emit("blur"),()=>h.window.emit("blur"),()=>h.canvas.emit("compositionstart"),h.replace,()=>{h.document.hidden=true;h.document.emit("visibilitychange");}]){
    h.window.emit("keydown",{code:"ArrowRight"});h.window.emit("keydown",{code:"KeyP"});cancel();h.calls.length=0;h.input.update(.016);
    assert.equal(h.calls.some(call=>call[0]==="orbit"),false);assert.equal(h.actions.getState().post,false);
    h.canvas.emit("compositionend");h.document.hidden=false;
  }
  h.input.dispose();
});
test("single captured pointer and normalized wheel use one listener and cancel lost capture",()=>
{
  const h=setup();assert.deepEqual(h.canvas.options.get("wheel"),{passive:false});
  assert.equal(h.canvas.listeners.get("pointermove").length,1);assert.equal(h.canvas.listeners.get("wheel").length,1);
  assert.equal(h.canvas.emit("pointerdown",{button:2}).defaultPrevented,false);
  h.canvas.emit("pointerdown",{shiftKey:true});h.canvas.emit("pointermove",{pointerId:2,clientX:99});h.canvas.emit("pointermove",{clientX:10,clientY:20});h.input.update(.016);
  assert.deepEqual(h.calls.find(call=>call[0]==="pan"),["pan",10,20]);
  h.canvas.emit("lostpointercapture");h.calls.length=0;h.canvas.emit("pointermove",{clientX:40});h.input.update(.016);assert.equal(h.calls.length,0);
  h.canvas.emit("wheel",{deltaY:2,deltaMode:1});h.canvas.emit("wheel",{deltaY:1,deltaMode:2,shiftKey:true});h.input.update(.016);
  assert.deepEqual(h.calls,[["dolly",32],["adjustFieldOfView",500]]);
  h.input.dispose();h.input.dispose();
  for(const target of [h.window,h.document,h.canvas])for(const callbacks of target.listeners.values())assert.equal(callbacks.length,0);
});
test("rebinding rejects conflicts atomically, supports unbind/reset, and gates async cloak",async()=>
{
  const h=setup();assert.throws(()=>h.input.rebind("post",[{code:"KeyC"}]),/Duplicate/);assert.throws(()=>h.input.rebind("post",[{code:"F1"}]),/Reserved/);
  h.input.rebind("post",[{code:"KeyB"}]);assert.equal(h.window.emit("keydown",{code:"KeyP"}).defaultPrevented,false);
  h.window.emit("keydown",{code:"KeyB"});h.input.update(.016);assert.equal(h.actions.getState().post,true);
  h.input.rebind("post",[]);assert.equal(h.window.emit("keydown",{code:"KeyB"}).defaultPrevented,false);h.input.resetBindings();
  assert.equal(h.window.emit("keydown",{code:"KeyP"}).defaultPrevented,true);h.input.cancel();
  h.window.emit("keydown",{code:"KeyC"});h.window.emit("keydown",{code:"KeyC"});h.input.update(.016);assert.equal(h.cloakCalls(),1);
  assert.equal(h.window.emit("keydown",{code:"KeyC"}).defaultPrevented,false);h.resolveCloak();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.actions.getState().pending.length,0);h.input.dispose();
});
test("frame clears later queued input; bounded queue and reattachment retain no duplicate listeners",()=>
{
  const h=setup();h.window.emit("keydown",{code:"KeyF"});h.window.emit("keydown",{code:"KeyP"});h.input.update(.016);assert.equal(h.actions.getState().post,false);
  for(let i=0;i<65;i++)h.window.emit("keydown",{code:"KeyP"});h.input.update(.016);assert.equal(h.actions.getState().post,false,"64 queued toggles, not65");
  h.input.dispose();h.mainWindow.Attach({window:h.window,document:h.document,target:h.canvas});
  assert.equal(h.canvas.listeners.get("wheel").length,1);assert.equal(h.window.listeners.get("keydown").length,1);h.mainWindow.Detach();
});
