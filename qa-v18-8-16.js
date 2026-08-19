const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync('app.js','utf8');
const curriculumText=fs.readFileSync('curriculum-data.js','utf8')+'\n'+fs.readFileSync('curriculum-expansion-v17-4.js','utf8');
let pass=0, fail=0;
function t(name,ok){if(ok){console.log('PASS',name);pass++}else{console.error('FAIL',name);fail++}}
// Structural checks against the real production code.
t('Guided block carries displayed reading into validator', app.includes('data-reading="${esc(a.reading)}"'));
t('Exact validator accepts target plus displayed reading', app.includes('field?.dataset?.exact,field?.dataset?.reading'));
t('Unicode answer normalization is compatibility-safe', app.includes("normalize('NFKC')"));
t('Validation rechecks while typing', app.includes("addEventListener('input',check)"));
t('Validation also rechecks on field change', app.includes("addEventListener('change',check)"));
t('Disabled completion cannot execute handler', app.includes('if(b.disabled)return;completeStudy'));
t('Khmer compact-script production supported', app.includes('\\u1780-\\u17FF'));
t('Japanese compact-script production supported', app.includes('\\u3040-\\u30FF'));
t('Chinese compact-script production supported', app.includes('\\u3400-\\u9FFF'));
t('V18.8.15 next-block advance retained', app.includes('openStudySession(unitIndex,dayIndex,sessionIndex+1)'));
t('V18.8.15 next-lesson advance retained', app.includes('openStudyDay(unitIndex+1,0)'));
// Load the actual curriculum object and verify all seven course datasets remain complete.
const sandbox={window:{}}; vm.createContext(sandbox); vm.runInContext(curriculumText,sandbox);
const cur=sandbox.window.ISC_CURRICULUM;
const langs=['english','khmer','mandarin','spanish','french','japanese','arabic'];
t('All seven language courses remain present', langs.every(l=>cur.languages[l]));
t('All seven courses still contain 150 units', langs.every(l=>cur.languages[l].units.length===150));
t('Curriculum still declares 1200 blocks per language', cur.activityCountPerLanguage===1200);
// Exact regression for the screenshot: Khmer lesson 1 shows Suosdei as the reading for សួស្តី.
const first=cur.languages.khmer.units[0].anchors[0];
const raw=String(first.meaning||''); const reading=raw.includes(' / ')?raw.split(' / ')[0]:String(first.reading||'');
t('Screenshot regression data is សួស្តី / Suosdei', first.target==='សួស្តី' && reading==='Suosdei');
console.log(`\nV18.8.16 validation QA: ${pass}/${pass+fail} passed`);process.exit(fail?1:0);
