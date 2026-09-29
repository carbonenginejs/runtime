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

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { resolveBindingPlan } from "../vertexLayoutMatch.js";


/**
 * The WebGL2 attribute format of a Carbon vertex data type name, such as
 * `FLOAT32_3` or `UBYTE_4_NORM`: dx11's `GetDxgiDataType` table
 * (`Tr2VertexLayoutALDx11.cpp:25-76`) in GL's terms.
 *
 * @param {WebGL2RenderingContext} gl The context whose enums to use.
 * @param {string} dataType The data type name.
 * @returns {{size: number, type: number, normalized: boolean, integer: boolean, bytes: number}|null}
 *   The format, or null for an unknown name.
 */
export function AttributeFormat(gl, dataType)
{
  const match = /^(U?BYTE|U?SHORT|U?INT32|FLOAT16|FLOAT32)_([1-4])(_NORM)?$/u.exec(String(dataType));
  if (!match) return null;

  const [ , base, count, norm ] = match;
  const size = Number(count);
  const normalized = Boolean(norm);
  const TYPES = {
    BYTE: [ gl.BYTE, 1 ],
    UBYTE: [ gl.UNSIGNED_BYTE, 1 ],
    SHORT: [ gl.SHORT, 2 ],
    USHORT: [ gl.UNSIGNED_SHORT, 2 ],
    INT32: [ gl.INT, 4 ],
    UINT32: [ gl.UNSIGNED_INT, 4 ],
    FLOAT16: [ gl.HALF_FLOAT, 2 ],
    FLOAT32: [ gl.FLOAT, 4 ]
  };
  const [ type, width ] = TYPES[base];
  const float = base === "FLOAT16" || base === "FLOAT32";

  return { size, type, normalized, integer: !float && !normalized, bytes: size * width };
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
  @impl.adapted
  Create(definition, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    const gl = al.GetWebgl2();
    const items = definition?.items ?? definition ?? [];
    const converted = [];

    for (const item of items)
    {
      const format = AttributeFormat(gl, item.type);
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
  @impl.adapted
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
  @impl.custom
  GetCurrentPlan()
  {
    return this._current;
  }
}

CjsSchema.define(Tr2VertexLayoutALWebgl2, { className: "Tr2VertexLayoutALWebgl2", carbon: "Tr2VertexLayoutAL" });
