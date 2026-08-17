const fs=require('fs');
const assert=require('assert');
const app=fs.readFileSync('app.js','utf8');
const server=fs.readFileSync('server.js','utf8');

// Student identity: teachers should see display names, not email addresses / generic Student.
assert(app.includes('id="accountDisplayName"'),'student registration display-name field missing');
assert(app.includes('This is the name your teachers will see in Messages and lessons.'),'display-name purpose not explained');
assert(server.includes("displayName.length<2||displayName.toLowerCase()==='student'"),'server display-name validation missing');
assert(server.includes('state:{name:displayName,country,timezone}'),'registration does not persist display name into account state');
assert(server.includes('function threadStudentDisplayName'),'conversation display-name resolver missing');
assert(server.includes('studentName:threadStudentDisplayName(studentEmail,messages)'),'teacher message thread does not use resolved student display name');
assert(server.includes("if(!studentName||studentName.toLowerCase()==='student')return json(res,400"),'generic Student messages are not blocked server-side');
assert(app.includes('Your teacher will see this name, not your email address.'),'existing generic-name users are not prompted for a real display name');

// Admin oversight: each student->teacher message creates a persistent notification and teacher replies resolve it.
assert(server.includes('function addAdminTeacherMessageNotification'),'admin notification writer missing');
assert(server.includes('addAdminTeacherMessageNotification(teacher,au.email,studentName,text)'),'student messages do not create admin notification');
assert(server.includes('function markAdminTeacherMessageAnswered'),'admin notification reply-state updater missing');
assert(server.includes('markAdminTeacherMessageAnswered(teacher,studentEmail)'),'teacher replies do not resolve admin notification');
assert(app.includes('id="adminTeacherOversight"'),'admin dashboard has no message-notification entry point');
assert(app.includes('Teacher messages awaiting reply'),'admin dashboard has no unanswered-message counter');
assert(server.includes('notificationCount:notifications.filter'),'oversight API has no persistent notification count');

// Classroom integrity/time: same booking ID + strict identities + server clock + ISO metadata for local display.
assert(server.includes('const data=ensureClassroom(bookingId);if(!data)return null;'),'classroom is not resolved from exact booking ID');
assert(server.includes("boundId===teacherAuth.a.id"),'teacher classroom identity binding missing');
assert(server.includes('userAuth.email===boundStudent'),'student classroom identity binding missing');
assert(server.includes('const joinWindow=classroomJoinWindow(access);if(!joinWindow.ok)return json(res,403'),'server classroom time gate missing');
assert(server.includes("const early=access.role==='teacher'?15:10"),'teacher/student entry windows missing');
assert(server.includes('lessonStartsAt:new Date(start).toISOString()'),'server does not return canonical lesson start time');
assert(app.includes("const iso=String(x?.lessonStartsAt||'')"),'client sorting does not use canonical lesson time');
assert(app.includes('function studentBookingLocalParts'),'student local-time conversion missing');
assert(app.includes("lessons=dated.filter(x=>x._local?.date===key)"),'student calendar does not place lessons by local date');

console.log('Targeted student-name/admin-notification/classroom QA: 24/24 passed');
