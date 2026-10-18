// Source: trinity/trinityal/dx11/Tr2VertexLayoutALDx11.h
// Source: trinity/trinityal/dx11/Tr2VertexLayoutALDx11.cpp
// Source: trinity/trinityal/include/Tr2VertexLayoutAL.h
//
// The WebGL2 vertex layout: a vertex definition, and per vertex shader the
// attribute plan that feeds it.
//
// dx11's `Create` turns each definition item into a `D3D11_INPUT_ELEMENT_DESC`
// (`Tr2VertexLayoutALDx11.cpp:78-99`), and `SetLayout` resolves those against a
// vertex shader's declared inputs, fabricating an element for any input the
// definition lacks, caching one input layout per shader and binding it
// (`:157-226`). WebGL2 has no input-layout object: attributes are pointers into
// the buffers bound at draw time. So the same resolution produces an ATTRIBUTE
// PLAN - per shader input, its attribute location, format, stream, offset and
// instance divisor - which the render context applies against its bound
// vertex streams, as a vertex array object would.
//
// - LOCATIONS are the inputs' DXBC registers: `Tr2ShaderProgramALWebgl2` binds
//   each vertex input's attribute location to its register before linking.
// - MATCHING is Carbon's, shared with every backend
//   (`trinityal/vertexLayoutMatch.js`): semantic and index only.
// - AN UNMATCHED INPUT is where dx11 fabricates an element reading from a slot
//   nothing is bound to. WebGL2 supplies nothing the same way by disabling the
//   attribute array and setting a constant zero, which is what the plan records.
//
// Formats: the three-component byte, short and half types have no DXGI format,
// and dx11 asserts on them; WebGL2 can read them, so they map here.

