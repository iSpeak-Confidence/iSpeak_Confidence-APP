const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),server=fs.readFileSync('server.js','utf8'),css=fs.readFileSync('styles.css','utf8'),sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['version server',server.includes("version:'V18.7.3'")],
 ['version console',server.includes('iSpeak Confidence V18.7.3:')],
 ['cache bumped',sw.includes('ispeak-v18-7-3')],
 ['payment claim wording',app.includes('I paid — request verification')],
 ['no local pending booking push',!app.includes("state.bookings.push({...r,status:result.status,bookingId:result.bookingId,paymentStatus:result.paymentStatus,amountPaid:0")],
 ['schedule excludes pending',app.includes("x.status!=='payment_pending'&&x.paymentStatus!=='pending_verification'")],
 ['server hides pending claims',server.includes("b.status!=='payment_pending'&&b.paymentStatus!=='pending_verification'")],
 ['pending does not reserve slot',server.includes("!['cancelled','payment_pending'].includes(b.status)")],
 ['verification ID prefix',server.includes("revolutBeta?'PV-':'BK-'")],
 ['claim not booking analytics',server.includes("revolutBeta?'payment_verification_requested':'booking_complete'")],
 ['classroom prejoin expanded',css.includes('max-width:1320px!important')],
 ['camera preview enlarged',css.includes('min-height:420px!important')],
 ['mobile prejoin full width',css.includes('width:100%!important;max-width:none!important')],
 ['release notes exist',fs.existsSync('RELEASE_NOTES_V18.7.3.txt')],
 ['bat exists',fs.existsSync('start-v18-7-3.bat')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}console.log(`${checks.length-fail}/${checks.length} passed`);process.exitCode=fail?1:0;
