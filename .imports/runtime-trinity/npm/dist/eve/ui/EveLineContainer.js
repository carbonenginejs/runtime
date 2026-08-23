import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_connectors, _init_extra_connectors, _init_name, _init_extra_name, _init_lineSet, _init_extra_lineSet, _init_display, _init_extra_display;

/** Owns and updates a connector-built EveCurveLineSet. */
let _EveLineContainer;
class EveLineContainer extends CjsModel {
  static {
    ({
      e: [_init_connectors, _init_extra_connectors, _init_name, _init_extra_name, _init_lineSet, _init_extra_lineSet, _init_display, _init_extra_display, _initProto],
      c: [_EveLineContainer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveLineContainer",
      family: "eve/ui"
    })], [[[io, io.persist, void 0, type.list("EveConnector")], 16, "connectors"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("EveCurveLineSet")], 16, "lineSet"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalBoundingBox"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_display(this);
  }
  /** m_connectors (PEveConnectorVector) [READ, PERSIST] */
  connectors = (_initProto(this), _init_connectors(this, []));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_connectors(this), _init_name(this, ""));

  /** m_lineSet (EveCurveLineSetPtr) [READWRITE, PERSIST] */
  lineSet = (_init_extra_name(this), _init_lineSet(this, null));

  /** m_display (bool) [READWRITE] */
  display = (_init_extra_lineSet(this), _init_display(this, true));

  /** Rebuilds the complete logical line set from the authored connectors. */
  Update(context) {
    if (!this.lineSet) {
      return;
    }
    this.lineSet.ClearLines();
    for (const connector of this.connectors) {
      connector.Update(context);
      connector.AddLine(this.lineSet);
    }
    this.lineSet.SubmitChanges();
  }

  /** Carbon's synchronous phase owns the connector rebuild. */
  UpdateSyncronous(updateContext) {
    this.Update(updateContext);
  }

  /** Carbon performs no asynchronous work for this container. */
  UpdateAsyncronous(_updateContext) {}

  /** Delegates transformed visibility only while this container is displayed. */
  UpdateVisibility(updateContext, parentTransform) {
    if (this.display && this.lineSet) {
      this.lineSet.UpdateVisibility(updateContext, parentTransform);
    }
  }

  /** Collects the concrete line set only while this container is displayed. */
  GetRenderables(renderables, impostors = null) {
    if (this.display && this.lineSet) {
      this.lineSet.GetRenderables(renderables, impostors);
    }
  }

  /** Delegates the line set's local bound when one is authored. */
  GetBoundingSphere(sphere, query = 0) {
    return this.lineSet ? this.lineSet.GetBoundingSphere(sphere, query) : false;
  }

  /** Delegates Carbon's model-center update hook. */
  UpdateModelCenterWorldPosition(position, time) {
    if (this.lineSet) {
      this.lineSet.UpdateModelCenterWorldPosition(position, time);
    }
  }

  /** Delegates Carbon's non-updating model-center query. */
  GetModelCenterWorldPosition(position) {
    if (this.lineSet) {
      this.lineSet.GetModelCenterWorldPosition(position);
    }
  }

  /** Delegates a local AABB query when the line set can supply one. */
  GetLocalBoundingBox(minBounds, maxBounds) {
    return this.lineSet ? this.lineSet.GetLocalBoundingBox(minBounds, maxBounds) : false;
  }

  /** Delegates Carbon's local-to-world query without inventing a fallback. */
  GetLocalToWorldTransform(transform) {
    if (this.lineSet) {
      this.lineSet.GetLocalToWorldTransform(transform);
    }
  }
  static {
    _initClass();
  }
}

export { _EveLineContainer as EveLineContainer };
//# sourceMappingURL=EveLineContainer.js.map
