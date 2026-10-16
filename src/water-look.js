// Shared artistic limits for the photographed water. The original capture
// already contains a sun path: animation must not invent a second one.
export const waterLook={ripple:.018,glint:.022,farStart:8,farEnd:38,farStrength:.12};
export const waves=[
 [3,5,.22,.04,.28,0],[8,3,-.31,.025,.22,1.7],
 [11,-7,.37,.019,.16,3.1],[19,13,-.41,.013,.12,.6],
 [23,-17,.53,.009,.09,2.3],[37,23,-.59,.005,.06,4.5],
 [41,-31,.67,.003,.04,1.2],[53,37,-.71,.002,.03,5.7]
];
const f=n=>Number.isInteger(n)?`${n}.0`:String(n);
export const waveFieldGLSL=`vec3 waveField(vec2 uv,float time){
 vec2 p=uv*6.28318530718;vec2 slope=vec2(0.0);float crest=0.0;
 ${waves.map(([x,y,speed,amp,weight,phase],i)=>`
 float a${i}=dot(p,vec2(${f(x)},${f(y)}))+time*${f(speed)}+${f(phase)};
 slope+=normalize(vec2(${f(x)},${f(y)}))*cos(a${i})*${f(amp)};
 crest+=sin(a${i})*${f(weight)};`).join('')}
 return vec3(slope,crest);
}`;
export const waterLightGLSL=`
vec3 waterLight(vec3 rgb,vec3 field,vec3 detail,float distanceToEye,float pond){
 float distanceFade=mix(${f(waterLook.farStrength)},1.0,1.0-smoothstep(${f(waterLook.farStart)},${f(waterLook.farEnd)},distanceToEye));
 float crest=field.b*2.0-1.0;
 float luma=dot(rgb,vec3(.2126,.7152,.0722));
 // Animate highlights already present in the photograph, in broken clusters.
 float existingReflection=smoothstep(.34,.72,luma);
 float flecks=smoothstep(.58,.87,detail.b)*smoothstep(.42,.72,field.b);
 float ripple=crest*${f(waterLook.ripple)}*distanceFade;
 float sparkle=flecks*existingReflection*${f(waterLook.glint)}*distanceFade*mix(1.0,.75,pond);
 vec3 shifted=rgb*(1.0+ripple);
 vec3 headroom=max(vec3(0.0),vec3(.9)-shifted);
 return min(vec3(1.0),shifted+min(headroom,vec3(sparkle)*vec3(1.0,.97,.9)));
}`;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function sampleWave(u,v,time){
 let x=0,y=0,c=0;for(const [dx,dy,speed,amp,weight,phase] of waves){const a=(u*dx+v*dy)*Math.PI*2+time*speed+phase,l=Math.hypot(dx,dy);x+=dx/l*Math.cos(a)*amp;y+=dy/l*Math.cos(a)*amp;c+=Math.sin(a)*weight}
 return [x+.5,y+.5,c*.5+.5];
}
export function waterLight(rgb,field,detail,distance,pond=0){
 const fade=waterLook.farStrength+(1-waterLook.farStrength)*(1-smooth(waterLook.farStart,waterLook.farEnd,distance));
 const luma=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 const sparkle=smooth(.58,.87,detail[2])*smooth(.42,.72,field[2])*smooth(.34,.72,luma)*waterLook.glint*fade*(1-.25*pond);
 return rgb.map((c,i)=>{const shifted=c*(1+(field[2]*2-1)*waterLook.ripple*fade);return Math.min(1,shifted+Math.min(Math.max(0,.9-shifted),sparkle*[1,.97,.9][i]))});
}
