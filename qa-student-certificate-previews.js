const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const checks=[
 ['five real-unit milestones remain',/units:30[\s\S]*units:60[\s\S]*units:90[\s\S]*units:120[\s\S]*units:150/.test(app)],
 ['milestones are clickable previews',/data-student-cert-preview/.test(app)&&/openMilestoneCertificate/.test(app)],
 ['locked milestone still opens preview',/Preview only\. Complete \$\{n\} genuine units/.test(app)],
 ['earned milestone exposes download',/downloadMilestoneCertificate/.test(app)],
 ['150 earned opens final certificate',/n>=150&&earned\)return openCertificate/.test(app)],
 ['placement cannot count as completed units',/completedUnitCount/.test(app)&&/studyTypes\.every/.test(app)],
 ['old 1200-block home certificate claim removed',!app.includes('1,200 PROGRESSIVE LEARNING BLOCKS COMPLETED')],
 ['old decorative home seal removed',!app.includes('cert-preview-seal')],
 ['clean home certificate styling present',/student-cert-home-paper/.test(css)&&/box-shadow:none/.test(css)],
 ['locked preview watermark present',/student-cert-preview-watermark/.test(css)]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`Student certificate preview QA: ${ok}/${checks.length} passed`);if(ok!==checks.length)process.exit(1);
