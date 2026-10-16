import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadSpz} from 'spz-js';
const room=await loadSpz(readFileSync(new URL('../public/assets/bedroom.spz',import.meta.url)));
test('bedroom roof has continuous level coverage above the window',()=>{
 const tiles=new Set();let n=0,min=Infinity,max=-Infinity;
 for(let i=0;i<room.numPoints;i++){
  const [x,y,z]=room.positions.subarray(i*3,i*3+3);
  if(x>-4.2&&x<4.2&&z>-3.9&&z<4.1&&y>3.1&&y<3.8){min=Math.min(min,y);max=Math.max(max,y);n++;tiles.add(`${Math.floor(x*2)},${Math.floor(z*2)}`)}
 }
 assert.ok(n>80000);assert.ok(max-min<.005,`roof varies by ${max-min}m`);assert.ok(tiles.size>250);
});
for(const sign of [-1,1])test(`bed side ${sign} contains opaque material throughout the former missing patch`,()=>{
 const tiles=new Set();
 for(let i=0;i<room.numPoints;i++){
  const [x,y,z]=room.positions.subarray(i*3,i*3+3);
  if(x>-3.9&&x<-2&&y>.06&&y<.58&&sign*z>1.24&&sign*z<1.45&&room.alphas[i]>2)tiles.add(`${Math.floor((x+3.9)*10)},${Math.floor((y-.06)*10)}`);
 }
 assert.ok(tiles.size>=100,`only ${tiles.size} side tiles covered`);
});
