import {rooms,constrain} from './navigation.js';

// Authored concept arrangement. Each scene retains its own local coordinates.
export const footprints={
 living:{x:18,y:42,w:100,h:76,label:'Ocean Living Room'},
 gallery:{x:121,y:82,w:37,h:119,label:'Hall'},
 bedroom:{x:161,y:42,w:101,h:76,label:'Ocean Bedroom'},
 study:{x:161,y:121,w:101,h:80,label:'Courtyard Study'}
};
export function mapPose(id,p){
 const r=footprints[id],b=rooms[id].bounds,c=constrain(p.x,p.z,b);
 const sx=(r.w-16)/(b[1]-b[0]),sz=(r.h-16)/(b[3]-b[2]);
 return {x:r.x+8+(c.x-b[0])*sx,y:r.y+8+(c.z-b[2])*sz,
 angle:Math.atan2(Math.sin(p.yaw)*sx,Math.cos(p.yaw)*sz)*180/Math.PI};
}
export function followPose(p,pitch,bounds){
 // Shorten the camera boom before the authored room boundary.
 const dx=-Math.sin(p.yaw),dz=Math.cos(p.yaw);let distance=1.85;
 for(const [value,direction,min,max] of [[p.x,dx,bounds[0],bounds[1]],[p.z,dz,bounds[2],bounds[3]]]){
  if(Math.abs(direction)>.00001)distance=Math.min(distance,Math.max(0,((direction>0?max:min)-value)/direction));
 }
 const pos=constrain(p.x+dx*distance,p.z+dz*distance,bounds);
 return {...pos,y:1.85+Math.max(0,-pitch)*.35,distance,
 target:{x:p.x+Math.sin(p.yaw)*.6,y:1.25+Math.sin(pitch)*1.4,z:p.z-Math.cos(p.yaw)*.6}};
}
