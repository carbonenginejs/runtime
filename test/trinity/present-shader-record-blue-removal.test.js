import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue } from "../../npm/dist/global/blue/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { createSofHydrationAdapter } from "../../npm/dist/sof/createSofHydrationAdapter.js";
import { Tr2ShaderOption } from "../../npm/dist/trinity/shader/reflection/Tr2ShaderOption.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { Tr2PresentParameters } from "../../npm/dist/trinity/ui/Tr2PresentParameters.js";
import { Tr2PresentParametersAL, Tr2DisplayModeInfo } from "../../npm/dist/trinityal/index.js";
import { TriDevice } from "../../npm/dist/trinity/core/device/TriDevice.js";

test("presentation record inherits native AL storage with concrete UI defaults and no query entries",()=>{
 const value=blue.classes.CreateInstanceFromName("Tr2PresentParameters"),other=new Tr2PresentParameters();
 assert.equal(Object.getPrototypeOf(Tr2PresentParameters.prototype),Tr2PresentParametersAL.prototype);assert.equal(value.mode.constructor,Tr2DisplayModeInfo);assert.notEqual(value.mode,other.mode);assert.deepEqual([...mappedInterfaces(Tr2PresentParameters)],[]);
 assert.deepEqual([value.backBufferWidth,value.backBufferHeight,value.backBufferCount,value.msaaType,value.msaaQuality,value.swapEffect,value.outputWindow,value.windowed,value.software,value.presentInterval],[0,0,0,0,0,0,0,false,false,1]);
 assert.equal(new Tr2PresentParametersAL().presentInterval,0);assert.equal(value.variableRefreshRateSupported,false);
 const software=CjsSchema.getField(Tr2PresentParameters,"software");assert.equal(software.enum.identity,"trinity.TriDevice.DeviceType");assert.equal(software.enum.members,blue.enums.GetEnum(software.enum.identity));assert.equal(software.enum.members,TriDevice.DeviceType);
 assert.deepEqual(CjsSchema.getSchema(Tr2PresentParameters).fields.map(field=>field.name),["backBufferWidth","backBufferHeight","windowed","software"]);
 for(const name of ["SetValues","GetValues","Clone","OnEvent","Traverse","GetResources"])assert.equal(name in value,false);
 for(const [field,type]of [["backBufferWidth","uint32"],["backBufferHeight","uint32"],["windowed","boolean"],["software","boolean"]]){const declaration=CjsSchema.getField(Tr2PresentParameters,field);assert.equal(declaration.type.kind,type);assert.equal(declaration.edit.persist,undefined);assert.equal(declaration.edit.read,true);assert.equal(declaration.edit.write,true);}
});

test("presentation dictionary aliases share AL dimensions and remain nonpersistent",()=>{
 const value=new Tr2PresentParameters(),mode=value.mode;new DictReader({declarations:true}).ReadInto(value,{backBufferWidth:800,backBufferHeight:600,windowed:true,software:true});assert.equal(value.mode,mode);assert.deepEqual([mode.width,mode.height],[800,600]);
 mode.width=1024;assert.equal(value.backBufferWidth,1024);const written=new DictWriter().WriteObject(value);assert.deepEqual([written.backBufferWidth,written.backBufferHeight,written.windowed,written.software],[1024,600,true,true]);
 const persisted=new DictWriter().WriteObject(value,{}, {persistOnly:true});for(const field of ["backBufferWidth","backBufferHeight","windowed","software"])assert.equal(Object.hasOwn(persisted,field),false);
});

test("actual device SetPresentation accepts the native record without backend startup",()=>{
 const value=new Tr2PresentParameters(),device=new TriDevice();value.backBufferWidth=640;value.backBufferHeight=480;const window={};value.outputWindow=window;
 try{assert.equal(device.SetPresentation(2,value),true);assert.equal(device.GetPresentParameters(),value);assert.equal(device.GetOutputWindow(),window);assert.equal(device.width,640);assert.equal(device.height,480);assert.equal(device.adapter,2);}
 finally{blue.os.UnregisterForTicks(device,TriDevice.TICK_COOKIE);}
});

test("shader option is a registered plain struct without model or query interfaces",()=>{
 const value=blue.classes.CreateInstanceFromName("Tr2ShaderOption");assert.equal(value.constructor,Tr2ShaderOption);assert.equal(Object.getPrototypeOf(Tr2ShaderOption.prototype),Object.prototype);assert.deepEqual([...mappedInterfaces(Tr2ShaderOption)],[]);
 assert.deepEqual(Object.keys(value),["name","value"]);assert.deepEqual([value.name,value.value],["",""]);
 for(const field of ["name","value"])assert.equal(CjsSchema.getField(Tr2ShaderOption,field).type.kind,"string");
 for(const name of ["SetValues","GetValues","Clone","OnEvent","Traverse","GetResources"])assert.equal(name in value,false);assert.equal("from" in Tr2ShaderOption,false);
});

test("authored shader option persistence and SOF hydration remain available",()=>{
 const option=new Tr2ShaderOption();createSofHydrationAdapter().applyValues(option,{name:"QUALITY",value:"高"});
 const serialized=new DictWriter().WriteObject(option,{}, {persistOnly:true});assert.deepEqual(serialized,{name:"QUALITY",value:"高"});
 const copy=new Tr2ShaderOption();blue.classes.CopyTo(option,copy);assert.deepEqual([copy.name,copy.value],["QUALITY","高"]);
 const hydrated=new DictReader({declarations:true}).CreateObject({_type:"Tr2ShaderOption",...serialized});assert.equal(hydrated.constructor,Tr2ShaderOption);assert.equal(hydrated.value,"高");
});

test("actual effect options create, update, query and remove the model-free option",()=>{
 const effect=new Tr2Effect();effect.SetOption("QUALITY","LOW");const option=effect.options[0];assert.equal(option.constructor,Tr2ShaderOption);assert.equal(effect.GetOption("QUALITY"),"LOW");
 effect.SetOption("QUALITY","HIGH");assert.equal(effect.options[0],option);assert.equal(option.value,"HIGH");assert.equal(effect.options.length,1);
 const written=new DictWriter().WriteObject(effect,{}, {persistOnly:true});assert.deepEqual(written.options.map(value=>[value.name,value.value]),[["QUALITY","HIGH"]]);
 effect.ResetOption("QUALITY");assert.equal(effect.GetOption("QUALITY"),"");assert.equal(effect.options.length,0);effect.Destroy();
});
