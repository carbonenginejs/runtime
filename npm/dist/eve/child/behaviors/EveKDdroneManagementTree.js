import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { PlaneType } from './enums.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_tree, _init_extra_tree, _init_debugSquareSize, _init_extra_debugSquareSize, _init_updateTimeCounter, _init_extra_updateTimeCounter, _init_maxFoundPerAgent, _init_extra_maxFoundPerAgent, _init_timeBetweenUpdate, _init_extra_timeBetweenUpdate, _init_agentRefs, _init_extra_agentRefs, _init_groupSearchReturnInfoBlock, _init_extra_groupSearchReturnInfoBlock, _init_agents, _init_extra_agents, _init_behaviorNbr, _init_extra_behaviorNbr, _init_radius, _init_extra_radius, _init_agent, _init_extra_agent, _init_rangeBetween, _init_extra_rangeBetween, _init_planeType, _init_extra_planeType, _init_b, _init_extra_b, _init_e, _init_extra_e, _init_left, _init_extra_left, _init_right, _init_extra_right;

/** A spatial index that builds and incrementally rebalances a k-d tree over a group's drone agents and answers nearest-neighbour and multi-radius range queries against it. */
let _EveKDdroneManagement;
new class extends _identity {
  static [class EveKDdroneManagementTree extends CjsModel {
    static {
      ({
        e: [_init_tree, _init_extra_tree, _init_debugSquareSize, _init_extra_debugSquareSize, _init_updateTimeCounter, _init_extra_updateTimeCounter, _init_maxFoundPerAgent, _init_extra_maxFoundPerAgent, _init_timeBetweenUpdate, _init_extra_timeBetweenUpdate, _init_agentRefs, _init_extra_agentRefs, _init_groupSearchReturnInfoBlock, _init_extra_groupSearchReturnInfoBlock, _init_agents, _init_extra_agents, _init_behaviorNbr, _init_extra_behaviorNbr, _init_radius, _init_extra_radius, _init_agent, _init_extra_agent, _init_rangeBetween, _init_extra_rangeBetween, _init_planeType, _init_extra_planeType, _init_b, _init_extra_b, _init_e, _init_extra_e, _init_left, _init_extra_left, _init_right, _init_extra_right, _initProto],
        c: [_EveKDdroneManagement, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveKDdroneManagementTree",
        family: "eve/child/behaviors"
      })], [[type.objectRef("Agent"), 0, "tree"], [[type, type.float32], 16, "debugSquareSize"], [[type, type.float32], 16, "updateTimeCounter"], [[type, type.uint64], 16, "maxFoundPerAgent"], [[type, type.float32], 16, "timeBetweenUpdate"], [type.list("Agent"), 0, "agentRefs"], [type.list("std::vector<std::vector<DroneAgent>>"), 0, "groupSearchReturnInfoBlock"], [type.list("DroneAgent"), 0, "agents"], [[type, type.int32], 16, "behaviorNbr"], [[type, type.float32], 16, "radius"], [type.objectRef("DroneAgent"), 0, "agent"], [[type, type.float32], 16, "rangeBetween"], [[type, type.int32, void 0, schema.enum("PlaneType")], 16, "planeType"], [[type, type.int32], 16, "b"], [[type, type.int32], 16, "e"], [type.objectRef("Agent"), 0, "left"], [type.objectRef("Agent"), 0, "right"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon copies the root AgentRef by value into m_tree; the JS port keeps a reference into agentRefs (same fields, shared identity).")], 18, "CreateTree"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateTree"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindClosestAgent"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindDronesInRange"]], 0, void 0, CjsModel));
    }
    /** m_tree (AgentRef) */
    tree = (_initProto(this), _init_tree(this, null));

    /** m_debugSquareSize (float) */
    debugSquareSize = (_init_extra_tree(this), _init_debugSquareSize(this, 0));

    /** m_updateTimeCounter (float) */
    updateTimeCounter = (_init_extra_debugSquareSize(this), _init_updateTimeCounter(this, 0));

    /** m_maxFoundPerAgent (size_t) */
    maxFoundPerAgent = (_init_extra_updateTimeCounter(this), _init_maxFoundPerAgent(this, 5));

    /** m_timeBetweenUpdate (float) */
    timeBetweenUpdate = (_init_extra_maxFoundPerAgent(this), _init_timeBetweenUpdate(this, 1));

    /** m_agentRefs (std::vector<AgentRef>) */
    agentRefs = (_init_extra_timeBetweenUpdate(this), _init_agentRefs(this, []));

    /** m_groupSearchReturnInfoBlock (std::vector<std::vector<std::vector<DroneAgent*>>>) */
    groupSearchReturnInfoBlock = (_init_extra_agentRefs(this), _init_groupSearchReturnInfoBlock(this, []));

    /** agents (std::vector<DroneAgent> &) */
    agents = (_init_extra_groupSearchReturnInfoBlock(this), _init_agents(this, []));

    /** behaviorNbr (int) */
    behaviorNbr = (_init_extra_agents(this), _init_behaviorNbr(this, 0));

    /** radius (float) */
    radius = (_init_extra_behaviorNbr(this), _init_radius(this, 0));

    /** agent (DroneAgent*) */
    agent = (_init_extra_radius(this), _init_agent(this, null));

    /** rangeBetween (float) */
    rangeBetween = (_init_extra_agent(this), _init_rangeBetween(this, 0));

    /** planeType (PlaneType - enum PlaneType) */
    planeType = (_init_extra_rangeBetween(this), _init_planeType(this, 0));

    /** b (int) */
    b = (_init_extra_planeType(this), _init_b(this, 0));

    /** e (int) */
    e = (_init_extra_b(this), _init_e(this, 0));

    /** left (AgentRef*) */
    left = (_init_extra_e(this), _init_left(this, null));

    /** right (AgentRef*) */
    right = (_init_extra_left(this), _init_right(this, null));

    // Reused SearchRange records ({behaviorNbr, radius}) - rebuilt each
    // FindDronesInRange call without reallocating the array shell.
    #searchRanges = (_init_extra_right(this), []);

    // Carbon threads activeRange as an int& through the recursive search; the
    // JS port carries it as instance state reset per agent.
    #activeRange = 0;

    /**
     * Builds the k-d tree over the agents and sizes the per-behavior search
     * result block (Carbon EveKDdroneManagementTree::CreateTree, cpp:18-42).
     * @param {Array} agents - DroneAgent records
     * @param {Number} numberOfBehaviors
     */
    CreateTree(agents, numberOfBehaviors) {
      if (!agents || agents.length === 0) {
        return;
      }
      this.#ChangeAgentsIntoAgentRefs(agents);
      this.tree = this.#SplitSort(0, agents.length - 1, _EveKDdroneManagement.PlaneType.Z);
      const infoBlock = this.groupSearchReturnInfoBlock;
      infoBlock.length = 0;
      for (let j = 0; j < numberOfBehaviors; j++) {
        const perAgentData = [];
        for (let i = 0; i < agents.length; i++) {
          perAgentData.push([]);
        }
        infoBlock.push(perAgentData);
      }
    }

    /**
     * Throttled incremental rebalance: every timeBetweenUpdate seconds each node
     * is checked against its children and locally re-sorted when the splitting
     * invariant broke (Carbon UpdateTree, cpp:44-55).
     * @param {Number} dt - delta time in seconds
     */
    UpdateTree(dt) {
      if (this.timeBetweenUpdate !== -1 && this.updateTimeCounter >= this.timeBetweenUpdate) {
        this.updateTimeCounter = 0;
        this.tree = this.#CompareNodeToChildren(this.tree);
      } else {
        this.updateTimeCounter += dt;
      }
    }

    /**
     * Standard nearest-neighbour tree search for callers outside the behavior
     * group (Carbon FindClosestAgent, cpp:276-289).
     * @param {Float32Array} pos
     * @returns {Object|null} the closest DroneAgent record
     */
    FindClosestAgent(pos) {
      if (!this.tree || !this.tree.agent) {
        return null;
      }
      const closest = {
        agent: this.tree.agent,
        rangeBetween: vec3.distance(this.tree.agent.position, pos)
      };
      this.#FindClosestAgentRecursive(pos, this.tree, closest);
      return closest.agent;
    }

    /**
     * Batched range search for every agent against every behavior's search
     * radius at once (Carbon FindDronesInRange, cpp:374-430). The result is
     * indexed [behaviorIndex][agentIndex] -> agents in range (up to
     * maxFoundPerAgent per Carbon's early-out bookkeeping).
     * @param {Array} agents - DroneAgent records
     * @param {Array<Number>} ranges - per-behavior search radii (-1 = don't care)
     * @param {Number} behaviorGroupBoundingSphereRadius
     * @returns {Array} groupSearchReturnInfoBlock
     */
    FindDronesInRange(agents, ranges, behaviorGroupBoundingSphereRadius) {
      const searchRanges = this.#searchRanges;
      searchRanges.length = 0;
      for (let behaviorNumber = 0; behaviorNumber < ranges.length; behaviorNumber++) {
        const radius = ranges[behaviorNumber];
        searchRanges.push({
          behaviorNbr: behaviorNumber,
          radius: radius === -1 ? -1 : radius + behaviorGroupBoundingSphereRadius
        });
      }
      searchRanges.sort(_EveKDdroneManagement.#CompareSearchRanges);
      const infoBlock = this.groupSearchReturnInfoBlock;
      if (infoBlock.length) {
        for (let j = 0; j < ranges.length && j < infoBlock.length; j++) {
          for (let i = 0; i < agents.length && i < infoBlock[j].length; i++) {
            infoBlock[j][i].length = 0;
          }
        }
      }
      if (searchRanges.length === 0) {
        return infoBlock;
      }
      if (searchRanges[0].radius === -1) {
        return infoBlock;
      }
      for (let c = 0; c < agents.length; c++) {
        this.#activeRange = 0;
        this.#SearchThroughTreeHelperFunction(infoBlock, this.tree, agents[c], searchRanges, c);
      }
      return infoBlock;
    }

    // Rebuilds the AgentRef shells over the live agents (Carbon
    // ChangeAgentsIntoAgentRefs, cpp:232-242).
    /**
     * Rebuilds the node shells, with default plane, bounds and null children, over the current live agents.
     */
    #ChangeAgentsIntoAgentRefs(agents) {
      const refs = this.agentRefs;
      refs.length = 0;
      for (const agent of agents) {
        refs.push({
          agent,
          planeType: _EveKDdroneManagement.PlaneType.X,
          b: 0,
          e: 0,
          left: null,
          right: null
        });
      }
    }

    // Recursive median split over agentRefs[b..e] (Carbon SplitSort,
    // cpp:202-230).
    /**
     * Recursively median-splits a range of agent references along an axis, building the tree node by node and cycling the split axis at each level.
     */
    #SplitSort(b, e, planeType) {
      const refs = this.agentRefs;
      if (b === e) {
        refs[b].b = b;
        refs[b].e = e;
        refs[b].left = null;
        refs[b].right = null;
        return refs[b];
      }
      if (b > e) {
        return null;
      }
      this.#SortByAxis(refs, b, e + 1, planeType);
      const m = b + (e - b >> 1);
      refs[m].b = b;
      refs[m].e = e;
      const nextPlane = _EveKDdroneManagement.#FindNextSplitAxis(planeType);
      refs[m].left = this.#SplitSort(b, m - 1, nextPlane);
      refs[m].right = this.#SplitSort(m + 1, e, nextPlane);
      return refs[m];
    }

    // Stamps planeType on the range then sorts it by that axis (Carbon
    // SortByAxis, cpp:261-271); the temporary subrange copy replaces
    // std::sort's in-place range sort and only allocates on the throttled
    // rebuild path.
    /**
     * Stamps the given split plane on a subrange of agent references and sorts that subrange along that axis.
     */
    #SortByAxis(refs, b, endExclusive, planeType) {
      for (let i = b; i < endExclusive; i++) {
        refs[i].planeType = planeType;
      }
      const range = refs.slice(b, endExclusive);
      range.sort((lhs, rhs) => lhs.agent.position[planeType] - rhs.agent.position[planeType]);
      for (let i = 0; i < range.length; i++) {
        refs[b + i] = range[i];
      }
    }

    // Checks each split invariant and locally re-sorts broken subtrees (Carbon
    // CompareNodeToChildren, cpp:58-110; the three per-axis cases collapse to
    // one indexed body on the shared vec3 layout).
    /**
     * Recursively checks a node's split invariant against its children and re-splits that subtree from scratch when it no longer holds.
     */
    #CompareNodeToChildren(node) {
      if (node === null) {
        return null;
      }
      if (node.left === null && node.right === null) {
        return node;
      }
      const axis = node.planeType;
      if (this.#IsBiggestOnAxis(node.left, node.agent.position[axis], axis) && this.#IsSmallestOnAxis(node.right, node.agent.position[axis], axis)) {
        node.left = this.#CompareNodeToChildren(node.left);
        node.right = this.#CompareNodeToChildren(node.right);
        return node;
      }
      return this.#SplitSort(node.b, node.e, axis);
    }

    // Carbon IsBiggestOnAxis (cpp:112-154): on the node's own split axis only
    // the bigger side needs checking; on other axes both sides do.
    /**
     * Whether a node and its relevant subtree all sit at or below a coordinate on an axis.
     */
    #IsBiggestOnAxis(node, n, planeType) {
      if (node === null) {
        return true;
      }
      const axis = node.planeType;
      if (planeType === axis) {
        return n >= node.agent.position[axis] && this.#IsBiggestOnAxis(node.right, n, axis);
      }
      return n >= node.agent.position[axis] && this.#IsBiggestOnAxis(node.left, n, axis) && this.#IsBiggestOnAxis(node.right, n, axis);
    }

    // Carbon IsSmallestOnAxis (cpp:157-199): mirror of IsBiggestOnAxis.
    /**
     * Whether a node and its relevant subtree all sit at or above a coordinate on an axis.
     */
    #IsSmallestOnAxis(node, n, planeType) {
      if (node === null) {
        return true;
      }
      const axis = node.planeType;
      if (planeType === axis) {
        return n <= node.agent.position[axis] && this.#IsSmallestOnAxis(node.left, n, axis);
      }
      return n <= node.agent.position[axis] && this.#IsSmallestOnAxis(node.left, n, axis) && this.#IsSmallestOnAxis(node.right, n, axis);
    }

    // Carbon FindClosestAgentRecursive (cpp:291-371): digs through the tree,
    // pruning half-spaces the best-so-far sphere cannot reach.
    /**
     * Recursively searches for the agent closest to a position, pruning subtrees that cannot beat the current best distance.
     */
    #FindClosestAgentRecursive(pos, node, closest) {
      if (node === null) {
        return;
      }
      const distToPoint = vec3.distance(node.agent.position, pos);
      if (closest.rangeBetween > distToPoint) {
        closest.rangeBetween = distToPoint;
        closest.agent = node.agent;
      }
      const axis = node.planeType;
      if (node.agent.position[axis] < pos[axis]) {
        this.#FindClosestAgentRecursive(pos, node.right, closest);
        if (node.agent.position[axis] + closest.rangeBetween > pos[axis]) {
          this.#FindClosestAgentRecursive(pos, node.left, closest);
        }
      } else {
        this.#FindClosestAgentRecursive(pos, node.left, closest);
        if (node.agent.position[axis] - closest.rangeBetween < pos[axis]) {
          this.#FindClosestAgentRecursive(pos, node.right, closest);
        }
      }
    }

    // Per-agent range search body (Carbon SearchThroughTreeHelperFunction,
    // cpp:443-517), kept bug-compatible: a found agent is appended once, then
    // once or twice more depending on the fill state, and activeRange advances
    // when the widest range saturates.
    /**
     * Recursively collects one agent's neighbours into the per-behaviour result lists for each configured radius, narrowing the active range as the widest one fills.
     */
    #SearchThroughTreeHelperFunction(closeAgents, node, agent, ranges, c) {
      if (node === null) {
        return;
      }
      if (this.#activeRange > ranges.length - 1) {
        return;
      }
      if (ranges[this.#activeRange].radius === -1) {
        return;
      }
      const dist = vec3.squaredDistance(node.agent.position, agent.position);
      const range = ranges[this.#activeRange].radius;
      if (dist < range * range) {
        _EveKDdroneManagement.#AddAgentToSearchLists(closeAgents, node, dist, ranges, this.#activeRange, c);
        const found = closeAgents[ranges[this.#activeRange].behaviorNbr][c].length;
        if (found < this.maxFoundPerAgent) {
          _EveKDdroneManagement.#AddAgentToSearchLists(closeAgents, node, dist, ranges, this.#activeRange, c);
        } else if (found === this.maxFoundPerAgent) {
          _EveKDdroneManagement.#AddAgentToSearchLists(closeAgents, node, dist, ranges, this.#activeRange, c);
          this.#activeRange++;
        }
      }
      const axis = node.planeType;
      const delta = node.agent.position[axis] - agent.position[axis];
      if (delta <= range) {
        this.#SearchThroughTreeHelperFunction(closeAgents, node.right, agent, ranges, c);
      }
      if (delta >= range) {
        this.#SearchThroughTreeHelperFunction(closeAgents, node.left, agent, ranges, c);
      }
    }

    // Descending-radius ordering (Carbon compareRef for SearchRange, h:81-84).
    /**
     * Orders search ranges by descending radius.
     */

    // Carbon AddAgentToSearchLists (cpp:519-532): the ranges are sorted
    // descending, so appending stops at the first range the agent falls out of.
    /**
     * Appends a found neighbour to every behaviour's result list whose radius it still falls within, stopping at the first it falls outside.
     */

    // X -> Y -> Z -> X (Carbon FindNextSplitAxis, cpp:244-259).
    /**
     * Cycles the split axis in the order X, Y, Z and back to X.
     */
  }];
  #CompareSearchRanges(lhs, rhs) {
    return rhs.radius - lhs.radius;
  }
  #AddAgentToSearchLists(closeAgents, node, dist, ranges, activeRange, agentNbr) {
    for (let i = activeRange; i < ranges.length; i++) {
      if (dist < ranges[i].radius * ranges[i].radius) {
        closeAgents[ranges[i].behaviorNbr][agentNbr].push(node.agent);
      } else {
        break;
      }
    }
  }
  #FindNextSplitAxis(planeType) {
    switch (planeType) {
      case _EveKDdroneManagement.PlaneType.X:
        return _EveKDdroneManagement.PlaneType.Y;
      case _EveKDdroneManagement.PlaneType.Y:
        return _EveKDdroneManagement.PlaneType.Z;
      default:
        return _EveKDdroneManagement.PlaneType.X;
    }
  }
  PlaneType = PlaneType;
  constructor() {
    super(_EveKDdroneManagement), _initClass();
  }
}();

export { _EveKDdroneManagement as EveKDdroneManagementTree };
//# sourceMappingURL=EveKDdroneManagementTree.js.map
