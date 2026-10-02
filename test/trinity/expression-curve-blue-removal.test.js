import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue, ITriFunction, ITriScalarFunction, ITriColorFunction, ITriVectorFunction, IInitialize } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2CurveScalarExpression as Scalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalarExpression.js";
import { Tr2CurveVector3Expression as Vector } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector3Expression.js";
import { CjsControllerExpressionProgram as Program } from "../../npm/dist/trinity/controllers/expression/CjsControllerExpressionProgram.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { createSofHydrationAdapter } from "../../npm/dist/sof/createSofHydrationAdapter.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";

test("expression curves construct without inherited model APIs", () =>
{
  for (const [Class, Base] of [[Scalar, ITriScalarFunction], [Vector, ITriColorFunction]])
  {
    const curve = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
    assert.equal(curve.constructor, Class);
    assert.equal(Object.getPrototypeOf(Class.prototype), Base.prototype);
    for (const key of ["SetValues", "UpdateValues", "GetValues", "Clone", "OnEvent", "__state"]) assert.equal(key in curve, false);
    assert.equal("from" in Class, false);
    assert.deepEqual(GetResources(curve), []);
  }
});

test("exact native query maps retain vector's color-first function branch", () =>
{
  for (const [Class, expected] of [[Scalar,[Scalar,ITriFunction,ITriScalarFunction,IInitialize]], [Vector,[Vector,ITriColorFunction,ITriVectorFunction,ITriFunction,IInitialize]]])
  {
    assert.deepEqual([...mappedInterfaces(Class)], expected);
    const value = new Class();
    for (const Interface of expected) assert.equal(CjsSchema.cast(value, Interface), value);
  }
});

test("expression backing members and live properties are independent native declarations", () =>
{
  for (const [Class, expressions] of [[Scalar,["expression"]], [Vector,["expressionX","expressionY","expressionZ"]]])
  {
    const schema = CjsSchema.getSchema(Class);
    assert.deepEqual(schema.members.map(field => field.name), ["name",...expressions,"currentValue","inputs","input1","input2","input3","input4"]);
    assert.deepEqual(schema.properties.map(field => field.name), expressions);
    for (const name of expressions)
    {
      const stored = schema.members.find(field => field.name === name), live = schema.properties.find(field => field.name === name);
      assert.equal(stored.key, "_"+name);
      assert.deepEqual(stored.edit, {hidden:true,persist:true,persistOnly:true});
      assert.equal(live.key, name);
      assert.deepEqual(live.edit, {read:true,write:true});
    }
  }
});

test("native setters compile immediately on every nonempty assignment without model events", t =>
{
  const compile = Program.Compile;
  let count = 0;
  t.mock.method(Program, "Compile", function(...args) {count++; return compile.apply(this,args);});
  const scalar = new Scalar();
  assert.equal(scalar.SetExpression("1 + 2"), undefined);
  assert.equal(count, 1);
  const old = scalar._program;
  scalar.expression = "1 + 2";
  assert.equal(count, 2);
  assert.notEqual(scalar._program, old);
  assert.equal(scalar.GetValue(0), 3);
  const vector = new Vector();
  assert.equal(vector.SetExpression(0,"4"), undefined);
  vector.expressionY = "5";
  vector.SetExpressionZ("6");
  assert.equal(count, 5);
  assert.deepEqual([vector.GetExpressionX(), vector.GetExpressionY(), vector.GetExpressionZ()], ["4","5","6"]);
  assert.deepEqual(Array.from(vector.GetValue(0,new Float32Array(3))), [4,5,6]);
});

test("invalid setter source preserves program and text; empty source preserves native scalar/vector distinction", () =>
{
  const scalar = new Scalar(), vector = new Vector();
  scalar.SetExpression("7"); vector.SetExpressionX("8");
  const scalarProgram = scalar._program, vectorProgram = vector._programs[0];
  scalar.SetExpression("("); vector.SetExpressionX("(");
  assert.equal(scalar.GetExpression(), "7"); assert.equal(vector.GetExpressionX(), "8");
  assert.equal(scalar._program, scalarProgram); assert.equal(vector._programs[0], vectorProgram);
  scalar.SetExpression(""); vector.SetExpressionX("");
  assert.equal(scalar.GetValue(0), 0);
  assert.equal(vector.GetValue(0,new Float32Array(3))[0], 8);
  assert.equal(scalar._program, scalarProgram); assert.equal(vector._programs[0], vectorProgram);
});

