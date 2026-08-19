const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('const ISPEAK_HEROES=['),end=src.lastIndexOf('Object.assign(window,{heroesHome,heroShelf,heroRead});');
if(start<0||end<0)throw new Error('Story library source not found');
const code=src.slice(start,end)+'\n;globalThis.__heroesHome=heroesHome;';
const langs=['english','mandarin','spanish','french','japanese','arabic','khmer'];
let passed=0;
for(const language of langs){
 const mk=hidden=>({hidden,dir:'',innerHTML:'',style:{},removeAttribute(k){if(k==='hidden')this.hidden=false},setAttribute(k){if(k==='hidden')this.hidden=true}});
 const pane=mk(true),hub=mk(false),classic=mk(true),nodes={heroesLibraryPane:pane,libraryHub:hub,classicLibraryPane:classic};
 const ctx={console,state:{language,heroReadingProgress:{}},localStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:id=>nodes[id]||null,addEventListener:()=>{}},window:{scrollTo:()=>{}},save:()=>{},localSave:()=>{},trackAnalytics:()=>{},alert:()=>{},toast:()=>{},esc:s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))};
 vm.createContext(ctx);vm.runInContext(code,ctx);ctx.__heroesHome();
 if(pane.hidden)throw new Error(`${language}: story pane stayed hidden`);
 if(!hub.hidden)throw new Error(`${language}: library hub was not hidden after successful story render`);
 const cards=(pane.innerHTML.match(/data-hero-shelf=/g)||[]).length;
 if(cards!==7)throw new Error(`${language}: expected 7 hero cards, got ${cards}`);
 if(/Story Series could not load/.test(pane.innerHTML))throw new Error(`${language}: recovery screen rendered instead of stories`);
 passed++;
}
console.log(`V18.8.36 story render QA: ${passed}/${langs.length} language states passed`);
