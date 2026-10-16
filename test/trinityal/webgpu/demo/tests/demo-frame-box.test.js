import test from 'node:test';
import assert from 'node:assert/strict';
import { EveCamera, EveShip2 } from '../../../../../npm/dist/trinity/index.js';
import { TnyCameraControls } from '../../../../../npm/dist/core/cameras/TnyCameraControls.js';
import { mat4 } from '../../../../../npm/dist/global/math/mat4.js';
import { selectionBounds } from '../demoGizmo.js';

test('frame transformed hull box tightly in portrait and wide viewports', () =>
{
  for (const aspect of [0.4, 1.6, 3.5]) for (const offset of [0, 0.3])
  {
    const ship = new EveShip2();
    ship.IsBoundingBoxReady = () => true;
    ship.GetLocalBoundingBox = (min, max) => { min.set([-100, -8, -15]); max.set([100, 8, 15]); return true; };
    mat4.fromYRotation(ship.worldTransform, 0.6);
    mat4.scale(ship.worldTransform, ship.worldTransform, [2, 3, 4]);
    ship.worldTransform[12] = 120; ship.worldTransform[13] = -15; ship.worldTransform[14] = 90;
    const bounds = selectionBounds(ship), camera = new EveCamera();
    camera.zoomCurve = null; camera.frontClip = 1; camera.backClip = 100;
    camera.fieldOfView = Math.PI / 4; camera.centerOffset = offset;
    camera.SetOrbit(0.7, -0.3); camera.Update(0, aspect, 0);
    const controls = new TnyCameraControls({ camera, getBounds: () => bounds,
      getViewport: () => ({ width: aspect * 500, height: 500 }), preferences: { frameMargin: 1.02 } });
    controls.Frame(); camera.Update(1, aspect, 0);
    let edge = 0;
    for (const point of bounds.corners)
    {
      const v = camera.viewMatrix.transform, p = camera.projectionMatrix.transform;
      const x = v[0]*point[0] + v[4]*point[1] + v[8]*point[2] + v[12];
      const y = v[1]*point[0] + v[5]*point[1] + v[9]*point[2] + v[13];
      const z = v[2]*point[0] + v[6]*point[1] + v[10]*point[2] + v[14];
      const nx = (p[0]*x + p[8]*z)/-z, ny = (p[5]*y + p[9]*z)/-z;
      edge = Math.max(edge, Math.abs(nx), Math.abs(ny));
      assert.ok(Math.abs(nx) <= 1.001 && Math.abs(ny) <= 1.001, JSON.stringify({aspect,offset,nx,ny}));
      assert.ok(-z >= camera.frontClip && -z <= camera.backClip);
    }
    assert.ok(edge > 0.95, `fit must fill viewport: ${edge}`);
    assert.deepEqual([...camera.extraTranslation], bounds.centre);
    assert.equal(camera.yaw, 0.7); assert.equal(camera.pitch, -0.3);
  }
});
