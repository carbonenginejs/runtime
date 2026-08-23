import { toHalfFloat } from "#math/num";


/** Carbon byte size for EveChildQuad::Quad and EveSmartLightQuad::SimplifiedQuad. */
export const QUAD_INSTANCE_SIZE = 108;


/**
 * Packs the shared Carbon quad instance shape into terminal little-endian bytes.
 *
 * The six transform rows are float32, followed by a half4 color and half2
 * brightness. The quad renderer copies these bytes without interpreting them.
 */
export function packQuadInstanceData(record, out = new Uint8Array(QUAD_INSTANCE_SIZE))
{
  if (!(out instanceof Uint8Array) || out.byteLength < QUAD_INSTANCE_SIZE)
  {
    throw new TypeError(`Quad instance output must provide at least ${QUAD_INSTANCE_SIZE} bytes.`);
  }

  const view = new DataView(out.buffer, out.byteOffset, QUAD_INSTANCE_SIZE);
  let byteOffset = 0;

  for (const values of [
    record.parentTransform0,
    record.parentTransform1,
    record.parentTransform2,
    record.localTransform0,
    record.localTransform1,
    record.localTransform2
  ])
  {
    for (let lane = 0; lane < 4; lane++)
    {
      view.setFloat32(byteOffset, values[lane], true);
      byteOffset += 4;
    }
  }

  for (let lane = 0; lane < 4; lane++)
  {
    view.setUint16(byteOffset, toHalfFloat(record.color[lane]), true);
    byteOffset += 2;
  }

  for (let lane = 0; lane < 2; lane++)
  {
    view.setUint16(byteOffset, toHalfFloat(record.brightness[lane]), true);
    byteOffset += 2;
  }

  return out.byteLength === QUAD_INSTANCE_SIZE
    ? out
    : out.subarray(0, QUAD_INSTANCE_SIZE);
}
