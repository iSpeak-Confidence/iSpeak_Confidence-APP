const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.js','utf8');
const checks=[
 ['Homework Helper uses real event binding', app.includes("hh.onclick=openHomeworkHelper")&&!app.includes('onclick="openHomeworkHelper()"')],
 ['Make Me Speak uses real event binding', app.includes("ms.onclick=openMakeMeSpeak")&&!app.includes('onclick="openMakeMeSpeak()"')],
 ['Direct Book trial lesson removed', !html.includes('Book trial lesson')&&!app.includes('>Book trial lesson</button>')],
 ['$NaN guarded', app.includes('Number.isFinite(raw)')],
 ['Teacher availability routes to chat', app.includes('openStudentTeacherChat(teacher,`Hi ${teacher}, is ${btn.dataset.previewDate}')],
 ['Teacher profile routes to chat', app.includes('id="profileBook" class="primary">Message teacher')],
 ['Teacher login endpoint wired', app.includes("/api/teacher-application/login")&&server.includes("pathname==='/api/teacher-application/login'")],
 ['Old-server port confusion removed', server.includes('Port ${PORT} is already in use')&&!server.includes('trying ${activePort+1}')],
 ['Teacher classroom 15-minute rule', server.includes("access.role==='teacher'?15:10")],
 ['Student classroom 10-minute rule', server.includes("access.role==='teacher'?15:10")],
 ['Classroom route enforces join window', server.includes('const joinWindow=classroomJoinWindow(access);if(!joinWindow.ok)')],
 ['Teacher portal tabs renderers exist', ['renderTeacherOverview','renderTeacherCalendar','renderTeacherSchedule','renderTeacherClassroomCentre','renderTeacherLessons','renderTeacherStudents','renderTeacherMessages','renderTeacherAcademy','renderTeacherPricing','renderTeacherProfileEditor','renderNathanAdmin'].every(x=>app.includes(x))],
 ['Teacher portal tab click binding exists', app.includes("$$('[data-portal-tab]',$('#modalBody')).forEach(x=>x.onclick=()=>render(x.dataset.portalTab))")],
 ['Teacher password/logout buttons bound', app.includes("$('#teacherPortalPassword').onclick")&&app.includes("$('#teacherPortalLogout').onclick")],
 ['Teacher UI language selector bound', app.includes("langSel.onchange=()=>")],
];
let n=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)n++}console.log(`\n${n}/${checks.length} checks passed`);if(n!==checks.length)process.exit(1);
