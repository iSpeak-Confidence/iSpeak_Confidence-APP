const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles.css','utf8');
const checks=[
 ['Learn navigation auto-focuses current unit',/if\(name==='learn'\)\{requestAnimationFrame\(\(\)=>requestAnimationFrame\(\(\)=>scrollToCurrentLearningUnit/.test(app)],
 ['Placement no longer blindly overrides real progress',/Progress always wins over an old placement recommendation/.test(app)&&/for\(let i=placementStart;i<=maxIndex;i\+\+\)/.test(app)],
 ['Current unit derives from all eight block IDs',/studyTypes\.filter\(\(__s,si\)=>state\.studyCompleted\.includes/.test(app)],
 ['Language card still routes into Learn',/changeLearningLanguage\(b\.dataset\.lang,\{view:'learn'/.test(app)],
 ['Profile language chooser still routes into Learn',/changeLearningLanguage\(b\.dataset\.modalLang,\{view:'learn'/.test(app)],
 ['Learn page contains path destination',/id="path" class="path"/.test(html)],
 ['Scroll uses deterministic page position',/card\.getBoundingClientRect\(\)\.top-110/.test(app)&&/window\.scrollTo\(\{top,behavior\}\)/.test(app)],
 ['Current unit gets visible focus treatment',/current-learning-focus/.test(app)&&/current-learning-focus/.test(css)]
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)bad++}if(bad)process.exit(1);console.log(`PASS ${checks.length}/${checks.length} learn-flow checks`);
