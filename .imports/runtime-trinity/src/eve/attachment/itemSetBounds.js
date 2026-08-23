// Source: E:\carbonengine\trinity\trinity\Utilities\BoundingBox.h (CreateItemSetBoundingBoxes)
// Source: E:\carbonengine\trinity\trinity\Utilities\BoundingBox.cpp (GetItemSetAabb)
//
// The bounds pair every packed attachment set keeps: one static box for the
// items that ride the parent transform, and one box per BONE for the items that
// ride an animated bone. Carbon templates the builder over the item iterator
// and keys the bone boxes with a std::map (so they come out ascending); the
// port takes an item array and sorts to match.
//
// Item bounds are read through the item's own GetBounds(out), which fills a
// box3. Carbon types this per set - a Sphere for sprites, an AxisAlignedBox for
// haze/plane/spotlight - but every consumer immediately Includes it into a box,
// so the port converts at the source and keeps one contract here. A foreign
// duck that returns a packed sph3 or a { min, max } pair is still accepted.
//
// All box math is core-math: nothing here re-implements union, transform, or
// sphere-to-box.
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { MatrixCopyFrom3x4 } from "../lights/lightConversion.js";


const ITEM_BOUNDS = box3.create();
const BONE_MATRIX = mat4.create();
const BONE_BOUNDS = box3.create();

/**
 * Reads one item's authored bounds as a box3. A sph3 becomes its enclosing box,
 * which is what Carbon's `AxisAlignedBox::Include(Sphere)` does.
 * @param {box3} out
 * @param {Object} item - a GetBounds(out) duck
 * @returns {box3|null} out, or null when the item has no usable bounds
 */
function ReadItemBounds(out, item)
{
  if (!item?.GetBounds)
  {
    return null;
  }

  const bounds = item.GetBounds(out);

  if (bounds?.length === 6)
  {
    return bounds === out ? out : box3.copy(out, bounds);
  }

  if (bounds?.length === 4)
  {
    return box3.fromPositionRadius(out, bounds, sph3.radius(bounds));
  }

  // The pre-box3 duck shape ({ min, max }) some sets still return.
  if (bounds?.min && bounds?.max)
  {
    return box3.fromBounds(out, bounds.min, bounds.max);
  }

  return null;
}

/**
 * Carbon CreateItemSetBoundingBoxes (BoundingBox.h:60-91): splits a set's items
 * into one static box plus one box per bone. An unskinned set, or an item with
 * a negative bone index, lands in the static box - Carbon groups ALL of those
 * together regardless of bone.
 *
 * `staticBounds` and `boneBounds` are the caller's own storage (Carbon's
 * `m_aabb` and `m_boundingBoxes` members); both are cleared first. Bone entries
 * are `{ boneIndex, bounds }` in ascending bone order, and their boxes are
 * reused across rebuilds where the count allows.
 *
 * @param {box3} staticBounds - receives the unskinned union
 * @param {Array} boneBounds - receives [{ boneIndex, bounds }], ascending
 * @param {Boolean} skinned
 * @param {Array} items - GetBounds/GetBoneIndex ducks
 * @returns {Array} boneBounds
 */
export function CreateItemSetBoundingBoxes(staticBounds, boneBounds, skinned, items)
{
  box3.empty(staticBounds);

  const byBone = new Map();

  for (const item of items ?? [])
  {
    const bounds = ReadItemBounds(ITEM_BOUNDS, item);
    if (!bounds)
    {
      continue;
    }

    const boneIndex = item.GetBoneIndex ? item.GetBoneIndex() : -1;

    if (skinned && boneIndex >= 0)
    {
      const existing = byBone.get(boneIndex);
      if (existing)
      {
        box3.union(existing, existing, bounds);
      }
      else
      {
        byBone.set(boneIndex, box3.clone(bounds));
      }
    }
    else
    {
      // Carbon groups every unskinned item into one box, bone index or not.
      box3.union(staticBounds, staticBounds, bounds);
    }
  }

  boneBounds.length = 0;
  for (const boneIndex of [...byBone.keys()].sort((a, b) => a - b))
  {
    boneBounds.push({ boneIndex, bounds: byBone.get(boneIndex) });
  }

  return boneBounds;
}

/**
 * Carbon GetItemSetAabb (BoundingBox.cpp:815-834): the static box unioned with
 * every bone box, each transformed by its bone when the caller supplied one.
 *
 * A bone index at or beyond `boneCount` contributes its box UNTRANSFORMED -
 * Carbon's else branch, not a skip - so a set whose bones have not arrived yet
 * still reports bounds in the parent's space.
 *
 * @param {box3} out
 * @param {box3} staticBounds
 * @param {Array} boneBounds - [{ boneIndex, bounds }]
 * @param {Float32Array} [bones] - flat Float4x3 list, stride 12
 * @param {Number} [boneCount]
 * @returns {box3} out
 */
export function GetItemSetAabb(out, staticBounds, boneBounds, bones = null, boneCount = 0)
{
  box3.copy(out, staticBounds);

  for (const entry of boneBounds ?? [])
  {
    if (bones && entry.boneIndex < boneCount)
    {
      MatrixCopyFrom3x4(BONE_MATRIX, bones, entry.boneIndex);
      box3.transformMat4(BONE_BOUNDS, entry.bounds, BONE_MATRIX);
      box3.union(out, out, BONE_BOUNDS);
    }
    else
    {
      box3.union(out, out, entry.bounds);
    }
  }

  return out;
}
