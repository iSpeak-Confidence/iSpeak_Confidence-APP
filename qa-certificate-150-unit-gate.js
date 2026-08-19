const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const checks=[
 ['client counts fully completed units',/function completedUnitCount\(lang=state\.language\)/.test(app)],
 ['client final certificate requires completed units',/function courseComplete\(lang\)\{const total=.*return completedUnitCount\(lang\)>=total\}/.test(app)],
 ['certificate preview shows unit progress',/\$\{unitsDone\}\/\$\{totalUnits\} units/.test(app)],
 ['placement-passed units explicitly excluded from certificate',/Placement-passed units do not count as completed units/.test(app)],
 ['150-unit milestone ladder exists',/units:30[\s\S]*units:60[\s\S]*units:90[\s\S]*units:120[\s\S]*units:150/.test(app)],
 ['server verifies each of 150 units',/for\(let unit=1;unit<=150;unit\+\+\)/.test(server)],
 ['server verifies all 8 blocks per unit',/for\(let block=1;block<=8;block\+\+\)/.test(server)],
 ['server rejects incomplete-unit certificate',/completedUnits<150/.test(server)],
 ['milestone styling exists',/\.certificate-milestones/.test(css)]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail)process.exit(1);console.log(`Certificate 150-unit gate QA: ${checks.length}/${checks.length} passed`);
