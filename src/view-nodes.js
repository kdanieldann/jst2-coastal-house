import {assetUrl} from './asset-url.js';
import {defaultAlignment,alignmentTransform} from './house-plan.js';

// Capture poses, not claims of registration. The doorway reconstructions
// are previews until their reconstructed walls are checked against the plan.
export const viewNodes=[
 ...['living','gallery','bedroom','study'].map(room=>({id:room,room,label:'Central view',url:assetUrl(`${room}.spz${room==='living'?'?v=window-2':room==='bedroom'?'?v=bedroom-multiview-2':''}`),u:.5,v:.5,yaw:room==='study'?-90:0,generated:false})),
 {id:'courtyard',room:'study',label:'Water Courtyard',url:assetUrl('courtyard.spz?v=sky-2'),outdoor:true,u:1.3/6,v:3.2/6,yaw:-90,generated:true},
 {id:'living-door',room:'living',label:'Doorway view',url:assetUrl('living-door.spz'),u:5.8/7,v:5.2/8,yaw:0,generated:true},
 {id:'bedroom-door',room:'bedroom',label:'Doorway view',url:assetUrl('bedroom-door.spz'),u:1.1/6,v:3.3/6,yaw:0,generated:true},
 {id:'study-door',room:'study',label:'Doorway · water courtyard',url:assetUrl('study-door.spz'),u:1.1/6,v:3.3/6,yaw:-90,generated:true}
];
export const nodeById=id=>viewNodes.find(n=>n.id===id);
export function nodeAnchor(plan,node){const r=node.outdoor?plan.courtyard:plan.rooms[node.room];return {x:r.x+r.w*node.u,z:r.z+r.h*node.v};}
export function pondPlacement(plan,node,alignment){
 const t=nodeTransform(plan,node,alignment),yaw=t.rotation.y*Math.PI/180;
 // Conservative interior measured from the new study's point-cloud projection.
 // This is appearance placement only; the blueprint remains authoritative.
 const bounds=node.id==='study-door'?[-3.15,-7.6,-1.2,-5]:[-2,-7,-.5,-5];
 const x=(bounds[0]+bounds[2])/2,z=(bounds[1]+bounds[3])/2;
 return {bounds,origin:t.position,yaw:t.rotation.y,x:t.position.x+Math.cos(yaw)*x+Math.sin(yaw)*z,z:t.position.z-Math.sin(yaw)*x+Math.cos(yaw)*z,w:bounds[3]-bounds[1],h:bounds[2]-bounds[0]};
}
export function nodeTransform(plan,node,alignment){
 if(!node.generated)return alignmentTransform(plan,node.room,alignment[node.room]);
 const r=plan.rooms[node.room],a=alignment[node.room],p=nodeAnchor(plan,node),yaw=(a.yaw-defaultAlignment()[node.room].yaw)*Math.PI/180;
 const dx=p.x-r.center.x,dz=p.z-r.center.z;
 return {position:{x:r.center.x+a.x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,y:a.y,z:r.center.z+a.z-Math.sin(yaw)*dx+Math.cos(yaw)*dz},rotation:{x:0,y:node.yaw+yaw*180/Math.PI,z:0},scale:1};
}
export function selectNode(plan,room,position,currentId){
 const nodes=viewNodes.filter(n=>n.room===room),distance=n=>{const p=nodeAnchor(plan,n);return Math.hypot(position.x-p.x,position.z-p.z)};
 const nearest=nodes.reduce((a,b)=>distance(a)<=distance(b)?a:b),current=nodes.find(n=>n.id===currentId);
 // Avoid oscillating around the midpoint between two views.
 return current&&distance(current)<distance(nearest)+.65?current:nearest;
}
export function nearbyDoor(plan,room,p){
 const doors=plan.doors.filter(d=>d.rooms.includes(room));
 const door=doors.reduce((a,b)=>!a||Math.hypot(p.x-b.x,p.z-b.z)<Math.hypot(p.x-a.x,p.z-a.z)?b:a,null);
 if(!door||Math.hypot(p.x-door.x,p.z-door.z)>2.6)return null;
 return {...door,next:door.rooms.find(id=>id!==room)};
}
