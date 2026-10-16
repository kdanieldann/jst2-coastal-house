export const rooms={
 // Conservative central regions informed by decoded body-height splat density.
 // These are authored navigation limits, not recovered collision geometry.
 living:{name:'Ocean Living Room',en:'LIVING / 01',subtitle:'Light, stone and the sea beyond.',spawn:{x:0,z:0,y:1.6,yaw:0},bounds:[-2,1.45,-5.5,2.5],links:[{to:'gallery',x:0,z:2.5,y:1.4,label:'Enter Connecting Hall'}]},
 gallery:{name:'Connecting Hall',en:'GALLERY / 02',subtitle:'A passage from shared spaces to quiet moments.',spawn:{x:0,z:0,y:1.6,yaw:0},bounds:[-.8,1.35,-6.8,3.2],links:[{to:'living',x:0,z:3.2,y:1.4,label:'Return to living room'},{to:'bedroom',x:1.35,z:-2.2,y:1.4,label:'Enter Ocean Bedroom'},{to:'study',x:0,z:-6.5,y:1.4,label:'Go to courtyard study'}]},
 bedroom:{name:'Ocean Bedroom',en:'BEDROOM / 03',subtitle:'Slow down. Let the sea become part of your day.',spawn:{x:0,z:0,y:1.6,yaw:0},bounds:[-1.2,2.4,-4.3,3.2],links:[{to:'gallery',x:0,z:3.2,y:1.4,label:'Return to hall'}]},
 study:{name:'Courtyard Study',en:'STUDY / 04',subtitle:'Tree shadows beside your desk.',spawn:{x:0,z:0,y:1.6,yaw:0},bounds:[-1.7,.65,-5.8,3.7],links:[{to:'gallery',x:0,z:3.7,y:1.4,label:'Return to hall'}]}
};
export function constrain(x,z,bounds){return {x:Math.max(bounds[0],Math.min(bounds[1],x)),z:Math.max(bounds[2],Math.min(bounds[3],z))};}
export function movement(x,z,yaw,forward,right,step,bounds){const len=Math.hypot(forward,right)||1;return constrain(x+(Math.sin(yaw)*forward+Math.cos(yaw)*right)*step/len,z+(-Math.cos(yaw)*forward+Math.sin(yaw)*right)*step/len,bounds);}
export function nearestLink(room,pos,radius=1.1){return room.links.map(link=>({link,distance:Math.hypot(pos.x-link.x,pos.z-link.z)})).filter(x=>x.distance<radius).sort((a,b)=>a.distance-b.distance)[0]?.link;}
