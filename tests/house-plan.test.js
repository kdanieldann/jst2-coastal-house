import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,makePlan,roomAt,walkable,moveInHouse,safeSpawn,photoWeight,alignmentTransform,defaultAlignment} from '../src/house-plan.js';
test('dimensions drive room areas, adjacency, door openings and metre placement',()=>{
 for(const d of [defaults,{...defaults,livingWidth:9,hallWidth:2.6,wingWidth:7,frontDepth:7,backDepth:5}]){
  const p=makePlan(d);assert.equal(p.width,d.livingWidth+d.hallWidth+d.wingWidth);
  assert.equal(p.rooms.bedroom.x,p.rooms.gallery.x+p.rooms.gallery.w);
  for(const door of p.doors){assert.ok(walkable(p,door),'door centre is passable');const start={x:door.x-.6,z:door.z};const end=moveInHouse(p,start,1.2,0);assert.ok(Math.abs(end.x-(door.x+.6))<1e-6);assert.equal(roomAt(p,start),door.rooms[0]);assert.equal(roomAt(p,end),door.rooms[1]);}
  for(const id of Object.keys(p.rooms)){assert.ok(walkable(p,safeSpawn(p,id)));const t=alignmentTransform(p,id,defaultAlignment()[id]);assert.deepEqual(t.position,{...p.rooms[id].center,y:0});assert.equal(t.scale,1);}
 }
});
test('solid walls and furniture block high-speed moves without tunnelling',()=>{
 const p=makePlan();const blocked=moveInHouse(p,{x:6,z:7},5,0);assert.ok(blocked.x<7,'living-to-hall wall blocks movement outside doorway');
 const exterior=moveInHouse(p,{x:3,z:4},0,-100);assert.ok(exterior.z>.2);
 const furniture=moveInHouse(p,{x:3,z:3.68},-2,0);assert.ok(furniture.x>2.8);
});
test('a route can walk from living through hallway into both adjacent rooms',()=>{
 const p=makePlan();let point=safeSpawn(p,'living');
 const walk=(x,z)=>{point=moveInHouse(p,point,x-point.x,z-point.z);assert.ok(Math.hypot(point.x-x,point.z-z)<.05,`failed route to ${x},${z}`)};
 walk(4,5.2);walk(8,5.2);walk(8,3.3);walk(10,3.3);assert.equal(roomAt(p,point),'bedroom');
 walk(8,3.3);walk(8,9.3);walk(10,9.3);assert.equal(roomAt(p,point),'study');
});
test('hybrid fades near doors and room edges; corridor stays blueprint',()=>{
 const p=makePlan();for(const d of p.doors)for(const id of d.rooms)assert.equal(photoWeight(p,id,d),0);
 assert.equal(photoWeight(p,'living',p.rooms.living.center),1);assert.equal(photoWeight(p,'gallery',p.rooms.gallery.center),0);
 assert.equal(photoWeight(p,'bedroom',{x:9.01,z:3}),0);
});
test('invalid and inconsistent dimensions fail before replacing the current plan',()=>{
 for(const changes of [{hallWidth:0},{height:NaN},{wingWidth:100},{livingDepth:12,frontDepth:4.5,backDepth:4.5}])assert.throws(()=>makePlan({...defaults,...changes}));
});
