import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/core-types/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { validateRgbaPayload } from '../format/payloadContract.js';
import { ValidateResourcePayload } from './resourceBoundary.js';

let _initProto, _initClass, _init_width, _init_extra_width, _init_height, _init_extra_height;

/**
 * Tr2ImageRes resource record.
 *
 * Carbon treats this as image payload data. Engine-gpu decides whether it ever
 * becomes device texture state.
 */
let _Tr2ImageRes;
new class extends _identity {
  static [class Tr2ImageRes extends _CjsResource {
    static {
      ({
        e: [_init_width, _init_extra_width, _init_height, _init_extra_height, _initProto],
        c: [_Tr2ImageRes, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ImageRes",
        family: "resources"
      })], [[[io, io.persist, type, type.uint32], 16, "width"], [[io, io.persist, type, type.uint32], 16, "height"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetWidth"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHeight"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPixelColor"], [[carbon, carbon.method, impl, impl.adapted], 18, "IsPixelOpaque"]], 0, void 0, _CjsResource));
    }
    width = (_initProto(this), _init_width(this, 0));
    height = (_init_extra_width(this), _init_height(this, 0));
    constructor(values = null) {
      super(), _init_extra_height(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }

    /**
     * Attach a plain canonical RGBA payload and mirror Carbon-exposed metadata.
     *
     * @param {object|null} payload
     * @param {object|null} options
     * @returns {Tr2ImageRes}
     */
    SetPayload(payload = null, options = null) {
      if (payload === null) {
        super.SetPayload(null);
        return this;
      }
      ValidateResourcePayload("Tr2ImageRes", payload, validateRgbaPayload);
      const values = {
        ...(options || {})
      };
      values.width = payload.width;
      values.height = payload.height;
      super.SetPayload(payload);
      this.SetValues(values);
      return this;
    }

    /**
     * Return image width in pixels.
     *
     * @returns {number}
     */
    GetWidth() {
      return this.width || 0;
    }

    /**
     * Return image height in pixels.
     *
     * @returns {number}
     */
    GetHeight() {
      return this.height || 0;
    }

    /**
     * Read pixel color from payload metadata when a simple pixel accessor exists.
     *
     * @param {number} x
     * @param {number} y
     * @returns {*}
     */
    GetPixelColor(x = 0, y = 0) {
      const payload = this.GetPayload();
      if (!payload || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= payload.width || y >= payload.height) return null;
      const elementsPerRow = payload.strideBytes / payload.data.BYTES_PER_ELEMENT;
      const offset = y * elementsPerRow + x * 4;
      return Array.from(payload.data.subarray(offset, offset + 4));
    }

    /**
     * Return true when a pixel alpha channel is absent or non-zero.
     *
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    IsPixelOpaque(x = 0, y = 0) {
      const color = this.GetPixelColor(x, y);
      if (!Array.isArray(color)) return false;
      return color.length < 4 || color[3] > 0;
    }
  }];
  payload = "image";
  constructor() {
    super(_Tr2ImageRes), _initClass();
  }
}();

export { _Tr2ImageRes as Tr2ImageRes };
//# sourceMappingURL=Tr2ImageRes.js.map
