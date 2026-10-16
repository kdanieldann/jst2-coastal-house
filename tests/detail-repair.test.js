import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadSpz} from 'spz-js';
test('courtyard blue sky is behind the canopy, including when walking toward the tree',async()=>{
 const c=await loadSpz(await readFile('public/assets/courtyard.spz'));let checked=0;
 for(let i=0;i<c.numPoints;i++){
  const j=i*3,x=c.positions[j],y=c.positions[j+1],z=c.positions[j+2],r=.5+.282095*c.colors[j],g=.5+.282095*c.colors[j+1],b=.5+.282095*c.colors[j+2];
  if(y>1.801&&b-r>.121&&b-g>.021){assert.ok(Math.hypot(x,y-1.6,z)>64.99);checked++;}
 }
 assert.ok(checked>100000);
});
test('the formerly missing island side is covered across height and length',async()=>{
 const c=await loadSpz(await readFile('public/assets/living.spz'));
 const points=[];for(let i=0;i<c.numPoints;i++){const j=i*3;if(Math.abs(c.positions[j+2]+1.105)<.003&&c.alphas[i]>1)points.push([c.positions[j],c.positions[j+1]]);}
 for(const x of [2.4,3,3.6,4.2,4.7])for(const y of [.05,.25,.5,.8])assert.ok(points.some(p=>Math.hypot(p[0]-x,p[1]-y)<.02),`missing side near ${x},${y}`);
});
test('distant courtyard sky has no near-white elongated streak splats',async()=>{
 const c=await loadSpz(await readFile('public/assets/courtyard.spz'));let defects=0;
 for(let i=0;i<c.numPoints;i++){
  const j=i*3,x=c.positions[j],y=c.positions[j+1],z=c.positions[j+2],radius=Math.hypot(x,y-1.6,z);
  const rgb=[0,1,2].map(k=>Math.min(1,Math.max(0,.5+.282095*c.colors[j+k]))),sc=[0,1,2].map(k=>Math.exp(c.scales[j+k])).sort((a,b)=>a-b);
  if(radius>12&&y>1.8&&(y-1.6)/radius<.6&&Math.min(...rgb)>.86&&rgb[2]>=rgb[0]-.015&&sc[2]/sc[1]>3)defects++;
 }
 assert.equal(defects,0);
});
