import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundAudio} from '../src/background-audio.js';
function fixture({saved,blocked=false,deferred=false}={}){
 const audio=new EventTarget();Object.assign(audio,{paused:true,currentTime:37,calls:0});
 let release;
 audio.play=()=>{audio.calls++;if(blocked)return Promise.reject(new Error('blocked'));audio.paused=false;audio.dispatchEvent(new Event('playing'));return deferred?new Promise(r=>release=r):Promise.resolve()};
 audio.pause=()=>{audio.paused=true;audio.dispatchEvent(new Event('pause'))};
 const page=new EventTarget();page.hidden=false;
 const button=new EventTarget();button.attributes={};button.setAttribute=(k,v)=>button.attributes[k]=v;
 const values=new Map(saved===undefined?[]:[['jst2-music-enabled',saved]]),errors=[];
 const controller=createBackgroundAudio({audio,button,page,storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},onError:m=>errors.push(m)});
 return {audio,page,button,controller,values,errors,release:()=>release?.(),click:()=>button.dispatchEvent(new Event('click')),visibility:hidden=>{page.hidden=hidden;page.dispatchEvent(new Event('visibilitychange'))}};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('music waits for entry, loops, and does not restart when enter is repeated',async()=>{
 const f=fixture();assert.equal(f.audio.calls,0);assert.equal(f.audio.loop,true);assert.equal(f.audio.volume,.3);
 f.controller.enter();await settle();assert.equal(f.audio.calls,1);assert.equal(f.button.attributes['aria-pressed'],'true');
 f.controller.enter();assert.equal(f.audio.calls,1);assert.equal(f.audio.currentTime,37);
});
test('user pause persists and visibility cannot override it',async()=>{
 const f=fixture();f.controller.enter();await settle();f.click();assert.equal(f.audio.paused,true);assert.equal(f.values.get('jst2-music-enabled'),'false');
 f.visibility(true);f.visibility(false);assert.equal(f.audio.calls,1);
 f.click();await settle();assert.equal(f.audio.paused,false);assert.equal(f.audio.currentTime,37);
});
test('hidden tabs pause and visible tabs resume enabled music',async()=>{
 const f=fixture();f.controller.enter();await settle();f.visibility(true);assert.equal(f.audio.paused,true);
 f.visibility(false);await settle();assert.equal(f.audio.paused,false);assert.equal(f.audio.calls,2);
});
test('stored off preference prevents entry autoplay',()=>{
 const f=fixture({saved:'false'});f.controller.enter();assert.equal(f.audio.calls,0);
 f.click();assert.equal(f.audio.calls,1);
});
test('blocked playback stays off and the music button retries',async()=>{
 const f=fixture({blocked:true});f.controller.enter();await settle();assert.equal(f.button.attributes['aria-pressed'],'false');assert.equal(f.errors.length,1);
 f.click();await settle();assert.equal(f.audio.calls,2);
});
test('late playback promise cannot override a user pause',async()=>{
 const f=fixture({deferred:true});f.controller.enter();f.click();f.release();await settle();assert.equal(f.audio.paused,true);assert.equal(f.button.attributes['aria-pressed'],'false');
});
