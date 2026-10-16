import test from 'node:test';
import assert from 'node:assert/strict';
import {rooms} from '../src/navigation.js';
import {footprints,mapPose,followPose} from '../src/exploration.js';
test('map positions stay inside the selected footprint including boundary movement',()=>{
 for(const [id,r] of Object.entries(rooms))for(const x of [r.bounds[0],0,r.bounds[1]])for(const z of [r.bounds[2],0,r.bounds[3]]){
  const p=mapPose(id,{x,z,yaw:0}),f=footprints[id];assert.ok(p.x>=f.x+8&&p.x<=f.x+f.w-8);assert.ok(p.y>=f.y+8&&p.y<=f.y+f.h-8);assert.equal(p.angle,0);
 }
 assert.ok(Math.abs(mapPose('living',{x:0,z:0,yaw:Math.PI/2}).angle-90)<1e-9);
});
test('follow camera shortens its boom at every room edge and never leaves the navigation region',()=>{
 for(const r of Object.values(rooms))for(const x of [r.bounds[0],0,r.bounds[1]])for(const z of [r.bounds[2],0,r.bounds[3]])for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=.17){
  const c=followPose({x,z,yaw},.3,r.bounds);assert.ok(c.x>=r.bounds[0]&&c.x<=r.bounds[1]);assert.ok(c.z>=r.bounds[2]&&c.z<=r.bounds[3]);assert.ok(c.distance>=0&&c.distance<=1.85);assert.ok(Number.isFinite(c.target.y));
 }
 const p=followPose({x:0,z:0,yaw:0},0,[-10,10,-10,10]);assert.equal(p.z,1.85);assert.equal(p.target.z,-.6);
});
