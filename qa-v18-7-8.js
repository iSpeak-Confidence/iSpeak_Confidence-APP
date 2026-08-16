const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['Spanish library hero translated',app.includes("'Choose your next story':'Elige tu próxima historia'")],
 ['French library hero translated',app.includes("'Choose your next story':'Choisissez votre prochaine histoire'")],
 ['Mandarin library hero translated',app.includes("'Choose your next story':'选择下一篇故事'")],
 ['Japanese library hero translated',app.includes("'Choose your next story':'次に読む物語を選ぼう'")],
 ['Khmer library hero translated',app.includes("'Choose your next story':'ជ្រើសរើសរឿងបន្ទាប់របស់អ្នក'")],
 ['Arabic library hero translated',app.includes("'Choose your next story':'اختر قصتك التالية'")],
 ['Localized certificate system',app.includes('const CERT_UI=')&&app.includes('certificateDisplayCourseName(lang)')],
 ['Certificate payload carries UI language',app.includes("uiLanguage:state.uiLanguage||'english'")&&app.includes('displayCourseName:certificateDisplayCourseName(lang)')],
 ['Localized certificate email',server.includes('const C={')&&server.includes('p.uiLanguage')&&server.includes('p.displayCourseName')],
 ['Revolut URL current',server.includes('cc6dd0ce-d4e9-4534-8ac0-93592e016a37')&&app.includes('cc6dd0ce-d4e9-4534-8ac0-93592e016a37')],
 ['Beta pending booking survives reload',app.includes("REVOLUT_PENDING_KEY='ispeak_pending_revolut_booking_v1878'")&&app.includes('offerPendingRevolutReturn()')],
 ['Pending booking saved before checkout',app.includes('savePendingRevolutBooking({r,quote:q,autoBeta:true})')],
 ['Single Revolut window opened',app.includes("window.open(checkout,'ispeakRevolutCheckout')")],
 ['Popup close auto-finishes beta booking',app.includes('if(w.closed)')&&app.includes('finishBetaBooking()')],
 ['No second I-paid button in live beta flow',!app.includes('I paid — request verification')],
 ['Server restricts shortcut to Nathan beta quote',server.includes("paymentMode==='revolut_beta_link'")&&server.includes('quote.isNathanBeta')&&server.includes('quote.studentTotal===NATHAN_BETA_PRICE')],
 ['Beta booking becomes confirmed and paid',server.includes("status:'confirmed',paymentStatus:'paid'")&&server.includes("paymentMode:revolutBeta?'revolut_beta_link':'test'")],
 ['Manual verification disabled for beta shortcut',server.includes('requiresManualVerification:false')],
 ['Calendar screen still present',html.includes('id="bookingDays"')&&html.includes('booking-calendar')],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}
if(fail){console.error(`\n${fail} QA check(s) failed.`);process.exit(1)}
console.log(`\nAll ${checks.length} V18.7.8 QA checks passed.`);
