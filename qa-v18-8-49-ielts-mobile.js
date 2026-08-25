const fs=require('fs');
const a=fs.readFileSync('app.js','utf8');
const i=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const d=fs.readFileSync('ielts-data.js','utf8');
const checks=[
 ['capture mode routing',a.includes('if(t.dataset.ieltsMode)')&&a.includes('openIELTSLevel(st.level)')],
 ['capture level routing',a.includes('if(t.dataset.ieltsLevel)')],
 ['academic control',i.includes('data-ielts-mode="academic"')],
 ['general control',i.includes('data-ielts-mode="general"')],
 ['72 units claim',i.includes('<b>72</b><span>Structured units</span>')],
 ['576 blocks claim',i.includes('<b>576</b><span>Core lesson blocks</span>')],
 ['IELTS data loaded',d.includes('window.ISC_IELTS')],
 ['new cache',sw.includes('ispeak-v18-8-49-ielts-mobile-controls')]
];
let bad=0;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);if(!ok)bad++}process.exitCode=bad?1:0;
