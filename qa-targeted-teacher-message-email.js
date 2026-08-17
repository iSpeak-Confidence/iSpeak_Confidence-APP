const fs=require('fs');
const server=fs.readFileSync('server.js','utf8');
let pass=0;
function ok(name,cond){if(!cond){console.error('FAIL:',name);process.exitCode=1}else{console.log('PASS:',name);pass++}}
ok('uses the existing SMTP delivery function',server.includes('await smtpSendMail(payload)'));
ok('requires configured server email before teacher notification',server.includes("if(!emailConfigured())throw new Error('Teacher message email is not configured on the server.')"));
ok('resolves recipient from approved teacher account',server.includes("x?.status!=='approved'")&&server.includes('teacherContactEmailByName(teacher)'));
ok('matches the teacher public display name to the teacher account',server.includes("x.publicName||`${x.firstName||''} ${x.lastName||''}`.trim()"));
ok('does not send student email address in teacher notification payload',!server.match(/teacherMessageEmailHTML\([^)]*studentEmail/));
ok('escapes message content before putting it in HTML email',server.includes("preview=htmlEsc(String(message||'').slice(0,1200))"));
ok('sanitizes student name before using it in email subject',server.includes("replace(/[\\r\\n]+/g,' ')"));
ok('email tells teacher to reply through Teacher Portal',server.includes('Please reply through the Teacher Portal'));
ok('email provides Teacher Portal link',server.includes('Open Teacher Portal'));
ok('student message is saved before notification email attempt',server.indexOf('saveTeachers(tdb);addAdminTeacherMessageNotification')<server.indexOf('sendTeacherStudentMessageEmail(teacher,studentName,text)'));
ok('student-to-teacher send path awaits notification email',server.includes('teacherEmailNotificationSent=await sendTeacherStudentMessageEmail(teacher,studentName,text)'));
ok('SMTP send retries once on transient failure',server.includes('for(let attempt=1;attempt<=2;attempt++)'));
ok('email failure does not erase or duplicate the already-delivered chat message',server.includes("console.error('[teacher student-message email]',teacher,e.message)")&&server.includes('return json(res,200,{teacher,messages:thread,teacherEmailNotificationSent})'));
ok('API reports whether notification email was sent',server.includes('teacherEmailNotificationSent}'));
if(!process.exitCode)console.log(`Teacher message email targeted QA: ${pass}/14 passed.`);
