const http=require('http');
const fs=require('fs');
const path=require('path');
const url=require('url');
const tls=require('tls');
const crypto=require('crypto');
function loadEnv(){const p=path.join(__dirname,'.env');if(!fs.existsSync(p))return;for(const raw of fs.readFileSync(p,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i<1)continue;const k=line.slice(0,i).trim(),v=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');if(!process.env[k])process.env[k]=v}}
loadEnv();
const PORT=Number(process.env.PORT||3000);
process.env.TZ=process.env.APP_TIMEZONE||'Asia/Phnom_Penh';

const DATA_DIR=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
const USERS_FILE=path.join(DATA_DIR,'users.json');
const TEACHERS_FILE=path.join(DATA_DIR,'teachers.json');
const APPLICATIONS_FILE=path.join(DATA_DIR,'teacher-applications.json');
const APPLICATION_UPLOAD_DIR=path.join(DATA_DIR,'application-uploads');
if(!fs.existsSync(APPLICATION_UPLOAD_DIR))fs.mkdirSync(APPLICATION_UPLOAD_DIR,{recursive:true});
if(!fs.existsSync(DATA_DIR))fs.mkdirSync(DATA_DIR,{recursive:true});
if(process.env.NODE_ENV==='production'&&!process.env.DATA_DIR)console.error('[iSpeak] PRODUCTION WARNING: DATA_DIR is not set. Configure persistent storage before accepting real accounts/bookings.');if(process.env.NODE_ENV==='production'&&!process.env.TEACHER_PORTAL_PIN)console.error('[iSpeak] PRODUCTION SECURITY: TEACHER_PORTAL_PIN is required; teacher portal login is disabled until configured.');
function loadUsers(){try{return JSON.parse(fs.readFileSync(USERS_FILE,'utf8'))}catch{return {users:{}}}}
function saveUsers(db){const tmp=USERS_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,USERS_FILE)}

const TEACHER_NAMES=['Nathan','Ounnoun','Jessica','An Sievly'];
const DEFAULT_AVAILABILITY={'0':['17:00','18:00','19:00'],'1':['17:00','18:00','19:00'],'2':['17:00','18:00','19:00'],'3':['17:00','18:00','19:00'],'4':['17:00','18:00','19:00'],'5':['10:00','11:00','14:00','15:00'],'6':['10:00','11:00','14:00','15:00']};
function loadTeachers(){try{const d=JSON.parse(fs.readFileSync(TEACHERS_FILE,'utf8'));if(d&&d.teachers)return d}catch{}const d={teachers:{}};for(const n of TEACHER_NAMES)d.teachers[n]={timezone:'Asia/Phnom_Penh',availability:JSON.parse(JSON.stringify(DEFAULT_AVAILABILITY)),bookings:[]};return d}
function saveTeachers(db){const tmp=TEACHERS_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,TEACHERS_FILE)}
function loadApplications(){try{const d=JSON.parse(fs.readFileSync(APPLICATIONS_FILE,'utf8'));if(d&&d.applications)return d}catch{}return {applications:{}}}
function saveApplications(db){const tmp=APPLICATIONS_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,APPLICATIONS_FILE)}
function applicationPublic(a){if(!a)return null;const {passwordHash,tokenHash,...safe}=a;return safe}
function appToken(req){return String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim()}
function authApplicant(req){const token=appToken(req);if(!token)return null;const db=loadApplications();const th=crypto.createHash('sha256').update(token).digest('hex');for(const [id,a] of Object.entries(db.applications)){if(a.tokenHash===th&&(!a.tokenIssuedAt||Date.now()-Date.parse(a.tokenIssuedAt)<30*24*60*60*1000))return {id,a,db,token}}return null}
function validAdminPin(pin){const configured=process.env.ADMIN_PORTAL_PIN;if(process.env.NODE_ENV==='production'&&!configured)return false;const expected=String(configured||'1357');const a=Buffer.from(String(pin||'')),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function cleanFilename(x){return String(x||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)}
function fileMagicOk(buf,mime){
 if(!Buffer.isBuffer(buf)||buf.length<12)return false;
 if(mime==='application/pdf')return buf.subarray(0,5).toString()==='%PDF-'&&buf.subarray(Math.max(0,buf.length-2048)).toString('latin1').includes('%%EOF');
 if(mime==='image/jpeg')return buf.length>128&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff&&buf[buf.length-2]===0xff&&buf[buf.length-1]===0xd9;
 if(mime==='image/png')return buf.length>32&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&buf.subarray(12,16).toString()==='IHDR'&&buf.subarray(Math.max(0,buf.length-20)).includes(Buffer.from('IEND'));
 if(mime==='image/webp'){const riff=buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP';const chunk=buf.subarray(12,16).toString();return buf.length>24&&riff&&['VP8 ','VP8L','VP8X'].includes(chunk)}
 if(mime==='video/mp4'){if(buf.length<32||buf.subarray(4,8).toString()!=='ftyp')return false;const scan=buf.subarray(0,Math.min(buf.length,2_000_000)).toString('latin1');return scan.includes('moov')||scan.includes('mdat')}
 if(mime==='video/webm'){if(buf.length<32||!buf.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))return false;return buf.includes(Buffer.from([0x18,0x53,0x80,0x67]))}
 return false
}
function deleteStoredUrl(u){try{const n=decodeURIComponent(String(u||'').split('/').pop());if(n===cleanFilename(n)){const f=path.join(APPLICATION_UPLOAD_DIR,n);if(f.startsWith(APPLICATION_UPLOAD_DIR)&&fs.existsSync(f))fs.unlinkSync(f)}}catch{}}
function saveDataFile(appId,kind,file,maxBytes,allowed){if(!file||!file.data)return '';const mime=String(file.type||'').toLowerCase();if(!allowed.some(x=>mime===x))throw new Error(`Unsupported ${kind} file type.`);const raw=String(file.data);if(!/^data:[^,]+;base64,/i.test(raw))throw new Error(`${kind} upload is not valid base64 data.`);let buf;try{buf=Buffer.from(raw.replace(/^data:[^,]+,/,''),'base64')}catch{throw new Error(`${kind} upload could not be decoded.`)}if(!buf.length||buf.length>maxBytes)throw new Error(`${kind} file is too large.`);if(!fileMagicOk(buf,mime))throw new Error(`${kind} file is not a valid supported ${mime.includes('image')?'image':mime.includes('video')?'video':'document'}.`);const extByMime={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','application/pdf':'pdf'};const ext=extByMime[mime];if(!ext)throw new Error(`Unsupported ${kind} file type.`);const name=`${appId}-${kind}-${Date.now()}.${ext}`;fs.writeFileSync(path.join(APPLICATION_UPLOAD_DIR,name),buf);return `/api/application-file/${encodeURIComponent(name)}`}
function applicationScore(a){let s=0;if(a.firstName&&a.lastName)s+=10;if(a.country)s+=5;if((a.teachingLanguages||[]).length)s+=10;if((a.spokenLanguages||[]).length)s+=5;if(String(a.headline||'').length>=25)s+=10;if(String(a.about||'').length>=160)s+=15;if(String(a.experience||'').length>=100)s+=10;if(a.photoUrl)s+=10;if(a.videoUrl)s+=10;if((a.certificates||[]).length)s+=5;if(a.availability&&Object.values(a.availability).some(v=>Array.isArray(v)&&v.length))s+=5;if(Number(a.requestedRate)>0)s+=5;return Math.min(100,s)}
function ensureTeacher(db,name){const apps=loadApplications();const approved=Object.values(apps.applications||{}).some(a=>a.status==='approved'&&a.publicName===name);if(!TEACHER_NAMES.includes(name)&&!approved)return null;if(!db.teachers[name])db.teachers[name]={timezone:'Asia/Phnom_Penh',availability:JSON.parse(JSON.stringify(DEFAULT_AVAILABILITY)),bookings:[]};return db.teachers[name]}
function dateKey(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function validTimeZone(tz){try{new Intl.DateTimeFormat('en',{timeZone:tz}).format();return true}catch{return false}}
function zoneNowParts(tz){const o={};for(const x of new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()))if(x.type!=='literal')o[x.type]=Number(x.value);return o}
function availableDays(name,count=60){const db=loadTeachers(),t=ensureTeacher(db,name);if(!t)return null;const timezone=validTimeZone(t.timezone)?t.timezone:'Asia/Phnom_Penh',now=zoneNowParts(timezone),base=new Date(Date.UTC(now.year,now.month-1,now.day)),out=[];for(let i=0;i<count;i++){const d=new Date(base.getTime()+i*86400000),key=dateKey(d),weekday=(d.getUTCDay()+6)%7;let slots=[...(t.availability[String(weekday)]||[])];slots=slots.filter(time=>!t.bookings.some(b=>b.date===key&&b.time===time&&b.status!=='cancelled'));if(i===0){const cur=now.hour*60+now.minute+60;slots=slots.filter(x=>{const [h,m]=x.split(':').map(Number);return h*60+m>=cur})}out.push({date:key,slots})}return {teacher:name,timezone,days:out}}
function validPortalPin(pin){const configured=process.env.TEACHER_PORTAL_PIN;if(process.env.NODE_ENV==='production'&&!configured)return false;const expected=String(configured||'2468');const a=Buffer.from(String(pin||'')),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function normEmail(x){return String(x||'').trim().toLowerCase().slice(0,160)}
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
 const hash=crypto.scryptSync(String(password),salt,64).toString('hex');return {salt,hash}
}
function verifyPassword(password,rec){try{return crypto.timingSafeEqual(Buffer.from(hashPassword(password,rec.salt).hash,'hex'),Buffer.from(rec.hash,'hex'))}catch{return false}}
function newToken(){return crypto.randomBytes(32).toString('hex')}
function authUser(req){
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();if(!token)return null;
 const db=loadUsers();for(const [email,u] of Object.entries(db.users)){if(u.tokenHash&&crypto.createHash('sha256').update(token).digest('hex')===u.tokenHash){if(u.tokenIssuedAt&&Date.now()-Date.parse(u.tokenIssuedAt)>30*24*60*60*1000)return null;return {email,u,db,token}}}
 return null;
}
function publicState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const allowed=['language','xp','streak','completed','attempts','correct','dailyGoal','lastDay','activity','name','bookings','mascot','voice','roomMode','coins','mood','energy','ownedAccessories','accessory','placement','studyCompleted','studyMinutes','email','certificates','unitMastery','placementDetail','uiLanguage','onboardingDone','learningPlan','quests','missionProgress','pronunciationHistory','writingMastery','khmerNativeSeen','libraryNotes','skillEvidence','errorHistory','learnerModel','translationFallbacks','schemaVersion'];
 const out={};for(const k of allowed)if(k in raw)out[k]=raw[k];
 return out;
}
const CHAT_MODEL=process.env.GEMINI_CHAT_MODEL||'gemini-3-flash-preview';
const TTS_MODEL=process.env.GEMINI_TTS_MODEL||'gemini-3.1-flash-tts-preview';
const mascots={
 jess:{name:'Jess',language:'English',personality:'cheerful, kind, curious and encouraging',voice:'Kore'},
 jack:{name:'Jack Chen',language:'Mandarin Chinese',personality:'smart, patient, calm and curious',voice:'Puck'},
 pedro:{name:'Pedro',language:'Spanish',personality:'energetic, warm, funny and encouraging',voice:'Charon'},
 loulou:{name:'Loulou',language:'French',personality:'sweet, playful, positive and patient',voice:'Aoede'},
 yuki:{name:'Yuki',language:'Japanese',personality:'calm, cheerful, supportive and thoughtful',voice:'Fenrir'},
 dariya:{name:'Dariya',language:'Khmer',personality:'gentle, patient, warm and encouraging',voice:'Leda'},
 zayd:{name:'Zayd',language:'Modern Standard Arabic',personality:'warm, patient, confident and encouraging',voice:'Puck'}
};
const SECURITY_HEADERS={
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(self), microphone=(self), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
const send=(res,status,body,type='application/json')=>{res.writeHead(status,{...SECURITY_HEADERS,'Content-Type':type,'Cache-Control':type.startsWith('text/html')?'no-store':'no-store'});res.end(body)};
const json=(res,status,obj)=>send(res,status,JSON.stringify(obj),'application/json; charset=utf-8');
function readBody(req,limit=1_000_000){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>limit){reject(new Error('Request too large'));req.destroy()}});req.on('end',()=>resolve(s));req.on('error',reject)})}
function readBuffer(req,limit=12_000_000){return new Promise((resolve,reject)=>{const chunks=[];let n=0;req.on('data',c=>{n+=c.length;if(n>limit){reject(new Error('Audio too large'));req.destroy();return}chunks.push(c)});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject)})}

