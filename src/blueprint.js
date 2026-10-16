import * as THREE from 'three';
import {WindowBackdrop} from './window-backdrop.js';
import {createOcean} from './ocean.js';
export class Blueprint {
 constructor(canvas){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0xe8ecdf);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.backdrop=new WindowBackdrop();this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0xe8ecdf,32,90);this.camera=new THREE.PerspectiveCamera(68,1,.05,1200);
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x8b947b,2.5));const sun=new THREE.DirectionalLight(0xfff1d5,2.2);sun.position.set(-8,20,-12);this.scene.add(sun);
  this.group=new THREE.Group();this.scene.add(this.group);this.ocean=createOcean();this.scene.add(this.ocean);this.oceanTime=0;this.resize();
 }
 resize(){const c=this.renderer.domElement;this.renderer.setSize(c.clientWidth,c.clientHeight,false);this.camera.aspect=c.clientWidth/c.clientHeight;this.camera.updateProjectionMatrix();}
 box(x,y,z,w,h,d,color,lines=true){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9}));mesh.position.set(x,y,z);this.group.add(mesh);if(lines){const e=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0x61715f,transparent:true,opacity:.38}));mesh.add(e);}return mesh;}
 build(plan){
  for(const o of [...this.group.children]){this.group.remove(o);o.traverse(n=>{n.geometry?.dispose();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material?.dispose()})}
  this.plan=plan;
  const court=plan.courtyard,pool=plan.pond;
  this.box(court.x+court.w/2,-.12,court.z+court.h/2,court.w,.16,court.h,0xd7d1b9);
  this.pond=createOcean(pool.w,pool.h,true);this.pond.position.set(pool.x,-.015,pool.z);this.group.add(this.pond);
  for(const side of [-1,1]){this.box(pool.x+side*(pool.w/2+.07),.04,pool.z,.14,.12,pool.h+.28,0xcfc7ae,false);this.box(pool.x,.04,pool.z+side*(pool.h/2+.07),pool.w,.12,.14,0xcfc7ae,false);}
  this.box(court.x+4,1.2,court.z+court.h-2,.18,1.8,.18,0x766d51,false);
  const tree=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1),new THREE.MeshStandardMaterial({color:0x839576,roughness:1}));tree.position.set(court.x+4,2.4,court.z+court.h-2);this.group.add(tree);
  for(const r of Object.values(plan.rooms)){this.box(r.center.x,-.1,r.center.z,r.w,.2,r.h,r.id==='gallery'?0xd4ddc8:0xe7e8da);this.box(r.center.x,plan.dimensions.height+.06,r.center.z,r.w,.12,r.h,0xe4e8d9);}
  for(const w of plan.walls)this.box(w.x,w.y,w.z,w.w,w.height,w.h,0xd6ddcb);
  for(const f of plan.furniture)if(f.kind!=='pond')this.box(f.x,f.height/2,f.z,f.w,f.height,f.h,f.color);
  this.ocean.position.x=plan.width/2;
  // Grid stops at the house; no blueprint lines float over the sea.
  const points=[];for(let x=0;x<=plan.width;x++)points.push(x,.012,0,x,.012,plan.depth);for(let z=0;z<=plan.depth;z++)points.push(0,.012,z,plan.width,.012,z);
  const grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),new THREE.LineBasicMaterial({color:0x8b9e8e,transparent:true,opacity:.25}));this.group.add(grid);
  for(const door of plan.doors){this.box(door.x,.025,door.z,.55,.03,door.width,0xc3a76d,false);}
 }
 setCamera(position,target){this.camera.position.set(position.x,position.y,position.z);this.camera.lookAt(target.x,target.y,target.z);}
 projectPoint(p){this.camera.updateMatrixWorld();const v=new THREE.Vector3(p.x,p.y,p.z).project(this.camera);return {x:(v.x+1)*50,y:(1-v.y)*50,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<.95&&Math.abs(v.y)<.9};}
 animateOcean(dt,enabled,strength){
  if(enabled)this.oceanTime+=dt;
  this.ocean.material.uniforms.uTime.value=this.oceanTime;this.ocean.material.uniforms.uStrength.value=strength;
  this.pond.material.uniforms.uTime.value=this.oceanTime;this.pond.material.uniforms.uStrength.value=1.1;
  // These geometric water surfaces belong only to the concept blueprint.
  this.ocean.rotation.y=0;this.ocean.position.set(this.plan.width/2,-.55,-400.2);
  this.pond.rotation.y=0;this.pond.scale.set(1,1,1);this.pond.position.set(this.plan.pond.x,-.015,this.plan.pond.z);
 }
 renderBackdrop(transform,enabled){this.backdrop.render(this.renderer,this.camera,transform,enabled,this.oceanTime)}
 render(){this.renderer.render(this.scene,this.camera)}
 captureRoom(id){
  const waters=[this.ocean,this.pond].map(mesh=>({mesh,position:mesh.position.clone(),rotation:mesh.rotation.clone(),scale:mesh.scale.clone()}));
  this.animateOcean(0,false,.9,{});
  const oldPos=this.camera.position.clone(),oldQ=this.camera.quaternion.clone(),oldAspect=this.camera.aspect;
  const size=this.renderer.getSize(new THREE.Vector2()),ratio=this.renderer.getPixelRatio(),r=this.plan.rooms[id];
  this.renderer.setPixelRatio(1);this.renderer.setSize(1600,1000,false);this.camera.aspect=1.6;this.camera.updateProjectionMatrix();
  this.setCamera({x:r.center.x,y:1.6,z:r.center.z},{x:r.center.x+(id==='study'?1:0),y:1.6,z:r.center.z-(id==='study'?0:1)});this.render();
  const url=this.renderer.domElement.toDataURL('image/png');this.renderer.setPixelRatio(ratio);this.renderer.setSize(size.x,size.y,false);this.camera.position.copy(oldPos);this.camera.quaternion.copy(oldQ);this.camera.aspect=oldAspect;this.camera.updateProjectionMatrix();for(const w of waters){w.mesh.position.copy(w.position);w.mesh.rotation.copy(w.rotation);w.mesh.scale.copy(w.scale)}this.render();return url;
 }
}