test("declared readers bypass live setters until initialization sees all persisted fields", t =>
{
  for (const [Class, type, expressions] of [[Scalar,"Tr2CurveScalarExpression",{expression:"input1 + 1"}], [Vector,"Tr2CurveVector3Expression",{expressionX:"input1 + 1",expressionY:"2"}]])
  {
    const initialize = Class.prototype.Initialize, setter = Class.prototype.SetExpression;
    let count = 0, inInitialize = false, setterCalls = 0;
    t.mock.method(Class.prototype,"Initialize",function()
    {
      count++; assert.equal(this.input1,9); assert.equal(this.name,"loaded");
      inInitialize = true;
      try {return initialize.call(this);} finally {inInitialize=false;}
    });
    t.mock.method(Class.prototype,"SetExpression",function(...args)
    {
      assert.equal(inInitialize,true,"reader writes backing members before calling the initializer");
      setterCalls++; return setter.apply(this,args);
    });
    const curve = new DictReader({declarations:true}).CreateObject({_type:type,...expressions,input1:9,name:"loaded"});
    assert.equal(count,1); assert.equal(setterCalls,Object.keys(expressions).length);
    assert.equal(Class===Scalar?curve.GetValue(0):curve.GetValue(0,new Float32Array(3))[0],10);
  }
});

test("Copier clones owned input graphs and initializes compiled state after backing-member copy", t =>
{
  const input = new Scalar(); input.expression="time + 2";
  const source = new Vector(); source.expressionX="input(0)"; source.expressionY="input1"; source.input1=6; source.inputs=[input];
  const initialize = Vector.prototype.Initialize;
  const scalarInitialize = Scalar.prototype.Initialize;
  let count=0, scalarCount=0;
  t.mock.method(Scalar.prototype,"Initialize",function()
  {
    scalarCount++; assert.equal(this.expression,"time + 2");
    return scalarInitialize.call(this);
  });
  t.mock.method(Vector.prototype,"Initialize",function()
  {
    count++; assert.equal(this.expressionX,"input(0)"); assert.equal(this.input1,6);
    assert.equal(this.inputs.length,1); return initialize.call(this);
  });
  const copy = new Copier().CloneTo(source);
  assert.equal(count,1);
  assert.equal(scalarCount,1);
  assert.notEqual(copy.inputs,source.inputs); assert.notEqual(copy.inputs[0],input);
  assert.notEqual(copy.inputs[0]._program,null);
  assert.notEqual(copy.inputs[0]._program,input._program);
  assert.notEqual(copy._programs[0],source._programs[0]);
  assert.deepEqual(Array.from(copy.GetValue(3,new Float32Array(3))),[5,6,0]);
});

test("Initialize skips empty source and preserves native failure handling on reused instances", () =>
{
  const scalar=new Scalar(),vector=new Vector();
  assert.equal(scalar.Initialize(),true);assert.equal(vector.Initialize(),true);
  assert.equal(scalar._program,null);assert.deepEqual(vector._programs,[null,null,null]);
  scalar._expression="(";
  assert.equal(scalar.GetValue(0),0,"failed lazy compilation retains the native absent-program guard");
  scalar.SetExpression("7");vector.SetExpressionX("8");
  scalar._expression="(";vector._expressionX="(";
  scalar.Initialize();vector.Initialize();
  assert.equal(scalar.expression,"");assert.equal(vector.expressionX,"");
  assert.equal(scalar.GetValue(0),0);
  assert.equal(vector.GetValue(0,new Float32Array(3))[0],8);
});

