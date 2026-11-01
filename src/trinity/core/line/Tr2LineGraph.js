import { IRoot } from "../../../blue/blueexposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2LineGraph.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { Tr2DeviceResource } from "../device/Tr2DeviceResource.js";

/** A rolling sample history with named markers and running statistics, drawn as a line graph. */
@be.define("Tr2LineGraph")
@be.inherit(Tr2DeviceResource)

export class Tr2LineGraph extends IRoot
{

  #currentIndex = 0;

  #data = new Array(200).fill(0);

  #markers = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_color (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /**
   * Carbon: Tr2LineGraph::GetName (Tr2LineGraph.cpp:323-326).
   *
   * @implemented
   * @returns {string} The graph's name.
   */
  GetName()
  {
    return this.name;
  }

  /**
   * Carbon: Tr2LineGraph::GetColor (Tr2LineGraph.cpp:313-316). Carbon returns a const
   * reference to m_color; JavaScript has no const reference, so the colour is copied into
   * the caller's vector.
   *
   * @adapted
   * @param {vec4} out Receives the colour.
   * @returns {vec4} out
   */
  GetColor(out)
  {
    return vec4.copy(out, this.color);
  }

  /**
   * Carbon: Tr2LineGraph::SetColor (Tr2LineGraph.cpp:318-321).
   *
   * @implemented
   * @param {vec4} val The colour to copy in.
   * @returns {void}
   */
  SetColor(val)
  {
    vec4.copy(this.color, val);
  }

  /**
   * Carbon: Tr2LineGraph::OnPrepareResources (Tr2LineGraph.cpp:41-106), private, the
   * Tr2DeviceResource hook.
   *
   * Not implemented. It builds the line-list vertex buffer (Tr2BufferAL, WRITE_OFTEN), the
   * FLOAT32_2 POSITION vertex declaration handle (Tr2EffectStateManager), and the shared
   * line-graph effect with the lineGraphScale / lineGraphColor global variables
   * (LINEGRAPH_EFFECT_PATH); none of that device path is ported for this class, and
   * Tr2LineGraph is not registered as a Tr2DeviceResource.
   *
   * @notImplemented
   * @returns {boolean} Never returns.
   */
  _OnPrepareResources()
  {
    throw new Error("Tr2LineGraph._OnPrepareResources requires the unported line-graph vertex buffer, vertex declaration and effect path.");
  }

  /**
   * Carbon: Tr2LineGraph::ReleaseResources (Tr2LineGraph.cpp:108-114), the ITriDeviceResource hook.
   *
   * Not implemented: it drops the vertex buffer and declaration that OnPrepareResources
   * would have made (see _OnPrepareResources).
   *
   * @notImplemented
   * @param {number} _storage A TriStorage value.
   * @returns {void}
   */
  ReleaseResources(_storage)
  {
    throw new Error("Tr2LineGraph.ReleaseResources requires the unported line-graph vertex buffer and declaration.");
  }

  /**
   * Carbon: Tr2LineGraph::Render (Tr2LineGraph.cpp:175-306).
   *
   * Not implemented. It needs _OnPrepareResources (see there), the buffer map/write of the
   * line vertices, Tr2Renderer::PrintfImmediate for the marker labels (unported), and the
   * effect's ApplyAllStateForPass / ApplyMaterialDataForPass with a line-list draw.
   *
   * @notImplemented
   * @param {number} _scale The vertical scale.
   * @param {object} _renderContext The Tr2RenderContext.
   * @returns {void}
   */
  Render(_scale, _renderContext)
  {
    throw new Error("Tr2LineGraph.Render requires the unported line-graph device path and Tr2Renderer.PrintfImmediate.");
  }

  /**
   * Carbon method AddMarker (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  AddMarker(name)
  {
    const last = this.#markers.at(-1);
    if (last?.index === this.#currentIndex)
    {
      last.values.push(String(name));
      return;
    }
    this.#markers.push({
      index: this.#currentIndex,
      ticksLeft: this.#data.length,
      values: [String(name)]
    });
  }

  /**
   * Carbon method GetStatsHistory (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetStatsHistory()
  {
    return this.#data.slice(this.#currentIndex).concat(this.#data.slice(0, this.#currentIndex));
  }

  /**
   * Carbon method SetSize (MAP_METHOD_AND_WRAP).
   *
   * @adapted
   */
  @be.mapMethodAndWrap()
  SetSize(size)
  {
    const length = Math.max(0, Math.trunc(Number(size)) || 0);
    if (length < this.#data.length)
    {
      this.#data.length = length;
    }
    else
    {
      while (this.#data.length < length) this.#data.push(0);
    }
    this.#currentIndex = 0;
  }

  /**
   * Adds a sample through Carbon's ICcpStatisticsAccumulator interface.
   *
   * @adapted
   */
  Add(value)
  {
    if (!this.#data.length) return false;
    for (let i = this.#markers.length - 1; i >= 0; i--)
    {
      this.#markers[i].ticksLeft--;
      if (!this.#markers[i].ticksLeft) this.#markers.splice(i, 1);
    }
    this.#data[this.#currentIndex] = Number(value);
    this.#currentIndex = (this.#currentIndex + 1) % this.#data.length;
    return true;
  }

  /**
   * The number of samples the history retains.
   *
   * @implemented
   */
  GetSize()
  {
    return this.#data.length;
  }

  /**
   * The largest sample currently in the history.
   *
   * @implemented
   */
  GetMaxValue()
  {
    let maximum = 0;
    for (const value of this.#data)
    {
      if (value > maximum) maximum = value;
    }
    return maximum;
  }

}

CjsSchema.decorateMethod(Tr2LineGraph, "Add");
CjsSchema.decorateMethod(Tr2LineGraph, "GetSize");
CjsSchema.decorateMethod(Tr2LineGraph, "GetMaxValue");
