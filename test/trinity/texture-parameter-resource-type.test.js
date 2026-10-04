// TriTextureParameter records what its effect declares for its name
// (Carbon m_resourceType / m_bindlessColorSpace, TriTextureParameter.cpp:315-364).
import assert from "node:assert/strict";
import test from "node:test";

import { Tr2Shader, TriTextureParameter } from "../../npm/dist/trinity/index.js";
import { Tr2EffectResource, Tr2EffectParameterAnnotation } from "../../npm/dist/resource/shader/index.js";
import { Tr2ColorSpace } from "../../npm/dist/global/consts/renderContext/index.js";


const { Type } = Tr2EffectResource;


/** A shader whose reflection answers from plain tables. */
function shaderWith({ resources = {}, constants = {}, annotations = {} })
{
  const shader = new Tr2Shader();
  shader.GetResource = name => resources[name] ?? null;
  shader.GetConstant = name => constants[name] ?? null;
  shader.GetParameterAnnotations = name => annotations[name] ?? null;
  return shader;
}


function annotation(name, type, value)
{
  const record = new Tr2EffectParameterAnnotation();
  record.name = name;
  record.type = type;
  if (type === Tr2EffectParameterAnnotation.Type.INT) record.intValue = value;
  else record.boolValue = value;
  return record;
}


function parameterNamed(name)
{
  const parameter = new TriTextureParameter();
  parameter.SetParameterName(name);
  return parameter;
}


test("a parameter starts typeless and linear (cpp:13, :17)", () =>
{
  const parameter = parameterNamed("EnvMap");
  assert.equal(parameter._resourceType, Type.TEXTURE_TYPELESS);
  assert.equal(parameter._bindlessColorSpace, Tr2ColorSpace.COLOR_SPACE_LINEAR);
});


test("a reflected resource gives its declared type", () =>
{
  const parameter = parameterNamed("EnvMap");
  parameter.RebuildEffectHandles(shaderWith({ resources: { EnvMap: { type: Type.TEXTURE_CUBE } } }));
  assert.equal(parameter._resourceType, Type.TEXTURE_CUBE);
  assert.equal(parameter.usedByCurrentEffect, true);
});


test("a bindless constant takes its type and colour space from its annotations", () =>
{
  const parameter = parameterNamed("Volume");
  parameter.RebuildEffectHandles(shaderWith({
    constants: { Volume: {} },
    annotations: { Volume: [
      annotation("BindlessHandleType", Tr2EffectParameterAnnotation.Type.INT, Type.TEXTURE_3D),
      annotation("Tr2sRGB", Tr2EffectParameterAnnotation.Type.BOOL, true)
    ] }
  }));
  assert.equal(parameter._resourceType, Type.TEXTURE_3D);
  assert.equal(parameter._bindlessColorSpace, Tr2ColorSpace.COLOR_SPACE_SRGB);
  assert.equal(parameter.usedByCurrentEffect, true);
});


test("a bindless constant without annotations is a linear 2D texture", () =>
{
  const parameter = parameterNamed("Plain");
  parameter.RebuildEffectHandles(shaderWith({ constants: { Plain: {} } }));
  assert.equal(parameter._resourceType, Type.TEXTURE_2D);
  assert.equal(parameter._bindlessColorSpace, Tr2ColorSpace.COLOR_SPACE_LINEAR);
});


test("an effect that does not use the name leaves the parameter unused", () =>
{
  const parameter = parameterNamed("Missing");
  parameter.RebuildEffectHandles(shaderWith({}));
  assert.equal(parameter.usedByCurrentEffect, false);
  assert.equal(parameter._resourceType, Type.TEXTURE_TYPELESS);
});
