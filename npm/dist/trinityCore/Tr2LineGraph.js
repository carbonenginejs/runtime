import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_name, _init_extra_name, _init_color, _init_extra_color;

/** A rolling sample history with named markers and running statistics, drawn as a line graph. */
let _Tr2LineGraph;
class Tr2LineGraph extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_color, _init_extra_color, _initProto],
      c: [_Tr2LineGraph, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2LineGraph",
      family: "trinityCore"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.color], 16, "color"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddMarker"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetStatsHistory"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetSize"], [[impl, impl.adapted], 18, "Add"], [[impl, impl.implemented], 18, "GetSize"], [[impl, impl.implemented], 18, "GetMaxValue"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_color(this);
  }
  #currentIndex = (_initProto(this), 0);
  #data = new Array(200).fill(0);
  #markers = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_name(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

  /** Carbon method AddMarker (MAP_METHOD_AND_WRAP). */
  AddMarker(name) {
    const last = this.#markers.at(-1);
    if (last?.index === this.#currentIndex) {
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
  GetStatsHistory() {
    return this.#data.slice(this.#currentIndex).concat(this.#data.slice(0, this.#currentIndex));
  }

  /** Carbon method SetSize (MAP_METHOD_AND_WRAP). */
  SetSize(size) {
    const length = Math.max(0, Math.trunc(Number(size)) || 0);
    if (length < this.#data.length) {
      this.#data.length = length;
    } else {
      while (this.#data.length < length) this.#data.push(0);
    }
    this.#currentIndex = 0;
  }

  /** Adds a sample through Carbon's ICcpStatisticsAccumulator interface. */
  Add(value) {
    if (!this.#data.length) return false;
    for (let i = this.#markers.length - 1; i >= 0; i--) {
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
  GetSize() {
    return this.#data.length;
  }

  /**
   * The largest sample currently in the history.
   */
  GetMaxValue() {
    let maximum = 0;
    for (const value of this.#data) {
      if (value > maximum) maximum = value;
    }
    return maximum;
  }
  static {
    _initClass();
  }
}

export { _Tr2LineGraph as Tr2LineGraph };
//# sourceMappingURL=Tr2LineGraph.js.map
