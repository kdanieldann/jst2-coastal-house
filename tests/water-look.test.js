import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleWave,waterLight} from '../src/water-look.js';
test('water animation stays within a gentle brightness budget and preserves dark water',()=>{
 for(const rgb of [[.08,.2,.3],[.3,.5,.6],[.7,.8,.85],[.95,.96,.97]])for(let i=0;i<100;i++){
  const field=sampleWave(i*.071,i*.139,i*.3),detail=sampleWave(i*.123+.31,i*.241+.57,i*.3),out=waterLight(rgb,field,detail,5);
  for(let j=0;j<3;j++){assert.ok(Math.abs(out[j]-rgb[j])<.04);assert.ok(out[j]>=0&&out[j]<=1)}
  if(rgb[0]<.1)assert.ok(out[0]<.11,'dark water must not acquire a white sun path');
 }
});
test('waves remain continuous across texture seams and change gently between frames',()=>{
 for(let i=0;i<40;i++){
  const u=i*.13,v=i*.23,t=i*.7,a=sampleWave(u,v,t),b=sampleWave(u+1,v+1,t),later=sampleWave(u,v,t+1/30);
  for(let j=0;j<3;j++){assert.ok(Math.abs(a[j]-b[j])<1e-10);assert.ok(Math.abs(a[j]-later[j])<.01)}
 }
});
test('far-water motion is attenuated while near-water motion remains active',()=>{
 const rgb=[.4,.55,.65];let nearEnergy=0,farEnergy=0;
 for(let i=0;i<80;i++){
  const f=sampleWave(i*.07,i*.13,i*.8),d=sampleWave(i*.121+.31,i*.225+.57,i*.8);
  nearEnergy+=Math.abs(waterLight(rgb,f,d,5)[1]-rgb[1]);farEnergy+=Math.abs(waterLight(rgb,f,d,60)[1]-rgb[1]);
 }
 assert.ok(nearEnergy>.05);assert.ok(farEnergy<nearEnergy*.15);
});
