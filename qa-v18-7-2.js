const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['version server',server.includes('V18.7.2')],
 ['cache bumped',sw.includes('v18-7-2')],
 ['revolut does not create booking on open',app.includes("pay.onclick=()=>{const w=window.open") && !app.includes("pay.onclick=async()=>{const result=await apiJSON('/api/booking'")],
 ['explicit payment completion required client',app.includes('paymentClaimedComplete:true')],
 ['explicit payment completion required server',server.includes("body.paymentClaimedComplete===true")],
 ['cancel promises no booking',app.includes('Payment cancelled. No lesson was booked.')],
 ['pending booking remains unconfirmed',server.includes("status:revolutBeta?'payment_pending':'confirmed'")],
 ['pending classroom blocked server',server.includes("data.booking.status==='payment_pending'||data.booking.paymentStatus==='pending_verification'")],
 ['student classroom excludes pending',app.includes("filter(x=>x.status!=='payment_pending'&&x.paymentStatus!=='pending_verification')")],
 ['schedule labels pending correctly',app.includes('Awaiting payment verification')],
 ['booking dialog enlarged',css.includes('.booking-dialog{width:min(1260px,96vw)!important')],
 ['schedule dialog enlarged',css.includes('dialog.student-schedule-dialog{width:min(1280px,96vw)!important')],
 ['classroom centre enlarged',css.includes('dialog.student-classroom-centre-dialog{width:min(1180px,96vw)!important')],
 ['mobile dialog sizing',css.includes('width:98vw!important;height:96vh!important')],
 ['new BAT exists',fs.existsSync('start-v18-7-2.bat')],
 ['release notes exist',fs.existsSync('RELEASE_NOTES_V18.7.2.txt')]
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}
console.log(`${checks.length-fail}/${checks.length} passed`);process.exit(fail?1:0);
