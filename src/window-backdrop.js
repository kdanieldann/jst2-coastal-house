import * as THREE from 'three';
// A far backdrop is visible only through the living room's measured opening
// and transparent reconstruction gaps. It never replaces foreground splats.
export const opening={z:-5.35,left:-5.78,right:5.78,bottom:.02,top:3.15};
export function rayThroughOpening(eye,ray){
 if(ray.z>=0)return false;const t=(opening.z-eye.z)/ray.z;
 const x=eye.x+t*ray.x,y=eye.y+t*ray.y;
 return t>0&&x>opening.left&&x<opening.right&&y>opening.bottom&&y<opening.top;
}
export class WindowBackdrop{
 constructor(){
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();
  this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{
   uProjectionInverse:{value:new THREE.Matrix4()},uCameraWorld:{value:new THREE.Matrix4()},uOrigin:{value:new THREE.Vector3()},uYaw:{value:new THREE.Vector2(1,0)},uEnabled:{value:0},uTime:{value:0},uOpening:{value:new THREE.Vector4(opening.left,opening.right,opening.bottom,opening.top)},uPlaneZ:{value:opening.z}
  },vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
   varying vec2 vUv;uniform mat4 uProjectionInverse,uCameraWorld;uniform vec3 uOrigin;uniform vec2 uYaw;uniform float uEnabled,uTime,uPlaneZ;uniform vec4 uOpening;
   vec3 localDirection(vec3 d){return vec3(uYaw.x*d.x-uYaw.y*d.z,d.y,uYaw.y*d.x+uYaw.x*d.z);}
   void main(){
    vec3 base=vec3(.87,.85,.79);
    vec3 ray=localDirection(normalize(mat3(uCameraWorld)*(uProjectionInverse*vec4(vUv*2.-1.,1.,1.)).xyz));
    vec3 eye=localDirection(uCameraWorld[3].xyz-uOrigin);
    float t=(uPlaneZ-eye.z)/min(ray.z,-.00001);vec3 hit=eye+ray*t;
    float edge=min(min(hit.x-uOpening.x,uOpening.y-hit.x),min(hit.y-uOpening.z,uOpening.w-hit.y));
    float windowMask=uEnabled*step(ray.z,-.00001)*step(.001,t)*smoothstep(0.,.025,edge);
    float elevation=ray.y+.03;
    vec3 sky=mix(vec3(.77,.85,.87),vec3(.55,.73,.84),smoothstep(0.,.5,elevation));
    vec2 p=ray.xz/max(-elevation,.025);
    float ripple=sin(p.x*2.1+p.y*3.7+uTime*.8)*sin(p.x*5.3-p.y*1.8-uTime*.6);
    float detail=smoothstep(.015,.12,-elevation);
    vec3 sea=vec3(.28,.46,.56)+ripple*.012*detail;
    vec3 scenery=mix(sea,sky,smoothstep(-.004,.004,elevation));
    gl_FragColor=vec4(mix(base,scenery,windowMask),1.);
   }`});
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
 }
 render(renderer,camera,transform,enabled,time){
  camera.updateMatrixWorld();const u=this.material.uniforms,yaw=transform.rotation.y*Math.PI/180;
  u.uProjectionInverse.value.copy(camera.projectionMatrixInverse);u.uCameraWorld.value.copy(camera.matrixWorld);
  u.uOrigin.value.set(transform.position.x,transform.position.y,transform.position.z);u.uYaw.value.set(Math.cos(yaw),Math.sin(yaw));u.uEnabled.value=enabled?1:0;u.uTime.value=time;
  renderer.render(this.scene,this.camera);
 }
}
