import * as THREE from 'three';
import {Texture,PIXELFORMAT_RGBA8,FILTER_LINEAR,ADDRESS_REPEAT} from 'playcanvas';

// One small Three.js wave-normal field shared with the splat renderer. Keeping
// water on its photographed geometry preserves foreground occlusion and edges.
export {waveFieldGLSL} from './water-look.js';
import {waveFieldGLSL} from './water-look.js';
export class WaterField {
 constructor(renderer,device){
  this.renderer=renderer;this.size=256;this.pixels=new Uint8Array(this.size*this.size*4);
  this.target=new THREE.WebGLRenderTarget(this.size,this.size,{depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,colorSpace:THREE.NoColorSpace});
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  this.material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},depthTest:false,depthWrite:false,toneMapped:false,
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
   fragmentShader:'uniform float uTime;varying vec2 vUv;'+waveFieldGLSL+'void main(){vec3 w=waveField(vUv,uTime);gl_FragColor=vec4(w.xy+.5,w.z*.5+.5,1.0);}'});
  this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  this.texture=new Texture(device,{name:'Three.js water normals',width:this.size,height:this.size,format:PIXELFORMAT_RGBA8,mipmaps:false,minFilter:FILTER_LINEAR,magFilter:FILTER_LINEAR,addressU:ADDRESS_REPEAT,addressV:ADDRESS_REPEAT});
  this.update(0);
 }
 update(time){
  if(time===this.lastTime)return false;
  const old=this.renderer.getRenderTarget();
  try{this.material.uniforms.uTime.value=time;this.renderer.setRenderTarget(this.target);this.renderer.render(this.scene,this.camera);this.renderer.readRenderTargetPixels(this.target,0,0,this.size,this.size,this.pixels);}
  finally{this.renderer.setRenderTarget(old);}
  this.texture.lock().set(this.pixels);this.texture.unlock();this.lastTime=time;return true;
 }
 dispose(){this.target.dispose();this.material.dispose();this.scene.children[0].geometry.dispose();this.texture.destroy();}
}