const rateBuckets=new Map();
function clientIP(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim()}
function rateLimit(req,key,limit,windowMs){
 const now=Date.now(),id=`${clientIP(req)}:${key}`,old=rateBuckets.get(id)||[];
 const fresh=old.filter(t=>now-t<windowMs);fresh.push(now);rateBuckets.set(id,fresh);
 return fresh.length<=limit;
}
function sameOriginPOST(req){
 if(req.method!=='POST')return true;
 const host=String(req.headers.host||'');
 const origin=String(req.headers.origin||'');
 const referer=String(req.headers.referer||'');
 if(origin){try{return new URL(origin).host===host}catch{return false}}
 if(referer){try{return new URL(referer).host===host}catch{return false}}
 return false;
}
function apiGuard(req,res,pathname){
 if(req.method==='POST'&&!sameOriginPOST(req)){json(res,403,{error:'Cross-origin API requests are blocked.'});return false}
 const rules=pathname==='/api/account/login'?['login',10,900000]:
   pathname==='/api/account/register'?['register',5,3600000]:
   pathname==='/api/booking'?['booking',8,3600000]:
   pathname==='/api/teacher/portal'?['teacherportal',40,3600000]:
   pathname.startsWith('/api/teacher-application')?['teacherapplication',60,3600000]:
   pathname==='/api/admin/applications'?['adminapplications',80,3600000]:
   pathname.startsWith('/api/chat/')?['chat',30,600000]:
   pathname.startsWith('/api/tts/')?['tts',20,600000]:
   pathname.startsWith('/api/transcribe/')?['transcribe',20,600000]:
   pathname==='/api/certificate/email'?['certificate',3,3600000]:
   ['api',60,600000];
 if(!rateLimit(req,rules[0],rules[1],rules[2])){json(res,429,{error:'Too many requests. Please wait and try again.'});return false}
 return true;
}
setInterval(()=>{const cutoff=Date.now()-3600000;for(const [k,v] of rateBuckets){const n=v.filter(t=>t>cutoff);if(n.length)rateBuckets.set(k,n);else rateBuckets.delete(k)}},600000).unref();
function systemPrompt(m){return `You are ${m.name}, the ${m.language} mascot tutor in iSpeak Confidence. You are ${m.personality}. Be a genuinely intelligent conversation partner and language tutor.
Answer the learner's actual meaning directly. Remember the recent conversation supplied to you. Ask relevant follow-up questions, vary wording, and avoid generic canned praise. Keep most replies 1-4 sentences. Adapt difficulty to the learner. Correct important language mistakes gently after responding to meaning. Support realistic role-play. Stay in character and in the same language identity.
If the learner gives a movement command, choose the matching action. Allowed actions: idle, wave, jump, run, sit, lie, dance, stand.
For Khmer, do not invent new curriculum or uncertain Khmer forms; if unsure, use English support instead.
Return JSON only with reply, action, correction, encouragement. action must be one allowed action.`}
function parseGeminiJSON(text,fallback={}){
 const raw=String(text||'').trim();
 const options=[raw,raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim(),(raw.match(/\{[\s\S]*\}/)||[])[0]||''].filter(Boolean);
 for(const x of options){try{return JSON.parse(x)}catch{}}
 return fallback;
}
async function geminiGenerate(key,model,payload){
 return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload)
 });
}
function wavHeader(dataLength,sampleRate=24000,channels=1,bits=16){const b=Buffer.alloc(44);b.write('RIFF',0);b.writeUInt32LE(36+dataLength,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*channels*bits/8,28);b.writeUInt16LE(channels*bits/8,32);b.writeUInt16LE(bits,34);b.write('data',36);b.writeUInt32LE(dataLength,40);return b}

function htmlEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function certificateEmailHTML(p){
 return `<!doctype html><html><body style="margin:0;padding:28px;background:#06111e;font-family:Arial,sans-serif;color:#10233d">
 <div style="max-width:900px;margin:auto;background:#fdfbf5;border:10px solid #0b2848;outline:2px solid #caa44b;padding:44px;box-sizing:border-box;text-align:center">
 <div style="font-weight:800;color:#0d9fa0;letter-spacing:.12em">iSPEAK CONFIDENCE</div>
 <div style="font:700 52px Georgia,serif;letter-spacing:.12em;margin-top:20px">CERTIFICATE</div>
 <div style="font:600 23px Georgia,serif;color:#b18737;letter-spacing:.18em">OF COMPLETION</div>
 <div style="height:1px;background:#c9a34a;margin:25px auto;width:72%"></div>
 <div style="font-size:12px;letter-spacing:.22em">THIS IS TO CERTIFY THAT</div>
 <div style="font:italic 48px Georgia,serif;color:#102b52;margin:18px 0">${htmlEsc(p.name)}</div>
 <div style="font-size:12px;letter-spacing:.16em">HAS SUCCESSFULLY COMPLETED THE</div>
 <div style="font-weight:900;font-size:23px;color:#087f89;margin:14px">${htmlEsc(p.courseName)}</div>
 <p style="line-height:1.6;max-width:680px;margin:18px auto">Awarded for completing all 240 progressive learning blocks in the 30-unit iSpeak Confidence mastery pathway, covering speaking, listening, reading, writing, vocabulary, grammar and conversation.</p>
 <table role="presentation" style="margin:30px auto;border-collapse:collapse"><tr><td style="padding:10px 30px;border-right:1px solid #d1c398"><b style="font-size:25px">240</b><br><small>Learning Blocks</small></td><td style="padding:10px 30px;border-right:1px solid #d1c398"><b style="font-size:25px">30</b><br><small>Units</small></td><td style="padding:10px 30px"><b style="font-size:25px">100%</b><br><small>Course Completion</small></td></tr></table>
 <div style="display:flex;justify-content:space-between;text-align:left;margin-top:35px;font-size:13px"><div><small>COMPLETION DATE</small><br><b>${htmlEsc(p.completionDate)}</b></div><div style="text-align:right"><small>CERTIFICATE ID</small><br><b>${htmlEsc(p.certificateId)}</b></div></div>
 <div style="margin-top:28px;font:italic 25px Georgia,serif">Nathan<br><small style="font:11px Arial,sans-serif;letter-spacing:.1em">iSPEAK CONFIDENCE</small></div>
 </div></body></html>`;
}
function smtpSendMail({to,subject,html}){
 const host=process.env.SMTP_HOST||'smtp.gmail.com',port=Number(process.env.SMTP_PORT||465),user=process.env.SMTP_USER,pass=process.env.SMTP_APP_PASSWORD,fromName=process.env.CERT_FROM_NAME||'iSpeak Confidence';
 if(!user||!pass)return Promise.reject(new Error('Email delivery is not configured on the server.'));
 return new Promise((resolve,reject)=>{
   const sock=tls.connect(port,host,{servername:host,rejectUnauthorized:true});
   let buffer='',queue=[],closed=false;
   const fail=e=>{if(closed)return;closed=true;try{sock.end()}catch{}reject(e instanceof Error?e:new Error(String(e)))};
   const waitCode=(codes)=>new Promise((res,rej)=>queue.push({codes:Array.isArray(codes)?codes:[codes],res,rej}));
   sock.setEncoding('utf8');
   sock.on('data',chunk=>{
     buffer+=chunk;
     const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';
     for(const line of lines){
       if(!/^\d{3}[ -]/.test(line)||line[3]==='-')continue;
       const code=Number(line.slice(0,3)),item=queue.shift();
       if(item){if(item.codes.includes(code))item.res(line);else item.rej(new Error(`SMTP ${code}: ${line.slice(4)}`))}
     }
   });
   sock.on('error',fail);sock.on('timeout',()=>fail(new Error('SMTP connection timed out.')));sock.setTimeout(20000);
   const cmd=async(text,codes)=>{sock.write(text+'\r\n');return waitCode(codes)};
   (async()=>{
     await waitCode(220);await cmd('EHLO ispeakconfidence.local',250);
     await cmd('AUTH LOGIN',334);await cmd(Buffer.from(user).toString('base64'),334);await cmd(Buffer.from(pass).toString('base64'),235);
     await cmd(`MAIL FROM:<${user}>`,250);await cmd(`RCPT TO:<${to}>`,[250,251]);await cmd('DATA',354);
     const boundary='ISC_CERT_'+Date.now();
     const message=[
       `From: "${fromName.replace(/"/g,'')}" <${user}>`,
       `To: <${to}>`,
       `Subject: ${subject}`,
       'MIME-Version: 1.0',
       `Content-Type: text/html; charset=UTF-8`,
       'Content-Transfer-Encoding: 8bit',
       '',
       html.replace(/\r?\n\./g,'\n..'),
       '.'
     ].join('\r\n');
     sock.write(message+'\r\n');await waitCode(250);await cmd('QUIT',221).catch(()=>{});closed=true;sock.end();resolve();
   })().catch(fail);
 });
}

