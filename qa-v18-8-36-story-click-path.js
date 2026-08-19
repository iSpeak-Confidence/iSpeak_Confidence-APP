const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const marker='document.addEventListener(\'click\',function ispeakCriticalRouter';
const start=src.indexOf(marker), end=src.indexOf('},true);',start);
if(start<0||end<0)throw new Error('critical click router not found');
const routerCode=src.slice(start,end+8);
let clickHandler=null;
const calls=[];
const ctx={
 document:{addEventListener(type,fn,opts){if(type==='click'&&opts===true)clickHandler=fn;}},
 heroesHome:()=>calls.push(['home']),heroShelf:id=>calls.push(['shelf',id]),heroRead:(id,v,ch)=>calls.push(['read',id,v,ch]),
 khmerHeroNotice:()=>calls.push(['khmer']),libraryHome:()=>calls.push(['libraryHome']),openClassicLibrary:()=>{},openReader:()=>{},
 setView:()=>{},renderIELTS:()=>{},openIELTSDiagnostic:()=>{},openIELTSMocks:()=>{},openIELTSSkill:()=>{},refreshFinishButtonState:()=>true,completeStudy:()=>{},toast:()=>{},console,
};
vm.createContext(ctx);vm.runInContext(routerCode,ctx);
if(typeof clickHandler!=='function')throw new Error('capture click handler was not installed');
function target({id='',attrs={},disabled=false}){
 const dataset={};for(const [k,v] of Object.entries(attrs))dataset[k]=String(v);
 const selectors=new Set();
 if(id)selectors.add('#'+id);
 for(const k of Object.keys(attrs))selectors.add(`[data-${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}]`);
 return {id,dataset,disabled,classList:{contains:()=>false},closest:()=>this,matches(sel){
   return sel.split(',').some(raw=>{const s=raw.trim();if(s.startsWith('#'))return s==='#'+id;if(s.startsWith('[data-')){const name=s.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return Object.prototype.hasOwnProperty.call(dataset,name)}return false});
 }};
}
function fire(t){let prevented=false,stopped=false;clickHandler({target:{closest:()=>t},preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});if(!prevented||!stopped)throw new Error('story click was not fully intercepted');}
const cases=[
 [target({id:'openHeroesLibrary'}),['home']],
 [target({attrs:{allHeroes:''}}),['home']],
 [target({attrs:{heroShelf:'jess'}}),['shelf','jess']],
 [target({attrs:{heroRead:'jess',volume:1,chapter:1}}),['read','jess',1,1]],
 [target({attrs:{storyNav:'',hero:'jess',volume:1,chapter:2}}),['read','jess',1,2]],
 [target({attrs:{libraryHome:''}}),['libraryHome']],
];
for(const [t,expected] of cases){calls.length=0;fire(t);if(JSON.stringify(calls[0])!==JSON.stringify(expected))throw new Error(`route failed: expected ${JSON.stringify(expected)} got ${JSON.stringify(calls[0])}`)}
console.log(`V18.8.36 Story click-path QA: ${cases.length}/${cases.length} capture-routed controls passed`);
