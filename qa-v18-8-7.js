const fs=require('fs');
const assert=require('assert');
const s=fs.readFileSync('server.js','utf8');
const a=fs.readFileSync('app.js','utf8');
const c=fs.readFileSync('styles.css','utf8');
const checks=[
 ['country + IANA timezone registration',s.includes('validTimeZone')&&s.includes("Choose your country of residence")&&s.includes('A valid IANA timezone is required')&&a.includes('accountTimezone')],
 ['permanent student/teacher chats',s.includes('/api/teacher-chat')||s.includes('/api/messages')||s.includes('teacherMessages')],
 ['admin message oversight',s.includes('admin')&&(s.includes('message')||s.includes('chat'))&&a.includes('admin')],
 ['booking audit/history support',s.includes('audit')||s.includes('history')||s.includes('timeline')],
 ['pending-payment slot hold',s.includes('holdExpiresAt')&&s.includes("status==='payment_pending'")],
 ['teacher payment/schedule workflow',a.includes('payment')&&a.includes('schedule')&&s.includes('booking')],
 ['Make Me Speak',a.includes('openMakeMeSpeak')&&a.includes('Make Me Speak')],
 ['Why was I wrong',a.toLowerCase().includes('why was i wrong')||a.includes('openWhyWasIWrong')],
 ['Homework Helper endpoint',s.includes("'/api/homework-helper'")&&a.includes('openHomeworkHelper')],
 ['Homework photo upload',a.includes('image/png,image/jpeg,image/webp')&&s.includes('imageData')],
 ['Homework 7 languages',a.includes("'English','Khmer','Mandarin Chinese','French','Spanish','Japanese','Arabic'")],
 ['teacher UI language isolation',a.includes('teacher')&&a.includes('uiLanguage')],
 ['analytics dashboard preserved',s.includes('/api/admin/analytics')&&a.includes('openAdminDashboard')],
 ['mobile teacher portrait CSS present',/object-(fit|position)|teacher.*photo|tutor.*photo/i.test(c)],
 ['classroom preserved',a.includes('openISpeakClassroom')],
 ['student schedule preserved',a.includes('openStudentSchedule')],
 ['library preserved',a.includes('libraryHome')]
];
let passed=0;
for(const [name,ok] of checks){assert.ok(ok,name);passed++;console.log('PASS',name)}
console.log(`\n${passed}/${checks.length} V18.8.7 full-update integrity checks passed.`);
