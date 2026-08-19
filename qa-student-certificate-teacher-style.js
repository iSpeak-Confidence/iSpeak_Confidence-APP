const fs=require('fs');const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('styles.css','utf8');
const checks=[
['shared teacher certificate frame used',/pro-tutor-cert-preview student-language-cert-preview/.test(app)],
['student unit ribbon exists',/student-cert-ribbon/.test(app)&&/student-home-ribbon/.test(app)],
['all five milestone stages defined',/30:\['FOUNDATION/.test(app)&&/60:\['DEVELOPING/.test(app)&&/90:\['INDEPENDENT/.test(app)&&/120:\['ADVANCED/.test(app)&&/n>=150/.test(app)],
['professional language achievement title',/CERTIFICATE OF LANGUAGE ACHIEVEMENT/.test(app)],
['locked preview stamp retained',/PREVIEW — LOCKED UNTIL COMPLETION/.test(app)],
['earned milestone name editable before download',/milestoneCertificateName/.test(app)&&/Enter the learner name before downloading/.test(app)],
['final certificate name editor retained',/studentCertificateName/.test(app)],
['download uses matching professional frame palette',/fill="#fffdfa"/.test(app)&&/stroke="#0b2940"/.test(app)&&/stroke="#c79a43"/.test(app)],
['placement exclusion remains visible',/Placement-passed units do not count as completed units/.test(app)],
['teacher-style student CSS present',/student-teacher-style-wrap/.test(css)&&/student-home-teacher-paper/.test(css)]
];let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}if(fail)process.exit(1);console.log(`Student teacher-style certificate QA: ${checks.length}/${checks.length} passed`);
