import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneEntryPose,sceneProfiles,sceneWalkable,moveInScene,crossedPortal,localToWorld,worldToLocal,mapScenePoint,movementSpeed} from '../src/scene-navigation.js';
import {makePlan,defaultAlignment} from '../src/house-plan.js';
import {nodeById,nodeTransform} from '../src/view-nodes.js';

test('bedside movement never enters corridor; the visible rear doorway does',()=>{
 let p={x:0,z:0};const bed=moveInScene('bedroom',p,-5,0);
 assert.ok(bed.x>-1.95);assert.equal(crossedPortal('bedroom',p,bed),null);
 const rear=moveInScene('bedroom',p,0,4.8);
 assert.ok(rear.z>4.65);assert.equal(crossedPortal('bedroom',p,rear)?.to,'gallery');
});
test('study route crosses the former hidden concept desk and reaches the actual courtyard opening',()=>{
 const before={x:0,z:-1.5},after=moveInScene('study',before,0,-3.5);
 assert.ok(after.z<-4.85);assert.equal(crossedPortal('study',before,after)?.to,'courtyard');
 assert.ok(sceneWalkable('study',{x:.3,z:-1.5}));
});
test('all visible portals are traversable and deliver to a safe reciprocal scene',()=>{
 for(const [id,profile] of Object.entries(sceneProfiles))for(const d of profile.portals){
  const before={x:d.x,z:d.z};before[d.axis]-=d.sign*.25;
  assert.ok(sceneWalkable(id,before),`${id}/${d.id} approach`);
  const after=moveInScene(id,before,d.axis==='x'?d.sign*.4:0,d.axis==='z'?d.sign*.4:0);
  assert.equal(crossedPortal(id,before,after)?.id,d.id);
  assert.ok(sceneWalkable(d.to,d.arrival),`${d.id} arrival`);
  assert.ok(sceneProfiles[d.to].portals.some(back=>back.to===id));
 }
});
test('sprint is about 2.3x walking and retains obstacle collision',()=>{
 assert.ok(movementSpeed(true)/movementSpeed(false)>2.2);
 assert.ok(movementSpeed(true)/movementSpeed(false)<2.4);
 const p=moveInScene('bedroom',{x:0,z:0},-movementSpeed(true)*10,0);assert.ok(p.x>-2);
 const pool=moveInScene('courtyard',{x:0,z:-1.5},-10,0);assert.ok(pool.x>-.85);
});
test('scene collision and portal positions follow manual world rotation and translation',()=>{
 const plan=makePlan(),alignment=defaultAlignment();alignment.study={x:1,y:.1,z:-.5,yaw:-63};
 const t=nodeTransform(plan,nodeById('study'),alignment),p={x:.2,z:-2,yaw:.7};
 const round=worldToLocal(localToWorld(p,t),t);
 for(const k of ['x','z','yaw'])assert.ok(Math.abs(round[k]-p[k])<1e-9);
});
test('navigation map always locates the player inside the selected scene footprint',()=>{
 const plan=makePlan();
 for(const id of Object.keys(sceneProfiles))for(const p of [{x:0,z:0,yaw:0},{x:100,z:-100,yaw:2}]){
  const m=mapScenePoint(plan,id,p),r=id==='courtyard'?plan.courtyard:plan.rooms[id];
  assert.ok(m.x>r.x&&m.x<r.x+r.w&&m.z>r.z&&m.z<r.z+r.h);
 }
});

test('measured courtyard has a connected route around pool and tree and back through the visible door',()=>{
 const waypoints=[{x:0,z:0},{x:-3.3,z:0},{x:-3.3,z:-3.95},{x:2,z:-3.95},{x:2,z:0},{x:-.2,z:0},{x:-.2,z:1.98}];
 let p=waypoints[0];
 for(const target of waypoints.slice(1)){
  const q=moveInScene('courtyard',p,target.x-p.x,target.z-p.z);
  assert.ok(Math.hypot(q.x-target.x,q.z-target.z)<.001,`route to ${JSON.stringify(target)}`);p=q;
 }
 assert.equal(crossedPortal('courtyard',{x:-.2,z:1.5},p)?.to,'study');
 assert.equal(sceneWalkable('courtyard',{x:-1.5,z:-1.5}),false);
 assert.equal(sceneWalkable('courtyard',{x:.8,z:-2.95}),false);
});


test('walking from living into the hall uses the map-click opening view',()=>{
 const d=sceneProfiles.living.portals.find(p=>p.to==='gallery');
 assert.deepEqual(d.arrival,sceneEntryPose());
 assert.ok(sceneWalkable('gallery',d.arrival));
 assert.equal(crossedPortal('gallery',d.arrival,{...d.arrival,z:-.05}),null);
});

test('completed bed sides block clipping and remain accessible from the surrounding route',()=>{
 for(const z of [-1.4,1.4])assert.equal(sceneWalkable('bedroom',{x:-3,z}),false);
 let p={x:0,z:3.4};
 for(const target of [{x:-2.8,z:3},{x:-1,z:3},{x:-1,z:-3},{x:-2.8,z:-3},{x:-1,z:-3},{x:0,z:0},{x:0,z:3.4}]){
  const q=moveInScene('bedroom',p,target.x-p.x,target.z-p.z);assert.ok(Math.hypot(q.x-target.x,q.z-target.z)<.01);p=q;
 }
});
