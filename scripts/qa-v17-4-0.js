const fs=require('fs'),vm=require('vm');
const root=__dirname+'/..';
let pass=0,fail=0;function check(name,ok){if(ok){console.log('PASS',name);pass++}else{console.error('FAIL',name);fail++}}
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/curriculum-data.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'/curriculum-expansion-v17-4.js','utf8'),ctx);
const C=ctx.window.ISC_CURRICULUM;
const uniq=l=>new Set(C.languages[l].units.flatMap(u=>u.anchors.map(a=>a.target))).size;
check('Khmer remains exactly 60 supplied targets',uniq('khmer')===60);
for(const l of ['spanish','french','mandarin','japanese']) check(l+' now has >=120 unique targets',uniq(l)>=120);
check('Arabic now has >=180 unique targets',uniq('arabic')>=180);
for(const l of ['english','spanish','french','mandarin','japanese','arabic']) check(l+' all 30 units have >=4 targets',C.languages[l].units.length===30&&C.languages[l].units.every(u=>u.anchors.length>=4));
check('Expansion explicitly marks Khmer untouched',C.depthExpansion?.khmerUntouched===true);
const app=fs.readFileSync(root+'/app.js','utf8');
check('Learning blocks rotate anchors',app.includes('anchors[(sessionIndex+offset)%anchors.length]'));
const html=fs.readFileSync(root+'/index.html','utf8');check('Expansion script loads before app',html.indexOf('curriculum-expansion-v17-4.js')>html.indexOf('curriculum-data.js')&&html.indexOf('curriculum-expansion-v17-4.js')<html.indexOf('app.js'));
const bad=[];for(const l of ['spanish','french','mandarin','japanese','arabic']){for(const u of C.languages[l].units){for(const a of u.anchors){if(!String(a.target||'').trim()||!String(a.meaning||'').trim())bad.push(l+u.id)}}}check('Expanded anchors all have target and meaning',bad.length===0);
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
