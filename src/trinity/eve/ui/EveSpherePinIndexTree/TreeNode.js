import { meta } from "#schema";
// Source: trinity/trinity/Eve/UI/EveSpherePinIndexTree.cpp
/** Native TreeNode storage; plain JS links replace allocated C++ child pointers. */
@meta.define({ className: "TreeNode", donors: ["EveSpherePinIndexTree::TreeNode"] })
export class TreeNode
{
  thetaMin = 0;
  thetaMax = 0;
  phiMin = 0;
  phiMax = 0;
  left = null;
  right = null;
  faces = [];
}
