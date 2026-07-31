import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterGraph", family: "character" })
/** Complete GPU-free and I/O-free character composition graph. */
export class CjsCharacterGraph extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    name = "";

    @type.string
    @io.persist
    sex = "";

    @type.struct("CjsCharacterRecipe")
    @io.persist
    recipe = null;

    @type.list("CjsCharacterResolvedPart")
    @io.persist
    parts = [];

    @type.list("CjsCharacterResolvedRule")
    @io.persist
    rules = [];

    @type.list("CjsCharacterMaterial")
    @io.persist
    materials = [];

    @type.list("CjsCharacterPose")
    @io.persist
    poses = [];

    @type.string
    @io.persist
    activePose = "";

    @type.map("float32")
    @io.persist
    morphs = new Map();

    @type.list("CjsCharacterProjection")
    @io.persist
    projections = [];

    @type.list("CjsCharacterDependency")
    @io.persist
    dependencies = [];

    @type.list("CjsCharacterResolutionIssue")
    @io.persist
    resolutionIssues = [];

    @type.boolean
    @io.persist
    complete = true;

    @type.unknown
    @io.persist
    metadata = {};

    @type.unknown
    @io.persist
    state = {};

    /**
     * Stores one finite named morph weight through the model change pipeline and
     * returns this graph.
     */
    SetMorph(name, value, options = {})
    {
        if (typeof name !== "string" || !name.trim())
        {
            throw new TypeError("Character morph name must be a non-empty string");
        }

        const weight = Number(value);

        if (!Number.isFinite(weight))
        {
            throw new TypeError(`Character morph weight must be finite, received ${value}`);
        }

        const morphs = new Map(this.morphs);
        morphs.set(name, weight);
        this.SetValues({ morphs }, options);
        return this;
    }

    /**
     * Stores the desired pose name through the model change pipeline and returns
     * this graph.
     */
    SetActivePose(name, options = {})
    {
        if (typeof name !== "string")
        {
            throw new TypeError("Character active pose must be a string");
        }

        this.SetValues({ activePose: name }, options);
        return this;
    }

    /**
     * Returns a detached dependency list, optionally filtered to required
     * resources.
     */
    GetDependencies({ requiredOnly = false } = {})
    {
        return requiredOnly
            ? this.dependencies.filter(value => value.required)
            : this.dependencies.slice();
    }
}
