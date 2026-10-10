import test from 'node:test';
import assert from 'node:assert/strict';
import {Tny} from '../../src/core/services/Tny.js';
import {TnyServiceFSD} from '../../src/core/services/TnyServiceFSD.js';
import {fsdFixture} from '../resource/tables/fixtures.mjs';

test('FSD pages, filters and cache use the real binary decoder and retain scalar identities',async()=>{
 const {bytes,schema}=fsdFixture();let reads=0;
 const tny=new Tny();
 tny.services.Register('fsd',TnyServiceFSD,{sourceID:'fixture',tables:{graphics:{key:'graphicID',schema}},read:async()=>{reads++;return {bytes,build:'100'};}});
 tny.database.Register({name:'graphics',description:'Fixture',columns:[{name:'graphicID',type:'int32',primaryKey:true},{name:'size',type:'float32'}]},
 {service:'fsd',source:'eve.fsd',build:100});
 assert.deepEqual(await tny.database.GetByID('graphics',11),{graphicID:11,size:2.25});
 assert.deepEqual(await tny.database.GetByID('graphics',11),{graphicID:11,size:2.25});assert.equal(reads,1);
 const filters=[{field:'size',operator:'gte',value:2}];
 const first=await tny.database.Find('graphics',{limit:1,filters});
 assert.deepEqual(first.entries,[{graphicID:11,size:2.25}]);
 const second=await tny.database.Find('graphics',{limit:1,filters,cursor:first.nextCursor});
 assert.deepEqual(second.entries,[{graphicID:12,size:3.25}]);assert.equal(second.nextCursor,null);
 await assert.rejects(tny.database.Find('graphics',{cursor:first.nextCursor}),/different/);
 assert.equal(await tny.database.GetByID('graphics',99),null);await tny.Close();
});

test('FSD source build mismatch is rejected and never cached',async()=>{
 const {bytes,schema}=fsdFixture();let build='99',reads=0;
 const tny=new Tny();
 tny.services.Register('fsd',TnyServiceFSD,{sourceID:'fixture',tables:{graphics:{key:'graphicID',schema}},read:async()=>{reads++;return {bytes,build};}});
 tny.database.Register({name:'graphics',columns:[{name:'graphicID',type:'int32',primaryKey:true}]},{service:'fsd',source:'eve.fsd',build:100});
 await assert.rejects(tny.database.GetByID('graphics',10),/build mismatch/);
 build='100';assert.equal((await tny.database.GetByID('graphics',10)).graphicID,10);assert.equal(reads,2);await tny.Close();
});
