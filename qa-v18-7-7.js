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
 ['Revolut URL current',server.includes('cc6dd0ce-d4e9-4534-8ac0-93592e016a37')],
 ['Pending Revolut booking survives return',app.includes("REVOLUT_PENDING_KEY='ispeak_pending_revolut_booking_v1877'")&&app.includes('offerPendingRevolutReturn()')],
 ['Pending booking saved before checkout',app.includes('savePendingRevolutBooking({r,quote:q})')],
 ['Calendar screen still present',html.includes('id="bookingDays"')&&html.includes('booking-calendar')],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}
if(fail){console.error(`\n${fail} QA check(s) failed.`);process.exit(1)}
console.log(`\nAll ${checks.length} V18.7.7 QA checks passed.`);
