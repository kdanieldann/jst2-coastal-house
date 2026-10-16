import * as THREE from 'three';
import {waterLightGLSL} from './water-look.js';

// Water changes RGB only; alpha is never cut to expose the other renderer.
export const oceanRevealGLSL=`
uniform float uOceanReveal;
uniform float uWaterMotion;
${waterLightGLSL}
uniform vec3 uOceanOrigin;
uniform vec2 uOceanYaw;
uniform float uSeaEdge;
uniform float uPondReveal;
uniform vec4 uPondBounds;
uniform vec3 uWaterEye;
uniform sampler2D uWaterField;
vec3 waterLocal(vec3 world){
 vec3 d=world-uOceanOrigin;
 return vec3(uOceanYaw.x*d.x-uOceanYaw.y*d.z,d.y,uOceanYaw.y*d.x+uOceanYaw.x*d.z);
}
float seaMask(vec3 p,vec3 rgb){
 float outside=1.0-smoothstep(uSeaEdge-.8,uSeaEdge,p.z);
 float height=(1.0-smoothstep(1.35,1.65,p.y))*smoothstep(-6.0,-4.5,p.y);
 float cool=smoothstep(.015,.065,rgb.b-rgb.r)*smoothstep(.005,.035,rgb.g-rgb.r);
 return outside*height*cool;
}
float pondMask(vec3 p,vec3 rgb){
 vec2 edge=min(p.xz-uPondBounds.xy,uPondBounds.zw-p.xz);
 float bounds=smoothstep(0.0,.12,min(edge.x,edge.y));
 float height=(1.0-smoothstep(.12,.35,p.y))*smoothstep(-1.0,-.3,p.y);
 return bounds*height*smoothstep(.015,.06,max(rgb.g,rgb.b)-rgb.r);
}
vec3 waterGlints(vec3 world,vec3 rgb){
 vec3 p=waterLocal(world);
 float sea=uOceanReveal*seaMask(p,rgb),pond=uPondReveal*pondMask(p,rgb);
 float mask=clamp(sea+pond,0.0,1.0);
 if(mask<.001||uWaterMotion<.001)return rgb;
 vec3 field=texture2D(uWaterField,p.xz/24.0*mix(1.0,2.5,pond)).rgb;
 vec3 detail=texture2D(uWaterField,p.xz/24.0*mix(1.73,3.7,pond)+vec2(.31,.57)).rgb;
 vec3 water=waterLight(rgb,field,detail,length(waterLocal(uWaterEye).xz-p.xz),pond);
 return mix(rgb,water,mask);
}`;

export function createOcean(width=800,depth=800,pond=false){
 const geometry=new THREE.PlaneGeometry(width,depth,pond?16:96,pond?16:96);
 geometry.rotateX(-Math.PI/2);
 const material=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:.8},uPond:{value:pond?1:0}},
  vertexShader:`
   uniform float uTime;
   uniform float uPond;
   varying vec3 vWorld;
   void main(){
    vec3 p=position;
    p.y += mix(1.0,.22,uPond)*(.025*sin(p.x*.42+p.z*.58+uTime*.7)+.014*sin(p.x*.83-p.z*.32-uTime*.9));
    vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;
    gl_Position=projectionMatrix*viewMatrix*world;
   }`,
  fragmentShader:`
   uniform float uTime;
   uniform float uStrength;
   uniform float uPond;
   varying vec3 vWorld;
   void main(){
    vec2 p=vWorld.xz;
    float a=dot(p,vec2(.75,1.05))+uTime*.85;
    float b=dot(p,vec2(2.1,-1.25))-uTime*1.1;
    float c=dot(p,vec2(5.7,3.9))+uTime*1.65;
    float d=dot(p,vec2(11.3,-6.7))-uTime*1.9;
    // Sum analytic slopes rather than scrolling an image of water.
    vec2 slope=vec2(.75,1.05)*cos(a)*.06+vec2(2.1,-1.25)*cos(b)*.024;
    slope+=vec2(5.7,3.9)*cos(c)*.008+vec2(11.3,-6.7)*cos(d)*.003;
    vec3 normal=normalize(vec3(-slope.x,1.0,-slope.y));
    vec3 view=normalize(cameraPosition-vWorld);
    vec3 sun=normalize(mix(vec3(-.16,.24,-.96),vec3(.65,.65,-.3),uPond));
    vec3 halfVector=normalize(view+sun);
    float fresnel=pow(1.0-max(dot(normal,view),0.0),3.0);
    vec3 sea=mix(vec3(.025,.125,.19),vec3(.10,.29,.35),fresnel);
    sea=mix(sea,vec3(.055,.21,.18)+vec3(.07,.12,.10)*fresnel,uPond*.65);
    sea += vec3(.008,.024,.025)*sin(a)*sin(b);
    float highlight=pow(max(dot(normal,halfVector),0.0),110.0);
    float shimmer=pow(max(dot(normal,halfVector),0.0),420.0);
    float footprint=max(length(fwidth(p)),.008);
    float detailed=1.0-smoothstep(.5,2.5,footprint);
    float flecks=smoothstep(.15,.8,sin(c)*sin(d));
    float glint=(highlight*.045+shimmer*.14*detailed*flecks)*uStrength;
    sea += vec3(1.0,.91,.68)*glint;
    float distanceToEye=length(cameraPosition-vWorld);
    sea=mix(sea,vec3(.30,.47,.49),smoothstep(160.,650.,distanceToEye)*.65);
    gl_FragColor=vec4(sea,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
  side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Living room animated sea';mesh.position.set(0,-.55,-400.2);mesh.frustumCulled=false;
 return mesh;
}