test("input functions reject out-of-range indices then call the required owned method", () =>
{
  for(const curve of [new Scalar(),new Vector()])
  {
    assert.equal(curve.GetInputValue(-1,2),0);assert.equal(curve.GetInputValue(0,2),0);
    curve.inputs=[null];
    assert.throws(()=>curve.GetInputValue(0,2),TypeError);
    const input=new Scalar();input.expression="time + 2";curve.inputs=[input];
    assert.equal(curve.GetInputValue(0,3),5);
  }
});

test("actual curve-set owner drives expression updates and vector color output", () =>
{
  const scalar=new Scalar(),vector=new Vector();
  scalar.expression="time + 1"; vector.expressionX="time * 2";vector.expressionY="3";
  const set=new TriCurveSet();set.curves.push(scalar,vector);
  set.ApplyTime(2);
  assert.equal(scalar.currentValue,3);assert.deepEqual(Array.from(vector.currentValue),[4,3,0]);
  const color=new Float32Array([0,0,0,9]);
  assert.equal(vector.Update(3,color),color);assert.deepEqual(Array.from(color),[6,3,0,0]);
});

test("warm SOF scalar hydration recompiles changed nonempty source without initializing", t =>
{
  const curve = new Scalar(), adapter = createSofHydrationAdapter();
  curve.SetExpression("time + 1");
  const initialProgram = curve._program;
  let initialized = 0;
  t.mock.method(curve,"Initialize",()=>{initialized++;return true;});
  assert.equal(adapter.applyValues(curve,{expression:"time + 5"}),curve);
  adapter.finalize(curve,{kind:"Tr2CurveScalarExpression"});
  assert.equal(initialized,0);
  assert.equal(curve.GetExpression(),"time + 5");
  assert.equal(new DictWriter().WriteObject(curve,{}, {persistOnly:true}).expression,"time + 5");
  assert.equal(curve._program,initialProgram,"stored hydration bypasses the live setter");
  assert.equal(curve.GetValue(2),7);
  assert.notEqual(curve._program,initialProgram);
  const warmProgram=curve._program;
  adapter.applyValues(curve,{expression:"("});
  assert.equal(curve.GetValue(2),7,"invalid warm source preserves the last valid program");
  assert.equal(curve._program,warmProgram);
  assert.equal(curve.GetExpression(),"(","failed lazy compilation does not rewrite persisted source");
  assert.equal(curve._compiledSource,"time + 5");
  adapter.applyValues(curve,{expression:""});
  assert.equal(curve.GetValue(2),0);
  assert.equal(curve._program,warmProgram);
  adapter.applyValues(curve,{expression:"time + 9"});
  assert.equal(curve.GetValue(2),11);
  assert.equal(initialized,0);
});

test("warm SOF vector hydration tracks each successful source while empty and invalid retain programs", t =>
{
  const curve=new Vector(),adapter=createSofHydrationAdapter();
  curve.SetExpressionX("time + 1");curve.SetExpressionY("2");curve.SetExpressionZ("3");
  const oldPrograms=curve._programs.slice();
  let initialized=0;
  t.mock.method(curve,"Initialize",()=>{initialized++;return true;});
  adapter.applyValues(curve,{expressionX:"time + 5",expressionY:"",expressionZ:"("});
  adapter.finalize(curve,{kind:"Tr2CurveVector3Expression"});
  assert.equal(initialized,0);
  assert.deepEqual(curve._programs,oldPrograms,"stored hydration bypasses live setters");
  const written=new DictWriter().WriteObject(curve,{}, {persistOnly:true});
  assert.deepEqual([written.expressionX,written.expressionY,written.expressionZ],["time + 5","","("]);
  assert.deepEqual(Array.from(curve.GetValue(2,new Float32Array(3))),[7,2,3]);
  assert.notEqual(curve._programs[0],oldPrograms[0]);
  assert.equal(curve._programs[1],oldPrograms[1]);assert.equal(curve._programs[2],oldPrograms[2]);
  assert.deepEqual(curve._compiledSources,["time + 5","2","3"]);
  adapter.applyValues(curve,{expressionX:"",expressionY:"time + 8",expressionZ:"4"});
  assert.deepEqual(Array.from(curve.Update(2,new Float32Array(4))),[7,10,4,0]);
  assert.equal(initialized,0);
});
