import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { blue, ICustomPersist, IInitialize, INotify, DictReader, DictWriter, Copier, GetResources } from "../../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { EveSOFDataGenericString as StringRecord } from "../../../npm/dist/sof/generic/EveSOFDataGenericString.js";
import { EveSOFDataTexture as Texture } from "../../../npm/dist/sof/shared/EveSOFDataTexture.js";
import { EveSOFDataDecalIndexBuffer as Indices } from "../../../npm/dist/sof/shared/EveSOFDataDecalIndexBuffer.js";
import { EveSOFDataGenericShader } from "../../../npm/dist/sof/generic/EveSOFDataGenericShader.js";
import { EveSOFDataGeneric } from "../../../npm/dist/sof/generic/EveSOFDataGeneric.js";
import { EveSOFData } from "../../../npm/dist/sof/EveSOFData.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/EveSOFDataMgr.js";
import { EveSOFDataLogo } from "../../../npm/dist/sof/shared/EveSOFDataLogo.js";
import { EveSOFDataHullDecalSetItem } from "../../../npm/dist/sof/hull/EveSOFDataHullDecalSetItem.js";
import { createSofHydrationAdapter } from "../../../npm/dist/sof/createSofHydrationAdapter.js";

test("SOF records construct without model APIs and expose only their native query tables", () =>
{
  for(const [Class,Base,table] of [[StringRecord,Object,[StringRecord]],[Texture,Object,[Texture]],[Indices,ICustomPersist,[Indices,ICustomPersist]]])
  {
    const record=blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(record.constructor,Class);
    assert.equal(Object.getPrototypeOf(Class.prototype),Base.prototype);
    for(const name of ["GetValues","SetValues","Copy","Clone","OnEvent","__state"])assert.equal(name in record,false);
    assert.equal("from" in Class,false);
    assert.deepEqual([...mappedInterfaces(Class)],table);
    assert.equal(CjsSchema.cast(record,IInitialize),null);assert.equal(CjsSchema.cast(record,INotify),null);
    assert.deepEqual(GetResources(record),[]);
  }
  assert.equal(CjsSchema.cast(new Indices(),ICustomPersist).constructor,Indices);
});

test("native stored member order and flags retain existing typed index transport", () =>
{
  const string=CjsSchema.getSchema(StringRecord),texture=CjsSchema.getSchema(Texture),indices=CjsSchema.getSchema(Indices);
  assert.deepEqual(string.members.map(field=>[field.name,field.type.kind]),[["str","string"]]);
  assert.deepEqual(texture.members.map(field=>[field.name,field.type.kind]),[["resFilePath","path"],["name","string"]]);
  for(const field of [...string.members,...texture.members])assert.deepEqual(field.edit,{read:true,write:true,persist:true});
  assert.deepEqual(indices.members.map(field=>field.name),["indexBuffer"]);
  assert.deepEqual(indices.members[0].edit,{hidden:true,persist:true,persistOnly:true});
  assert.equal(indices.members[0].type.kind,"typedArray");
  assert.equal(new StringRecord().str,"");assert.equal(new Texture().resFilePath,"");
  assert.notEqual(new Indices().indexBuffer,new Indices().indexBuffer);
});

test("real SOF hydration adapter reads all three model-free record declarations", () =>
{
  const adapter=createSofHydrationAdapter(),string=new StringRecord(),texture=new Texture(),indices=new Indices();
  adapter.applyValues(string,{str:"Material1"});
  adapter.applyValues(texture,{name:"AlbedoMap",resFilePath:"res:/hull.dds"});
  adapter.applyValues(indices,{indexBuffer:[0,1,70000,4294967295]});
  assert.equal(string.str,"Material1");assert.deepEqual(texture.Assign(),{AlbedoMap:"res:/hull.dds"});
  assert.ok(indices.indexBuffer instanceof Uint32Array);assert.deepEqual(indices.GetIndices(),[0,1,70000,4294967295]);
  for(const record of [string,texture,indices])adapter.finalize(record,{kind:CjsSchema.getClassName(record.constructor)});
  const values=new DictWriter().WriteObject(indices,{}, {persistOnly:true});
  assert.deepEqual(values.indexBuffer,[0,1,70000,4294967295]);
});

