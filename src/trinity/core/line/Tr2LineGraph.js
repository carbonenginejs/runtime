// Source: trinity/trinity/Tr2LineGraph.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";

/** A rolling sample history with named markers and running statistics, drawn as a line graph. */
@type.define({ className: "Tr2LineGraph", family: "trinityCore" })
export class Tr2LineGraph extends CjsModel
{

  #currentIndex = 0;

  #data = new Array(200).fill(0);

  #markers = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** Carbon method AddMarker (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
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

  /** Carbon method GetStatsHistory (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetStatsHistory()
  {
    return this.#data.slice(this.#currentIndex).concat(this.#data.slice(0, this.#currentIndex));
  }

  /** Carbon method SetSize (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
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

  /** Adds a sample through Carbon's ICcpStatisticsAccumulator interface. */
  @impl.adapted
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
   */
  @impl.implemented
  GetSize()
  {
    return this.#data.length;
  }

  /**
   * The largest sample currently in the history.
   */
  @impl.implemented
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