async function handleAPI(req,res,pathname){
 if(pathname!=='/api/status'&&!apiGuard(req,res,pathname))return true;
 
 if(pathname==='/api/account/register'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const email=normEmail(body.email),password=String(body.password||'');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json(res,400,{error:'Enter a valid email.'});
   if(password.length<8||password.length>128)return json(res,400,{error:'Password must be 8–128 characters.'});
   const db=loadUsers();if(db.users[email])return json(res,409,{error:'An account already exists for this email.'});
   const p=hashPassword(password),token=newToken();db.users[email]={salt:p.salt,hash:p.hash,tokenHash:crypto.createHash('sha256').update(token).digest('hex'),tokenIssuedAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:null,state:{}};saveUsers(db);
   return json(res,201,{email,token});
 }
 if(pathname==='/api/account/login'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const email=normEmail(body.email),password=String(body.password||''),db=loadUsers(),u=db.users[email];
   if(!u||!verifyPassword(password,u))return json(res,401,{error:'Incorrect email or password.'});
   const token=newToken();u.tokenHash=crypto.createHash('sha256').update(token).digest('hex');u.lastLoginAt=new Date().toISOString();u.tokenIssuedAt=new Date().toISOString();saveUsers(db);return json(res,200,{email,token});
 }
 if(pathname==='/api/account/progress'&&req.method==='GET'){
   const a=authUser(req);if(!a)return json(res,401,{error:'Sign in required.'});return json(res,200,{email:a.email,state:a.u.state||{},updatedAt:a.u.updatedAt||null});
 }
 if(pathname==='/api/account/progress'&&req.method==='PUT'){
   const a=authUser(req);if(!a)return json(res,401,{error:'Sign in required.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const serialized=JSON.stringify(body.state||{});if(Buffer.byteLength(serialized)>700000)return json(res,413,{error:'Progress data is too large.'});
   a.u.state=publicState(body.state);a.u.updatedAt=new Date().toISOString();saveUsers(a.db);return json(res,200,{updatedAt:a.u.updatedAt});
 }
 if(pathname==='/api/account'&&req.method==='DELETE'){
   const a=authUser(req);if(!a)return json(res,401,{error:'Sign in required.'});delete a.db.users[a.email];saveUsers(a.db);return json(res,200,{deleted:true});
 }

 if(pathname==='/api/status'&&req.method==='GET')return json(res,200,{aiConfigured:Boolean(process.env.GEMINI_API_KEY),provider:'Gemini',model:CHAT_MODEL,speechInput:'Gemini audio transcription',tts:TTS_MODEL,version:'V18.0.1',bookingEmailConfigured:Boolean(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD),emailConfigured:Boolean(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD)});
 if(pathname==='/api/verify'&&req.method==='GET'){
   const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{ok:false,error:'GEMINI_API_KEY is not configured.'});
   try{
     const r=await geminiGenerate(key,CHAT_MODEL,{contents:[{role:'user',parts:[{text:'Reply with OK only.'}]}],generationConfig:{temperature:0,maxOutputTokens:8}});
     const data=await r.json();if(!r.ok)return json(res,r.status,{ok:false,error:data?.error?.message||'Gemini verification failed.'});
     return json(res,200,{ok:true,model:CHAT_MODEL});
   }catch(e){console.error(e);return json(res,500,{ok:false,error:'Could not connect to Gemini.'})}
 }

 if(pathname==='/api/placement-evaluate'&&req.method==='POST'){
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});
   const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'GEMINI_API_KEY is not configured.'});
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const language=String(body.language||'').slice(0,40),prompt=String(body.prompt||'').slice(0,1800),response=String(body.response||'').slice(0,4000),requirements=Array.isArray(body.requirements)?body.requirements.slice(0,8).map(x=>String(x).slice(0,300)):[],difficulty=Math.max(1,Math.min(5,Number(body.difficulty)||5));
   if(!language||!prompt||!response)return json(res,400,{error:'Incomplete placement response.'});
   const rubric=`You are evaluating an advanced ${language} placement-test response. Do NOT require one memorized wording. Judge whether the learner communicates the requested ideas naturally and intelligibly in ${language}. Accept valid variation. Do not reward an English-only response. At difficulty 5, expect connected multi-clause communication, appropriate politeness/register where relevant, reasons/details, and successful completion of the communicative task. Minor spelling/typing errors may pass if meaning is clear. Requirements: ${requirements.join('; ')}. Scenario: ${prompt}\nLearner response: ${response}\nReturn JSON only: {"pass":true|false,"score":0-100,"feedback":"one short English sentence explaining the decision"}. A pass normally requires 70+ and completion of the core communicative requirements.`;
   const payload={contents:[{role:'user',parts:[{text:rubric}]}],generationConfig:{temperature:0,maxOutputTokens:180}};
   try{const r=await geminiGenerate(key,CHAT_MODEL,payload),data=await r.json();if(!r.ok)return json(res,r.status,{error:data?.error?.message||'Placement evaluation failed.'});const raw=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'',parsed=parseGeminiJSON(raw,{});if(typeof parsed.pass!=='boolean')return json(res,502,{error:'Could not score this response reliably.'});return json(res,200,{pass:parsed.pass,score:Math.max(0,Math.min(100,Number(parsed.score)||0)),feedback:String(parsed.feedback||'').slice(0,300)})}catch(e){console.error(e);return json(res,500,{error:'Could not evaluate the placement response.'})}
 }

 if(pathname==='/api/ielts-evaluate'&&req.method==='POST'){
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});
   const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'GEMINI_API_KEY is not configured.'});
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const skill=String(body.skill||'').toLowerCase(),task=String(body.task||'').slice(0,5000),response=String(body.response||'').slice(0,16000),taskType=String(body.taskType||'').slice(0,80);
   if(!['writing','speaking'].includes(skill)||!task||!response)return json(res,400,{error:'Complete the task before requesting AI marking.'});
   const criteria=skill==='writing'?['Task Achievement / Task Response','Coherence and Cohesion','Lexical Resource','Grammatical Range and Accuracy']:['Fluency and Coherence','Lexical Resource','Grammatical Range and Accuracy','Pronunciation'];
   const base=`You are a strict IELTS MOCK assessor. This is practice, never claim to be an official IELTS examiner or official score. Use the public IELTS band-descriptor principles. Score each criterion from 0 to 9 in 0.5 increments. Be conservative: do not inflate weak work. For writing, assess the submitted text itself and the task requirements. For speaking, assess the transcript for fluency/coherence, vocabulary, grammar and task development; pronunciation cannot be reliably inferred from a transcript, so set pronunciation to null unless audio-derived evidence is supplied. Return concise actionable feedback. Task type: ${taskType}. Task: ${task}\nCandidate response: ${response}\nCriteria: ${criteria.join('; ')}. Return JSON only with: {"overall":0-9,"criteria":{"criterion name":score_or_null},"strengths":["..."],"improvements":["..."],"nextSteps":["..."],"summary":"...","confidence":"high|medium|low"}. Overall must reflect available criteria and be rounded to the nearest 0.5.`;
   const run=async(extra='')=>{const r=await geminiGenerate(key,CHAT_MODEL,{contents:[{role:'user',parts:[{text:base+extra}]}],generationConfig:{temperature:0,maxOutputTokens:700}});const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||'IELTS evaluation failed.');const raw=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';return parseGeminiJSON(raw,{})};
   const clean=x=>{const overall=Math.max(0,Math.min(9,Math.round((Number(x.overall)||0)*2)/2));const c={};for(const k of criteria){const v=x.criteria?.[k];c[k]=v==null?null:Math.max(0,Math.min(9,Math.round((Number(v)||0)*2)/2))}return {overall,criteria:c,strengths:(Array.isArray(x.strengths)?x.strengths:[]).slice(0,3).map(String),improvements:(Array.isArray(x.improvements)?x.improvements:[]).slice(0,4).map(String),nextSteps:(Array.isArray(x.nextSteps)?x.nextSteps:[]).slice(0,3).map(String),summary:String(x.summary||'').slice(0,700),confidence:['high','medium','low'].includes(x.confidence)?x.confidence:'medium'}};
   try{const a=clean(await run('\nThis is independent scoring pass A.'));const b=clean(await run('\nThis is independent scoring pass B. Reassess from scratch.'));let final;if(Math.abs(a.overall-b.overall)>=1){final=clean(await run(`\nTwo independent passes disagreed (${a.overall} vs ${b.overall}). Reconcile carefully from the original response and choose the most defensible score.`))}else{final={...a,overall:Math.round(((a.overall+b.overall)/2)*2)/2};for(const k of criteria){if(a.criteria[k]!=null&&b.criteria[k]!=null)final.criteria[k]=Math.round(((a.criteria[k]+b.criteria[k])/2)*2)/2}final.strengths=[...new Set([...a.strengths,...b.strengths])].slice(0,3);final.improvements=[...new Set([...a.improvements,...b.improvements])].slice(0,4);final.nextSteps=[...new Set([...a.nextSteps,...b.nextSteps])].slice(0,3);final.confidence=a.confidence==='low'||b.confidence==='low'?'low':a.confidence==='high'&&b.confidence==='high'?'high':'medium'}
     return json(res,200,{...final,estimated:true,label:'AI-estimated mock band',doubleChecked:true,disclaimer:'Practice estimate only — not an official IELTS result.'});
   }catch(e){console.error(e);return json(res,500,{error:e.message||'Could not mark this mock response.'})}
 }


 if(pathname.startsWith('/api/application-file/')&&req.method==='GET'){
   const name=decodeURIComponent(pathname.split('/').pop()||'');if(name!==cleanFilename(name))return json(res,400,{error:'Invalid file.'});const p=path.join(APPLICATION_UPLOAD_DIR,name);if(!p.startsWith(APPLICATION_UPLOAD_DIR)||!fs.existsSync(p))return json(res,404,{error:'File not found.'});
   if(name.includes('-certificate-')){const au=authApplicant(req),adminPin=String(req.headers['x-admin-pin']||'');if(!au&&!validAdminPin(adminPin))return json(res,403,{error:'Private qualification file.'});if(au&&!name.startsWith(`${au.a.id}-certificate-`))return json(res,403,{error:'This qualification belongs to another application.'});}
   const ext=path.extname(p).toLowerCase(),types={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.pdf':'application/pdf'};return send(res,200,fs.readFileSync(p),types[ext]||'application/octet-stream')
 }
 if(pathname==='/api/teacher-application/register'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,2_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const email=normEmail(body.email),password=String(body.password||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8)return json(res,400,{error:'Use a valid email and a password of at least 8 characters.'});const db=loadApplications();if(Object.values(db.applications).some(a=>a.email===email))return json(res,409,{error:'An application account already exists for this email.'});const id='TA-'+crypto.randomBytes(5).toString('hex').toUpperCase(),token=newToken(),ph=hashPassword(password);db.applications[id]={id,email,passwordHash:ph,tokenHash:crypto.createHash('sha256').update(token).digest('hex'),tokenIssuedAt:new Date().toISOString(),status:'draft',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),reviewHistory:[],certificates:[],availability:{}};saveApplications(db);return json(res,200,{ok:true,token,application:applicationPublic(db.applications[id])})
 }
 if(pathname==='/api/teacher-application/login'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,1_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const email=normEmail(body.email),password=String(body.password||''),db=loadApplications();const entry=Object.entries(db.applications).find(([,a])=>a.email===email);if(!entry||!verifyPassword(password,entry[1].passwordHash))return json(res,403,{error:'Incorrect application email or password.'});const [id,a]=entry,token=newToken();a.tokenHash=crypto.createHash('sha256').update(token).digest('hex');a.tokenIssuedAt=new Date().toISOString();saveApplications(db);return json(res,200,{ok:true,token,application:applicationPublic(a)})
 }
 if(pathname==='/api/teacher-application/me'&&req.method==='GET'){const au=authApplicant(req);if(!au)return json(res,401,{error:'Applicant login required.'});return json(res,200,{application:{...applicationPublic(au.a),profileScore:applicationScore(au.a)}})}
 if(pathname==='/api/teacher-application/save'&&req.method==='POST'){
   const au=authApplicant(req);if(!au)return json(res,401,{error:'Applicant login required.'});if(['submitted','approved'].includes(au.a.status))return json(res,409,{error:'This application is locked while under review or after approval.'});let body;try{body=JSON.parse(await readBody(req,75_000_000)||'{}')}catch{return json(res,400,{error:'Application data is invalid or too large.'})}const a=au.a,fields=['firstName','lastName','publicName','country','timezone','phone','headline','about','experience','education','requestedRate','currency'];for(const k of fields)if(k in body)a[k]=String(body[k]||'').trim().slice(0,k==='about'||k==='experience'?4000:500);a.teachingLanguages=Array.isArray(body.teachingLanguages)?body.teachingLanguages.map(x=>String(x).slice(0,60)).slice(0,7):a.teachingLanguages||[];a.spokenLanguages=Array.isArray(body.spokenLanguages)?body.spokenLanguages.map(x=>String(x).slice(0,60)).slice(0,7):a.spokenLanguages||[];a.specialties=Array.isArray(body.specialties)?body.specialties.map(x=>String(x).slice(0,80)).slice(0,12):a.specialties||[];if(body.availability&&typeof body.availability==='object')a.availability=body.availability;try{if(body.photo?.data){const old=a.photoUrl;a.photoUrl=saveDataFile(a.id,'photo',body.photo,4_000_000,['image/jpeg','image/png','image/webp']);deleteStoredUrl(old)}if(body.video?.data){const old=a.videoUrl;a.videoUrl=saveDataFile(a.id,'video',body.video,55_000_000,['video/mp4','video/webm']);deleteStoredUrl(old)}if(Array.isArray(body.newCertificates)){for(const f of body.newCertificates.slice(0,5)){const url=saveDataFile(a.id,'certificate',f,10_000_000,['application/pdf','image/jpeg','image/png']);a.certificates.push({name:cleanFilename(f.name),url})}}}catch(e){return json(res,400,{error:e.message})}a.updatedAt=new Date().toISOString();saveApplications(au.db);return json(res,200,{ok:true,application:{...applicationPublic(a),profileScore:applicationScore(a)}})
 }
 if(pathname==='/api/teacher-application/submit'&&req.method==='POST'){
   const au=authApplicant(req);if(!au)return json(res,401,{error:'Applicant login required.'});const a=au.a,score=applicationScore(a),missing=[];if(!a.firstName||!a.lastName)missing.push('name');if(!a.country)missing.push('country');if(!(a.teachingLanguages||[]).length)missing.push('teaching language');if(String(a.headline||'').length<25)missing.push('headline');if(String(a.about||'').length<160)missing.push('profile description');if(String(a.experience||'').length<100)missing.push('experience');if(!a.photoUrl)missing.push('profile photo');if(!a.videoUrl)missing.push('intro video');if(!a.availability||!Object.values(a.availability).some(v=>Array.isArray(v)&&v.length))missing.push('availability');if(!(Number(a.requestedRate)>0))missing.push('requested rate');if(missing.length)return json(res,400,{error:`Complete before submitting: ${missing.join(', ')}.`,profileScore:score});a.status='submitted';a.submittedAt=new Date().toISOString();a.updatedAt=a.submittedAt;a.reviewHistory.push({at:a.submittedAt,type:'submitted',note:'Application submitted for iSpeak review.'});saveApplications(au.db);return json(res,200,{ok:true,status:a.status,profileScore:score})
 }
 if(pathname==='/api/teacher-application/portal'&&req.method==='POST'){
   const au=authApplicant(req);if(!au)return json(res,401,{error:'Teacher login required.'});if(au.a.status!=='approved')return json(res,403,{error:'Your teacher application must be approved first.'});let body;try{body=JSON.parse(await readBody(req,2_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const teacher=String(au.a.publicName||`${au.a.firstName||''} ${au.a.lastName||''}`).trim(),db=loadTeachers(),t=ensureTeacher(db,teacher);if(!t)return json(res,404,{error:'Teacher scheduling profile not found.'});if(body.action==='dashboard'){const open=Object.values(t.availability||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);return json(res,200,{teacher,timezone:t.timezone,availability:t.availability,bookings:(t.bookings||[]).slice().sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),openSlotCount:open})}if(body.action==='availability'){const av=body.availability;if(!av||typeof av!=='object')return json(res,400,{error:'Availability is required.'});const clean={};for(let d=0;d<7;d++){const arr=Array.isArray(av[String(d)])?av[String(d)]:[];clean[String(d)]=[...new Set(arr.filter(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x))))].sort()}t.availability=clean;{const z=String(body.timezone||t.timezone||au.a.timezone||'Asia/Phnom_Penh').slice(0,80);if(!validTimeZone(z))return json(res,400,{error:'Invalid timezone.'});t.timezone=z;}saveTeachers(db);return json(res,200,{ok:true})}if(body.action==='bookingStatus'){const b=(t.bookings||[]).find(x=>x.id===String(body.bookingId||''));if(!b)return json(res,404,{error:'Booking not found.'});const status=String(body.status||'');if(!['pending','confirmed','completed','cancelled'].includes(status))return json(res,400,{error:'Invalid booking status.'});b.status=status;b.updated=new Date().toISOString();saveTeachers(db);return json(res,200,{ok:true})}return json(res,400,{error:'Unknown teacher dashboard action.'})
 }
 if(pathname==='/api/admin/applications'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,2_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}if(!validAdminPin(body.pin))return json(res,403,{error:'Incorrect admin PIN.'});const db=loadApplications();if(body.action==='list')return json(res,200,{applications:Object.values(db.applications).map(a=>({...applicationPublic(a),profileScore:applicationScore(a)})).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))});const a=db.applications[String(body.applicationId||'')];if(!a)return json(res,404,{error:'Application not found.'});if(body.action==='review'){const decision=String(body.decision||'');if(!['approved','changes_requested','rejected'].includes(decision))return json(res,400,{error:'Invalid review decision.'});const note=String(body.note||'').trim().slice(0,2000);a.status=decision;a.reviewNote=note;a.reviewedAt=new Date().toISOString();a.updatedAt=a.reviewedAt;a.reviewHistory=a.reviewHistory||[];a.reviewHistory.push({at:a.reviewedAt,type:decision,note});if(decision==='approved'){a.publicName=String(a.publicName||`${a.firstName} ${a.lastName}`).trim();const tdb=loadTeachers();if(!tdb.teachers[a.publicName])tdb.teachers[a.publicName]={timezone:a.timezone||'Asia/Phnom_Penh',availability:a.availability||{},bookings:[],applicationId:a.id};saveTeachers(tdb)}saveApplications(db);return json(res,200,{ok:true,application:{...applicationPublic(a),profileScore:applicationScore(a)}})}return json(res,400,{error:'Unknown admin action.'})
 }
 if(pathname==='/api/approved-teachers'&&req.method==='GET'){const db=loadApplications();const teachers=Object.values(db.applications).filter(a=>a.status==='approved').map(a=>({id:a.id,name:a.publicName||`${a.firstName} ${a.lastName}`,country:a.country||'',timezone:a.timezone||'UTC',photoUrl:a.photoUrl,videoUrl:a.videoUrl,teachingLanguages:a.teachingLanguages||[],spokenLanguages:a.spokenLanguages||[],specialties:a.specialties||[],headline:a.headline||'',about:a.about||'',experience:a.experience||'',requestedRate:a.requestedRate||''}));return json(res,200,{teachers})}
 if(pathname==='/api/teacher-availability'&&req.method==='GET'){
   const u=new URL(req.url,`http://${req.headers.host||'localhost'}`),teacher=String(u.searchParams.get('teacher')||'').trim();const data=availableDays(teacher,60);if(!data)return json(res,404,{error:'Teacher not found.'});return json(res,200,data)
 }
 if(pathname==='/api/teacher/portal'&&req.method==='POST'){
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const teacher=String(body.teacher||'').trim(),pin=String(body.pin||'');if(!validPortalPin(pin))return json(res,403,{error:'Incorrect teacher portal PIN.'});const db=loadTeachers(),t=ensureTeacher(db,teacher);if(!t)return json(res,404,{error:'Teacher not found.'});
   if(body.action==='dashboard'){const open=Object.values(t.availability||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);return json(res,200,{teacher,timezone:t.timezone,availability:t.availability,bookings:(t.bookings||[]).slice().sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),openSlotCount:open})}
   if(body.action==='availability'){const av={};for(let i=0;i<7;i++){const vals=Array.isArray(body.availability?.[String(i)])?body.availability[String(i)]:[];av[String(i)]=[...new Set(vals.map(String).filter(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x)))].sort()}t.availability=av;if(body.timezone){const z=String(body.timezone).slice(0,80);if(!validTimeZone(z))return json(res,400,{error:'Invalid timezone.'});t.timezone=z;}saveTeachers(db);return json(res,200,{ok:true})}
   if(body.action==='bookingStatus'){const b=(t.bookings||[]).find(x=>x.id===String(body.bookingId||''));if(!b)return json(res,404,{error:'Booking not found.'});const status=String(body.status||'');if(!['pending','confirmed','completed','cancelled'].includes(status))return json(res,400,{error:'Invalid booking status.'});b.status=status;b.updated=new Date().toISOString();saveTeachers(db);return json(res,200,{ok:true})}
   return json(res,400,{error:'Unknown teacher portal action.'})
 }
 if(pathname==='/api/my-bookings'&&req.method==='GET'){
   const au=authUser(req);if(!au)return json(res,401,{error:'Account login required.'});const db=loadTeachers(),out=[];for(const t of Object.values(db.teachers||{}))for(const b of t.bookings||[])if(b.ownerEmail===au.email||(!b.ownerEmail&&normEmail(b.email)===au.email))out.push(b);out.sort((a,b)=>String(a.created).localeCompare(String(b.created)));return json(res,200,{bookings:out})
 }
 if(pathname==='/api/booking'&&req.method==='POST'){
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const teacher=String(body.teacher||'').trim().slice(0,80),subject=String(body.subject||'').trim().slice(0,80),name=String(body.name||'').trim().slice(0,120),email=normEmail(body.email),date=String(body.date||'').trim(),time=String(body.time||'').trim(),type=String(body.type||'').trim().slice(0,120),message=String(body.message||'').trim().slice(0,2000);
   if(!teacher||!subject||!name||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Complete all booking details with a valid email.'});
   const db=loadTeachers(),t=ensureTeacher(db,teacher);if(!t)return json(res,404,{error:'Teacher not found.'});const check=availableDays(teacher,60),day=check.days.find(x=>x.date===date);if(!day||!day.slots.includes(time))return json(res,409,{error:'That time is no longer available. Please choose another time.'});
   const owner=authUser(req);const ownerEmail=owner?.email&&owner.email===email?owner.email:'';const bookingId='BK-'+crypto.randomBytes(4).toString('hex').toUpperCase(),safe={id:bookingId,teacher,subject,name,email,date,time,type,message,ownerEmail,status:'pending',created:new Date().toISOString()};t.bookings=t.bookings||[];t.bookings.push(safe);saveTeachers(db);
   const html=`<h2>New iSpeak Confidence lesson booking</h2><p><b>Booking ID:</b> ${htmlEsc(bookingId)}</p><p><b>Teacher:</b> ${htmlEsc(teacher)}</p><p><b>Subject:</b> ${htmlEsc(subject)}</p><p><b>Student:</b> ${htmlEsc(name)}</p><p><b>Email:</b> ${htmlEsc(email)}</p><p><b>Selected time:</b> ${htmlEsc(date)} at ${htmlEsc(time)} (${htmlEsc(t.timezone||'Asia/Phnom_Penh')})</p><p><b>Lesson:</b> ${htmlEsc(type)}</p><p><b>Message:</b><br>${htmlEsc(message||'No additional message.').replace(/\n/g,'<br>')}</p>`;
   try{await smtpSendMail({to:process.env.BOOKING_TO||'ispeakconfidence@gmail.com',subject:`Booked time — ${subject} with ${teacher} — ${date} ${time}`,html})}catch(e){console.error('[booking email]',e.message||e)}
   return json(res,200,{ok:true,bookingId,status:'pending'})
 }

 if(pathname==='/api/certificate/email'&&req.method==='POST'){
   const a=authUser(req);if(!a)return json(res,401,{error:'Sign in first so iSpeak can verify course completion.'});
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const languageKey=String(body.languageKey||'').trim().toLowerCase(),courseName=String(body.courseName||'').trim();
   const validCourses={khmer:'KHMER 30-UNIT MASTERY COURSE',english:'ENGLISH 30-UNIT MASTERY COURSE',mandarin:'MANDARIN CHINESE 30-UNIT MASTERY COURSE',spanish:'SPANISH 30-UNIT MASTERY COURSE',french:'FRENCH 30-UNIT MASTERY COURSE',japanese:'JAPANESE 30-UNIT MASTERY COURSE',arabic:'ARABIC (MSA) 30-UNIT MASTERY COURSE'};
   if(!validCourses[languageKey]||courseName!==validCourses[languageKey])return json(res,400,{error:'Certificate course information is invalid.'});
   const st=a.u.state||{},completed=Array.isArray(st.studyCompleted)?st.studyCompleted:[];
   const prefix=languageKey+'-',done=new Set(completed.filter(x=>typeof x==='string'&&x.startsWith(prefix)&&/-d1-s[1-8]$/.test(x))).size;
   if(done<240)return json(res,403,{error:`Certificate is locked. Server progress shows ${done}/240 completed learning blocks.`});
   const name=String(st.name||body.name||'').trim(),email=normEmail(st.email||a.email),completionDate=String(body.completionDate||'').trim()||new Date().toISOString().slice(0,10);
   if(!name||name==='Student')return json(res,400,{error:'Add the learner name in Profile & Settings first.'});
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Add a valid learner email in Profile & Settings first.'});
   st.certificates=st.certificates&&typeof st.certificates==='object'?st.certificates:{};let cert=st.certificates[languageKey];
   if(!cert||!/^ISC-[A-Z]{2}-\d{4}-[A-F0-9]{12}$/.test(String(cert.id||''))){const code={khmer:'KH',english:'EN',mandarin:'ZH',spanish:'ES',french:'FR',japanese:'JA',arabic:'AR'}[languageKey];cert={id:`ISC-${code}-${new Date().getFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,date:completionDate,awarded:true,serverVerified:true};st.certificates[languageKey]=cert;a.u.state=publicState(st);a.u.updatedAt=new Date().toISOString();saveUsers(a.db)}
   const p={name,email,courseName,certificateId:cert.id,completionDate:cert.date||completionDate};
   try{await smtpSendMail({to:email,subject:`Your iSpeak Confidence Certificate — ${courseName}`,html:certificateEmailHTML(p)});return json(res,200,{ok:true,to:email,certificateId:cert.id,serverVerified:true})}
   catch(e){console.error(e);return json(res,503,{error:e.message||'Could not email certificate.'})}
 }

 const am=pathname.match(/^\/api\/transcribe\/(\w+)$/);if(am&&req.method==='POST'){
   const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'GEMINI_API_KEY is not configured.'});const m=mascots[am[1]]||mascots.jess;let audio;try{audio=await readBuffer(req)}catch(e){return json(res,413,{error:e.message})}if(!audio.length)return json(res,400,{error:'No audio received.'});const mime=String(req.headers['content-type']||'audio/webm').split(';')[0].trim();
   const payload={contents:[{role:'user',parts:[{text:`Transcribe the learner's speech exactly as spoken. The expected learning language is ${m.language}. Do not translate, explain or correct it. Return ONLY the transcript text, with no JSON, labels, markdown or commentary.`},{inlineData:{mimeType:mime,data:audio.toString('base64')}}]}],generationConfig:{temperature:0,maxOutputTokens:300}};
   try{const r=await geminiGenerate(key,CHAT_MODEL,payload);const data=await r.json();if(!r.ok)return json(res,r.status,{error:data?.error?.message||'Speech AI is busy right now. Please try again shortly.'});let text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';text=String(text).replace(/^```[a-z]*\s*|\s*```$/gi,'').trim();return json(res,200,{transcript:text})}catch(e){console.error(e);return json(res,500,{error:'Could not transcribe audio with Gemini.'})}
 }
 const cm=pathname.match(/^\/api\/chat\/(\w+)$/);if(cm&&req.method==='POST'){
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});
   const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'GEMINI_API_KEY is not configured.'});const m=mascots[cm[1]]||mascots.jess;
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const message=String(body.message||'').trim();if(!message)return json(res,400,{error:'Missing message.'});const history=Array.isArray(body.history)?body.history.slice(-12):[];
   const contents=[...history.map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:String(x.text||'')}]})),{role:'user',parts:[{text:message}]}];
   const plainSystem=`You are ${m.name}, the ${m.language} mascot tutor in iSpeak Confidence. You are ${m.personality}. Have a natural, intelligent conversation with the learner. Answer their meaning directly, remember recent context, ask useful follow-up questions, and gently correct important language mistakes when helpful. Keep most replies 1-4 sentences. Stay in your language identity. Return ONLY the words you want the learner to see and hear. Never output JSON, code, markdown fences, field names, or technical formatting. For Khmer, do not invent uncertain Khmer curriculum forms; use English support if unsure.`;
   const payload={systemInstruction:{parts:[{text:plainSystem}]},contents,generationConfig:{temperature:0.75,maxOutputTokens:350}};
   try{const r=await geminiGenerate(key,CHAT_MODEL,payload);const data=await r.json();if(!r.ok)return json(res,r.status,{error:data?.error?.message||'Your AI tutor is busy right now. Please try again shortly.'});let reply=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';reply=String(reply).replace(/^```[a-z]*\s*|\s*```$/gi,'').trim();if(/^\s*[\[{]/.test(reply)){reply=reply.replace(/^\s*[\[{]+/,'').replace(/[\]}]+\s*$/,'').replace(/^["']?(reply|text|message)["']?\s*:\s*/i,'').replace(/^["']|["']$/g,'').trim()}let action='idle';if(/\bjump\b|跳|salta|saute|ジャンプ|លោត/i.test(message))action='jump';else if(/\brun\b|跑|corre|cours|走って|រត់/i.test(message))action='run';else if(/\bsit\b|坐下|si[eé]ntate|assis|座って|អង្គុយ/i.test(message))action='sit';else if(/\bdance\b|跳舞|baila|danse|踊って|រាំ/i.test(message))action='dance';else if(/\bwave\b|挥手|saluda|salue|手を振って|គ្រវីដៃ/i.test(message))action='wave';return json(res,200,{reply:reply||'I’m here. Try that again.',action,correction:'',encouragement:''})}catch(e){console.error(e);return json(res,500,{error:'Could not connect to Gemini.'})}
 }
 const tm=pathname.match(/^\/api\/tts\/(\w+)$/);if(tm&&req.method==='POST'){
   if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))return json(res,415,{error:'Content-Type must be application/json.'});
   const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'GEMINI_API_KEY is not configured.'});const m=mascots[tm[1]]||mascots.jess;let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const text=String(body.text||'').trim().slice(0,900);if(!text)return json(res,400,{error:'Missing text.'});const prompt=`Character: ${m.name}, a ${m.personality} ${m.language} learning companion. Use a friendly natural pace and pronunciation. Recite exactly: ${text}`;
    try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({model:TTS_MODEL,input:prompt,response_format:{type:'audio'},generation_config:{speech_config:[{voice:m.voice}]}})});const data=await r.json();if(!r.ok)return json(res,r.status,{error:data?.error?.message||'Gemini TTS failed.'});const b64=data?.output_audio?.data;if(!b64)return json(res,502,{error:'No audio returned.'});const pcm=Buffer.from(b64,'base64'),wav=Buffer.concat([wavHeader(pcm.length),pcm]);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':wav.length,'Cache-Control':'no-store'});return res.end(wav)}catch(e){console.error(e);return json(res,500,{error:'Could not generate Gemini voice.'})}
 }
 return false;
}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml; charset=utf-8','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.json':'application/json','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 let pathname;try{pathname=decodeURIComponent(url.parse(req.url).pathname)}catch{return send(res,400,'Bad request','text/plain')}
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
 if(pathname.startsWith('/api/')){const handled=await handleAPI(req,res,pathname);if(handled!==false)return;return json(res,404,{error:'Not found'})}
 let rel=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
 if(rel.split('/').some(x=>x.startsWith('.'))||rel==='data'||rel.startsWith('data/')||rel==='node_modules'||rel.startsWith('node_modules/')||/^(server\.js|package(?:-lock)?\.json)$/i.test(rel))return send(res,404,'Not found','text/plain');
 const root=path.resolve(__dirname),file=path.resolve(root,rel),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative))return send(res,403,'Forbidden','text/plain');
 let target=file;fs.stat(target,(err,st)=>{if(err||!st.isFile()){if(path.extname(rel))return send(res,404,'Not found','text/plain');target=path.join(root,'index.html')}fs.readFile(target,(e,data)=>{if(e)return send(res,404,'Not found','text/plain');send(res,200,data,mime[path.extname(target).toLowerCase()]||'application/octet-stream')})})
});
let activePort=PORT;
function listenOn(port){
 activePort=port;
 server.listen(port,()=>{console.log(`\niSpeak Confidence V18.0.1: http://localhost:${port}`);console.log(process.env.GEMINI_API_KEY?'Gemini Smart AI: READY (key loaded)':'Gemini Smart AI: OFF — add GEMINI_API_KEY to .env');console.log(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD?'Certificate Email: READY':'Certificate Email: OFF — add SMTP_USER and SMTP_APP_PASSWORD to .env');console.log('Press Ctrl+C to stop.\n')});
}
server.on('error',e=>{if(e.code==='EADDRINUSE'&&activePort<PORT+10){console.log(`Port ${activePort} is busy — trying ${activePort+1}...`);setTimeout(()=>listenOn(activePort+1),100)}else throw e});
listenOn(PORT);
