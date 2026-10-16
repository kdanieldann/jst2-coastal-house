export const defaults={livingWidth:7,hallWidth:2,wingWidth:6,livingDepth:8,frontDepth:6,backDepth:6,height:3.2};
export const names={living:'Ocean Living Room',gallery:'Connecting Hall',bedroom:'Ocean Bedroom',study:'Courtyard Study'};
export const order=Object.keys(names);
export function validateDimensions(input){
 const limits={livingWidth:[5,10],hallWidth:[1.6,3],wingWidth:[4.5,9],livingDepth:[6,12],frontDepth:[4.5,8],backDepth:[4.5,8],height:[2.6,4]};
 const d={};for(const [key,[min,max]] of Object.entries(limits)){const v=Number(input[key]);if(!Number.isFinite(v)||v<min||v>max)throw new Error(`${key} must be within ${min}–${max} m`);d[key]=v;}
 if(d.livingDepth>d.frontDepth+d.backDepth)throw new Error('Living room depth cannot exceed the total house depth.');return d;
}
export function makePlan(input=defaults){
 const d=validateDimensions(input),a=d.livingWidth,b=a+d.hallWidth,c=b+d.wingWidth,total=d.frontDepth+d.backDepth;
 const rooms={living:{x:0,z:0,w:a,h:d.livingDepth},gallery:{x:a,z:0,w:d.hallWidth,h:total},bedroom:{x:b,z:0,w:d.wingWidth,h:d.frontDepth},study:{x:b,z:d.frontDepth,w:d.wingWidth,h:d.backDepth}};
 for(const [id,r] of Object.entries(rooms)){r.id=id;r.name=names[id];r.center={x:r.x+r.w/2,z:r.z+r.h/2};r.area=r.w*r.h;r.spawn={...r.center,y:1.6,yaw:0};}
 const doors=[{x:a,z:d.livingDepth*.65,width:1.6,rooms:['living','gallery']},{x:b,z:d.frontDepth*.55,width:1.5,rooms:['gallery','bedroom']},{x:b,z:d.frontDepth+d.backDepth*.55,width:1.5,rooms:['gallery','study']}];
 const walls=[];const wall=(x,z,w,h,height=d.height,y=height/2)=>walls.push({x,z,w,h,height,y});
 const split=(x,start,end,door)=>{const l=door.z-door.width/2,u=door.z+door.width/2;wall(x,(start+l)/2,.16,l-start);wall(x,(u+end)/2,.16,end-u);wall(x,door.z,.16,door.width,d.height-2.35,2.35+(d.height-2.35)/2)};
 wall(0,d.livingDepth/2,.16,d.livingDepth);wall(a/2,d.livingDepth,a,.16);
 split(a,0,d.livingDepth,doors[0]);if(total>d.livingDepth)wall(a,(total+d.livingDepth)/2,.16,total-d.livingDepth);
 split(b,0,d.frontDepth,doors[1]);split(b,d.frontDepth,total,doors[2]);
 const courtyard={x:c,z:d.frontDepth,w:6,h:d.backDepth};
 const gardenDoor={x:c,z:d.frontDepth+d.backDepth*.5,width:2.8};
 const pond={x:c+3,z:d.frontDepth+1.75,w:2,h:1.5};
 rooms.study.spawn.yaw=Math.PI/2;
 wall((b+c)/2,d.frontDepth,d.wingWidth,.16);wall(c,d.frontDepth/2,.16,d.frontDepth);split(c,d.frontDepth,total,gardenDoor);wall((a+c)/2,total,c-a,.16);
 wall(c+6,d.frontDepth+d.backDepth/2,.16,d.backDepth,1.6);wall(c+3,d.frontDepth,6,.16,1.6);wall(c+3,total,6,.16,1.6);
 // Ocean-facing glazing and courtyard view: solid low sill, open view above.
 wall(a/2,0,a,.16,.55);wall((b+c)/2,0,d.wingWidth,.16,.55);wall((a+b)/2,0,d.hallWidth,.16);
 const furniture=[
  {room:'living',kind:'sofa',x:.9,z:d.livingDepth*.46,w:1.15,h:2.5,height:.68,color:0xd0d6c6},
  {room:'living',kind:'table',x:2.45,z:d.livingDepth*.46,w:.8,h:1.3,height:.38,color:0xb7b9a8},
  {room:'living',kind:'island',x:a-1.3,z:1.8,w:1.3,h:1.1,height:.9,color:0xc2b28d},
  {room:'bedroom',kind:'bed',x:c-2,z:1.5,w:1.9,h:2.2,height:.52,color:0xd4d5c7},
  {room:'bedroom',kind:'wardrobe',x:c-.5,z:d.frontDepth-1.2,w:.65,h:1.8,height:2.4,color:0xc5b390},
  {room:'study',kind:'desk',x:c-1,z:d.frontDepth+d.backDepth*.45,w:.8,h:1.8,height:.75,color:0xbaaa86},
  {room:'study',kind:'shelf',x:b+d.wingWidth*.5,z:total-.4,w:1.8,h:.5,height:2.1,color:0xc5b390},
  {room:'study',kind:'pond',...pond,height:.12,color:0x557f78},
  {room:'study',kind:'planter',x:c+4,z:total-2,w:1.1,h:1.1,height:.6,color:0xb6b79b}
 ];
 return {dimensions:d,rooms,doors,walls,furniture,courtyard,gardenDoor,pond,extentWidth:c+6,width:c,depth:total,area:Object.values(rooms).reduce((sum,r)=>sum+r.area,0)};
}
export function roomAt(plan,p){return order.find(id=>{const r=plan.rooms[id];return p.x>=r.x&&p.x<=r.x+r.w&&p.z>=r.z&&p.z<=r.z+r.h})??(p.x>=plan.courtyard.x&&p.x<=plan.courtyard.x+plan.courtyard.w&&p.z>=plan.courtyard.z&&p.z<=plan.courtyard.z+plan.courtyard.h?'study':null);}
function intersects(p,b,r){return p.x>b.x-b.w/2-r&&p.x<b.x+b.w/2+r&&p.z>b.z-b.h/2-r&&p.z<b.z+b.h/2+r;}
export function walkable(plan,p,radius=.2){
 if(!roomAt(plan,p))return false;
 const obstacles=[...plan.walls.filter(w=>w.y-w.height/2<1.8),...plan.furniture];
 return !obstacles.some(b=>intersects(p,b,radius));
}
export function moveInHouse(plan,p,dx,dz){
 let x=p.x,z=p.z;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 for(let i=0;i<steps;i++){if(walkable(plan,{x:x+dx/steps,z}))x+=dx/steps;if(walkable(plan,{x,z:z+dz/steps}))z+=dz/steps;}
 return {x,z};
}
export function safeSpawn(plan,id){const r=plan.rooms[id];if(walkable(plan,r.center))return {...r.spawn};for(let z=r.z+.5;z<r.z+r.h;z+=.5)for(let x=r.x+.5;x<r.x+r.w;x+=.5)if(walkable(plan,{x,z}))return {x,z,y:1.6,yaw:0};throw new Error('This room has no walkable area.');}
export function photoWeight(plan,id,p){
 if(!id||id==='gallery')return 0;const r=plan.rooms[id];
 const edge=Math.min(p.x-r.x,r.x+r.w-p.x,p.z-r.z,r.z+r.h-p.z);
 const door=Math.min(...plan.doors.filter(d=>d.rooms.includes(id)).map(d=>Math.hypot(p.x-d.x,p.z-d.z)));
 return Math.max(0,Math.min(1,(edge-.35)/.9,(door-.65)/1.1));
}
export function defaultAlignment(){return Object.fromEntries(order.map(id=>[id,{x:0,y:0,z:0,yaw:id==='study'?-90:0,status:'pending'}]));}
export function alignmentTransform(plan,id,a){const c=plan.rooms[id].center;return {position:{x:c.x+a.x,y:a.y,z:c.z+a.z},rotation:{x:0,y:a.yaw,z:0},scale:1};}
