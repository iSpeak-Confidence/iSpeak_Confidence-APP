const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('academy-refresh-v18-9-1.js','utf8');
const css=fs.readFileSync('academy-refresh-v18-9-1.css','utf8');

assert(index.includes('academy-refresh-v18-9-1.css?v=18.9.1'),'Academy CSS is not wired into index.html');
assert(index.includes('academy-refresh-v18-9-1.js?v=18.9.1'),'Academy JS is not wired into index.html');

const courses=[
'Practical ESL & EFL Teaching',
'School Leadership & Management',
'Classroom Management & Positive Behaviour',
'Inclusive Education & SEND Support',
'Curriculum, Assessment & Instructional Planning',
'Teaching Young Learners & Primary Education',
'IELTS & Academic English Teaching',
'Educational Technology, AI & Digital Teaching',
'Teacher Mentoring & Instructional Coaching',
'Safeguarding, Student Wellbeing & Pastoral Care',
'Child Psychology, Development & Learning',
'Literacy, Phonics & Reading Instruction',
'Project-Based, Inquiry & Experiential Learning'
];
for(const title of courses)assert(js.includes(title),`Missing Academy course: ${title}`);
assert(js.includes("12 MODULES • APPLIED PORTFOLIO • FINAL ASSESSMENT"),'Certificate assessment line missing');
assert(js.includes("Michael Carter"),'Course Director missing');
assert(js.includes("Download Audio"),'Audio download fallback missing');
assert(js.includes("MutationObserver"),'Dynamic audio fallback observer missing');
assert(css.includes('.isc-academy-cert'),'Approved diploma template styles missing');
console.log('QA v18.9.1 passed: 13 Academy diplomas + certificate template + audio fallback are wired.');
