// Source: trinity/trinity/Eve/UI/EveSpherePinIndexTree.h
// Source: trinity/trinity/Eve/UI/EveSpherePinIndexTree.cpp
// Hand-maintained CPU implementation of the native, non-Blue geometry index.
import { meta } from "#schema";
import { TreeNode } from "./TreeNode.js";
import { Face } from "./Face.js";

/** Splits the greater angular extent; ties split theta (cpp:49-84). */
function CreateChildNodes(node)
{
  const left = node.left = new TreeNode(), right = node.right = new TreeNode();
  for (const child of [left, right])
  {
    child.thetaMin = node.thetaMin;
    child.thetaMax = node.thetaMax;
    child.phiMin = node.phiMin;
    child.phiMax = node.phiMax;
  }
  if (node.phiMax - node.phiMin > node.thetaMax - node.thetaMin)
  {
    left.phiMax = right.phiMin = 0.5 * (node.phiMax + node.phiMin);
  }
  else
  {
    left.thetaMax = right.thetaMin = 0.5 * (node.thetaMax + node.thetaMin);
  }
}

/** Creates the native fixed-depth tree, with nine levels including its root. */
function CreateTree(node, levels)
{
  if (!node)
  {
    node = new TreeNode();
    node.phiMin = -Math.PI;
    node.phiMax = Math.PI;
    node.thetaMin = -Math.PI / 2;
    node.thetaMax = Math.PI / 2;
  }
  if (--levels)
  {
    CreateChildNodes(node);
    CreateTree(node.left, levels);
    CreateTree(node.right, levels);
  }
  return node;
}

/** Native strict/asymmetric angular overlap; touching an upper boundary can miss. */
function OverlapTest(node, minTheta, maxTheta, minPhi, maxPhi)
{
  const phi = (minPhi < node.phiMin && maxPhi > node.phiMin)
    || (minPhi < node.phiMax && minPhi >= node.phiMin);
  const theta = (minTheta < node.thetaMin && maxTheta > node.thetaMin)
    || (minTheta < node.thetaMax && minTheta >= node.thetaMin);
  return theta && phi;
}

/** Inserts a face in every overlapping leaf, retaining native seam asymmetry. */
function AddFaceToTree(node, face, spherical)
{
  if (node.left && node.right)
  {
    const a = spherical[face.index1], b = spherical[face.index2], c = spherical[face.index3];
    const minTheta = Math.min(a[0], b[0], c[0]), maxTheta = Math.max(a[0], b[0], c[0]);
    let minPhi = Math.min(a[1], b[1], c[1]), maxPhi = Math.max(a[1], b[1], c[1]);
    if (maxPhi - minPhi > Math.PI)
    {
      const oldMin = minPhi;
      minPhi = maxPhi;
      maxPhi = oldMin + 2 * Math.PI;
    }
    // Native quirk (cpp:325-330): no second insertion on the negative seam.
    if (OverlapTest(node.left, minTheta, maxTheta, minPhi, maxPhi)) AddFaceToTree(node.left, face, spherical);
    if (OverlapTest(node.right, minTheta, maxTheta, minPhi, maxPhi)) AddFaceToTree(node.right, face, spherical);
    return;
  }
  node.faces.push(face);
}

/**
 * Selects the sphere triangles touched by a pin using Carbon's angular tree.
 * The decoded geometry payload replaces both native CMF and Granny streams.
 * This native helper has no Blue identity or serialized fields.
 */
export class EveSpherePinIndexTree
{
  granny = null;
  tree = null;
  faces = null;
  initialized = 0;
  markedFaces = [];

  /** Retains the CPU geometry resource supplied by the pin's shared cache. */
  constructor(granny)
  {
    this.granny = granny;
  }

