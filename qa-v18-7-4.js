const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['booking dialog full viewport',/dialog\.booking-dialog\{[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)],
 ['student schedule full viewport',/dialog\.student-schedule-dialog,[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)],
 ['student classroom centre full viewport',/dialog\.student-classroom-centre-dialog\{[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)],
 ['classroom dialog full viewport',/dialog\.classroom-dialog\{[\s\S]*?width:100vw!important;[\s\S]*?height:100dvh!important;/.test(css)],
 ['prejoin full viewport',/dialog\.classroom-dialog \.classroom-prejoin\{[\s\S]*?min-height:100dvh!important;/.test(css)],
 ['browser fullscreen API removed',!app.includes('requestFullscreen(')&&!app.includes('exitFullscreen(')],
 ['CSS focus mode wired',app.includes('classroom-focus-mode')&&css.includes('dialog.classroom-dialog.classroom-focus-mode')],
 ['booking dialog still present',html.includes('id="booking" class="booking-dialog"')],
 ['student app does not ask for Booking ID',!/(Booking ID|booking ID)[^\n]{0,80}(input|enter|type)/i.test(app)],
 ['Revolut cancel says no booking',app.includes('Payment cancelled. No lesson was booked.')],
 ['payment pending does not enter schedule before verification',require('fs').readFileSync('server.js','utf8').includes("status:revolutBeta?'payment_pending':'confirmed'")],
 ['mobile booking collapses cleanly',/@media\(max-width:900px\)[\s\S]*?dialog\.booking-dialog \.booking-layout\{grid-template-columns:1fr!important/.test(css)]
];
let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)pass++;}
console.log(`${pass}/${checks.length} checks passed`); if(pass!==checks.length)process.exit(1);
