const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const root=__dirname,app=fs.readFileSync(path.join(root,'app.js'),'utf8'),server=fs.readFileSync(path.join(root,'server.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const checks=[];const ok=(name,cond)=>{checks.push([name,!!cond]);if(!cond)process.exitCode=1};
ok('Professional 120-hour certificate wording',app.includes('CERTIFICATE OF PROFESSIONAL ACHIEVEMENT')&&app.includes('120-Hour Professional Tutor Course')&&app.includes('CERTIFIED PROFESSIONAL TUTOR'));
ok('Tutor enters certificate name only after unlock',app.includes('id="teacherCertificateName"')&&app.includes('saveTeacherCertificateName'));
ok('High-resolution downloadable certificate file',app.includes("canvas.width=2800")&&app.includes("'image/png'")&&app.includes('iSpeak-120-Hour-Professional-Tutor-'));
ok('Certificate completion remains gated',app.includes("done.size<20||Number(st.score||0)<80||String(st.plan||'').length<250"));
ok('No separate admin PIN UI',!app.includes('id="applicationAdminPin"')&&!app.includes('Local development default: <b>1357</b>'));
ok('Admin route uses approved owner account',app.includes('openOwnerAdminDashboard')&&app.includes('/api/owner-admin-token'));
ok('Teacher test room has explicit launcher',app.includes("function openTeacherTestRoom()")&&app.includes("openISpeakClassroom('TEST-TEACHER','teacher')"));
ok('Teacher-facing student display names resolve from user profile',server.includes('function userDisplayNameByEmail')&&server.includes('name:userDisplayNameByEmail(x.email,x.name)'));
ok('Teacher portal bookings strip emails',server.includes('delete c.email;delete c.ownerEmail'));
ok('Certificate visual styling included',css.includes('.pro-tutor-cert-preview')&&css.includes('.pro-cert-ribbon'));

async function runtime(){
 const data=path.join(root,'data'),backup=path.join(root,'.qa-data-backup-18812');
 if(fs.existsSync(backup))fs.rmSync(backup,{recursive:true,force:true});
 if(fs.existsSync(data))fs.renameSync(data,backup);fs.mkdirSync(data,{recursive:true});
 const token='qa-owner-token-'+crypto.randomBytes(10).toString('hex'),studentToken='qa-student-token-'+crypto.randomBytes(10).toString('hex');
 const h=x=>crypto.createHash('sha256').update(x).digest('hex');
 const pw=crypto.scryptSync('QaPass1','00112233445566778899aabbccddeeff',64).toString('hex');
 const applications={applications:{}};applications.applications['TA-QA']={id:'TA-QA',email:'qaadmin@example.com',publicName:'Nathan',firstName:'Nathan',lastName:'QA',status:'approved',passwordHash:{salt:'00112233445566778899aabbccddeeff',hash:pw},tokenHash:h(token),tokenIssuedAt:new Date().toISOString(),identityVerified:true,timezone:'Asia/Phnom_Penh',availability:{}};fs.writeFileSync(path.join(data,'teacher-applications.json'),JSON.stringify(applications,null,2));
 fs.writeFileSync(path.join(data,'users.json'),JSON.stringify({users:{'learner@example.com':{tokenHash:h(studentToken),tokenIssuedAt:new Date().toISOString(),state:{name:'Sokchenda QA',email:'learner@example.com'}}}},null,2));
 fs.writeFileSync(path.join(data,'teachers.json'),JSON.stringify({teachers:{Nathan:{applicationId:'TA-QA',timezone:'Asia/Phnom_Penh',active:true,availability:{},studentMessages:{'learner@example.com':[{from:'student',name:'Student',text:'Hello',createdAt:new Date().toISOString()}]},bookings:[{id:'QA-BOOK',teacher:'Nathan',teacherApplicationId:'TA-QA',name:'Student',email:'learner@example.com',ownerEmail:'learner@example.com',date:'2099-01-01',time:'12:00',subject:'English',status:'confirmed'}]}}},null,2));
 const port=3312,child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),NODE_ENV:'development',DATA_DIR:data},stdio:['ignore','pipe','pipe']});let ready=false;
 child.stdout.on('data',d=>{if(String(d).includes('http://localhost'))ready=true});
 try{
  for(let i=0;i<50&&!ready;i++)await new Promise(r=>setTimeout(r,100));
  const headers={Authorization:`Bearer ${token}`,Origin:`http://127.0.0.1:${port}`};
  let r=await fetch(`http://127.0.0.1:${port}/api/classroom/TEST-TEACHER`,{headers});ok('Runtime teacher test room opens',r.status===200);
  r=await fetch(`http://127.0.0.1:${port}/api/owner-admin-token`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});const owner=await r.json();ok('Runtime owner admin token opens without second password',r.status===200&&String(owner.adminToken||'').startsWith('OWNER-'));
  r=await fetch(`http://127.0.0.1:${port}/api/admin/applications`,{method:'POST',headers:{'Content-Type':'application/json',Origin:`http://127.0.0.1:${port}`},body:JSON.stringify({action:'list',pin:owner.adminToken})});ok('Runtime full admin dashboard API accepts owner session',r.status===200);
  r=await fetch(`http://127.0.0.1:${port}/api/teacher-application/portal`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'dashboard'})});const dash=await r.json();ok('Runtime teacher sees student display name, not generic Student/email',r.status===200&&dash.bookings?.[0]?.name==='Sokchenda QA'&&!JSON.stringify(dash.bookings?.[0]||{}).includes('learner@example.com'));
 }catch(e){ok('Runtime test harness',false);console.error(e)}finally{child.kill('SIGTERM');await new Promise(r=>setTimeout(r,200));fs.rmSync(data,{recursive:true,force:true});if(fs.existsSync(backup))fs.renameSync(backup,data)}
}
runtime().then(()=>{for(const [n,v] of checks)console.log(`${v?'PASS':'FAIL'} ${n}`);const passed=checks.filter(x=>x[1]).length;console.log(`\nV18.8.12 targeted QA: ${passed}/${checks.length} passed`);if(passed!==checks.length)process.exitCode=1});