  /**
   * Builds mesh zero / LOD zero from decoded positions and ordered index groups.
   * JS payload channels replace format-specific byte streams; malformed or absent
   * channels return failure rather than performing native invalid memory access.
   */
  @meta.adapted
  Initialize()
  {
    this.initialized = 0;
    if (!this.granny || !this.granny.IsGood()) return 0;
    const mesh = this.granny.GetPayload()?.meshes?.[0];
    if (!mesh) return 0;
    const lod = mesh.lods?.[0] ?? mesh;
    const positions = (lod.vertex ?? mesh.vertex)?.position;
    const groups = lod.indices ?? mesh.indices;
    if (!positions || !groups) return 0;
    this.tree = CreateTree(null, 9);
    this.faces = [];
    this.markedFaces.length = 0;
    const spherical = [];
    for (let i = 0; i < positions.length; i += 3)
    {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      spherical.push([Math.PI / 2 - Math.acos(y / Math.hypot(x, y, z)), Math.atan2(-z, x)]);
    }
    for (const group of groups)
    {
      const indices = group.faces;
      for (let i = 0; i + 2 < indices.length; i += 3)
      {
        const face = new Face();
        face.index1 = indices[i];
        face.index2 = indices[i + 1];
        face.index3 = indices[i + 2];
        const offsets = [face.index1 * 3, face.index2 * 3, face.index3 * 3];
        if (offsets.some(offset => offset < 0 || offset + 2 >= positions.length))
        {
          this.tree = this.faces = null;
          return 0;
        }
        for (let axis = 0; axis < 3; axis++)
        {
          const a = positions[offsets[0] + axis], b = positions[offsets[1] + axis], c = positions[offsets[2] + axis];
          face.center[axis] = (Math.min(a, b, c) + Math.max(a, b, c)) / 2;
        }
        for (const offset of offsets)
        {
          face.radius = Math.max(face.radius, Math.hypot(
            positions[offset] - face.center[0],
            positions[offset + 1] - face.center[1],
            positions[offset + 2] - face.center[2]
          ));
        }
        this.faces.push(face);
        AddFaceToTree(this.tree, face, spherical);
      }
    }
    this.initialized = 1;
    return 1;
  }

  /** Native readiness flag. */
  @meta.implemented
  IsInitialized()
  {
    return this.initialized;
  }

  /** Marks each matching face once in left-before-right tree traversal order. */
  @meta.implemented
  MarkFaces(node, minTheta, maxTheta, minPhi, maxPhi)
  {
    let count = 0;
    if (node.left && node.right)
    {
      if (OverlapTest(node.left, minTheta, maxTheta, minPhi, maxPhi)) count += this.MarkFaces(node.left, minTheta, maxTheta, minPhi, maxPhi);
      if (OverlapTest(node.right, minTheta, maxTheta, minPhi, maxPhi)) count += this.MarkFaces(node.right, minTheta, maxTheta, minPhi, maxPhi);
      return count;
    }
    for (const face of node.faces)
    {
      if (!face.flag)
      {
        face.flag = true;
        count++;
        this.markedFaces.push(face);
      }
    }
    return count;
  }

  /**
   * Writes { primitives, indices } in place of native reference out parameters.
   * Only primitives * 3 entries are accepted: native keeps the rejected tail.
   * Query radius remains both angular and Cartesian, and uint16 truncation and
   * unclamped pole tests are preserved (cpp:594-670).
   */
  @meta.adapted
  GetIndices(point, radius, output)
  {
    if (!this.initialized) return 0;
    const theta = Math.PI / 2 - Math.acos(point[1] / Math.hypot(point[0], point[1], point[2]));
    const phi = Math.atan2(-point[2], point[0]);
    let minTheta = theta - radius, maxTheta = theta + radius, minPhi, maxPhi;
    if (theta >= 0)
    {
      if (Math.acos(point[1]) < radius)
      {
        minPhi = -Math.PI;
        maxPhi = Math.PI;
        maxTheta = Math.PI / 2;
      }
      else
      {
        minPhi = phi - radius / Math.cos(maxTheta);
        maxPhi = phi + radius / Math.cos(maxTheta);
      }
    }
    else if (Math.acos(-point[1]) < radius)
    {
      minPhi = -Math.PI;
      maxPhi = Math.PI;
      minTheta = -Math.PI / 2;
    }
    else
    {
      minPhi = phi - radius / Math.cos(minTheta);
      maxPhi = phi + radius / Math.cos(minTheta);
    }
    let count;
    if (maxPhi > Math.PI)
    {
      count = this.MarkFaces(this.tree, minTheta, maxTheta, minPhi, Math.PI)
        + this.MarkFaces(this.tree, minTheta, maxTheta, -Math.PI, maxPhi - 2 * Math.PI);
    }
    else if (minPhi < -Math.PI)
    {
      count = this.MarkFaces(this.tree, minTheta, maxTheta, 2 * Math.PI + minPhi, Math.PI)
        + this.MarkFaces(this.tree, minTheta, maxTheta, -Math.PI, maxPhi);
    }
    else count = this.MarkFaces(this.tree, minTheta, maxTheta, minPhi, maxPhi);
    output.indices.length = count * 3;
    output.indices.fill(0);
    let accepted = 0;
    for (const face of this.markedFaces)
    {
      face.flag = false;
      const distance = Math.hypot(face.center[0] - point[0], face.center[1] - point[1], face.center[2] - point[2]);
      if (distance <= radius + face.radius)
      {
        output.indices[accepted * 3] = face.index1 & 0xffff;
        output.indices[accepted * 3 + 1] = face.index2 & 0xffff;
        output.indices[accepted * 3 + 2] = face.index3 & 0xffff;
        accepted++;
      }
    }
    output.primitives = accepted;
    this.markedFaces.length = 0;
    return 1;
  }
}
