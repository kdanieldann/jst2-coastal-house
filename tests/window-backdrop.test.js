import test from 'node:test';
import assert from 'node:assert/strict';
import {rayThroughOpening} from '../src/window-backdrop.js';
test('the window backdrop fills the opening but cannot paint over the sofa, floor or ceiling',()=>{
 const eye={x:-2,y:1.6,z:-3.8};
 assert.equal(rayThroughOpening(eye,{x:-.95,y:0,z:-.42}),true);
 assert.equal(rayThroughOpening(eye,{x:-1,y:-.1,z:-.1}),false,'sofa / solid wall');
 assert.equal(rayThroughOpening(eye,{x:0,y:-2,z:-1}),false,'floor');
 assert.equal(rayThroughOpening(eye,{x:0,y:2,z:-1}),false,'ceiling');
 assert.equal(rayThroughOpening(eye,{x:0,y:0,z:1}),false,'behind camera');
});
