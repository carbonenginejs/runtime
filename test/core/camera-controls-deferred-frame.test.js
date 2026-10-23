import test from 'node:test';
import assert from 'node:assert/strict';
import { TnyCameraControls } from '../../npm/dist/core/cameras/TnyCameraControls.js';
import { EveCamera } from '../../npm/dist/trinity/index.js';

function fixture()
{
    const camera = new EveCamera();
    camera.zoomCurve = null;
    camera.translationFromParent = 100;
    camera.SetOrbit(.7, -.3);
    camera.Update(0, 1.6, 0);
    const viewport = { width: 0, height: 0 };
    let reads = 0;
    const controls = new TnyCameraControls({ camera, getViewport: () => viewport,
        getBounds: () => { reads++; return { centre: [100, 200, 300], radius: 10 }; } });
    return { camera, controls, viewport, reads: () => reads };
}

test('a restored pose supersedes a deferred fit before the first measurable viewport', () =>
{
    const { controls, viewport, reads } = fixture();
    assert.equal(controls.Frame(), false);
    controls.SetPose({ ...controls.GetPose(), yaw: 1.2, pitch: .4, distance: 123,
        center: [4, 5, 6], fieldOfView: .8 });
    const pose = controls.GetPose();
    Object.assign(viewport, { width: 800, height: 500 });
    controls.Resize();
    assert.deepEqual(controls.GetPose(), pose);
    assert.equal(reads(), 0, 'resizing must not frame a superseded target');
});

test('selection cancellation and intentional camera edits discard deferred fitting', () =>
{
    for (const action of ['Cancel', 'Orbit', 'Pan', 'Dolly', 'SetFieldOfView'])
    {
        const { camera, controls, viewport } = fixture();
        assert.equal(controls.Frame(), false);
        Object.assign(viewport, { width: 800, height: 500 });
        if (action === 'Cancel') controls.Cancel();
        else if (action === 'Orbit' || action === 'Pan') controls[action](15, 20);
        else controls[action](action === 'Dolly' ? 100 : .8);
        camera.Update(1, 1.6, 0);
        const pose = controls.GetPose();
        controls.Resize();
        assert.deepEqual(controls.GetPose(), pose, action);
    }
});

test('a deferred explicit fit still completes when no newer camera intent supersedes it', () =>
{
    const { controls, viewport, reads } = fixture();
    assert.equal(controls.Frame(), false);
    assert.equal(controls.Resize(), false);
    Object.assign(viewport, { width: 800, height: 500 });
    assert.equal(controls.Resize(), true);
    assert.deepEqual(controls.GetPose().center, [100, 200, 300]);
    assert.equal(reads(), 1);
    const pose = controls.GetPose();
    for (const size of [[1600, 300], [0, 0], [600, 900]])
    {
        [viewport.width, viewport.height] = size;
        controls.Resize();
        assert.deepEqual(controls.GetPose(), pose);
    }
    assert.equal(reads(), 1);
});
