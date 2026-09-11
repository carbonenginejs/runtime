// Per-object constant-buffer layout for `EveLensflarePerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Types } = CjsConstantLayout;


/**
 * EveLensflare.cpp:41-45 - same bytes bound to VS and PS. `indices[2..3]` are
 * never written in Carbon and are left as allocator garbage.
 */
export class CjsEveLensflareLayout
{
  static structConfig = Object.freeze({
    shared: {
        struct: "EveLensflarePerObjectData",
        fields: {
            directionScale: { type: Types.VECTOR4 },
            indices: { type: Types.UINT32, count: 4 }
        }
    }
  });
}
