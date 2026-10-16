// A single soundtrack survives scene changes. Playback starts with a user gesture.
export function createBackgroundAudio({audio,button,page,storage,onError=()=>{}}){
 const key='jst2-music-enabled';
 let enabled=true,entered=false,pending=false,attempt=0,failed=false;
 try{enabled=storage?.getItem(key)!=='false'}catch{}
 audio.loop=true;audio.volume=.3;
 const wanted=()=>entered&&enabled&&!page.hidden;
 function render(){
  const playing=wanted()&&!audio.paused&&!failed;
  button.textContent=pending?'Music · Loading…':playing?'Music · On':'Music · Off';
  button.setAttribute('aria-pressed',String(playing));
  button.setAttribute('aria-label',playing?'Pause background music: Sea Life — Loop':'Play background music: Sea Life — Loop');
 }
 async function sync(){
  const ticket=++attempt;
  if(!wanted()){pending=false;audio.pause();render();return}
  pending=true;failed=false;render();
  try{
   await audio.play();
   if(ticket!==attempt){if(!wanted())audio.pause();return}
   pending=false;render();
  }catch{
   if(ticket!==attempt)return;
   pending=false;failed=true;render();
   onError('Music could not start. Select Music to try again.');
  }
 }
 button.addEventListener('click',()=>{
  // A blocked play can be retried with a fresh user gesture.
  enabled=failed||!enabled;failed=false;
  try{storage?.setItem(key,String(enabled))}catch{}
  void sync();
 });
 page.addEventListener('visibilitychange',()=>void sync());
 audio.addEventListener('playing',render);
 audio.addEventListener('pause',render);
 audio.addEventListener('error',()=>{
  if(!wanted())return;
  ++attempt;pending=false;failed=true;render();
 });
 render();
 return {enter(){if(entered)return;entered=true;void sync()}};
}