test("declared reader and Blue Copier preserve typed buffers and record independence", () =>
{
  const source=new DictReader({declarations:true}).CreateObject({_type:"EveSOFDataDecalIndexBuffer",indexBuffer:[0,70000,4294967295]});
  const copy=new Copier().CloneTo(source);
  assert.equal(copy.constructor,Indices);assert.notEqual(copy.indexBuffer,source.indexBuffer);
  assert.deepEqual(copy.GetIndices(),[0,70000,4294967295]);
  copy.AddIndex(9);assert.equal(source.indexBuffer.length,3);
  const texture=new DictReader({declarations:true}).CreateObject({_type:"EveSOFDataTexture",name:"A",resFilePath:"res:/a.dds"});
  assert.deepEqual(new Copier().CloneTo(texture).Assign(),{A:"res:/a.dds"});
});

test("Blue shader copy and values preserve model-free string and texture children", () =>
{
  const string=new StringRecord();string.str="Paint";
  const texture=new Texture();texture.name="AlbedoMap";texture.resFilePath="res:/a.dds";
  const shader=new EveSOFDataGenericShader();shader.parameters.push(string);shader.defaultTextures.push(texture);
  assert.equal(shader.HasUsage("Paint"),true);
  assert.deepEqual(shader.AssignTextures(),{AlbedoMap:"res:/a.dds"});
  const copy=new EveSOFDataGenericShader();new Copier().CopyTo(shader,copy);
  assert.equal(copy.parameters[0].constructor,StringRecord);assert.notEqual(copy.parameters[0],string);
  assert.equal(copy.defaultTextures[0].constructor,Texture);assert.notEqual(copy.defaultTextures[0],texture);
  const values=new DictWriter().WriteObject(copy,{}, {refs:true,forceTypeTags:true});
  assert.equal(values.parameters[0].str,"Paint");assert.equal(values.defaultTextures[0].resFilePath,"res:/a.dds");
});

test("existing decal owner schema copy and export preserve model-free index records", () =>
{
  const buffer=new Indices();buffer.AddIndex(70000);buffer.AddIndex(1);
  const owner=new EveSOFDataHullDecalSetItem();owner.indexBuffers.push(buffer);
  const copy=new EveSOFDataHullDecalSetItem();CjsSchema.copy(copy, owner);
  assert.equal(copy.indexBuffers[0].constructor,Indices);
  assert.notEqual(copy.indexBuffers[0].indexBuffer,buffer.indexBuffer);
  const values=CjsSchema.getValues(copy, {}, {refs:true,forceTypeTags:true});
  assert.deepEqual(values.indexBuffers[0].indexBuffer,[70000,1]);
});

test("SOF texture composition reuses records and catalog projection accepts model-free strings", () =>
{
  const base=new Texture();base.name="AlbedoMap";base.resFilePath="res:/base.dds";
  const override=new Texture();override.name="AlbedoMap";override.resFilePath="res:/override.dds";
  const logo=new EveSOFDataLogo();logo.textures.push(base);
  const overrides=new EveSOFDataLogo();overrides.textures.push(override);
  const output=EveSOFDataLogo.combine(logo,overrides);
  const reused=output.textures[0];
  EveSOFDataLogo.combine(logo,null,output);
  assert.equal(output.textures[0],reused);assert.deepEqual(output.Assign(),{textures:{AlbedoMap:"res:/base.dds"}});
  const prefix=new StringRecord();prefix.str="Material1";
  const data=new EveSOFData();data.generic=new EveSOFDataGeneric();data.generic.materialPrefixes.push(prefix);
  const manager=new EveSOFDataMgr();assert.equal(manager.SetData(data),true);
  assert.deepEqual(manager.GetGenericData().materialPrefixes,["Material1"]);
});

test("decal custom persistence methods preserve their established JavaScript buffer contract", () =>
{
  const record=new Indices(),storage=record.AllocateReadBuffer(16);
  storage.set([7,8,70000,10]);
  const view=record.GetWriteBufferAndSize();assert.equal(view.buffer,storage);assert.equal(view.byteSize,16);
  record.SetBufferAndSize(new Uint32Array([99]),8);
  assert.deepEqual(record.GetIndices(),[7,8]);
  record.ReleaseWriteBuffer();assert.deepEqual(record.GetIndices(),[7,8]);
  const copied=record.GetIndices();copied[0]=99;assert.equal(record.indexBuffer[0],7);
});
