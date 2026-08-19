const fs=require('fs'),vm=require('vm');
const app=fs.readFileSync('app.js','utf8');
const curriculumText=fs.readFileSync('curriculum-data.js','utf8')+'\n'+fs.readFileSync('curriculum-expansion-v17-4.js','utf8');
let pass=0,fail=0;const t=(n,c)=>{console.log((c?'PASS ':'FAIL ')+n);c?pass++:fail++};
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(curriculumText,sandbox);const C=sandbox.window.ISC_CURRICULUM;
function norm(v){return String(v||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[’‘`´]/g,"'").replace(/[.!?？¿؟។、，,;；:：…]+/gu,' ').replace(/[‐‑‒–—-]+/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase();}
function fold(v){const x=norm(v);return /[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(x)?x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC'):x;}
function accepted(input,...answers){const n=norm(input);return answers.map(norm).includes(n)||answers.map(fold).includes(fold(input));}
const fr=C.languages.french.units[0].anchors[0];
t('French screenshot target still present',fr.target==='Bonjour, comment ça va ?');
t('French screenshot answer accepts no pre-question-mark space',accepted('Bonjour, Comment ça va?',fr.target));
t('French answer accepts capitalization difference',accepted('BONJOUR, COMMENT ÇA VA ?',fr.target));
t('French answer accepts punctuation omission',accepted('bonjour comment ça va',fr.target));
t('French answer accepts keyboard accent omission',accepted('Bonjour comment ca va?',fr.target));
t('Internal punctuation is normalized globally',norm('Bonjour, comment ça va ?')===norm('Bonjour comment ça va'));
t('Smart and straight apostrophes normalize equally',norm("J’aime")===norm("J'aime"));
t('Whitespace around punctuation cannot create mismatch',norm('ça va ?')===norm('ça va?'));
t('Khmer script is not accent-folded/stripped',fold('សួស្តី')==='សួស្តី');
t('Japanese script remains intact',fold('こんにちは')==='こんにちは');
t('Chinese script remains intact',fold('你好')==='你好');
t('Arabic script remains intact',fold('مرحبًا')==='مرحبًا');
t('Production validator still reads exact target',app.includes('field?.dataset?.exact'));
t('Displayed reading remains an accepted beginner target',app.includes('field?.dataset?.reading'));
t('Input listener still enables button live',app.includes("addEventListener('input',check)"));
t('Completion cannot fire while disabled',app.includes('if(b.disabled)return;completeStudy'));
t('Next-block progression retained',app.includes('openStudySession(unitIndex,dayIndex,sessionIndex+1)'));
t('Next-lesson progression retained',app.includes('openStudyDay(unitIndex+1,0)'));
const langs=['english','khmer','mandarin','spanish','french','japanese','arabic'];
t('All 7 courses remain present',langs.every(l=>C.languages[l]));
t('All 7 courses remain 150 units',langs.every(l=>C.languages[l].units.length===150));
console.log(`\nV18.8.17 punctuation/case QA: ${pass}/${pass+fail} passed`);process.exit(fail?1:0);
