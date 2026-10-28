import { meta } from "#schema";

/**
 * Keeps a set of paper doll characters in one interior scene: it is given the
 * scene, adds each doll's drawn objects to it and removes them again, and
 * updates every doll once per frame, before the frame is drawn.
 *
 * Dolls are told nothing about the scene type. A space scene reaches
 * characters only through an interior scene placed in it.
 *
 * An application class (operator-approved character application); no Carbon
 * donor.
 */
@meta.define("CjsPaperDollManager")
export class CjsPaperDollManager
{

    /** The interior scene the dolls are drawn in. */
    scene = null;

    /** The dolls this manager keeps, in the order they were added. */
    dolls = [];

    /**
     * @param {import("../trinity/interior/Tr2InteriorScene.js").Tr2InteriorScene} scene The interior scene the dolls are drawn in.
     */
    constructor(scene)
    {
        this.scene = scene;
    }

    /**
     * Adds a doll and puts its front instance's objects into the scene.
     * @param {import("./CjsPaperDoll.js").CjsPaperDoll} doll A doll with a built front instance.
     * @returns {void}
     * @throws {Error} When the doll is already kept or has no front instance.
     */
    AddDoll(doll)
    {
        if (this.dolls.includes(doll)) throw new Error("The paper doll is already in this manager");
        if (!doll.front) throw new Error("A paper doll needs a built front instance before it joins a scene");
        this.dolls.push(doll);
        for (const object of doll.front.objects) this.scene.AddDynamic(object);
    }

    /**
     * Removes a doll and takes its front instance's objects out of the scene.
     * @param {import("./CjsPaperDoll.js").CjsPaperDoll} doll A doll this manager keeps.
     * @returns {void}
     * @throws {Error} When the doll is not kept here.
     */
    RemoveDoll(doll)
    {
        const index = this.dolls.indexOf(doll);
        if (index < 0) throw new Error("The paper doll is not in this manager");
        this.dolls.splice(index, 1);
        for (const object of doll.front.objects) this.scene.RemoveDynamic(object);
    }

    /**
     * Applies every doll's pending edits, in the order the dolls were added.
     * Runs before the frame, never inside a render pass.
     * @returns {boolean} Whether any doll rebuilt an output.
     * @throws {Error} Whatever a doll's bindings throw; later dolls are not updated this call.
     */
    Update()
    {
        let rebuilt = false;
        for (const doll of this.dolls) rebuilt = doll.Update() || rebuilt;
        return rebuilt;
    }

}
