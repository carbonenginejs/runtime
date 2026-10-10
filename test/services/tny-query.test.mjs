import test from 'node:test';
import assert from 'node:assert/strict';
import {Tny} from '../../src/core/services/Tny.js';
import {TnyServiceAPI} from '../../src/core/services/TnyServiceAPI.js';
import {CjsTableData} from '../../src/resource/format/CjsTableData.js';

test('shared headers describe and round-trip positional rows without operational descriptions',async()=>{
 const header={name:'types',description:'Items',columns:[{name:'typeID',primaryKey:true,type:'int32',description:'ID'},{name:'name',type:'string'}]};
 const doc=CjsTableData.writeRows(header,[{typeID:34,name:'Tritanium'}],{build:'100'});
 assert.deepEqual(doc.tables[0].entries,[[34,'Tritanium']]);
 assert.deepEqual(CjsTableData.readRows(structuredClone(doc),'types'),[{typeID:34,name:'Tritanium'}]);
 assert.throws(()=>CjsTableData.defineTable({...header,columns:[{name:'x',type:'not-a-runtime-type'}]}),/Invalid type/);
 assert.throws(()=>CjsTableData.writeRows(header,[{typeID:undefined}]),/Undefined/);
});

test('API pages bind cursors to filters and reject unsupported filtering before fetch',async()=>{
 let requests=0;
 const tny=new Tny();
 const fetcher=async(url)=>{requests++;const u=new URL(url);assert.equal(u.searchParams.get('field'),'graphicID');
 const offset=Number(u.searchParams.get('offset'));return new Response(JSON.stringify({build:'100',items:offset===0?[{table:'types',id:'34',payload:{graphicID:10}}]:[]}));};
 tny.services.Register('api',TnyServiceAPI,{url:'https://example.invalid',fetcher,tables:{types:{key:'typeID'}}});
 tny.database.Register({name:'types',columns:[{name:'typeID',type:'int32',primaryKey:true},{name:'graphicID',type:'int32'}]},
 {service:'api',source:'sde',build:100});
 const filters=[{field:'graphicID',operator:'eq',value:10}];
 const page=await tny.database.Find('types',{limit:1,filters});
 assert.equal(page.entries[0].typeID,34);assert.equal(typeof page.nextCursor,'string');
 const last=await tny.database.Find('types',{limit:1,filters,cursor:page.nextCursor});
 assert.deepEqual(last.entries,[]);assert.equal(last.nextCursor,null);
 await assert.rejects(tny.database.Find('types',{filters:[],cursor:page.nextCursor}),/different/);
 await assert.rejects(tny.database.Find('types',{filters:[{field:'typeID',operator:'gt',value:2}]}),/one scalar/);
 assert.equal(requests,2);await tny.Close();
});
