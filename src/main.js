import {assetUrl} from './asset-url.js';
import {createBackgroundAudio} from './background-audio.js';
import {Scene,Environment,Splat,Character,Animation,ENV_WORK_BUFFER_MODIFIER_GLSL} from '@viggle/splat-engine';
import {WaterField} from './water-field.js';
import {Blueprint} from './blueprint.js';
import {oceanRevealGLSL} from './ocean.js';
import {defaults,makePlan,order,roomAt,moveInHouse,safeSpawn,walkable,defaultAlignment} from './house-plan.js';
import {viewNodes,nodeById,nodeTransform} from './view-nodes.js';
import {sceneEntryPose,sceneProfiles,sceneWalkable,moveInScene,crossedPortal,nearestPortal,localToWorld,worldToLocal,mapScenePoint,movementSpeed} from './scene-navigation.js';
import './style.css';
const mapNames={living:'Living',gallery:'Hall',bedroom:'Bedroom',study:'Study',courtyard:'Courtyard'};
const $=s=>document.querySelector(s),canvas=$('#world'),keys=new Set(),storageKey='jst2-hybrid-house-v1';
let saved;try{saved=JSON.parse(localStorage.getItem(storageKey))}catch{}
let plan;try{plan=makePlan(saved?.dimensions??defaults)}catch{plan=makePlan()}
let alignment=defaultAlignment();for(const id of order){const a=saved?.alignment?.[id];if(a&&['x','y','z','yaw'].every(k=>Number.isFinite(a[k]))&&Math.abs(a.x)<=6&&Math.abs(a.z)<=6&&Math.abs(a.y)<=2&&Math.abs(a.yaw)<=180)alignment[id]={...alignment[id],...a};}
if(saved?.schema!==2&&alignment.study.status==='pending')alignment.study.yaw=-90;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let oceanPaused=reducedMotion.matches;
const state={entered:false,room:'living',mode:'hybrid',view:'first',position:safeSpawn(plan,'living'),pitch:0,visited:new Set(['living']),errors:[],frames:0,weight:0,node:'living',requestedNode:'living',isCourtyard:false,transition:null,running:false};
let blueprint,waterField,scene,scenePromise,character,characterPromise,motion='idle',actorYaw=0,groundOffset=0,drag,toastTimer,padMove,loadingRoom=null,statusText='',lastRoom='living',alignRoom='living';
let audioStorage;try{audioStorage=window.localStorage}catch{}
const backgroundAudio=createBackgroundAudio({audio:$('#bgm'),button:$('#music-toggle'),page:document,storage:audioStorage,onError:toast});
const environments=new Map(),failedRooms=new Map();let waterTick=0,photoReturn=null;let lastTime=0,lastActor={x:state.position.x,z:state.position.z};
const opacityShader='uniform float uSkinOpacity;\n'+oceanRevealGLSL+ENV_WORK_BUFFER_MODIFIER_GLSL.replace('void modifySplatColor(', 'void originalSplatColor(')+'\nvoid modifySplatColor(vec3 center, inout vec4 color){color.rgb=waterGlints(center,color.rgb);originalSplatColor(center,color);color.a *= uSkinOpacity;}';
function report(e){state.errors.push(String(e));console.error(e)}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000)}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({schema:2,dimensions:plan.dimensions,alignment}));return true}catch{toast('Browser storage is unavailable. Export the plan JSON to keep a copy.');return false}}
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click()}
function downloadJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));download(url,name);setTimeout(()=>URL.revokeObjectURL(url),1000)}
function manifest(){return {schema:'jst2-hybrid-house-v1',units:'metres',basis:'editable concept dimensions, not surveyed',dimensions:plan.dimensions,rooms:plan.rooms,doors:plan.doors,courtyard:plan.courtyard,pond:plan.pond,alignment,assets:viewNodes.filter(n=>sceneProfiles[n.id]).map(n=>({...n,normalised:true,transform:nodeTransform(plan,n,alignment),registration:'not geometrically verified'}))}}
function rebuildMap(){
 $('#house-map').setAttribute('viewBox',`-1.2 -1.7 ${plan.extentWidth+2.4} ${plan.depth+2.8}`);
 $('#map-rooms').innerHTML=Object.values(plan.rooms).map(r=>`<g role="button" tabindex="0" data-room="${r.id}" aria-label="Enter ${r.name}"><rect x="${r.x}" y="${r.z}" width="${r.w}" height="${r.h}"/><text x="${r.center.x}" y="${r.center.z-.2}" text-anchor="middle">${mapNames[r.id]}</text><text class="map-measure" x="${r.center.x}" y="${r.center.z+.45}" text-anchor="middle">${r.w.toFixed(1)} × ${r.h.toFixed(1)}</text></g>`).join('');
 $('#map-rooms').innerHTML+=`<g role="button" tabindex="0" data-room="courtyard" aria-label="Enter Water Courtyard"><rect x="${plan.courtyard.x}" y="${plan.courtyard.z}" width="${plan.courtyard.w}" height="${plan.courtyard.h}"/><text x="${plan.courtyard.x+3}" y="${plan.courtyard.z+3.5}" text-anchor="middle">Courtyard</text></g>`;
 $('#map-detail').innerHTML=`<text x="${plan.width/2}" y="-.7" text-anchor="middle">COAST · centre lines ${plan.width.toFixed(1)} m</text>`+plan.furniture.map(f=>`<rect x="${f.x-f.w/2}" y="${f.z-f.h/2}" width="${f.w}" height="${f.h}"/>`).join('')+[...plan.doors,plan.gardenDoor].map(d=>`<path d="M${d.x} ${d.z-d.width/2}v${d.width}"/>`).join('');
 for(const el of document.querySelectorAll('[data-room]')){const enter=()=>jumpTo(el.dataset.room);el.onclick=enter;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enter()}}}
 $('#map-viewpoints').innerHTML='';
 $('#plan-size').textContent=`${plan.area.toFixed(1)} m² · concept area`;syncUI();
}
function syncUI(){
 const r=plan.rooms[state.room];$('#room-number').textContent=`${state.mode==='blueprint'?'BLUEPRINT':'HYBRID HOUSE'} / 0${state.isCourtyard?5:order.indexOf(state.room)+1}`;$('#room-title').textContent=state.isCourtyard?'Water Courtyard':r.name;$('#room-subtitle').textContent=state.mode!=='blueprint'?'Explore the room. Follow a doorway to the next space.':state.isCourtyard?`${plan.courtyard.w.toFixed(1)} × ${plan.courtyard.h.toFixed(1)} m · open courtyard`:`${r.w.toFixed(1)} × ${r.h.toFixed(1)} m (centre lines) · height ${plan.dimensions.height.toFixed(1)} m`;
 for(const el of document.querySelectorAll('[data-room]')){el.classList.toggle('current',el.dataset.room===(state.isCourtyard?'courtyard':state.room));el.classList.toggle('visited',state.visited.has(el.dataset.room));el.setAttribute('aria-current',String(el.dataset.room===(state.isCourtyard?'courtyard':state.room)))}
 $('#map-count').textContent=`${state.visited.size} / 5 explored`;
 for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===state.view));
 $('#app').classList.toggle('third-person',state.view==='third');$('#app').classList.toggle('photo-active',state.entered&&state.mode!=='blueprint');$('#map-title').textContent=state.mode==='blueprint'?'CONCEPT FLOOR PLAN':'ROOM NAVIGATION';$('#map-note').textContent=state.mode==='blueprint'?'Concept dimensions · centre lines':'Connected spaces · destinations marked at doorways';
 renderMapPortals();
 $('#portal-labels').innerHTML=state.mode==='blueprint'?'':sceneProfiles[state.node].portals.map(d=>`<button data-portal="${d.id}" aria-label="Enter ${nodeTitle(d.to)}">${nodeTitle(d.to)} ↗</button>`).join('');
 for(const b of document.querySelectorAll('[data-portal]'))b.onclick=()=>{const d=sceneProfiles[state.node].portals.find(d=>d.id===b.dataset.portal);if(d&&!state.transition){state.transition=d;getEnvironment(d.to)}};
}
function nodeTitle(id){return id==='courtyard'?'Water Courtyard':plan.rooms[nodeById(id).room].name;}
function currentTransform(){return nodeTransform(plan,nodeById(state.node),alignment);}
function localPosition(){return worldToLocal(state.position,currentTransform());}
function renderMapPortals(){
 if(!$('#map-portals'))return;
 $('#map-portals').innerHTML=state.mode==='blueprint'?'':sceneProfiles[state.node].portals.map(d=>{const m=mapScenePoint(plan,state.node,d);return `<g><circle cx="${m.x}" cy="${m.z}" r=".17"/><text x="${m.x}" y="${m.z-.35}" text-anchor="middle">${mapNames[d.to]}</text></g>`}).join('');
 $('#map-detail').style.opacity=state.mode==='blueprint'?'1':'.15';
}
function jumpTo(id,arrival){
 keys.clear();padMove=null;state.transition=null;state.weight=0;state.node=id;state.requestedNode=id;state.room=id==='courtyard'?'study':id;state.isCourtyard=id==='courtyard';
 if(state.mode==='blueprint')state.position=id==='courtyard'?{x:plan.courtyard.x+1,z:plan.gardenDoor.z,y:1.6,yaw:Math.PI/2}:safeSpawn(plan,id);
 else state.position=localToWorld(arrival??sceneEntryPose(),currentTransform());
 state.pitch=0;actorYaw=0;lastRoom=state.room;lastActor={...state.position};state.visited.add(id);syncUI();
}
function setMode(mode){
 if(state.mode===mode){failedRooms.delete(state.node);return;}
 const id=state.isCourtyard?'courtyard':state.room;
 if(state.mode!=='blueprint')photoReturn={id,local:localPosition()};
 state.mode=mode;failedRooms.delete(id);jumpTo(id,mode!=='blueprint'&&photoReturn?.id===id?photoReturn.local:undefined);
}
function movePlayer(dx,dz){
 if(state.transition)return;
 if(state.mode==='blueprint'){Object.assign(state.position,moveInHouse(plan,state.position,dx,dz));return;}
 if(!environments.has(state.node))return;
 const t=currentTransform(),before=localPosition(),candidate=worldToLocal({...state.position,x:state.position.x+dx,z:state.position.z+dz},t);
 const after=moveInScene(state.node,before,candidate.x-before.x,candidate.z-before.z);
 Object.assign(state.position,localToWorld({...after,yaw:before.yaw},t));
 const portal=crossedPortal(state.node,before,after);if(portal){state.transition=portal;getEnvironment(portal.to);}
}
function cameraWalkable(p){return state.mode==='blueprint'?walkable(plan,p,.13):sceneWalkable(state.node,worldToLocal({...p,yaw:state.position.yaw},currentTransform()),.1);}
async function getEnvironment(id){
 if(!scene||environments.has(id)||loadingRoom||failedRooms.has(id))return;
 const node=nodeById(id);if(!node)return;loadingRoom=id;
 try{
  const env=await Environment.load(scene,node.url,{filename:node.url.split('/').pop().split('?')[0],name:nodeTitle(id)+' · '+node.label,...nodeTransform(plan,node,alignment)});
  env.entity.gsplat.setWorkBufferModifier({glsl:opacityShader});env.entity.gsplat.setParameter('uSkinOpacity',0);env.entity.gsplat.setParameter('uOceanReveal',['living','bedroom','study','courtyard'].includes(id)?1:0);env.entity.gsplat.setParameter('uPondReveal',id==='courtyard'?1:0);env.entity.enabled=false;
  applyNodeAlignment(node,env);environments.set(id,env);
  // Current view plus one adjacent view; never evict the displayed capture.
  if(environments.size>2){const evict=[...environments.keys()].find(k=>k!==id&&k!==state.node&&k!==state.requestedNode);if(evict){environments.get(evict).destroy();environments.delete(evict)}}
 }catch(e){report(e);failedRooms.set(id,true);toast('Scene unavailable. Explore the plan, or select Room view to retry.')}
 finally{loadingRoom=null}
}
function applyNodeAlignment(node,env){
 const t=nodeTransform(plan,node,alignment),yaw=t.rotation.y*Math.PI/180;
 env.entity.setPosition(t.position.x,t.position.y,t.position.z);env.entity.setEulerAngles(0,t.rotation.y,0);
 env.entity.gsplat.setParameter('uOceanOrigin',[t.position.x,t.position.y,t.position.z]);env.entity.gsplat.setParameter('uOceanYaw',[Math.cos(yaw),Math.sin(yaw)]);
 env.entity.gsplat.setParameter('uSeaEdge',node.id==='courtyard'?-4.5:node.id==='study'?-8:-6);
 env.entity.gsplat.setParameter('uPondBounds',[-2.75,-3,-.65,-.55]);
 env.entity.gsplat.setParameter('uWaterField',waterField.texture);env.entity.gsplat.setParameter('uWaterMotion',oceanPaused?0:1);env.entity.gsplat.setParameter('uWaterEye',[state.position.x,state.position.y??1.6,state.position.z]);

 Splat.markEnvWorkBuffersDirty();
}
function applyAlignment(room){for(const [id,env] of environments){const node=nodeById(id);if(node.room===room)applyNodeAlignment(node,env)}}
async function ensureCharacter(){
 if(character)return;if(characterPromise)return characterPromise;
 characterPromise=(async()=>{await scenePromise;if(!scene)throw new Error('Character renderer unavailable');await Promise.all(['idle','walk'].map(n=>Animation.loadGlb(scene,assetUrl(`${n}.glb`),n)));let c;try{c=await Character.load(scene,assetUrl('visitor.vsplat'),{name:'PINOC Visitor'});c.setPosition(0,0,0);c.playAnimation('idle',{loop:true,rootMotion:false});await new Promise(resolve=>scene.app.once('frameend',resolve));const feet=c.getLowestWorldY();if(Number.isFinite(feet)&&Math.abs(feet)<.5)groundOffset=-feet;c.setActive(false);character=c;}catch(e){c?.destroy();throw e;}})();
 try{await characterPromise}finally{characterPromise=null}
}
async function setView(view){if(characterPromise)return;keys.clear();const buttons=[...document.querySelectorAll('[data-view]')];buttons.forEach(b=>b.disabled=true);try{if(view==='third'){toast('Preparing your PINOC character…');await ensureCharacter()}state.view=view;actorYaw=-state.position.yaw*180/Math.PI;syncUI()}catch(e){report(e);toast('Character unavailable. You can still explore in first person.')}finally{buttons.forEach(b=>b.disabled=false)}}
function cameraPose(){
 const p=state.position,eye=state.mode==='blueprint'?1.6:(p.y??1.6),c=Math.cos(state.pitch),target={x:p.x+Math.sin(p.yaw)*c,y:eye+Math.sin(state.pitch),z:p.z-Math.cos(p.yaw)*c};
 if(state.view==='first')return {position:{x:p.x,y:eye,z:p.z},target,distance:0};
 let distance=0;for(let d=.08;d<1.9;d+=.08){if(!cameraWalkable({x:p.x-Math.sin(p.yaw)*d,z:p.z+Math.cos(p.yaw)*d}))break;distance=d}
 return {position:{x:p.x-Math.sin(p.yaw)*distance,y:eye+.35,z:p.z+Math.cos(p.yaw)*distance},target:{x:p.x+Math.sin(p.yaw)*.5,y:eye-.35+Math.sin(state.pitch),z:p.z-Math.cos(p.yaw)*.5},distance};
}
function update(time){
 requestAnimationFrame(update);if(!blueprint)return;const dt=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;state.frames++;
 const modal=document.querySelector('dialog[open]');state.running=false;
 if(state.entered&&!modal){const f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)+(padMove?.[0]??0),r=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+(padMove?.[1]??0),p=state.position,len=Math.max(1,Math.hypot(f,r));state.running=keys.has('shift')&&!!(f||r);const speed=movementSpeed(state.running);movePlayer((Math.sin(p.yaw)*f+Math.cos(p.yaw)*r)*dt*speed/len,(-Math.cos(p.yaw)*f+Math.sin(p.yaw)*r)*dt*speed/len);}
 if(state.mode==='blueprint'){
  state.room=roomAt(plan,state.position)??state.room;
  const outside=state.room==='study'&&state.position.x>=plan.courtyard.x;
  if(lastRoom!==state.room||outside!==state.isCourtyard){lastRoom=state.room;state.isCourtyard=outside;state.node=outside?'courtyard':state.room;state.requestedNode=state.node;state.visited.add(state.node);syncUI();}
 }
 let p=state.position;const moved=Math.hypot(p.x-lastActor.x,p.z-lastActor.z);if(moved>.0001)actorYaw=Math.atan2(lastActor.x-p.x,lastActor.z-p.z)*180/Math.PI;lastActor={x:p.x,z:p.z};
 const photo=state.entered&&state.mode!=='blueprint';
 if(photo)getEnvironment(state.node);
 const desired=photo&&!state.transition&&environments.has(state.node)?1:0;
 state.weight+=(desired-state.weight)*(1-Math.exp(-9*dt));if(state.weight<.015)state.weight=0;
 if(state.transition&&state.weight===0){const portal=state.transition;jumpTo(portal.to,portal.arrival);p=state.position;}
 blueprint.animateOcean(dt,!oceanPaused&&!document.hidden,.9);
 waterTick+=dt;const updateWater=waterTick>=1/30;if(updateWater){waterTick=0;if(photo&&waterField&&!document.hidden)waterField.update(blueprint.oceanTime);}
 for(const [id,env] of environments){
  const weight=id===state.node?state.weight:0;env.entity.enabled=weight>0;
  if(Math.abs((env.lastOpacity??-1)-weight)>.002){env.entity.gsplat.setParameter('uSkinOpacity',weight);env.lastOpacity=weight;Splat.markEnvWorkBuffersDirty()}
  if(weight>0&&updateWater&&!document.hidden){env.entity.gsplat.setParameter('uWaterEye',[p.x,p.y??1.6,p.z]);Splat.markEnvWorkBuffersDirty();}
 }
 const local=photo?localPosition():null,door=photo?nearestPortal(state.node,local):null;
 const near=door&&Math.hypot(local.x-door.x,local.z-door.z)<1.6;
 if(door&&photo&&environments.has(state.node)&&Math.hypot(local.x-door.x,local.z-door.z)<6)getEnvironment(door.to);
 $('#door-hint').hidden=!near||!state.entered;
 if(near)$('#door-hint').textContent=`Doorway → ${nodeTitle(door.to)} · Walk forward to enter`;
 $('#travel-shade').style.opacity=photo?String(1-state.weight):'0';
 const cam=cameraPose();blueprint.setCamera(cam.position,cam.target);if(!photo)blueprint.render();else blueprint.renderBackdrop(currentTransform(),state.node==='living');
 for(const button of document.querySelectorAll('[data-portal]')){const d=sceneProfiles[state.node].portals.find(d=>d.id===button.dataset.portal);if(!d)continue;const wp=localToWorld({...d,yaw:0},currentTransform()),projected=blueprint.projectPoint({...wp,y:wp.y-.3});button.hidden=!photo||!projected.visible||state.weight<.8;button.style.left=projected.x+'%';button.style.top=projected.y+'%';}
 if(scene){scene.cameraEntity.setPosition(cam.position.x,cam.position.y,cam.position.z);scene.cameraEntity.lookAt(cam.target.x,cam.target.y,cam.target.z)}
 if(character){character.armature.playbackSpeed=state.running?2.1:1;character.setPosition(p.x,groundOffset+(state.mode==='blueprint'?0:(p.y??1.6)-1.6),p.z);character.setRotation(0,actorYaw,0);character.setActive(state.view==='third'&&cam.distance>.45&&state.entered);const next=moved>.0001&&!modal?'walk':'idle';if(next!==motion){character.crossfadeTo(next,{duration:.18,loop:true,rootMotion:false});motion=next}}
 const mapPoint=photo?mapScenePoint(plan,state.node,localPosition()):p;$('#map-player').setAttribute('transform',`translate(${mapPoint.x} ${mapPoint.z}) rotate(${mapPoint.yaw*180/Math.PI})`);
 const status=failedRooms.has(state.node)?'Scene unavailable · Select Room view to retry':state.transition?'Entering the next space…':loadingRoom===state.node?'Loading room…':photo?`${state.running?'Running · Shift':'WASD to explore'} · Follow a doorway to the next room`:'Blueprint structure · Concept dimensions';
 if(status!==statusText){$('#surface-status').textContent=status;statusText=status}
 if(!$('#diagnostics').hidden)$('#diagnostics').textContent=`${state.room} / ${state.mode} / ${state.view}\nx ${p.x.toFixed(2)} z ${p.z.toFixed(2)} · skin ${state.weight.toFixed(2)}\n${state.frames} frames · ${state.errors.length} errors`;
}
$('#enter').onclick=()=>{backgroundAudio.enter();state.entered=true;$('#welcome').hidden=true;$('#hud').hidden=false;$('#app').classList.add('entered');syncUI();canvas.focus()};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>setMode(b.dataset.mode);
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
function syncOceanControl(){for(const env of environments.values())env.entity.gsplat.setParameter('uWaterMotion',oceanPaused?0:1);Splat.markEnvWorkBuffersDirty();$('#ocean-motion').setAttribute('aria-pressed',String(!oceanPaused));$('#ocean-motion').textContent=oceanPaused?'Water · Still':'Water · Shimmer';}
$('#ocean-motion').onclick=()=>{oceanPaused=!oceanPaused;syncOceanControl()};reducedMotion.addEventListener('change',e=>{oceanPaused=e.matches;syncOceanControl()});syncOceanControl();
$('#reset').onclick=()=>jumpTo(state.node);$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#app').requestFullscreen()}catch{toast('Full screen is unavailable in this browser.')}};
$('#map-toggle').onclick=()=>{const open=$('#map-toggle').getAttribute('aria-expanded')!=='true';$('#map-toggle').setAttribute('aria-expanded',String(open));$('#map-toggle').textContent=open?'−':'+';$('#map-body').hidden=!open};
function show(id){keys.clear();padMove=null;$('#'+id).showModal()}$('#about').onclick=()=>show('info');for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$('#'+b.dataset.close).close();
canvas.addEventListener('pointerdown',e=>{if(!state.entered)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;state.position.yaw+=(e.clientX-drag.x)*.004;state.pitch=Math.max(-1,Math.min(1,state.pitch-(e.clientY-drag.y)*.004));drag={id:e.pointerId,x:e.clientX,y:e.clientY}});for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drag=null);
for(const b of document.querySelectorAll('[data-move]')){const vector={forward:[1,0],back:[-1,0],left:[0,-1],right:[0,1]}[b.dataset.move];b.onpointerdown=e=>{padMove=vector;b.setPointerCapture(e.pointerId)};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>padMove=null);b.onclick=e=>{if(e.detail===0){const p=state.position;movePlayer((Math.sin(p.yaw)*vector[0]+Math.cos(p.yaw)*vector[1])*.25,(-Math.cos(p.yaw)*vector[0]+Math.sin(p.yaw)*vector[1])*.25)}}}
for(const b of document.querySelectorAll('[data-turn]'))b.onclick=()=>state.position.yaw+=Number(b.dataset.turn);
document.addEventListener('keydown',e=>{if(!state.entered||document.querySelector('dialog[open]')||e.target.closest('input,textarea'))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){e.preventDefault();keys.add(k)}if(!e.repeat){if(k==='v')setView(state.view==='first'?'third':'first');if(k==='b')setMode(state.mode==='blueprint'?'hybrid':'blueprint');if(k==='r')jumpTo(state.node)}});document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();padMove=null;drag=null});document.addEventListener('visibilitychange',()=>{keys.clear();padMove=null});
const dimensionLabels={livingWidth:'Living room width',livingDepth:'Living room depth',hallWidth:'Hall width · centre lines',wingWidth:'Bedroom / study width',frontDepth:'Bedroom depth',backDepth:'Study depth',height:'Ceiling height'};
$('#edit-plan').onclick=()=>{$('#dimension-fields').innerHTML=Object.entries(dimensionLabels).map(([key,label])=>`<label>${label}<span><input name="${key}" type="number" step="0.1" value="${plan.dimensions[key]}" required> m</span></label>`).join('');$('#plan-error').textContent='';show('plan-editor')};
$('#plan-form').onsubmit=e=>{e.preventDefault();try{const next=makePlan(Object.fromEntries(new FormData(e.target)));plan=next;alignment=defaultAlignment();for(const env of environments.values())env.destroy();environments.clear();failedRooms.clear();blueprint.build(plan);jumpTo('living');rebuildMap();persist();$('#plan-editor').close();toast('Plan dimensions updated. Room alignment has been reset.')}catch(e){$('#plan-error').textContent=e.message}};
$('#export-plan').onclick=()=>downloadJSON(manifest(),'jst2-concept-house.json');
$('#align').onclick=()=>{alignRoom=state.room;$('#alignment-title').textContent=plan.rooms[alignRoom].name+' · Room alignment';$('#alignment-fields').innerHTML=Object.entries({x:'Horizontal offset / m',z:'Depth offset / m',y:'Ground offset / m',yaw:'Rotation / °'}).map(([k,label])=>`<label>${label}<input name="${k}" type="number" step="${k==='yaw'?1:.1}" min="${k==='yaw'?-180:k==='y'?-2:-6}" max="${k==='yaw'?180:k==='y'?2:6}" value="${alignment[alignRoom][k]}"></label>`).join('');show('alignment')};
function previewAlignment(){const local=state.mode!=='blueprint'?localPosition():null;const values=Object.fromEntries(new FormData($('#alignment-form')));for(const k of ['x','y','z','yaw']){const n=Number(values[k]);if(Number.isFinite(n))alignment[alignRoom][k]=Math.max(k==='yaw'?-180:k==='y'?-2:-6,Math.min(k==='yaw'?180:k==='y'?2:6,n))}alignment[alignRoom].status='adjusted';applyAlignment(alignRoom);if(local)state.position=localToWorld(local,currentTransform())}
$('#alignment-fields').oninput=previewAlignment;$('#compare').onclick=()=>{setMode(state.mode==='blueprint'?'photo':'blueprint');$('#alignment').close();toast('View changed. Reopen Align room to continue adjusting.')};$('#alignment-form').onsubmit=e=>{e.preventDefault();previewAlignment();persist();$('#alignment').close();toast('Manual adjustment saved. Doorways, walls and floors still need verification.')};$('#reset-alignment').onclick=()=>{const local=state.mode!=='blueprint'?localPosition():null;alignment[alignRoom]=defaultAlignment()[alignRoom];applyAlignment(alignRoom);if(local)state.position=localToWorld(local,currentTransform());persist();$('#alignment').close()};
$('#export-view').onclick=()=>{try{const id=state.room;download(blueprint.captureRoom(id),`${id}-blueprint-camera.png`);downloadJSON({...manifest(),generationInput:{room:id,projection:'perspective',fov:68,aspect:1.6,camera:{position:{...plan.rooms[id].center,y:1.6},target:{x:plan.rooms[id].center.x+(id==='study'?1:0),y:1.6,z:plan.rooms[id].center.z-(id==='study'?0:1)}},prompt:`Preserve the attached camera view, door positions, straight walls and clear circulation. Finish this ${plan.rooms[id].w}m by ${plan.rooms[id].h}m coastal room with warm plaster, pale oak and travertine. Geometry and metric consistency must be checked after reconstruction.`,pipeline:'blueprint reference -> geometry-guided panorama -> JST-2 reconstruction -> registration review'}},`${id}-generation-input.json`);toast('Plan image and generation settings exported. No generation task was submitted.')}catch(e){report(e);toast('Export failed. Please try again.')}};
window.addEventListener('resize',()=>blueprint?.resize());Object.defineProperty(window,'explorerState',{get:()=>({...state,visited:[...state.visited],errors:[...state.errors],avatarReady:!!character,loadedRooms:[...environments.keys()],motion,localPosition:state.mode==='blueprint'?null:localPosition(),oceanPaused,oceanTime:blueprint?.oceanTime})});if(new URLSearchParams(location.search).has('inspect'))$('#diagnostics').hidden=false;
async function boot(){try{blueprint=new Blueprint($('#blueprint'));blueprint.build(plan);rebuildMap();jumpTo('living');$('#enter').disabled=false;$('#enter').textContent='Enter the house';requestAnimationFrame(update);scenePromise=Scene.create(canvas,{backend:'webgl',loadSkeleton:true,preserveDrawingBuffer:true,bgColor:{r:0,g:0,b:0,a:0},fov:68,far:120,maxPixelRatio:Math.min(devicePixelRatio,1.5),exposure:1,ambientLight:1}).then(s=>{scene=s;waterField=new WaterField(blueprint.renderer,scene.graphicsDevice);scene.cameraEntity.camera.nearClip=.05;scene.start()}).catch(e=>{report(e);toast('Room renderer unavailable. You can still explore the plan.')});}catch(e){report(e);$('#enter').textContent='Unable to start · Please refresh';$('#welcome p').textContent='Use a browser that supports WebGL2 with hardware acceleration enabled.'}}boot();