import { CjsSchema, blue, meta, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { resolveBindingPlan } from "../vertexLayoutMatch.js";
import { IsVertexElementType, VertexElementType } from "#resource/geometry/vertex";


/**
 * The WebGL2 attribute format of a vertex element: dx11's `GetDxgiDataType`
 * table (`Tr2VertexLayoutALDx11.cpp:25-76`) in GL's terms.
 *
 * The element is decomposed by the geometry layer's `VertexElementType`, the
 * one WebGPU's format table reads, so both vocabularies a declaration holds
 * are accepted: a Carbon DataType name that carries its count (`FLOAT32_3`,
 * `UBYTE_4_NORM`, `UINT32_2`), or a geometry payload's type plus
 * `elementCount` (`Float32` x 3). A combined declaration has both - the
 * mesh's payload items and Carbon-named instance items added after them
 * (`EveChildInstancedMeshes.cpp:715-724`). An unnormalized integer is
 * `integer`, which the render context binds with `vertexAttribIPointer`, as
 * D3D's `_UINT` and `_SINT` formats reach the shader as integers.
 *
 * @param {WebGL2RenderingContext} gl The context whose enums to use.
 * @param {string|object} element A declaration element, or a bare Carbon DataType name.
 * @returns {{size: number, type: number, normalized: boolean, integer: boolean, bytes: number}|null}
 *   The format, or null for an unknown type.
 */
export function AttributeFormat(gl, element)
{
  const described = typeof element === "string" ? { type: element } : element;
  if (!IsVertexElementType(described.type)) return null;

  const { base, bits, count, normalized, bytes } = VertexElementType(described);
  const TYPES = {
    "float:32": gl.FLOAT,
    "float:16": gl.HALF_FLOAT,
    "uint:32": gl.UNSIGNED_INT,
    "sint:32": gl.INT,
    "uint:16": gl.UNSIGNED_SHORT,
    "sint:16": gl.SHORT,
    "uint:8": gl.UNSIGNED_BYTE,
    "sint:8": gl.BYTE
  };

  return { size: count, type: TYPES[`${base}:${bits}`], normalized, integer: base !== "float" && !normalized, bytes };
}


/**
 * A vertex layout on a WebGL2 device.
 */
export class Tr2VertexLayoutALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_definition: `{ location?, format, stream, offset, divisor, usage, usageIndex }` per item. */
  _definition = [];

  /** The definition as given, for matching. */
  _items = [];

  /** m_layout: attribute plans, one per vertex shader. */
  _layout = new Map();

  /** The plan `SetLayout` last selected, which the render context applies. */
  _current = null;

  /** m_name */
  _name = "";

  /** The context the layout was created on. */
  _gl = null;

  /**
   * Converts a vertex definition's items (`Tr2VertexLayoutALDx11.cpp:78-99`).
   *
   * @param {object} definition A `Tr2VertexDefinition`, or a plain item array.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @meta.adapted
  Create(definition, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    const gl = al.GetWebgl2();
    const items = definition?.items ?? definition ?? [];
    const converted = [];

    for (const item of items)
    {
      const format = AttributeFormat(gl, item);
      if (!format) return ALResult.E_INVALIDARG;

      converted.push({
        usage: item.usage,
        usageIndex: item.usageIndex,
        format,
        stream: item.stream,
        offset: item.offset,
        divisor: item.instanceStepRate
      });
    }

    this._Reset();
    this._gl = gl;
    this._items = items;
    this._definition = converted;

    return ALResult.S_OK;
  }

  /**
   * Selects the attribute plan for a vertex shader, building it on first use
   * (`Tr2VertexLayoutALDx11.cpp:157-226`). dx11 binds the input layout here;
   * WebGL2 has none, so the plan becomes current and the render context
   * applies it against its bound streams at the draw.
   *
   * @param {import("./Tr2ShaderALWebgl2.js").Tr2ShaderALWebgl2} vertexShader The vertex stage.
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @meta.adapted
  SetLayout(vertexShader, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !vertexShader || this._definition.length === 0) return ALResult.E_FAIL;

    let plan = this._layout.get(vertexShader);

    if (!plan)
    {
      const inputs = vertexShader.GetSignature()?.pipelineInputs ?? [];
      const resolved = resolveBindingPlan(this._items, inputs);

      plan = resolved.entries.map(entry =>
      {
        const index = entry.element ? this._items.indexOf(entry.element) : -1;
        const item = index >= 0 ? this._definition[index] : null;

        return item
          ? { location: entry.registerIndex, format: item.format, stream: item.stream, offset: item.offset, divisor: item.divisor, constant: null }
          : { location: entry.registerIndex, format: null, stream: null, offset: 0, divisor: 0, constant: entry.fallbackType };
      });

      this._layout.set(vertexShader, plan);
    }

    this._current = plan;
    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy` (`:101-105`): clears the definition and every cached plan. */
  _Reset()
  {
    this._layout = new Map();
    this._definition = [];
    this._items = [];
    this._current = null;
    this._gl = null;
  }

  /** Releases the layout and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the layout holds a definition.
   *
   * @returns {boolean} True once created with items.
   */
  IsValid()
  {
    return this._definition.length > 0;
  }

  /**
   * Which memory class this layout occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the layout for the device-resource registry, with dx11's key.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2VertexLayoutAL";
  }

  /**
   * Names the layout. WebGL has no debug names, so it is kept for `Describe`.
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }

  /**
   * The attribute plan `SetLayout` last selected: per vertex-shader input,
   * `{ location, format, stream, offset, divisor, constant }`. `constant` is
   * the fallback scalar type of an input the definition cannot feed, which the
   * render context supplies as a constant zero.
   *
   * @returns {object[]|null} The plan.
   */
  GetCurrentPlan()
  {
    return this._current;
  }
}

CjsSchema.decorateField(Tr2VertexLayoutALWebgl2, "_name", type.string);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "Create", blue.method);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "SetLayout", blue.method);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "Destroy", blue.method);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "IsValid", blue.method);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "GetMemoryClass", blue.method);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "Describe", blue.method);
CjsSchema.decorateMethod(Tr2VertexLayoutALWebgl2, "SetName", blue.method);
CjsSchema.blue.define(Tr2VertexLayoutALWebgl2, { className: "Tr2VertexLayoutALWebgl2", donors: [ "Tr2VertexLayoutAL" ] });
