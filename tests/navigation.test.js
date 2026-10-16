import test from 'node:test';
import assert from 'node:assert/strict';
import {rooms,movement,constrain,nearestLink} from '../src/navigation.js';
test('every room is reachable from the living room and can return',()=>{
 for(const start of Object.keys(rooms)){const seen=new Set(),queue=[start];while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);for(const link of rooms[id].links){assert.ok(rooms[link.to]);queue.push(link.to)}}assert.equal(seen.size,4)}
});
test('spawn and every connection point lie inside their navigation region',()=>{
 for(const r of Object.values(rooms)){for(const p of [r.spawn,...r.links]){assert.deepEqual(constrain(p.x,p.z,r.bounds),{x:p.x,z:p.z})}assert.equal(r.spawn.y,1.6)}
});
test('movement respects limits at all headings and diagonal speed is normalized',()=>{
 for(const r of Object.values(rooms)){for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=.1){for(const [f,side] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]]){const p=movement(0,0,yaw,f,side,100,r.bounds);assert.deepEqual(constrain(p.x,p.z,r.bounds),p)}}}
 const bounds=[-100,100,-100,100];for(const [f,side] of [[1,0],[0,1],[1,1]]){const p=movement(0,0,.7,f,side,.8,bounds);assert.ok(Math.abs(Math.hypot(p.x,p.z)-.8)<1e-9)}
});
test('forward follows camera heading and nearby connections only activate locally',()=>{
 assert.deepEqual(movement(0,0,0,1,0,1,[-10,10,-10,10]),{x:0,z:-1});
 const p=movement(0,0,Math.PI/2,1,0,1,[-10,10,-10,10]);assert.ok(Math.abs(p.x-1)<1e-9);
 for(const r of Object.values(rooms)){assert.equal(nearestLink(r,{x:99,z:99}),undefined);for(const link of r.links)assert.equal(nearestLink(r,link)?.to,link.to)}
});
