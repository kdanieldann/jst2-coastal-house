import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,defaults,defaultAlignment,moveInHouse,walkable,roomAt,photoWeight} from '../src/house-plan.js';
import {nodeById,nodeAnchor,nodeTransform,selectNode,nearbyDoor} from '../src/view-nodes.js';
test('nearby capture selection has hysteresis and does not change the player position',()=>{
 const p=makePlan(),position={x:10.1,z:3.3},before={...position};
 assert.equal(selectNode(p,'bedroom',position,'bedroom').id,'bedroom-door');
 assert.equal(selectNode(p,'bedroom',{x:12,z:3},'bedroom-door').id,'bedroom');
 assert.equal(selectNode(p,'bedroom',{x:11.05,z:3.15},'bedroom').id,'bedroom');
 assert.equal(selectNode(p,'bedroom',{x:11.05,z:3.15},'bedroom-door').id,'bedroom-door');
 assert.deepEqual(position,before);
});
test('new captures use independent anchors and study faces the east courtyard',()=>{
 const p=makePlan(),a=defaultAlignment(),n=nodeById('study-door');
 const t=nodeTransform(p,n,a);assert.ok(Math.abs(t.position.x-10.1)<1e-8);assert.equal(t.position.z,9.3);assert.equal(t.rotation.y,-90);
 a.study.x=1;a.study.yaw=0;const adjusted=nodeTransform(p,n,a);
 assert.ok(Math.abs(adjusted.position.x-13.3)<1e-8);assert.ok(Math.abs(adjusted.position.z-10.9)<1e-8);
 for(const id of ['living-door','bedroom-door','study-door'])assert.ok(walkable(p,nodeAnchor(p,nodeById(id))));
});
test('door cue preloads the room on the other side, never a nonadjacent room',()=>{
 const p=makePlan();assert.equal(nearbyDoor(p,'bedroom',{x:10,z:3.3}).next,'gallery');
 assert.equal(nearbyDoor(p,'gallery',{x:8,z:9.3}).next,'study');
 assert.equal(nearbyDoor(p,'bedroom',{x:14,z:1}),null);
});
test('courtyard is reachable on foot, bounded by walls, with solid water feature',()=>{
 const p=makePlan();let pos={x:12,z:9};
 for(const [x,z] of [[12,10.1],[16,10.1],[16,9],[19.7,9]]){pos=moveInHouse(p,pos,x-pos.x,z-pos.z);assert.ok(Math.hypot(pos.x-x,pos.z-z)<.05);}
 assert.equal(roomAt(p,pos),'study');assert.equal(photoWeight(p,'study',pos),0);
 assert.equal(walkable(p,{x:18,z:7.75}),false);
 assert.ok(moveInHouse(p,{x:16,z:7.75},8,0).x<17);
 assert.ok(moveInHouse(p,{x:20,z:9},8,0).x<21);
 for(const backDepth of [4.5,6,8]){const q=makePlan({...defaults,backDepth});assert.ok(walkable(q,{x:q.gardenDoor.x,z:q.gardenDoor.z+1}));}
});
