const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const server=fs.readFileSync('server.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['single checkout trigger uses anchor click',app.includes("link.target='_blank'")&&app.includes('link.click()')],
 ['old double-navigation fallback removed',!app.includes("window.open(q.checkoutUrl")&&!app.includes("window.location.href=q.checkoutUrl")],
 ['pay button disabled after launch',app.includes("pay.disabled=true;pay.textContent='Revolut opened")],
 ['checkout rel noopener',app.includes("link.rel='noopener noreferrer'")],
 ['V18.7.5 status',server.includes("version:'V18.7.5'")],
 ['V18.7.5 console banner',server.includes('iSpeak Confidence V18.7.5:')],
 ['new cache key',sw.includes('ispeak-v18-7-5-revolut-single-tab-v1')],
 ['booking full viewport preserved',/dialog\.booking-dialog\{[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)],
 ['student schedule full viewport preserved',/dialog\.student-schedule-dialog,[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)],
 ['classroom full viewport preserved',/dialog\.classroom-dialog\{[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)]
];
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok)pass++;}
console.log(`${pass}/${checks.length} checks passed`); if(pass!==checks.length)process.exit(1);
