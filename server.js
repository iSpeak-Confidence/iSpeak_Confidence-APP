const http=require('http');
const fs=require('fs');
const path=require('path');
const url=require('url');
const tls=require('tls');
const crypto=require('crypto');
const zlib=require('zlib');
function loadEnv(){const p=path.join(__dirname,'.env');if(!fs.existsSync(p))return;for(const raw of fs.readFileSync(p,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i<1)continue;const k=line.slice(0,i).trim(),v=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');if(!process.env[k])process.env[k]=v}}
loadEnv();
const PORT=Number(process.env.PORT||3000);
process.env.TZ=process.env.APP_TIMEZONE||'Asia/Phnom_Penh';

const os=require('os');
const LEGACY_DATA_DIR=path.join(__dirname,'data');
const DEFAULT_PERSISTENT_DATA_DIR=process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'iSpeakConfidence','data'):path.join(os.homedir(),'.ispeak-confidence','data');
const DATA_DIR=path.resolve(process.env.DATA_DIR||DEFAULT_PERSISTENT_DATA_DIR);
if(!fs.existsSync(DATA_DIR))fs.mkdirSync(DATA_DIR,{recursive:true});
function newestLegacyDataFile(filename){
 const candidates=[];const add=p=>{try{const st=fs.statSync(p);if(st.isFile())candidates.push({p,mtime:st.mtimeMs})}catch{}};
 add(path.join(LEGACY_DATA_DIR,filename));
 if(process.env.DATA_DIR)return candidates.sort((a,b)=>b.mtime-a.mtime)[0]?.p||'';
 const downloads=path.join(os.homedir(),'Downloads');
 const walk=(dir,depth,inISpeak=false)=>{if(depth<0)return;let rows=[];try{rows=fs.readdirSync(dir,{withFileTypes:true})}catch{return}for(const x of rows){if(x.name==='node_modules'||x.name.startsWith('.'))continue;const full=path.join(dir,x.name);if(x.isFile()&&x.name===filename)add(full);else if(x.isDirectory()&&depth>0){const next=inISpeak||/ispeak/i.test(x.name);if(next)walk(full,depth-1,next)}}};
 walk(downloads,5,false);return candidates.filter(x=>!path.resolve(x.p).startsWith(DATA_DIR+path.sep)).sort((a,b)=>b.mtime-a.mtime)[0]?.p||'';
}
function migrateLocalDataOnce(){for(const filename of ['users.json','teachers.json','teacher-applications.json','classrooms.json']){const dest=path.join(DATA_DIR,filename);if(fs.existsSync(dest))continue;const src=newestLegacyDataFile(filename);if(src){try{fs.copyFileSync(src,dest);console.log(`[iSpeak] Migrated ${filename} from ${src}`)}catch(e){console.warn(`[iSpeak] Could not migrate ${filename}: ${e.message}`)}}}}
migrateLocalDataOnce();
const USERS_FILE=path.join(DATA_DIR,'users.json');
const TEACHERS_FILE=path.join(DATA_DIR,'teachers.json');
const APPLICATIONS_FILE=path.join(DATA_DIR,'teacher-applications.json');
const CLASSROOMS_FILE=path.join(DATA_DIR,'classrooms.json');
const ANALYTICS_FILE=path.join(DATA_DIR,'analytics.json');
const POSTGRES_ENABLED=Boolean(process.env.DATABASE_URL);
let PG_POOL=null;
const PG_CACHE={};
const PG_WRITE_QUEUE=new Map();
const PASSWORD_RESETS=new Map();
const DEVICE_VERIFICATIONS=new Map();
const OWNER_ADMIN_TOKENS=new Map();
const CLASSROOM_RECORDING_DIR=path.join(DATA_DIR,'classroom-recordings');
const CLASSROOM_FILE_DIR=path.join(DATA_DIR,'classroom-files');
const APPLICATION_UPLOAD_DIR=path.join(DATA_DIR,'application-uploads');
if(!fs.existsSync(APPLICATION_UPLOAD_DIR))fs.mkdirSync(APPLICATION_UPLOAD_DIR,{recursive:true});
if(!fs.existsSync(CLASSROOM_FILE_DIR))fs.mkdirSync(CLASSROOM_FILE_DIR,{recursive:true});
if(!fs.existsSync(CLASSROOM_RECORDING_DIR))fs.mkdirSync(CLASSROOM_RECORDING_DIR,{recursive:true});
if(process.env.NODE_ENV==='production'&&!POSTGRES_ENABLED&&!process.env.DATA_DIR)console.error('[iSpeak] PRODUCTION WARNING: Configure DATABASE_URL (recommended) or persistent DATA_DIR before accepting real accounts/bookings.');
function readJsonSafe(file,fallback){for(const p of [file,file+'.bak']){try{const d=JSON.parse(fs.readFileSync(p,'utf8'));if(d&&typeof d==='object')return d}catch{}}return fallback}
function atomicJsonSave(file,data){const tmp=file+'.tmp',bak=file+'.bak';fs.writeFileSync(tmp,JSON.stringify(data,null,2));try{if(fs.existsSync(file))fs.copyFileSync(file,bak)}catch{}fs.renameSync(tmp,file)}
function pgState(key,fallback){return POSTGRES_ENABLED&&PG_CACHE[key]?PG_CACHE[key]:fallback}
function queuePgState(key,data){if(!POSTGRES_ENABLED||!PG_POOL)return;PG_CACHE[key]=JSON.parse(JSON.stringify(data));const prior=PG_WRITE_QUEUE.get(key)||Promise.resolve();const next=prior.catch(()=>{}).then(()=>PG_POOL.query('INSERT INTO ispeak_state(key,data,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()',[key,JSON.stringify(PG_CACHE[key])])).catch(e=>console.error('[Postgres save]',key,e.message));PG_WRITE_QUEUE.set(key,next)}
async function initializePostgres(){if(!POSTGRES_ENABLED)return;let Pool;try{({Pool}=require('pg'))}catch{throw new Error('DATABASE_URL is set but package pg is missing. Run npm install before starting production.')}PG_POOL=new Pool({connectionString:process.env.DATABASE_URL,ssl:String(process.env.PGSSL||'true').toLowerCase()==='false'?false:{rejectUnauthorized:false},max:Number(process.env.PG_POOL_MAX||10)});await PG_POOL.query('CREATE TABLE IF NOT EXISTS ispeak_state (key TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');for(const [key,file,fallback] of [['users',USERS_FILE,{users:{}}],['teachers',TEACHERS_FILE,null],['applications',APPLICATIONS_FILE,{applications:{}}],['classrooms',CLASSROOMS_FILE,{rooms:{}}],['analytics',ANALYTICS_FILE,{events:[],counters:{}}]]){const r=await PG_POOL.query('SELECT data FROM ispeak_state WHERE key=$1',[key]);if(r.rows[0]?.data){PG_CACHE[key]=r.rows[0].data}else{const local=readJsonSafe(file,fallback);if(local){PG_CACHE[key]=local;await PG_POOL.query('INSERT INTO ispeak_state(key,data) VALUES($1,$2::jsonb) ON CONFLICT(key) DO NOTHING',[key,JSON.stringify(local)])}}}console.log('[iSpeak] PostgreSQL persistence: READY')}
function loadUsers(){const local=readJsonSafe(USERS_FILE,{users:{}}),d=pgState('users',local);return d&&d.users?d:{users:{}}}
function userDisplayNameByEmail(email,fallback='Student'){const key=normEmail(email);if(!key)return String(fallback||'Student').trim()||'Student';try{const u=loadUsers().users?.[key],name=String(u?.state?.name||u?.displayName||'').trim();if(name&&name.toLowerCase()!=='student')return name.slice(0,120)}catch{}const fb=String(fallback||'Student').trim();return fb&&fb.toLowerCase()!=='student'?fb.slice(0,120):'Student'}
function saveUsers(db){atomicJsonSave(USERS_FILE,db);queuePgState('users',db)}

const TEACHER_NAMES=['Nathan','Ounnoun','Jessica','An Sievly'];
const STUDENT_LESSON_PRICE=13;
const MIN_TEACHER_RATE=STUDENT_LESSON_PRICE;
const ISPEAK_MANUAL_PAYMENT_LINK=String(process.env.ISPEAK_MANUAL_PAYMENT_LINK||'https://checkout.revolut.com/pay/7e46147d-6776-4383-a387-5486fc197cee').trim();
const REVOLUT_API_VERSION=process.env.REVOLUT_API_VERSION||'2026-03-12';
const REVOLUT_API_BASE=String(process.env.REVOLUT_API_BASE||'https://merchant.revolut.com').replace(/\/$/,'');
function revolutConfigured(){return Boolean(process.env.REVOLUT_SECRET_API_KEY)}
const TEACHER_LESSON_PAY=8;
function validStrongPassword(password){const p=String(password||'');const letters=(p.match(/[A-Za-z]/g)||[]).length;return p.length<=128&&letters>=6&&/[A-Z]/.test(p)&&/\d/.test(p)}
function passwordPolicyText(){return 'Password must contain at least 6 letters, including 1 uppercase letter, and at least 1 number.'}
function isOwnerTeacherName(name){return ['nathan','ounnoun'].includes(String(name||'').trim().toLowerCase())}
function lessonDurationHours(type){return 50/60}
function completedTeachingHours(t){return (t.bookings||[]).filter(b=>b.status==='completed').reduce((n,b)=>n+Number(b.durationHours||lessonDurationHours(b.type)),0)}
function teacherListedRate(){return STUDENT_LESSON_PRICE}

function studentRefFor(email){return crypto.createHash('sha256').update(normEmail(email)).digest('hex').slice(0,24)}
function resolveTeacherStudentEmail(t,body){if(body.studentEmail)return normEmail(body.studentEmail);const ref=String(body.studentRef||'');if(!ref)return '';return Object.keys(t.studentMessages||{}).find(e=>studentRefFor(e)===ref)||''}
function bookingAudit(b,status,actor,detail=''){b.audit=Array.isArray(b.audit)?b.audit:[];b.audit.push({status:String(status),actor:String(actor||'system'),detail:String(detail||'').slice(0,300),at:new Date().toISOString()});return b}
function bookingQuote(teacher,t,type,email){const studentTotal=STUDENT_LESSON_PRICE,teacherEarning=TEACHER_LESSON_PAY;return {currency:'USD',basePrice:STUDENT_LESSON_PRICE,discount:0,studentTotal,teacherEarning,ispeakGross:Number((studentTotal-teacherEarning).toFixed(2)),commissionRate:null,completedTeachingHours:Number(completedTeachingHours(t).toFixed(2))}}
const DEFAULT_AVAILABILITY={'0':['17:00','18:00','19:00'],'1':['17:00','18:00','19:00'],'2':['17:00','18:00','19:00'],'3':['17:00','18:00','19:00'],'4':['17:00','18:00','19:00'],'5':['10:00','11:00','14:00','15:00'],'6':['10:00','11:00','14:00','15:00']};
function loadTeachers(){const saved=pgState('teachers',readJsonSafe(TEACHERS_FILE,null));if(saved&&saved.teachers)return saved;const d={teachers:{}};for(const n of TEACHER_NAMES)d.teachers[n]={timezone:'Asia/Phnom_Penh',availability:JSON.parse(JSON.stringify(DEFAULT_AVAILABILITY)),bookings:[]};return d}
function saveTeachers(db){atomicJsonSave(TEACHERS_FILE,db);queuePgState('teachers',db)}
function loadApplications(){const d=pgState('applications',readJsonSafe(APPLICATIONS_FILE,null));return d&&d.applications?d:{applications:{}}}
function saveApplications(db){atomicJsonSave(APPLICATIONS_FILE,db);queuePgState('applications',db)}

function teacherConductCheck(text){
 const t=String(text||'').toLowerCase().replace(/\s+/g,' ').trim();
 const channels=['telegram','whatsapp','messenger','facebook','instagram','wechat','line app','signal app','discord','skype'];
 const contact=channels.find(x=>t.includes(x));
 const privateLesson=/(lesson|class|teach|tutor|pay|payment|book|booking).{0,45}(private|outside|off[- ]?platform|direct|separately)|(?:private|outside|off[- ]?platform|direct).{0,45}(lesson|class|teach|tutor|pay|payment|book|booking)/i.test(t);
 const sharing=/(my|add me|message me|contact me|find me|dm me|send me|reach me|username|user name|number|phone|handle)/i.test(t);
 const bypass=/(don't book|do not book|cancel.{0,25}ispeak|cheaper.{0,25}(direct|private)|pay me|send.{0,20}money|without ispeak|outside ispeak)/i.test(t);
 if((contact&&sharing)||privateLesson||bypass)return {flagged:true,reason:contact?`Possible off-platform contact sharing (${contact})`:privateLesson?'Possible request for a private/off-platform lesson':'Possible attempt to bypass iSpeak booking/payment'};
 return {flagged:false};
}
function applyTeacherConductStrike(teacherName,reason,evidence,source='chat'){
 const adb=loadApplications(),a=Object.values(adb.applications||{}).find(x=>x.status==='approved'&&(x.publicName||`${x.firstName||''} ${x.lastName||''}`.trim())===teacherName);
 if(!a)return {level:0,action:'logged'};
 a.conduct=a.conduct||{strikes:0,events:[]};a.conduct.strikes=Number(a.conduct.strikes||0)+1;const n=a.conduct.strikes,now=new Date().toISOString();
 const action=n===1?'warning':n===2?'suspended':'terminated';a.conduct.events.push({at:now,source,reason,evidence:String(evidence||'').slice(0,500),action});a.conduct.events=a.conduct.events.slice(-100);a.updatedAt=now;
 const tdb=loadTeachers(),t=ensureTeacher(tdb,teacherName);
 if(n>=2&&t){t.active=false;t.suspensionReason=n>=3?'Terminated after third conduct strike.':'Suspended after second conduct strike.';saveTeachers(tdb)}
 if(n>=3)a.status='terminated';saveApplications(adb);return {level:n,action,reason};
}

function loadClassrooms(){const d=pgState('classrooms',readJsonSafe(CLASSROOMS_FILE,null));return d&&d.rooms?d:{rooms:{}}}
function saveClassrooms(db){atomicJsonSave(CLASSROOMS_FILE,db);queuePgState('classrooms',db)}
function findBooking(bookingId){const db=loadTeachers();for(const [teacher,t] of Object.entries(db.teachers||{})){const booking=(t.bookings||[]).find(b=>b.id===bookingId);if(booking)return {db,teacher,t,booking}}return null}
function ensureRoomRecord(roomId,teacher,studentEmail,bookingId=roomId){const cdb=loadClassrooms();let room=cdb.rooms[roomId];if(!room){room=cdb.rooms[roomId]={bookingId,roomId,teacher,studentEmail:normEmail(studentEmail),createdAt:new Date().toISOString(),messages:[],canvas:'',canvasUpdatedAt:null,whiteboard:{strokes:[]},whiteboardUpdatedAt:null,signals:[],signalSeq:0,presence:{},attendance:{teacher:{},student:{}},consent:{teacher:false,student:false},recordings:[],files:[],review:null};saveClassrooms(cdb)}return {cdb,room}}
function ensureClassroom(bookingId){const found=findBooking(bookingId);if(!found)return null;const base=ensureRoomRecord(bookingId,found.teacher,found.booking.email,bookingId);return {...base,...found}}
function privatePracticeRoomId(kind,key){return `PRACTICE-${kind}-`+crypto.createHash('sha256').update(String(key||'')).digest('hex').slice(0,24).toUpperCase()}
function zonedLessonStartMs(date,time,timezone){
 const tz=validTimeZone(timezone)?timezone:'Asia/Phnom_Penh';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))||!/^\d{2}:\d{2}/.test(String(time||'')))return NaN;
 const [y,m,d]=String(date).split('-').map(Number),[hh,mm]=String(time).slice(0,5).split(':').map(Number);let guess=Date.UTC(y,m-1,d,hh,mm,0);
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));const seen=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second||0),want=Date.UTC(y,m-1,d,hh,mm,0);guess+=want-seen}
 return guess;
}
function classroomJoinWindow(access){
 if(!access||access.practice||access.role==='admin')return {ok:true};
 const b=access.booking||{},tz=access.t?.timezone||'Asia/Phnom_Penh',start=zonedLessonStartMs(b.date,b.time,tz);if(!Number.isFinite(start))return {ok:false,error:'This lesson does not have a valid scheduled start time.'};
 const early=access.role==='teacher'?15:10,opens=start-early*60000,closes=start+60*60000,now=Date.now();
 if(now<opens)return {ok:false,error:`${access.role==='teacher'?'Teachers':'Students'} can enter this classroom only ${early} minutes before the lesson starts.`,opensAt:new Date(opens).toISOString()};
 if(now>closes)return {ok:false,error:'This classroom entry window has closed for this lesson.'};
 return {ok:true,opensAt:new Date(opens).toISOString(),lessonStartsAt:new Date(start).toISOString()};
}
function bookingClassroomMeta(b,timezone){const start=zonedLessonStartMs(b?.date,b?.time,validTimeZone(timezone)?timezone:'Asia/Phnom_Penh');if(!Number.isFinite(start))return {};return {lessonStartsAt:new Date(start).toISOString(),teacherClassroomOpensAt:new Date(start-15*60000).toISOString(),studentClassroomOpensAt:new Date(start-10*60000).toISOString()}}
function classroomAccess(req,bookingId){
 const adminPin=String(req.headers['x-admin-pin']||'');
 const teacherAuth=authApplicant(req),userAuth=authUser(req);
 if(bookingId==='TEST-TEACHER'&&teacherAuth&&teacherAuth.a.status==='approved'){
   const teacher=String(teacherAuth.a.publicName||`${teacherAuth.a.firstName||''} ${teacherAuth.a.lastName||''}`).trim(),roomId=privatePracticeRoomId('T',teacherAuth.a.id),base=ensureRoomRecord(roomId,teacher,'',roomId),booking={id:roomId,teacherApplicationId:teacherAuth.a.id,teacher,name:'Practice room',email:'',subject:'Teacher test classroom',date:'Anytime',time:'',status:'practice'};
   return {...base,teacher,t:{applicationId:teacherAuth.a.id,bookings:[]},booking,role:'teacher',teacherAuth,practice:true};
 }
 if(bookingId==='TEST-STUDENT'&&userAuth){
   const name=String(userAuth.u?.state?.name||'Student').trim().slice(0,80)||'Student',roomId=privatePracticeRoomId('S',userAuth.email),base=ensureRoomRecord(roomId,'iSpeak Practice Room',userAuth.email,roomId),booking={id:roomId,teacher:'iSpeak Practice Room',name,email:userAuth.email,subject:'Student test classroom',date:'Anytime',time:'',status:'practice'};
   return {...base,teacher:'iSpeak Practice Room',t:{bookings:[]},booking,role:'student',userAuth,practice:true};
 }
 const data=ensureClassroom(bookingId);if(!data)return null;
 if(validAdminPin(adminPin))return {...data,role:'admin'};
 if(data.booking.status==='payment_pending'||data.booking.paymentStatus==='pending_verification')return null;
 if(teacherAuth&&teacherAuth.a.status==='approved'){const n=String(teacherAuth.a.publicName||`${teacherAuth.a.firstName||''} ${teacherAuth.a.lastName||''}`).trim(),boundId=String(data.booking.teacherApplicationId||data.t.applicationId||'');if((boundId&&boundId===teacherAuth.a.id)||(!boundId&&n===data.teacher))return {...data,role:'teacher',teacherAuth}}
 if(userAuth){const boundStudent=normEmail(data.booking.ownerEmail||data.booking.email);if(boundStudent&&userAuth.email===boundStudent)return {...data,role:'student',userAuth}}
 return null
}
function roomPresence(room){const now=Date.now(),out={};for(const role of ['teacher','student','admin']){const p=room.presence?.[role];out[role]=Boolean(p&&p.lastSeen&&now-Date.parse(p.lastSeen)<12000)}return out}
function recordingReady(room){return Boolean(room.consent?.teacher&&room.consent?.student)}
function safeReview(r){if(!r||r.hidden)return null;return {rating:Number(r.rating||0),comment:String(r.comment||''),studentName:String(r.studentName||'Student'),createdAt:r.createdAt,bookingId:r.bookingId}}
function teacherReviewSummary(name){const cdb=loadClassrooms(),rows=Object.values(cdb.rooms||{}).filter(r=>r.teacher===name&&r.review&&!r.review.hidden).map(r=>safeReview(r.review)).filter(Boolean);const average=rows.length?rows.reduce((n,r)=>n+r.rating,0)/rows.length:0;return {average:Number(average.toFixed(2)),count:rows.length,reviews:rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,20)}}
function applicationPublic(a){if(!a)return null;const {passwordHash,tokenHash,...safe}=a;return safe}
function appToken(req){return String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim()}
function authApplicant(req){const token=appToken(req);if(!token)return null;const db=loadApplications();const th=crypto.createHash('sha256').update(token).digest('hex');for(const [id,a] of Object.entries(db.applications)){if(a.tokenHash===th&&(!a.tokenIssuedAt||Date.now()-Date.parse(a.tokenIssuedAt)<30*24*60*60*1000))return {id,a,db,token}}return null}
function validAdminPin(pin){const token=String(pin||'');const exp=OWNER_ADMIN_TOKENS.get(token);if(exp){if(exp>Date.now())return true;OWNER_ADMIN_TOKENS.delete(token)}const configured=process.env.ADMIN_PORTAL_PIN;if(process.env.NODE_ENV==='production'&&!configured)return false;const expected=String(configured||'1357');const a=Buffer.from(token),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function cleanFilename(x){return String(x||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)}
function zipEntryBuffer(buf,target){
 if(!Buffer.isBuffer(buf)||buf.length<30)return null;
 for(let i=0;i<=buf.length-46;){
   if(buf.readUInt32LE(i)!==0x02014b50){i++;continue}
   const flags=buf.readUInt16LE(i+8),method=buf.readUInt16LE(i+10),compressed=buf.readUInt32LE(i+20),uncompressed=buf.readUInt32LE(i+24),nameLen=buf.readUInt16LE(i+28),extraLen=buf.readUInt16LE(i+30),commentLen=buf.readUInt16LE(i+32),localOffset=buf.readUInt32LE(i+42);
   const next=i+46+nameLen+extraLen+commentLen;if(next>buf.length)return null;const name=buf.subarray(i+46,i+46+nameLen).toString('utf8');
   if(name===target){if(flags&1||compressed>12_000_000||uncompressed>6_000_000||localOffset+30>buf.length||buf.readUInt32LE(localOffset)!==0x04034b50)return null;const ln=buf.readUInt16LE(localOffset+26),le=buf.readUInt16LE(localOffset+28),start=localOffset+30+ln+le,end=start+compressed;if(end>buf.length)return null;const data=buf.subarray(start,end);try{return method===0?Buffer.from(data):method===8?zlib.inflateRawSync(data,{maxOutputLength:6_000_000}):null}catch{return null}}
   i=next;
 }
 return null
}
function validDocx(buf){return Boolean(zipEntryBuffer(buf,'[Content_Types].xml')&&zipEntryBuffer(buf,'word/document.xml'))}
function docxPreviewText(buf){const xml=zipEntryBuffer(buf,'word/document.xml');if(!xml)return '';return xml.toString('utf8').replace(/<w:tab\s*\/>/gi,'\t').replace(/<\/w:p>/gi,'\n').replace(/<w:br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,120000)}
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
function applicationRequiredChecks(a){return [
 Boolean(String(a.firstName||'').trim()),Boolean(String(a.lastName||'').trim()),Boolean(String(a.publicName||'').trim()),Boolean(String(a.country||'').trim()),Boolean(String(a.phone||'').trim()),validTimeZone(String(a.timezone||'')),(a.teachingLanguages||[]).length>0,(a.spokenLanguages||[]).length>0,String(a.headline||'').trim().length>=25,String(a.about||'').trim().length>=160,String(a.experience||'').trim().length>=100,String(a.education||'').trim().length>=20,(a.specialties||[]).length>0,(a.certificates||[]).length>0,Boolean(a.photoUrl),Boolean(a.videoUrl),Boolean(a.availability&&Object.values(a.availability).some(v=>Array.isArray(v)&&v.length)),Number(a.requestedRate)>=MIN_TEACHER_RATE,(a.ageGroup==='15-17'||a.ageGroup==='18+'),(a.ageGroup!=='15-17'||Boolean(a.guardianConsent)),Boolean(a.equipmentConfirmed),Boolean(a.internetConfirmed),Boolean(a.agreementAccepted)
]}
function applicationScore(a){const checks=applicationRequiredChecks(a);return Math.round(checks.filter(Boolean).length/checks.length*100)}
function ensureTeacher(db,name){const apps=loadApplications();const approved=Object.values(apps.applications||{}).some(a=>a.status==='approved'&&a.publicName===name);if(!TEACHER_NAMES.includes(name)&&!approved)return null;if(!db.teachers[name])db.teachers[name]={timezone:'Asia/Phnom_Penh',availability:JSON.parse(JSON.stringify(DEFAULT_AVAILABILITY)),bookings:[]};return db.teachers[name]}
function dateKey(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function validTimeZone(tz){try{new Intl.DateTimeFormat('en',{timeZone:tz}).format();return true}catch{return false}}
function zoneNowParts(tz){const o={};for(const x of new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()))if(x.type!=='literal')o[x.type]=Number(x.value);return o}
function availableDays(name,count=60){const db=loadTeachers(),t=ensureTeacher(db,name);if(!t)return null;const lessonRate=teacherListedRate(name,t),timezone=validTimeZone(t.timezone)?t.timezone:'Asia/Phnom_Penh',now=zoneNowParts(timezone),base=new Date(Date.UTC(now.year,now.month-1,now.day)),out=[];for(let i=0;i<count;i++){const d=new Date(base.getTime()+i*86400000),key=dateKey(d),weekday=(d.getUTCDay()+6)%7;let slots=[...(t.availability[String(weekday)]||[])];slots=slots.filter(time=>!t.bookings.some(b=>{if(b.status==='payment_pending'&&b.holdExpiresAt&&Date.parse(b.holdExpiresAt)<Date.now()){b.status='expired';return false}return b.date===key&&b.time===time&&!['cancelled','expired','payment_failed','payment_cancelled'].includes(b.status)}));if(i===0){const cur=now.hour*60+now.minute+60;slots=slots.filter(x=>{const [h,m]=x.split(':').map(Number);return h*60+m>=cur})}out.push({date:key,slots})}return {teacher:name,timezone,lessonRate,rateReady:lessonRate!=null,days:out}}
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
 const allowed=['language','xp','streak','completed','attempts','correct','dailyGoal','lastDay','activity','name','bookings','mascot','voice','roomMode','coins','mood','energy','ownedAccessories','accessory','placement','studyCompleted','studyMinutes','email','certificates','unitMastery','placementDetail','uiLanguage','onboardingDone','learningPlan','quests','missionProgress','pronunciationHistory','writingMastery','khmerNativeSeen','libraryNotes','skillEvidence','errorHistory','learnerModel','translationFallbacks','heroReadingProgress','ieltsProgress','schemaVersion','country','timezone'];
 const out={};for(const k of allowed)if(k in raw)out[k]=raw[k];
 return out;
}
const CHAT_MODEL=process.env.GEMINI_CHAT_MODEL||'gemini-3.6-flash';
const CONDUCT_MODEL=process.env.GEMINI_CONDUCT_MODEL||CHAT_MODEL;
const AI_CONDUCT_ENABLED=String(process.env.AI_CONDUCT_MONITORING||'true').toLowerCase()!=='false';
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
 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://storage.googleapis.com https://storage.googleapis.com/tfjs-models/; worker-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
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
   pathname.startsWith('/api/teacher-application')?['teacherapplication',60,3600000]:
   pathname==='/api/admin/applications'?['adminapplications',80,3600000]:
   pathname==='/api/admin/classrooms'?['adminclassrooms',180,3600000]:
   pathname.startsWith('/api/classroom-recording/')?['classroomrecording',150,3600000]:
   pathname.startsWith('/api/classroom/')?['classroom',6500,3600000]:
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

async function aiTeacherConductCheck(text,context='teacher_message'){
 const fallback=teacherConductCheck(text),key=process.env.GEMINI_API_KEY;
 if(!AI_CONDUCT_ENABLED||!key)return {...fallback,ai:false,method:fallback.flagged?'rules':'none',confidence:fallback.flagged?'high':'low'};
 const prompt=`You are the safeguarding and marketplace-integrity classifier for iSpeak Confidence, an online tutoring platform. Analyze ONLY whether the TEACHER text below tries to move the student off-platform, exchange private contact/social-media details for private communication, request payment outside iSpeak, or arrange a private lesson outside iSpeak.

Do NOT flag harmless lesson discussion about Facebook, Telegram, WhatsApp, social media, phone numbers, payments, or examples used as teaching content. Do NOT flag a teacher telling the student to keep communication/payments on iSpeak. Context: ${context}.

Return JSON only: {"violation":true|false,"category":"off_platform_contact|off_platform_lesson|payment_bypass|none","confidence":"high|medium|low","reason":"short reason"}.

Teacher text: ${JSON.stringify(String(text||'').slice(0,3000))}`;
 try{
  const r=await geminiGenerate(key,CONDUCT_MODEL,{contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0,maxOutputTokens:180,responseMimeType:'application/json'}}),data=await r.json();
  if(!r.ok)throw new Error(data?.error?.message||'AI conduct check failed');
  const raw=data?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'',a=parseGeminiJSON(raw,{}),confidence=['high','medium','low'].includes(a.confidence)?a.confidence:'low';
  const aiFlag=Boolean(a.violation)&&confidence!=='low';
  return {flagged:aiFlag,reason:String(a.reason||fallback.reason||'Possible teacher conduct violation').slice(0,300),category:['off_platform_contact','off_platform_lesson','payment_bypass'].includes(a.category)?a.category:(fallback.flagged?'off_platform_contact':'none'),confidence,ai:true,method:'gemini',fallbackFlagged:Boolean(fallback.flagged)};
 }catch(e){console.warn('[conduct AI fallback]',e.message||e);return {...fallback,ai:false,method:fallback.flagged?'rules-fallback':'none',confidence:fallback.flagged?'high':'low'};}
}
function recentAudioConductDuplicate(room,category){const cutoff=Date.now()-15*60*1000;return (room.aiMonitoring?.events||[]).some(e=>e.source==='classroom_audio_ai'&&e.category===category&&Date.parse(e.at||0)>cutoff&&e.strikeApplied)}
async function analyzeClassroomRecordingConduct(buf,mimeType,access,rec){
 const key=process.env.GEMINI_API_KEY;if(!AI_CONDUCT_ENABLED||!key||!buf?.length||buf.length>12_000_000)return null;
 const prompt=`You are monitoring a disclosed iSpeak Confidence tutoring lesson for safeguarding and off-platform solicitation. Analyze the audio/video segment. Focus ONLY on statements made by the TEACHER. A violation means the teacher asks the student to contact them privately on Telegram, Messenger, Facebook, WhatsApp, Instagram, WeChat, LINE, Signal, Discord, Skype or similar; shares personal contact details for off-platform communication; asks to move the lesson outside iSpeak; or asks for direct/off-platform payment. Harmless lesson examples or discussion of these services are NOT violations. If you cannot reliably distinguish the teacher from the student, set teacherIdentified=false and violation=false. Return JSON only: {"teacherIdentified":true|false,"violation":true|false,"category":"off_platform_contact|off_platform_lesson|payment_bypass|none","confidence":"high|medium|low","evidence":"brief paraphrase, not a long quote","transcriptSummary":"brief relevant summary"}.`;
 try{
  const r=await geminiGenerate(key,CONDUCT_MODEL,{contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data:buf.toString('base64')}}]}],generationConfig:{temperature:0,maxOutputTokens:280,responseMimeType:'application/json'}}),data=await r.json();
  if(!r.ok)throw new Error(data?.error?.message||'AI classroom monitor failed');
  const raw=data?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'',a=parseGeminiJSON(raw,{}),confidence=['high','medium','low'].includes(a.confidence)?a.confidence:'low',category=['off_platform_contact','off_platform_lesson','payment_bypass'].includes(a.category)?a.category:'none';
  access.room.aiMonitoring=access.room.aiMonitoring||{events:[]};const event={at:new Date().toISOString(),source:'classroom_audio_ai',segment:rec.file,teacherIdentified:Boolean(a.teacherIdentified),violation:Boolean(a.violation),category,confidence,evidence:String(a.evidence||'').slice(0,300),transcriptSummary:String(a.transcriptSummary||'').slice(0,600),strikeApplied:false};
  if(event.teacherIdentified&&event.violation&&event.confidence==='high'&&category!=='none'&&!recentAudioConductDuplicate(access.room,category)){const c=applyTeacherConductStrike(access.teacher,`AI-detected ${category.replace(/_/g,' ')}`,event.evidence||event.transcriptSummary,'classroom_audio_ai');event.strikeApplied=true;event.conduct=c}
  access.room.aiMonitoring.events.push(event);access.room.aiMonitoring.events=access.room.aiMonitoring.events.slice(-200);saveClassrooms(access.cdb);return event;
 }catch(e){console.warn('[classroom AI monitor]',e.message||e);return null;}
}
function wavHeader(dataLength,sampleRate=24000,channels=1,bits=16){const b=Buffer.alloc(44);b.write('RIFF',0);b.writeUInt32LE(36+dataLength,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*channels*bits/8,28);b.writeUInt16LE(channels*bits/8,32);b.writeUInt16LE(bits,34);b.write('data',36);b.writeUInt32LE(dataLength,40);return b}

function htmlEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function certificateEmailHTML(p){
 const C={
  english:{certificate:'CERTIFICATE',completion:'OF COMPLETION',certify:'THIS IS TO CERTIFY THAT',completed:'HAS SUCCESSFULLY COMPLETED THE',copy:'Awarded for completing all 240 progressive learning blocks in the 30-unit iSpeak Confidence mastery pathway, covering speaking, listening, reading, writing, vocabulary, grammar and conversation.',blocks:'Learning Blocks',units:'Units',course:'Course Completion',date:'COMPLETION DATE',id:'CERTIFICATE ID'},
  spanish:{certificate:'CERTIFICADO',completion:'DE FINALIZACIÓN',certify:'SE CERTIFICA QUE',completed:'HA COMPLETADO SATISFACTORIAMENTE EL',copy:'Otorgado por completar los 240 bloques de aprendizaje progresivos del programa de dominio de iSpeak Confidence de 30 unidades, que abarca expresión oral, comprensión auditiva, lectura, escritura, vocabulario, gramática y conversación.',blocks:'Bloques de aprendizaje',units:'Unidades',course:'Curso completado',date:'FECHA DE FINALIZACIÓN',id:'ID DEL CERTIFICADO'},
  french:{certificate:'CERTIFICAT',completion:'DE RÉUSSITE',certify:'NOUS CERTIFIONS QUE',completed:'A TERMINÉ AVEC SUCCÈS LE',copy:'Décerné pour avoir terminé les 240 blocs d’apprentissage progressifs du parcours de maîtrise iSpeak Confidence en 30 unités, couvrant l’expression orale, la compréhension orale, la lecture, l’écriture, le vocabulaire, la grammaire et la conversation.',blocks:'Blocs d’apprentissage',units:'Unités',course:'Cours terminé',date:'DATE DE RÉUSSITE',id:'ID DU CERTIFICAT'},
  mandarin:{certificate:'结业证书',completion:'课程完成证明',certify:'兹证明',completed:'已成功完成',copy:'此证书授予完成 iSpeak Confidence 30 单元精通课程全部 240 个渐进学习模块的学习者，课程涵盖口语、听力、阅读、写作、词汇、语法和会话。',blocks:'学习模块',units:'单元',course:'课程完成度',date:'完成日期',id:'证书编号'},
  japanese:{certificate:'修了証',completion:'コース修了証明',certify:'ここに次の者が',completed:'以下のコースを修了したことを証明します',copy:'iSpeak Confidence の30ユニット習熟コースに含まれる240の学習ブロックをすべて修了し、スピーキング、リスニング、リーディング、ライティング、語彙、文法、会話を学習したことを認定します。',blocks:'学習ブロック',units:'ユニット',course:'コース修了',date:'修了日',id:'証明書ID'},
  khmer:{certificate:'វិញ្ញាបនបត្រ',completion:'បញ្ជាក់ការបញ្ចប់វគ្គសិក្សា',certify:'សូមបញ្ជាក់ថា',completed:'បានបញ្ចប់ដោយជោគជ័យនូវ',copy:'ផ្តល់ជូនសម្រាប់ការបញ្ចប់ប្លុកសិក្សារីកចម្រើនទាំង 240 ក្នុងកម្មវិធីស្ទាត់ជំនាញ iSpeak Confidence 30 ឯកតា ដែលគ្របដណ្តប់ការនិយាយ ការស្តាប់ ការអាន ការសរសេរ វាក្យសព្ទ វេយ្យាករណ៍ និងការសន្ទនា។',blocks:'ប្លុកសិក្សា',units:'ឯកតា',course:'បញ្ចប់វគ្គសិក្សា',date:'កាលបរិច្ឆេទបញ្ចប់',id:'លេខវិញ្ញាបនបត្រ'},
  arabic:{certificate:'شهادة',completion:'إتمام الدورة',certify:'نشهد بموجب هذه الشهادة أن',completed:'قد أتم بنجاح',copy:'تُمنح هذه الشهادة لإكمال جميع وحدات التعلم التدريجية البالغ عددها 240 ضمن مسار iSpeak Confidence للإتقان المكوّن من 30 وحدة، والذي يشمل التحدث والاستماع والقراءة والكتابة والمفردات والقواعد والمحادثة.',blocks:'وحدات التعلم',units:'وحدات',course:'إتمام الدورة',date:'تاريخ الإتمام',id:'معرّف الشهادة'}
 };
 const c=C[p.uiLanguage]||C.english,courseName=p.displayCourseName||p.courseName,rtl=p.uiLanguage==='arabic';
 return `<!doctype html><html dir="${rtl?'rtl':'ltr'}"><body style="margin:0;padding:28px;background:#06111e;font-family:Arial,sans-serif;color:#10233d">
 <div style="max-width:900px;margin:auto;background:#fdfbf5;border:10px solid #0b2848;outline:2px solid #caa44b;padding:44px;box-sizing:border-box;text-align:center">
 <div style="font-weight:800;color:#0d9fa0;letter-spacing:.12em">iSPEAK CONFIDENCE</div>
 <div style="font:700 52px Georgia,serif;letter-spacing:.08em;margin-top:20px">${htmlEsc(c.certificate)}</div>
 <div style="font:600 23px Georgia,serif;color:#b18737;letter-spacing:.08em">${htmlEsc(c.completion)}</div>
 <div style="height:1px;background:#c9a34a;margin:25px auto;width:72%"></div>
 <div style="font-size:12px;letter-spacing:.12em">${htmlEsc(c.certify)}</div>
 <div style="font:italic 48px Georgia,serif;color:#102b52;margin:18px 0">${htmlEsc(p.name)}</div>
 <div style="font-size:12px;letter-spacing:.1em">${htmlEsc(c.completed)}</div>
 <div style="font-weight:900;font-size:23px;color:#087f89;margin:14px">${htmlEsc(courseName)}</div>
 <p style="line-height:1.6;max-width:680px;margin:18px auto">${htmlEsc(c.copy)}</p>
 <table role="presentation" style="margin:30px auto;border-collapse:collapse"><tr><td style="padding:10px 30px;border-right:1px solid #d1c398"><b style="font-size:25px">240</b><br><small>${htmlEsc(c.blocks)}</small></td><td style="padding:10px 30px;border-right:1px solid #d1c398"><b style="font-size:25px">30</b><br><small>${htmlEsc(c.units)}</small></td><td style="padding:10px 30px"><b style="font-size:25px">100%</b><br><small>${htmlEsc(c.course)}</small></td></tr></table>
 <div style="display:flex;justify-content:space-between;text-align:${rtl?'right':'left'};margin-top:35px;font-size:13px"><div><small>${htmlEsc(c.date)}</small><br><b>${htmlEsc(p.completionDate)}</b></div><div style="text-align:${rtl?'left':'right'}"><small>${htmlEsc(c.id)}</small><br><b>${htmlEsc(p.certificateId)}</b></div></div>
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

function loadAnalytics(){const d=pgState('analytics',readJsonSafe(ANALYTICS_FILE,{events:[],counters:{}}));return d&&Array.isArray(d.events)?d:{events:[],counters:{}}}
function saveAnalytics(db){db.events=(db.events||[]).slice(-25000);atomicJsonSave(ANALYTICS_FILE,db);queuePgState('analytics',db)}
function analyticsLocation(req){return {country:String(req.headers['cf-ipcountry']||req.headers['x-vercel-ip-country']||'').slice(0,40),city:decodeURIComponent(String(req.headers['x-vercel-ip-city']||req.headers['cf-ipcity']||'')).slice(0,80)}}
function recordAnalytics(req,type,details={}){try{const db=loadAnalytics(),loc=analyticsLocation(req);db.events.push({at:new Date().toISOString(),type:String(type||'event').slice(0,60),session:String(details.session||'').slice(0,80),userHash:details.user?crypto.createHash('sha256').update(String(details.user)).digest('hex').slice(0,20):'',page:String(details.page||'').slice(0,80),target:String(details.target||'').slice(0,140),language:String(details.language||'').slice(0,30),uiLanguage:String(details.uiLanguage||'').slice(0,30),device:String(details.device||'').slice(0,20),source:String(details.source||'').slice(0,120),country:loc.country,city:loc.city});saveAnalytics(db)}catch(e){console.warn('[analytics]',e.message)}}
function analyticsSummary(){const users=loadUsers(),db=loadAnalytics(),events=db.events||[],now=Date.now(),day=86400000,week=7*day;const recent=ms=>events.filter(e=>now-Date.parse(e.at)<=ms),uniq=(rows,k)=>new Set(rows.map(x=>x[k]).filter(Boolean)).size,countBy=(rows,k)=>Object.entries(rows.reduce((a,x)=>{const v=x[k]||'Unknown';a[v]=(a[v]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,value])=>({name,value}));const allUsers=Object.values(users.users||{}),new24=allUsers.filter(u=>u.createdAt&&now-Date.parse(u.createdAt)<=day).length,new7=allUsers.filter(u=>u.createdAt&&now-Date.parse(u.createdAt)<=week).length,active24=uniq(recent(day),'session'),active7=uniq(recent(week),'session');return {totalUsers:allUsers.length,newUsers24h:new24,newUsers7d:new7,active24h:active24,active7d:active7,sessions7d:uniq(recent(week),'session'),events7d:recent(week).length,topPages:countBy(recent(week).filter(x=>x.type==='page_view'),'page'),topClicks:countBy(recent(week).filter(x=>x.type==='click'),'target'),languages:countBy(recent(week),'language'),uiLanguages:countBy(recent(week),'uiLanguage'),devices:countBy(recent(week),'device'),sources:countBy(recent(week),'source'),countries:countBy(recent(week),'country'),cities:countBy(recent(week),'city'),funnel:{teacherViews:recent(week).filter(x=>x.type==='teacher_view').length,teacherMessages:recent(week).filter(x=>x.type==='teacher_message_open').length,paymentLinksSent:recent(week).filter(x=>x.type==='payment_link_sent').length,bookingStarts:recent(week).filter(x=>x.type==='booking_start').length,bookingQuotes:recent(week).filter(x=>x.type==='booking_quote').length,bookings:recent(week).filter(x=>x.type==='booking_complete').length,libraryOpens:recent(week).filter(x=>x.type==='library_open').length,storyOpens:recent(week).filter(x=>x.type==='story_open').length,lessonStarts:recent(week).filter(x=>x.type==='lesson_start').length,ieltsOpens:recent(week).filter(x=>x.type==='ielts_open').length},storage:POSTGRES_ENABLED?'PostgreSQL':'Local JSON fallback'}}
async function revolutRequest(apiPath,options={}){
 if(!revolutConfigured())throw new Error('Revolut Merchant API is not configured. Add REVOLUT_SECRET_API_KEY to .env.');
 const r=await fetch(REVOLUT_API_BASE+apiPath,{...options,headers:{'Authorization':'Bearer '+process.env.REVOLUT_SECRET_API_KEY,'Revolut-Api-Version':REVOLUT_API_VERSION,'Content-Type':'application/json',...(options.headers||{})}});
 let data={};try{data=await r.json()}catch{}if(!r.ok){const e=new Error(data?.message||data?.error||`Revolut API returned ${r.status}`);e.status=r.status;throw e}return data
}
function publicBase(req){const configured=String(process.env.PUBLIC_BASE_URL||'').trim().replace(/\/$/,'');if(configured)return configured;const host=String(req.headers.host||`localhost:${PORT}`);return `${req.socket.encrypted?'https':'http'}://${host}`}
function paymentBookingByOrder(orderId){const db=loadTeachers();for(const [teacher,t] of Object.entries(db.teachers||{})){const booking=(t.bookings||[]).find(b=>b.revolutOrderId===orderId);if(booking)return {db,teacher,t,booking}}return null}
function verifyWebhookSignature(raw,timestamp,signature){const secret=String(process.env.REVOLUT_WEBHOOK_SIGNING_SECRET||'');if(!secret||!timestamp||!signature)return false;const ts=Number(timestamp);if(!Number.isFinite(ts)||Math.abs(Date.now()-ts)>300000)return false;const expected='v1='+crypto.createHmac('sha256',secret).update(`v1.${timestamp}.${raw}`).digest('hex');return String(signature).split(',').map(x=>x.trim()).some(sig=>{const a=Buffer.from(sig),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)})}
async function verifyAndFinalizeRevolut(orderId){const found=paymentBookingByOrder(orderId);if(!found)return {ok:false,error:'Payment booking not found.'};const {db,booking}=found;if(booking.status==='confirmed'&&booking.paymentStatus==='paid')return {ok:true,booking,alreadyConfirmed:true};const order=await revolutRequest('/api/orders/'+encodeURIComponent(orderId),{method:'GET'});const expectedAmount=Math.round(Number(booking.amountDue)*100),state=String(order.state||'').toLowerCase();if(String(order.id)!==String(booking.revolutOrderId))throw new Error('Revolut order ID mismatch.');if(Number(order.amount)!==expectedAmount)throw new Error('Revolut amount mismatch.');if(String(order.currency||'').toUpperCase()!==String(booking.currency||'USD').toUpperCase())throw new Error('Revolut currency mismatch.');if(state==='completed'){booking.status='confirmed';booking.paymentStatus='paid';booking.amountPaid=Number(booking.amountDue);booking.paidAt=new Date().toISOString();booking.revolutVerifiedAt=new Date().toISOString();saveTeachers(db);return {ok:true,booking,orderState:state}}if(['cancelled','failed'].includes(state)){booking.status='payment_'+state;booking.paymentStatus=state;saveTeachers(db)}return {ok:false,pending:!['cancelled','failed'].includes(state),orderState:state,booking}
}
async function handleAPI(req,res,pathname){
 if(pathname==='/api/payment/revolut/create'&&req.method==='POST') return json(res,410,{error:'Dynamic checkout is retired. Teachers send the single iSpeak $13 Revolut payment link in Messages.'});
 if(pathname==='/api/payment/revolut/status'&&req.method==='POST'){
   const owner=authUser(req);if(!owner)return json(res,401,{error:'Log in first.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const found=findBooking(String(body.bookingId||''));if(!found||normEmail(found.booking.ownerEmail||found.booking.email)!==owner.email)return json(res,404,{error:'Booking not found.'});if(!found.booking.revolutOrderId)return json(res,409,{error:'This booking has no Revolut order.'});try{const v=await verifyAndFinalizeRevolut(found.booking.revolutOrderId);return json(res,200,{ok:v.ok,pending:v.pending||false,status:v.booking.status,paymentStatus:v.booking.paymentStatus,bookingId:v.booking.id,orderState:v.orderState||'completed'})}catch(e){return json(res,502,{error:'Could not verify payment with Revolut: '+String(e.message||e)})}
 }
 if(pathname==='/api/payment/revolut/webhook'&&req.method==='POST'){
   const raw=await readBody(req,200000),ts=String(req.headers['revolut-request-timestamp']||''),sig=String(req.headers['revolut-signature']||'');if(!verifyWebhookSignature(raw,ts,sig))return json(res,401,{error:'Invalid Revolut webhook signature.'});let event;try{event=JSON.parse(raw)}catch{return json(res,400,{error:'Invalid webhook JSON.'})}if(event.event==='ORDER_COMPLETED'&&event.order_id){try{await verifyAndFinalizeRevolut(String(event.order_id))}catch(e){console.error('[Revolut webhook verification]',e.message);return json(res,502,{error:'Order verification failed.'})}}return json(res,200,{ok:true})
 }
 if(pathname==='/api/analytics/event'&&req.method==='POST'){let body;try{body=JSON.parse(await readBody(req,12000)||'{}')}catch{return json(res,400,{error:'Invalid analytics event.'})}recordAnalytics(req,body.type,body);return json(res,200,{ok:true})}

 if(pathname==='/api/admin/teacher-message-oversight'&&req.method==='POST'){
  let body;try{body=JSON.parse(await readBody(req,20000)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}
  if(!validAdminPin(String(body.pin||'')))return json(res,403,{error:'Incorrect admin PIN.'});
  const db=loadTeachers(),rows=[];
  for(const [teacher,t] of Object.entries(db.teachers||{}))for(const [studentEmail,msgs] of Object.entries(t.studentMessages||{})){
   const arr=Array.isArray(msgs)?msgs:[],last=arr.at(-1),lastStudent=[...arr].reverse().find(x=>x.from==='student'),lastTeacher=[...arr].reverse().find(x=>x.from==='teacher');
   const unanswered=Boolean(lastStudent&&(!lastTeacher||Date.parse(lastStudent.createdAt)>Date.parse(lastTeacher.createdAt)));
   rows.push({teacher,studentEmail,studentName:String(arr.find(x=>x.from==='student')?.name||studentEmail),lastMessage:last||null,unanswered,messageCount:arr.length});
  }
  rows.sort((x,y)=>String(y.lastMessage?.createdAt||'').localeCompare(String(x.lastMessage?.createdAt||'')));
  return json(res,200,{threads:rows,unanswered:rows.filter(x=>x.unanswered).length});
 }
 if(pathname==='/api/admin/analytics'&&req.method==='POST'){let body;try{body=JSON.parse(await readBody(req,20000)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}if(!validAdminPin(String(body.pin||'')))return json(res,403,{error:'Incorrect admin PIN.'});return json(res,200,analyticsSummary())}

 if(pathname!=='/api/status'&&!apiGuard(req,res,pathname))return true;
 
 if(pathname==='/api/account/register'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const email=normEmail(body.email),password=String(body.password||''),country=String(body.country||'').trim().slice(0,100),timezone=String(body.timezone||'').trim();
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json(res,400,{error:'Enter a valid email.'});
   if(!validStrongPassword(password))return json(res,400,{error:passwordPolicyText()});if(!country)return json(res,400,{error:'Choose your country of residence.'});if(!validTimeZone(timezone))return json(res,400,{error:'A valid IANA timezone is required.'});
   const db=loadUsers();if(db.users[email])return json(res,409,{error:'An account already exists for this email.'});
   const p=hashPassword(password),token=newToken();recordAnalytics(req,'signup',{user:email});db.users[email]={salt:p.salt,hash:p.hash,tokenHash:crypto.createHash('sha256').update(token).digest('hex'),tokenIssuedAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:null,country,timezone,state:{country,timezone}};saveUsers(db);
   return json(res,201,{email,token});
 }
 if(pathname==='/api/account/login'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const email=normEmail(body.email),password=String(body.password||''),deviceId=String(body.deviceId||'').trim().slice(0,180),db=loadUsers(),u=db.users[email];
   if(!u||!verifyPassword(password,u))return json(res,401,{error:'Incorrect email or password.'});
   u.trustedDevices=Array.isArray(u.trustedDevices)?u.trustedDevices:[];
   const emailReady=Boolean(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD);
   if(deviceId&&!u.trustedDevices.includes(deviceId)&&emailReady){const code=String(crypto.randomInt(100000,1000000)),key=`student:${email}:${deviceId}`;DEVICE_VERIFICATIONS.set(key,{hash:crypto.createHash('sha256').update(code).digest('hex'),expires:Date.now()+10*60*1000,tries:0});smtpSendMail({to:email,subject:'iSpeak Confidence new-device verification',html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px"><h2 style="color:#0f766e">New device sign-in</h2><p>Use this verification code to finish signing in:</p><div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#102b52">${code}</div><p>This code expires in 10 minutes.</p></div>`}).catch(e=>console.warn('[device verification email]',e.message));saveUsers(db);return json(res,200,{verificationRequired:true,email});}
   if(deviceId&&!u.trustedDevices.includes(deviceId)){u.trustedDevices.push(deviceId);u.trustedDevices=u.trustedDevices.slice(-12)}
   recordAnalytics(req,'login',{user:email});const token=newToken();u.tokenHash=crypto.createHash('sha256').update(token).digest('hex');u.lastLoginAt=new Date().toISOString();u.tokenIssuedAt=new Date().toISOString();saveUsers(db);return json(res,200,{email,token});
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

 if(pathname==='/api/device-verification/confirm'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}const kind=body.kind==='teacher'?'teacher':'student',email=normEmail(body.email),deviceId=String(body.deviceId||'').trim().slice(0,180),code=String(body.code||'').trim(),key=`${kind}:${email}:${deviceId}`,r=DEVICE_VERIFICATIONS.get(key);if(!r||r.expires<Date.now()){DEVICE_VERIFICATIONS.delete(key);return json(res,400,{error:'Verification code expired. Sign in again to request a new one.'})}r.tries++;if(r.tries>6){DEVICE_VERIFICATIONS.delete(key);return json(res,429,{error:'Too many incorrect codes. Sign in again.'})}if(crypto.createHash('sha256').update(code).digest('hex')!==r.hash)return json(res,400,{error:'Incorrect verification code.'});let token=newToken();if(kind==='student'){const db=loadUsers(),u=db.users[email];if(!u)return json(res,404,{error:'Account not found.'});u.trustedDevices=Array.isArray(u.trustedDevices)?u.trustedDevices:[];if(deviceId&&!u.trustedDevices.includes(deviceId))u.trustedDevices.push(deviceId);u.tokenHash=crypto.createHash('sha256').update(token).digest('hex');u.tokenIssuedAt=new Date().toISOString();u.lastLoginAt=u.tokenIssuedAt;saveUsers(db)}else{const db=loadApplications(),a=Object.values(db.applications).find(x=>normEmail(x.email)===email);if(!a)return json(res,404,{error:'Teacher account not found.'});a.trustedDevices=Array.isArray(a.trustedDevices)?a.trustedDevices:[];if(deviceId&&!a.trustedDevices.includes(deviceId))a.trustedDevices.push(deviceId);a.tokenHash=crypto.createHash('sha256').update(token).digest('hex');a.tokenIssuedAt=new Date().toISOString();saveApplications(db)}DEVICE_VERIFICATIONS.delete(key);return json(res,200,{ok:true,email,token});
 }
 if(pathname==='/api/password-reset/request'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}
   const kind=body.kind==='teacher'?'teacher':'student',email=normEmail(body.email);if(!email)return json(res,400,{error:'Enter your email address.'});
   let exists=false;if(kind==='student')exists=Boolean(loadUsers().users[email]);else exists=Object.values(loadApplications().applications).some(a=>normEmail(a.email)===email);
   if(exists){
     if(!process.env.SMTP_USER||!process.env.SMTP_APP_PASSWORD)return json(res,503,{error:'Password reset email is not configured on this server.'});
     const code=String(crypto.randomInt(100000,1000000)),reset={hash:crypto.createHash('sha256').update(code).digest('hex'),expires:Date.now()+10*60*1000,tries:0,createdAt:new Date().toISOString()};
     if(kind==='student'){const db=loadUsers();db.users[email].passwordReset=reset;saveUsers(db)}else{const db=loadApplications(),a=Object.values(db.applications).find(x=>normEmail(x.email)===email);a.passwordReset=reset;saveApplications(db)}
     const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px"><h2 style="color:#0f766e">iSpeak Confidence password reset</h2><p>Your verification code is:</p><div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#102b52">${code}</div><p>This code expires in 10 minutes and can only be used once.</p><p>If you did not request this, you can ignore this email.</p></div>`;
     try{await smtpSendMail({to:email,subject:'iSpeak Confidence password reset code',html})}catch(e){console.error('[password reset email]',e.message);return json(res,503,{error:'We could not send the reset email. Please try again shortly.'})}
   }
   return json(res,200,{ok:true,message:'If that account exists, a reset code has been sent.'});
 }
 if(pathname==='/api/password-reset/confirm'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}const kind=body.kind==='teacher'?'teacher':'student',email=normEmail(body.email),code=String(body.code||'').trim(),password=String(body.password||'');if(!validStrongPassword(password))return json(res,400,{error:passwordPolicyText()});let ownerDb=null,owner=null;if(kind==='student'){ownerDb=loadUsers();owner=ownerDb.users[email]}else{ownerDb=loadApplications();owner=Object.values(ownerDb.applications).find(x=>normEmail(x.email)===email)}
   const r=owner?.passwordReset;if(!r||Number(r.expires)<Date.now()){if(owner){delete owner.passwordReset;kind==='student'?saveUsers(ownerDb):saveApplications(ownerDb)}return json(res,400,{error:'Reset code expired. Request a new code.'})}
   r.tries=Number(r.tries||0)+1;if(r.tries>6){delete owner.passwordReset;kind==='student'?saveUsers(ownerDb):saveApplications(ownerDb);return json(res,429,{error:'Too many attempts. Request a new code.'})}
   if(crypto.createHash('sha256').update(code).digest('hex')!==r.hash){kind==='student'?saveUsers(ownerDb):saveApplications(ownerDb);return json(res,400,{error:'Incorrect verification code.'})}
   if(kind==='student'){const db=loadUsers(),u=db.users[email];if(!u)return json(res,400,{error:'Account no longer exists.'});const ph=hashPassword(password);u.salt=ph.salt;u.hash=ph.hash;u.tokenHash='';u.updatedAt=new Date().toISOString();delete u.passwordReset;saveUsers(db)}else{const db=loadApplications(),a=Object.values(db.applications).find(x=>normEmail(x.email)===email);if(!a)return json(res,400,{error:'Teacher account no longer exists.'});a.passwordHash=hashPassword(password);a.tokenHash='';a.mustChangePassword=false;a.updatedAt=new Date().toISOString();delete a.passwordReset;saveApplications(db)}return json(res,200,{ok:true});
 }
 if(pathname==='/api/owner-admin-token'&&req.method==='POST'){
   const au=authApplicant(req);if(!au||!isOwnerTeacherName(au.a.publicName))return json(res,403,{error:'Owner access only.'});const token='OWNER-'+crypto.randomBytes(24).toString('hex');OWNER_ADMIN_TOKENS.set(token,Date.now()+30*60*1000);return json(res,200,{ok:true,adminToken:token,expiresInMinutes:30});
 }
 if(pathname==='/api/owner-teacher-messages'&&req.method==='GET'){
   const au=authApplicant(req);if(!au||!isOwnerTeacherName(au.a.publicName))return json(res,403,{error:'Owner access only.'});const db=au.db,tdb=loadTeachers(),cdb=loadClassrooms(),teachers=Object.values(db.applications).filter(a=>a.status==='approved'&&a.id!==au.a.id).map(a=>{const name=a.publicName||`${a.firstName||''} ${a.lastName||''}`.trim()||a.email,t=ensureTeacher(tdb,name),lessonsTaught=(t?.bookings||[]).filter(b=>b.status==='completed').length;const live=Object.values(cdb.rooms||{}).find(r=>String(r.teacher||'').trim().toLowerCase()===String(name).trim().toLowerCase()&&roomPresence(r).teacher);return {id:a.id,name,email:a.email,lessonsTaught,liveBookingId:live?.bookingId||''}});return json(res,200,{teachers,messages:db.ownerTeacherMessages||[]});
 }
 if(pathname==='/api/owner-teacher-messages'&&req.method==='POST'){
   const au=authApplicant(req);if(!au||!isOwnerTeacherName(au.a.publicName))return json(res,403,{error:'Owner access only.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}const target=au.db.applications[String(body.teacherId||'')],text=String(body.text||'').trim().slice(0,3000);if(!target||target.status!=='approved'||!text)return json(res,400,{error:'Choose an approved teacher and enter a message.'});au.db.ownerTeacherMessages=au.db.ownerTeacherMessages||[];au.db.ownerTeacherMessages.push({id:'OTM-'+crypto.randomBytes(5).toString('hex'),fromId:au.a.id,toId:target.id,toName:target.publicName||target.email,text,createdAt:new Date().toISOString()});au.db.ownerTeacherMessages=au.db.ownerTeacherMessages.slice(-500);saveApplications(au.db);return json(res,200,{ok:true});
 }

 if(pathname==='/api/homework-helper'&&req.method==='POST'){
  const au=authUser(req);if(!au)return json(res,401,{error:'Student login required.'});let body;try{body=JSON.parse(await readBody(req,12_000_000)||'{}')}catch{return json(res,400,{error:'Invalid homework request.'})}
  const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'Homework AI is not configured yet.'});
  const task=String(body.task||'').trim().slice(0,10000),attempt=String(body.attempt||'').trim().slice(0,6000),grade=String(body.grade||'Not specified').slice(0,60),homeworkLanguage=String(body.homeworkLanguage||'English').slice(0,60),explanationLanguage=String(body.explanationLanguage||'English').slice(0,60);
  if(!task&&!body.imageData)return json(res,400,{error:'Type the homework question or upload a clear photo.'});
  const prompt=`You are iSpeak Confidence Homework Helper. Teach, do not simply hand over final answers. Learner grade/age level: ${grade}. Homework language: ${homeworkLanguage}. Explanation language: ${explanationLanguage}. Carefully distinguish instructions/questions from any existing student answers. If unclear, say exactly what is unclear and ask for a clearer photo/context. Explain the concept briefly, give a useful hint or worked analogous example, evaluate the student's attempt if supplied, and end with one concrete next step. Verify reasoning before responding. Homework text: ${task||'[see image]'}. Student attempt: ${attempt||'[none]'}`;
  const parts=[{text:prompt}];if(body.imageData&&/^data:image\/(png|jpeg|webp);base64,/.test(body.imageData)){const [head,data]=body.imageData.split(',');parts.push({inlineData:{mimeType:head.match(/^data:(.*?);/)[1],data}})}
  try{const r=await geminiGenerate(key,CHAT_MODEL,{contents:[{role:'user',parts}],generationConfig:{temperature:.2,maxOutputTokens:1200}}),d=await r.json();if(!r.ok)return json(res,r.status,{error:d?.error?.message||'Homework Helper is busy.'});const reply=d?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();return json(res,200,{reply})}catch(e){return json(res,500,{error:'Homework Helper could not respond.'})}
 }
 if(pathname==='/api/make-me-speak'&&req.method==='POST'){
  const au=authUser(req);if(!au)return json(res,401,{error:'Student login required.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'Speaking AI is not configured yet.'});const scenario=String(body.scenario||'Ordering food').slice(0,300),answer=String(body.answer||'').trim().slice(0,5000),lang=String(body.language||'English').slice(0,60);if(!answer)return json(res,400,{error:'Say or type your answer first.'});const prompt=`Evaluate this learner's open-ended real-life speaking response in ${lang}. Scenario: ${scenario}. Accept multiple natural answers; do not require a fixed sentence. Score meaning, grammar, vocabulary, pronunciation/confidence only when evidence exists (if text-only, mark pronunciation as not assessed). Give concise encouraging feedback, one improved natural version, and one follow-up question that keeps the conversation going. Learner response: ${answer}`;try{const r=await geminiGenerate(key,CHAT_MODEL,{contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:.2,maxOutputTokens:650}}),d=await r.json();if(!r.ok)return json(res,r.status,{error:d?.error?.message||'Speaking coach is busy.'});return json(res,200,{reply:d?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim()})}catch{return json(res,500,{error:'Speaking coach could not respond.'})}
 }
 if(pathname==='/api/why-wrong'&&req.method==='POST'){
  const au=authUser(req);if(!au)return json(res,401,{error:'Student login required.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid request.'})}const key=process.env.GEMINI_API_KEY;if(!key)return json(res,503,{error:'Explanation AI is not configured yet.'});const q=String(body.question||'').slice(0,3000),ans=String(body.answer||'').slice(0,3000),target=String(body.target||'').slice(0,3000),lang=String(body.language||'English').slice(0,60);const prompt=`Explain briefly in ${lang} why the learner's answer is wrong or less natural. Teach the grammar/usage, show one better version, then ask them to try again. Do not over-explain. Question/context: ${q}. Learner answer: ${ans}. Expected idea/example: ${target}`;try{const r=await geminiGenerate(key,CHAT_MODEL,{contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:.1,maxOutputTokens:450}}),d=await r.json();return json(res,r.ok?200:r.status,r.ok?{reply:d?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim()}:{error:d?.error?.message||'Could not explain this answer.'})}catch{return json(res,500,{error:'Could not explain this answer.'})}
 }
 if(pathname==='/api/status'&&req.method==='GET')return json(res,200,{aiConfigured:Boolean(process.env.GEMINI_API_KEY),provider:'Gemini',model:CHAT_MODEL,speechInput:'Gemini audio transcription',tts:TTS_MODEL,storage:POSTGRES_ENABLED?'PostgreSQL':'JSON fallback',nathanBetaPrice:false?STUDENT_LESSON_PRICE:null,bookingEmailConfigured:Boolean(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD),emailConfigured:Boolean(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD)});
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



 // iSpeak Classroom: authenticated lesson room, WebRTC signaling, shared workspace, reviews and quality recordings.
 const classroomRecordingMatch=pathname.match(/^\/api\/classroom-recording\/([^/]+)$/);
 if(classroomRecordingMatch&&req.method==='POST'){
   const bookingId=decodeURIComponent(classroomRecordingMatch[1]);const access=classroomAccess(req,bookingId);if(!access||access.role!=='teacher')return json(res,403,{error:'Teacher classroom login required.'});if(!recordingReady(access.room))return json(res,409,{error:'Teacher and student recording acknowledgement is required.'});let buf;try{buf=await readBuffer(req,25_000_000)}catch{return json(res,413,{error:'Recording segment is too large.'})}if(!buf.length)return json(res,400,{error:'Empty recording segment.'});const mimeType=String(req.headers['content-type']||'').split(';')[0].toLowerCase();if(!['video/webm','video/mp4'].includes(mimeType))return json(res,415,{error:'Recording must be WebM or MP4.'});if(!fileMagicOk(buf,mimeType))return json(res,400,{error:'Recording segment is not a valid supported video file.'});const session=String(req.headers['x-recording-session']||'session').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60),segment=Math.max(0,Math.min(9999,Number(req.headers['x-recording-segment'])||0)),ext=mimeType==='video/mp4'?'mp4':'webm',file=`${bookingId}-${session}-${String(segment).padStart(4,'0')}.${ext}`;fs.writeFileSync(path.join(CLASSROOM_RECORDING_DIR,file),buf);const rec={file,segment,session,mimeType,size:buf.length,createdAt:new Date().toISOString()};access.room.recordings=(access.room.recordings||[]).filter(x=>x.file!==file);access.room.recordings.push(rec);access.room.recordings.sort((a,b)=>a.segment-b.segment);saveClassrooms(access.cdb);const aiMonitor=await analyzeClassroomRecordingConduct(buf,mimeType,access,rec);return json(res,200,{ok:true,segment:rec,aiMonitor:aiMonitor?{enabled:true,violation:aiMonitor.violation,confidence:aiMonitor.confidence,strikeApplied:aiMonitor.strikeApplied}: {enabled:Boolean(process.env.GEMINI_API_KEY&&AI_CONDUCT_ENABLED)}})
 }
 const classroomReplayMatch=pathname.match(/^\/api\/classroom-replay\/([^/]+)\/([^/]+)$/);
 if(classroomReplayMatch&&req.method==='GET'){
   const bookingId=decodeURIComponent(classroomReplayMatch[1]),file=decodeURIComponent(classroomReplayMatch[2]);const access=classroomAccess(req,bookingId);if(!access||access.role!=='admin')return json(res,403,{error:'Admin access required.'});if(file!==cleanFilename(file)||!(access.room.recordings||[]).some(x=>x.file===file))return json(res,404,{error:'Recording not found.'});const fp=path.join(CLASSROOM_RECORDING_DIR,file);if(!fp.startsWith(CLASSROOM_RECORDING_DIR)||!fs.existsSync(fp))return json(res,404,{error:'Recording not found.'});const type=file.endsWith('.mp4')?'video/mp4':'video/webm';res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':type,'Cache-Control':'private, no-store','Accept-Ranges':'bytes'});return fs.createReadStream(fp).pipe(res)
 }

 const classroomFilePreviewMatch=pathname.match(/^\/api\/classroom-file-preview\/([^/]+)\/([^/]+)$/);
 if(classroomFilePreviewMatch&&req.method==='GET'){
   const bookingId=decodeURIComponent(classroomFilePreviewMatch[1]),fileId=decodeURIComponent(classroomFilePreviewMatch[2]),access=classroomAccess(req,bookingId);if(!access)return json(res,403,{error:'You do not have access to this classroom file.'});
   const meta=(access.room.files||[]).find(x=>x.id===fileId);if(!meta)return json(res,404,{error:'Shared file not found.'});const stored=cleanFilename(meta.storedName||''),fp=path.join(CLASSROOM_FILE_DIR,stored);if(!stored||!fp.startsWith(CLASSROOM_FILE_DIR)||!fs.existsSync(fp))return json(res,404,{error:'Shared file is unavailable.'});
   if(meta.mimeType==='application/pdf')return json(res,200,{kind:'pdf',url:`/api/classroom-file/${encodeURIComponent(bookingId)}/${encodeURIComponent(fileId)}`,name:meta.name});
   if(meta.mimeType==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){let text='';try{text=docxPreviewText(fs.readFileSync(fp))}catch{};return json(res,200,{kind:'docx',name:meta.name,text:text||'This Word document could not be previewed as text. Use Open / download to view the original file.'})}
   return json(res,415,{error:'Preview is not available for this file type.'})
 }

 const classroomFileMatch=pathname.match(/^\/api\/classroom-file\/([^/]+)\/([^/]+)$/);
 if(classroomFileMatch&&req.method==='GET'){
   const bookingId=decodeURIComponent(classroomFileMatch[1]),fileId=decodeURIComponent(classroomFileMatch[2]),access=classroomAccess(req,bookingId);
   if(!access)return json(res,403,{error:'You do not have access to this classroom file.'});
   const meta=(access.room.files||[]).find(x=>x.id===fileId);if(!meta)return json(res,404,{error:'Shared file not found.'});
   const stored=cleanFilename(meta.storedName||'');const fp=path.join(CLASSROOM_FILE_DIR,stored);
   if(!stored||!fp.startsWith(CLASSROOM_FILE_DIR)||!fs.existsSync(fp))return json(res,404,{error:'Shared file is unavailable.'});
   res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':meta.mimeType||'application/octet-stream','Content-Disposition':`inline; filename="${cleanFilename(meta.name||'lesson-file')}"`,'Cache-Control':'private, no-store'});
   return fs.createReadStream(fp).pipe(res)
 }

 const classroomMatch=pathname.match(/^\/api\/classroom\/([^/]+)$/);
 if(classroomMatch){
   const bookingId=decodeURIComponent(classroomMatch[1]),access=classroomAccess(req,bookingId);if(!access)return json(res,403,{error:'You do not have access to this classroom.'});const joinWindow=classroomJoinWindow(access);if(!joinWindow.ok)return json(res,403,{error:joinWindow.error,opensAt:joinWindow.opensAt||null});const room=access.room,b=access.booking;
   if(req.method==='GET')return json(res,200,{booking:{id:b.id,teacher:access.teacher,studentName:userDisplayNameByEmail(b.email,b.name),subject:b.subject||b.type||'Private lesson',date:b.date,time:b.time,status:b.status},role:access.role,presence:roomPresence(room),messages:(room.messages||[]).slice(-150),files:(room.files||[]).slice(-40),canvas:room.canvas||'',canvasUpdatedAt:room.canvasUpdatedAt||null,whiteboard:room.whiteboard||{strokes:[]},whiteboardUpdatedAt:room.whiteboardUpdatedAt||null,recordingReady:recordingReady(room),iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},...(process.env.TURN_URL?[{urls:process.env.TURN_URL,username:process.env.TURN_USERNAME||'',credential:process.env.TURN_CREDENTIAL||''}]:[])],recordingNotice:'Classes may be monitored live and recorded by iSpeak Confidence for safeguarding, service quality, disputes and teacher coaching. When Smart AI is enabled, in-platform messages and disclosed lesson recordings may also be analyzed for off-platform solicitation and serious conduct risks. Admin observers do not participate unless intervention is necessary.',review:access.role==='student'?safeReview(room.review):room.review||null,recordings:access.role==='admin'?(room.recordings||[]):[],aiMonitoringEnabled:Boolean(process.env.GEMINI_API_KEY&&AI_CONDUCT_ENABLED),aiMonitoring:access.role==='admin'?room.aiMonitoring||{events:[]}:undefined});
   if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});let body;try{body=JSON.parse(await readBody(req,18_000_000)||'{}')}catch{return json(res,400,{error:'Invalid classroom request.'})}const action=String(body.action||'');const now=new Date().toISOString();room.presence=room.presence||{};room.attendance=room.attendance||{};room.consent=room.consent||{};
   if(action==='join'){if(access.role!=='admin'&&body.consent!==true)return json(res,400,{error:'Acknowledge the classroom monitoring and recording notice before joining.'});if(access.role!=='admin'){room.presence[access.role]={lastSeen:now,joinedAt:room.presence[access.role]?.joinedAt||now};room.consent[access.role]=true;const at=room.attendance[access.role]||(room.attendance[access.role]={});if(!at.firstJoinedAt)at.firstJoinedAt=now;at.lastJoinedAt=now;at.joinCount=Number(at.joinCount||0)+1}saveClassrooms(access.cdb);return json(res,200,{ok:true,role:access.role,presence:roomPresence(room),recordingReady:recordingReady(room)})}
   if(action==='heartbeat'){room.presence[access.role]={...(room.presence[access.role]||{}),lastSeen:now};saveClassrooms(access.cdb);return json(res,200,{ok:true,presence:roomPresence(room),recordingReady:recordingReady(room)})}
   if(action==='leave'){const p=room.presence[access.role]||(room.presence[access.role]={});p.lastSeen='1970-01-01T00:00:00.000Z';p.leftAt=now;if(access.role!=='admin'){const at=room.attendance[access.role]||(room.attendance[access.role]={});at.lastLeftAt=now}saveClassrooms(access.cdb);return json(res,200,{ok:true})}
   if(action==='poll'){const since=Math.max(0,Number(body.since)||0);room.presence[access.role]={...(room.presence[access.role]||{}),lastSeen:now};const signals=(room.signals||[]).filter(x=>x.id>since&&x.to===access.role).slice(-100);const lastSignalId=signals.length?signals[signals.length-1].id:since;saveClassrooms(access.cdb);return json(res,200,{signals,lastSignalId,presence:roomPresence(room),messages:(room.messages||[]).slice(-150),files:(room.files||[]).slice(-40),canvas:room.canvas||'',canvasUpdatedAt:room.canvasUpdatedAt||null,whiteboard:room.whiteboard||{strokes:[]},whiteboardUpdatedAt:room.whiteboardUpdatedAt||null,recordingReady:recordingReady(room),aiMonitoringEnabled:Boolean(process.env.GEMINI_API_KEY&&AI_CONDUCT_ENABLED)})}
   if(action==='signal'){const to=String(body.to||'');if(!['teacher','student','admin'].includes(to)||to===access.role)return json(res,400,{error:'Invalid signal target.'});room.signalSeq=Number(room.signalSeq||0)+1;room.signals=room.signals||[];room.signals.push({id:room.signalSeq,from:access.role,to,data:body.data,createdAt:now});room.signals=room.signals.filter(x=>Date.now()-Date.parse(x.createdAt)<10*60*1000).slice(-300);saveClassrooms(access.cdb);return json(res,200,{ok:true,id:room.signalSeq})}
   if(action==='chat'){const text=String(body.text||'').trim().slice(0,3000);if(!text)return json(res,400,{error:'Message is empty.'});let conduct=null;if(access.role==='teacher'){const check=await aiTeacherConductCheck(text,'classroom_chat');if(check.flagged)conduct=applyTeacherConductStrike(access.teacher,check.reason,text,'classroom_chat');if(conduct)conduct={...conduct,ai:check.ai,confidence:check.confidence,category:check.category||''}}room.messages=room.messages||[];room.messages.push({id:'MSG-'+crypto.randomBytes(5).toString('hex'),role:access.role,name:access.role==='teacher'?access.teacher:access.role==='student'?b.name:'iSpeak Admin',text,createdAt:now,conduct});room.messages=room.messages.slice(-300);saveClassrooms(access.cdb);return json(res,200,{ok:true,message:room.messages[room.messages.length-1],conduct})}
   if(action==='fileUpload'){
     if(access.role==='admin')return json(res,403,{error:'Observers cannot upload lesson files.'});
     const f=body.file||{},name=cleanFilename(f.name||'lesson-file'),mime=String(f.type||'').toLowerCase(),raw=String(f.data||'');
     const allowed={'application/pdf':'pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx'};
     if(!allowed[mime])return json(res,415,{error:'Only PDF and Word .docx lesson files are supported.'});
     if(!/^data:[^,]+;base64,/i.test(raw))return json(res,400,{error:'Shared file data is invalid.'});
     let buf;try{buf=Buffer.from(raw.replace(/^data:[^,]+,/,''),'base64')}catch{return json(res,400,{error:'Shared file could not be decoded.'})}
     if(!buf.length||buf.length>12_000_000)return json(res,413,{error:'Shared lesson files must be 12 MB or smaller.'});
     const extOk=mime==='application/pdf'?/\.pdf$/i.test(name):/\.docx$/i.test(name);if(!extOk)return json(res,400,{error:'The file extension does not match the selected document type.'});
     const valid=mime==='application/pdf'?fileMagicOk(buf,'application/pdf'):validDocx(buf);
     if(!valid)return json(res,400,{error:'The uploaded document does not match its file type or is not a valid Word document.'});
     const id='CF-'+crypto.randomBytes(6).toString('hex').toUpperCase(),storedName=`${cleanFilename(room.roomId||bookingId)}-${id}.${allowed[mime]}`;
     fs.writeFileSync(path.join(CLASSROOM_FILE_DIR,storedName),buf);
     room.files=room.files||[];room.files.push({id,name:name||`lesson.${allowed[mime]}`,storedName,mimeType:mime,size:buf.length,uploadedBy:access.role,uploadedByName:access.role==='teacher'?access.teacher:String(b.name||'Student'),createdAt:now});
     room.files=room.files.slice(-40);saveClassrooms(access.cdb);return json(res,200,{ok:true,file:room.files[room.files.length-1]})
   }
   if(action==='canvas'){if(access.role==='admin')return json(res,403,{error:'Observers cannot edit the lesson workspace.'});room.canvas=String(body.text||'').slice(0,25000);room.canvasUpdatedAt=now;saveClassrooms(access.cdb);return json(res,200,{ok:true,updatedAt:now})}
   if(action==='whiteboard'){if(access.role==='admin')return json(res,403,{error:'Observers cannot edit the whiteboard.'});const wb=body.whiteboard&&typeof body.whiteboard==='object'?body.whiteboard:{strokes:[]};const strokes=Array.isArray(wb.strokes)?wb.strokes.slice(-600):[];const cleaned=[];for(const st of strokes){if(!st||!Array.isArray(st.points))continue;const pts=st.points.slice(-2500).map(p=>Array.isArray(p)&&p.length>=2?[Math.max(0,Math.min(1,Number(p[0])||0)),Math.max(0,Math.min(1,Number(p[1])||0))]:null).filter(Boolean);if(!pts.length)continue;cleaned.push({tool:['pen','highlighter','eraser'].includes(st.tool)?st.tool:'pen',size:Math.max(1,Math.min(30,Number(st.size)||4)),color:'#12324a',points:pts})}room.whiteboard={strokes:cleaned};room.whiteboardUpdatedAt=now;saveClassrooms(access.cdb);return json(res,200,{ok:true,updatedAt:now})}
   if(action==='review'){if(access.practice)return json(res,409,{error:'Reviews are only available for completed booked lessons.'});if(access.role!=='student')return json(res,403,{error:'Only the student can review this lesson.'});if(b.status!=='completed')return json(res,409,{error:'Complete the lesson before leaving a review.'});if(!room.attendance?.student?.firstJoinedAt||!room.attendance?.teacher?.firstJoinedAt)return json(res,409,{error:'A review is available after an attended iSpeak Classroom lesson.'});if(room.review)return json(res,409,{error:'This lesson has already been reviewed.'});const rating=Math.round(Number(body.rating));const comment=String(body.comment||'').trim().slice(0,1200);if(rating<1||rating>5)return json(res,400,{error:'Choose a rating from 1 to 5 stars.'});if(comment.length<10)return json(res,400,{error:'Write at least 10 characters about the lesson.'});room.review={bookingId,teacher:access.teacher,rating,comment,studentName:String(b.name||'Student').slice(0,80),studentEmail:normEmail(b.email),createdAt:now,hidden:false};saveClassrooms(access.cdb);return json(res,200,{ok:true,review:safeReview(room.review),summary:teacherReviewSummary(access.teacher)})}
   return json(res,400,{error:'Unknown classroom action.'})
 }
 if(pathname==='/api/teacher-reviews'&&req.method==='GET'){const u=new URL(req.url,`http://${req.headers.host||'localhost'}`),teacher=String(u.searchParams.get('teacher')||'').trim();if(!teacher)return json(res,400,{error:'Teacher is required.'});return json(res,200,{teacher,...teacherReviewSummary(teacher)})}
 if(pathname==='/api/admin/classrooms'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,1_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const pin=String(body.pin||'');if(!validAdminPin(pin))return json(res,403,{error:'Incorrect admin PIN.'});const action=String(body.action||'list'),cdb=loadClassrooms();
   if(action==='list'){const rooms=Object.values(cdb.rooms||{}).map(r=>{const found=findBooking(r.bookingId),b=found?.booking||{};return {bookingId:r.bookingId,teacher:r.teacher,studentName:userDisplayNameByEmail(b.email,b.name||'Student'),date:b.date||'',time:b.time||'',status:b.status||'',presence:roomPresence(r),recordingReady:recordingReady(r),recordingCount:(r.recordings||[]).length,review:r.review||null,attendance:r.attendance||{}}}).sort((a,b)=>`${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));return json(res,200,{rooms})}
   if(action==='reviewModeration'){const id=String(body.bookingId||''),room=cdb.rooms[id];if(!room?.review)return json(res,404,{error:'Review not found.'});room.review.hidden=Boolean(body.hidden);room.review.moderatedAt=new Date().toISOString();saveClassrooms(cdb);return json(res,200,{ok:true})}
   return json(res,400,{error:'Unknown admin classroom action.'})
 }
 if(pathname.startsWith('/api/application-file/')&&req.method==='GET'){
   const name=decodeURIComponent(pathname.split('/').pop()||'');if(name!==cleanFilename(name))return json(res,400,{error:'Invalid file.'});const p=path.join(APPLICATION_UPLOAD_DIR,name);if(!p.startsWith(APPLICATION_UPLOAD_DIR)||!fs.existsSync(p))return json(res,404,{error:'File not found.'});
   if(name.includes('-certificate-')){const au=authApplicant(req),adminPin=String(req.headers['x-admin-pin']||'');if(!au&&!validAdminPin(adminPin))return json(res,403,{error:'Private qualification file.'});if(au&&!name.startsWith(`${au.a.id}-certificate-`))return json(res,403,{error:'This qualification belongs to another application.'});}
   const ext=path.extname(p).toLowerCase(),types={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.pdf':'application/pdf'};return send(res,200,fs.readFileSync(p),types[ext]||'application/octet-stream')
 }
 if(pathname==='/api/teacher-application/register'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,2_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const email=normEmail(body.email),password=String(body.password||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Enter a valid email.'});if(!validStrongPassword(password))return json(res,400,{error:passwordPolicyText()});const db=loadApplications();if(Object.values(db.applications).some(a=>a.email===email))return json(res,409,{error:'An application account already exists for this email.'});const id='TA-'+crypto.randomBytes(5).toString('hex').toUpperCase(),token=newToken(),ph=hashPassword(password);db.applications[id]={id,email,passwordHash:ph,tokenHash:crypto.createHash('sha256').update(token).digest('hex'),tokenIssuedAt:new Date().toISOString(),status:'draft',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),reviewHistory:[],certificates:[],availability:{}};saveApplications(db);return json(res,200,{ok:true,token,application:applicationPublic(db.applications[id])})
 }
 if(pathname==='/api/teacher-application/login'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,1_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}const email=normEmail(body.email),password=String(body.password||''),deviceId=String(body.deviceId||'').trim().slice(0,180),db=loadApplications();const entry=Object.entries(db.applications).find(([,a])=>a.email===email);if(!entry||!verifyPassword(password,entry[1].passwordHash))return json(res,403,{error:'Teacher email or password is incorrect. Check the exact email shown in Admin, or reset the teacher password from Admin.'});const [id,a]=entry;a.trustedDevices=Array.isArray(a.trustedDevices)?a.trustedDevices:[];const emailReady=Boolean(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD);if(deviceId&&!a.trustedDevices.includes(deviceId)&&emailReady){const code=String(crypto.randomInt(100000,1000000)),key=`teacher:${email}:${deviceId}`;DEVICE_VERIFICATIONS.set(key,{hash:crypto.createHash('sha256').update(code).digest('hex'),expires:Date.now()+10*60*1000,tries:0});smtpSendMail({to:email,subject:'iSpeak Confidence teacher new-device verification',html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px"><h2 style="color:#0f766e">Teacher Portal new-device sign-in</h2><p>Use this verification code to finish signing in:</p><div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#102b52">${code}</div><p>This code expires in 10 minutes.</p></div>`}).catch(e=>console.warn('[teacher device verification email]',e.message));saveApplications(db);return json(res,200,{verificationRequired:true,email,application:applicationPublic(a)});}if(deviceId&&!a.trustedDevices.includes(deviceId)){a.trustedDevices.push(deviceId);a.trustedDevices=a.trustedDevices.slice(-12)}const token=newToken();a.tokenHash=crypto.createHash('sha256').update(token).digest('hex');a.tokenIssuedAt=new Date().toISOString();saveApplications(db);return json(res,200,{ok:true,token,application:applicationPublic(a)})
 }
 if(pathname==='/api/teacher-application/me'&&req.method==='GET'){const au=authApplicant(req);if(!au)return json(res,401,{error:'Applicant login required.'});return json(res,200,{application:{...applicationPublic(au.a),profileScore:applicationScore(au.a)}})}
 if(pathname==='/api/teacher-application/save'&&req.method==='POST'){
   const au=authApplicant(req);if(!au)return json(res,401,{error:'Applicant login required.'});if(['submitted','approved'].includes(au.a.status))return json(res,409,{error:'This application is locked while under review or after approval.'});let body;try{body=JSON.parse(await readBody(req,75_000_000)||'{}')}catch{return json(res,400,{error:'Application data is invalid or too large.'})}const a=au.a,fields=['firstName','lastName','publicName','country','timezone','phone','headline','about','experience','education','requestedRate','currency','ageGroup'];for(const k of fields)if(k in body)a[k]=String(body[k]||'').trim().slice(0,k==='about'||k==='experience'?4000:500);if('requestedRate' in body&&Number(body.requestedRate)<MIN_TEACHER_RATE)return json(res,400,{error:`Teacher lesson rate cannot be lower than $${MIN_TEACHER_RATE} per 50-minute lesson.`});for(const k of ['guardianConsent','equipmentConfirmed','internetConfirmed','agreementAccepted'])if(k in body)a[k]=Boolean(body[k]);a.teachingLanguages=Array.isArray(body.teachingLanguages)?body.teachingLanguages.map(x=>String(x).slice(0,60)).slice(0,7):a.teachingLanguages||[];a.spokenLanguages=Array.isArray(body.spokenLanguages)?body.spokenLanguages.map(x=>String(x).slice(0,60)).slice(0,7):a.spokenLanguages||[];a.specialties=Array.isArray(body.specialties)?body.specialties.map(x=>String(x).slice(0,80)).slice(0,12):a.specialties||[];if(body.availability&&typeof body.availability==='object')a.availability=body.availability;try{if(body.photo?.data){const old=a.photoUrl;a.photoUrl=saveDataFile(a.id,'photo',body.photo,4_000_000,['image/jpeg','image/png','image/webp']);deleteStoredUrl(old)}if(body.video?.data){const old=a.videoUrl;a.videoUrl=saveDataFile(a.id,'video',body.video,55_000_000,['video/mp4','video/webm']);deleteStoredUrl(old)}if(Array.isArray(body.newCertificates)){for(const f of body.newCertificates.slice(0,5)){const url=saveDataFile(a.id,'certificate',f,10_000_000,['application/pdf','image/jpeg','image/png']);a.certificates.push({name:cleanFilename(f.name),url})}}}catch(e){return json(res,400,{error:e.message})}a.updatedAt=new Date().toISOString();saveApplications(au.db);return json(res,200,{ok:true,application:{...applicationPublic(a),profileScore:applicationScore(a)}})
 }
 if(pathname==='/api/teacher-application/submit'&&req.method==='POST'){
   const au=authApplicant(req);if(!au)return json(res,401,{error:'Applicant login required.'});const a=au.a,score=applicationScore(a),missing=[];
   if(!String(a.firstName||'').trim())missing.push('first name');if(!String(a.lastName||'').trim())missing.push('last name');if(!String(a.publicName||'').trim())missing.push('public teacher name');if(!String(a.country||'').trim())missing.push('country');if(!String(a.phone||'').trim())missing.push('phone number');if(!validTimeZone(String(a.timezone||'')))missing.push('valid timezone');if(!(a.teachingLanguages||[]).length)missing.push('teaching language');if(!(a.spokenLanguages||[]).length)missing.push('languages spoken');if(String(a.headline||'').trim().length<25)missing.push('headline (25+ characters)');if(String(a.about||'').trim().length<160)missing.push('profile description (160+ characters)');if(String(a.experience||'').trim().length<100)missing.push('teaching experience (100+ characters)');if(String(a.education||'').trim().length<20)missing.push('education');if(!(a.specialties||[]).length)missing.push('specialties');if(!(a.certificates||[]).length)missing.push('qualification/certificate');if(!a.photoUrl)missing.push('profile photo');if(!a.videoUrl)missing.push('intro video');if(!a.availability||!Object.values(a.availability).some(v=>Array.isArray(v)&&v.length))missing.push('weekly availability');if(!['15-17','18+'].includes(a.ageGroup))missing.push('age group (15–17 or 18+)');if(a.ageGroup==='15-17'&&!a.guardianConsent)missing.push('parent/guardian consent for under-18 teacher');if(!a.equipmentConfirmed)missing.push('teaching equipment confirmation');if(!a.internetConfirmed)missing.push('internet confirmation');if(!a.agreementAccepted)missing.push('teacher terms agreement');
   if(missing.length)return json(res,400,{error:`Complete every required item before submitting: ${missing.join(', ')}.`,missing,profileScore:score});a.status='submitted';a.submittedAt=new Date().toISOString();a.updatedAt=a.submittedAt;a.reviewHistory=a.reviewHistory||[];a.reviewHistory.push({at:a.submittedAt,type:'submitted',note:'Application submitted for iSpeak Admin review.'});saveApplications(au.db);return json(res,200,{ok:true,status:a.status,profileScore:score,adminQueue:true})
 }
 if(pathname==='/api/teacher-application/portal'&&req.method==='POST'){
   const au=authApplicant(req);if(!au)return json(res,401,{error:'Teacher login required.'});if(au.a.status!=='approved')return json(res,403,{error:'Your teacher application must be approved first.'});let body;try{body=JSON.parse(await readBody(req,65_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}
   const teacher=String(au.a.publicName||`${au.a.firstName||''} ${au.a.lastName||''}`).trim(),db=loadTeachers(),t=ensureTeacher(db,teacher);if(!t)return json(res,404,{error:'Teacher scheduling profile not found.'});t.bookings=t.bookings||[];t.availability=t.availability||{};if(t.active==null)t.active=true;
   const payRate=TEACHER_LESSON_PAY,lessonRate=teacherListedRate(teacher,t);const stats=()=>{const now=new Date().toISOString().slice(0,10),completed=t.bookings.filter(b=>b.status==='completed'),earned=completed.reduce((n,b)=>n+Number(b.earningAmount||0),0),paid=completed.filter(b=>b.paymentStatus==='paid').reduce((n,b)=>n+Number(b.earningAmount||0),0);return {total:t.bookings.length,upcoming:t.bookings.filter(b=>b.status!=='cancelled'&&b.status!=='completed'&&String(b.date)>=now).length,completed:completed.length,cancelled:t.bookings.filter(b=>b.status==='cancelled').length,students:new Set(t.bookings.map(b=>normEmail(b.email)).filter(Boolean)).size,earned:Number(earned.toFixed(2)),pendingEarnings:Number((earned-paid).toFixed(2)),paidEarnings:Number(paid.toFixed(2))}};
   if(body.action==='dashboard'){const open=Object.values(t.availability||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);const messageThreads=Object.entries(t.studentMessages||{}).map(([studentEmail,messages])=>({studentRef:studentRefFor(studentEmail),studentName:userDisplayNameByEmail(studentEmail,(messages||[]).find(m=>m.from==='student')?.name||'Student'),messages:(messages||[]).slice(-100).map(m=>{const c={...m};delete c.email;return c})})).sort((a,b)=>String(b.messages.at(-1)?.createdAt||'').localeCompare(String(a.messages.at(-1)?.createdAt||'')));const safeBookings=t.bookings.slice().sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map(x=>{const c={...x,name:userDisplayNameByEmail(x.email,x.name),...bookingClassroomMeta(x,t.timezone||au.a.timezone||'Asia/Phnom_Penh')};delete c.email;delete c.ownerEmail;return c});const studentMap=new Map();for(const x of t.bookings||[]){const ref=studentRefFor(x.email||'');if(!x.email)continue;const q=studentMap.get(ref)||{studentRef:ref,name:userDisplayNameByEmail(x.email,x.name),count:0,next:null};q.count++;if(!['cancelled','completed'].includes(x.status)&&(!q.next||`${x.date}${x.time}`<`${q.next.date}${q.next.time}`))q.next={date:x.date,time:x.time};studentMap.set(ref,q)}for(const th of messageThreads){if(!studentMap.has(th.studentRef))studentMap.set(th.studentRef,{studentRef:th.studentRef,name:th.studentName||'Student',count:0,next:null})}return json(res,200,{teacher,timezone:t.timezone||au.a.timezone||'Asia/Phnom_Penh',availability:t.availability,bookings:safeBookings,messageThreads,students:[...studentMap.values()],paymentLink:ISPEAK_MANUAL_PAYMENT_LINK,openSlotCount:open,payRate,lessonRate,active:t.active!==false,identityVerified:Boolean(au.a.identityVerified),mustChangePassword:Boolean(au.a.mustChangePassword),pendingProfile:au.a.pendingProfile||null,profile:{headline:au.a.headline||'',about:au.a.about||'',specialties:au.a.specialties||[],teachingLanguages:au.a.teachingLanguages||[],photoUrl:au.a.photoUrl||'',videoUrl:au.a.videoUrl||''},stats:stats()})}
   if(body.action==='availability'){const av=body.availability;if(!av||typeof av!=='object')return json(res,400,{error:'Availability is required.'});const clean={};for(let d=0;d<7;d++){const arr=Array.isArray(av[String(d)])?av[String(d)]:[];clean[String(d)]=[...new Set(arr.filter(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x))))].sort()}t.availability=clean;const z=String(body.timezone||t.timezone||au.a.timezone||'Asia/Phnom_Penh').slice(0,80);if(!validTimeZone(z))return json(res,400,{error:'Invalid timezone.'});t.timezone=z;au.a.timezone=z;au.a.updatedAt=new Date().toISOString();saveTeachers(db);saveApplications(au.db);return json(res,200,{ok:true,timezone:z})}
   if(body.action==='rate')return json(res,400,{error:'Lesson pricing is fixed by iSpeak at $13 USD and cannot be changed by teachers.'})
   if(body.action==='profile'){const pending={headline:String(body.headline??au.a.headline??'').trim().slice(0,140),about:String(body.about??au.a.about??'').trim().slice(0,4000),specialties:Array.isArray(body.specialties)?body.specialties.map(x=>String(x).trim().slice(0,80)).filter(Boolean).slice(0,12):(au.a.specialties||[]),submittedAt:new Date().toISOString()};try{if(body.photo?.data)pending.photoUrl=saveDataFile(au.a.id,'pending-photo',body.photo,4_000_000,['image/jpeg','image/png','image/webp']);if(body.video?.data)pending.videoUrl=saveDataFile(au.a.id,'pending-video',body.video,55_000_000,['video/mp4','video/webm'])}catch(e){return json(res,400,{error:e.message})}au.a.pendingProfile=pending;au.a.updatedAt=pending.submittedAt;saveApplications(au.db);return json(res,200,{ok:true,pendingProfile:pending})}
   if(body.action==='changePassword'){const password=String(body.password||'');if(!validStrongPassword(password))return json(res,400,{error:passwordPolicyText()});au.a.passwordHash=hashPassword(password);au.a.mustChangePassword=false;au.a.updatedAt=new Date().toISOString();saveApplications(au.db);return json(res,200,{ok:true})}
   
   if(body.action==='holdSlot'){const studentEmail=resolveTeacherStudentEmail(t,body),date=String(body.date||''),time=String(body.time||'');if(!studentEmail||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return json(res,400,{error:'Student, date and time are required.'});const clash=t.bookings.find(x=>x.date===date&&x.time===time&&!['cancelled','expired','payment_failed'].includes(x.status));if(clash)return json(res,409,{error:'That slot is already held or booked.'});const b={id:'HOLD-'+crypto.randomBytes(4).toString('hex').toUpperCase(),teacher,email:studentEmail,ownerEmail:studentEmail,name:userDisplayNameByEmail(studentEmail,body.studentName||'Student'),date,time,type:'50 minutes — tutor rate',subject:String(body.subject||'Private lesson'),status:'payment_pending',paymentStatus:'awaiting_manual_payment',paymentMode:'manual_revolut',created:new Date().toISOString(),holdExpiresAt:new Date(Date.now()+30*60*1000).toISOString()};bookingAudit(b,'slot_held',teacher,'30-minute payment hold created after agreeing availability.');t.bookings.push(b);saveTeachers(db);const safeBooking={...b};delete safeBooking.email;delete safeBooking.ownerEmail;return json(res,200,{ok:true,booking:safeBooking})}
if(body.action==='teacherCreateBooking'){const studentEmail=resolveTeacherStudentEmail(t,body),threadName=String((t.studentMessages?.[studentEmail]||[]).find(m=>m.from==='student')?.name||body.studentName||'Student'),name=userDisplayNameByEmail(studentEmail,threadName),date=String(body.date||'').trim(),time=String(body.time||'').trim(),subject=String(body.subject||'Private lesson').trim().slice(0,80),type=String(body.type||'50 minutes — tutor rate').trim().slice(0,120);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return json(res,400,{error:'Student email, date and time are required.'});const today=new Date().toISOString().slice(0,10);if(date<today)return json(res,409,{error:'Choose today or a future date.'});const ownHold=t.bookings.find(x=>x.status==='payment_pending'&&x.email===studentEmail&&x.date===date&&x.time===time);const clash=t.bookings.find(x=>x!==ownHold&&x.status!=='cancelled'&&x.date===date&&x.time===time);if(clash)return json(res,409,{error:'That time is already booked. Choose another time.'});if(ownHold){ownHold.status='cancelled';ownHold.paymentStatus='converted_to_confirmed';bookingAudit(ownHold,'hold_converted',teacher,'Converted to confirmed lesson.')}const id='TB-'+crypto.randomBytes(4).toString('hex').toUpperCase(),quote=bookingQuote(teacher,t,type,studentEmail),b={id,teacher,teacherApplicationId:t.applicationId||'',subject,name,email:studentEmail,ownerEmail:studentEmail,date,time,type,message:'Booked by teacher after direct availability/payment confirmation.',status:'confirmed',paymentStatus:'paid_manual_teacher_confirmed',paymentMode:'manual_revolut_teacher_confirmed',basePrice:quote.basePrice,amountPaid:quote.studentTotal,amountDue:quote.studentTotal,teacherEarning:quote.teacherEarning,earningAmount:quote.teacherEarning,durationHours:lessonDurationHours(type),created:new Date().toISOString(),paidAt:new Date().toISOString(),confirmedByTeacherAt:new Date().toISOString()};bookingAudit(b,'confirmed',teacher,'Teacher verified payment and added student to schedule.');t.bookings.push(b);t.studentMessages=t.studentMessages||{};const thread=t.studentMessages[studentEmail]||(t.studentMessages[studentEmail]=[]);thread.push({id:'TM-'+crypto.randomBytes(5).toString('hex'),from:'teacher',name:teacher,text:`✓ Lesson confirmed for ${date} at ${time} (${t.timezone||'Asia/Phnom_Penh'}). It is now in your iSpeak schedule.`,createdAt:new Date().toISOString(),system:true});saveTeachers(db);recordAnalytics(req,'booking_complete',{user:studentEmail,target:teacher,source:'teacher_manual'});const safeBooking={...b};delete safeBooking.email;delete safeBooking.ownerEmail;return json(res,200,{ok:true,booking:safeBooking,stats:stats()})}
   if(body.action==='bookingUpdate'){const b=t.bookings.find(x=>x.id===String(body.bookingId||''));if(!b)return json(res,404,{error:'Booking not found.'});if('status' in body){const status=String(body.status||'');if(!['pending','confirmed','completed','cancelled'].includes(status))return json(res,400,{error:'Invalid booking status.'});b.status=status;if(status==='completed'&&!b.completedAt){b.completedAt=new Date().toISOString();b.earningAmount=TEACHER_LESSON_PAY;b.paymentStatus=b.earningAmount>0?'pending':'not_set'}if(status!=='completed'&&b.completedAt){delete b.completedAt;delete b.earningAmount;delete b.paymentStatus}}if('teacherNote' in body)b.teacherNote=String(body.teacherNote||'').trim().slice(0,3000);if('meetingLink' in body){const link=String(body.meetingLink||'').trim().slice(0,500);if(link&&!/^https:\/\//i.test(link))return json(res,400,{error:'Meeting link must start with https://'});b.meetingLink=link}b.updated=new Date().toISOString();saveTeachers(db);const safeBooking={...b};delete safeBooking.email;delete safeBooking.ownerEmail;return json(res,200,{ok:true,booking:safeBooking,stats:stats()})}
   return json(res,400,{error:'Unknown teacher dashboard action.'})
 }
 if(pathname==='/api/admin/applications'&&req.method==='POST'){
   let body;try{body=JSON.parse(await readBody(req,2_000_000)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})}if(!validAdminPin(body.pin))return json(res,403,{error:'Incorrect admin PIN.'});const db=loadApplications();
   if(body.action==='list'){const tdb=loadTeachers();return json(res,200,{applications:Object.values(db.applications).map(a=>{const n=a.publicName||`${a.firstName||''} ${a.lastName||''}`.trim(),t=tdb.teachers?.[n]||{};return {...applicationPublic(a),profileScore:applicationScore(a),payRate:Number(t.payRate||0),active:t.active!==false,completedPayments:(t.bookings||[]).filter(b=>b.status==='completed').map(b=>({id:b.id,date:b.date,name:b.name,amount:Number(b.earningAmount||0),paymentStatus:b.paymentStatus||'not_set'}))}}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))})};
   if(body.action==='resetTeacherPassword'){const id=String(body.applicationId||'');const a=db.applications[id];if(!a||a.status!=='approved')return json(res,404,{error:'Approved teacher account not found.'});const password=String(body.temporaryPassword||'');if(!validStrongPassword(password))return json(res,400,{error:passwordPolicyText()});a.passwordHash=hashPassword(password);a.mustChangePassword=true;a.updatedAt=new Date().toISOString();a.reviewHistory=a.reviewHistory||[];a.reviewHistory.push({at:a.updatedAt,type:'password_reset',note:'Temporary password reset by admin.'});saveApplications(db);return json(res,200,{ok:true,email:a.email,publicName:a.publicName||`${a.firstName||''} ${a.lastName||''}`.trim()})}
   if(body.action==='createExistingTeacherAccount'){const name=String(body.publicName||'').trim().slice(0,120),email=normEmail(body.email),temporaryPassword=String(body.temporaryPassword||'');if(!TEACHER_NAMES.includes(name))return json(res,400,{error:'Select an existing iSpeak teacher.'});if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Enter a valid teacher email.'});if(!validStrongPassword(temporaryPassword))return json(res,400,{error:passwordPolicyText()});if(Object.values(db.applications).some(x=>x.email===email||x.publicName===name))return json(res,409,{error:'That teacher or email already has an account.'});const id='TA-'+crypto.randomBytes(5).toString('hex').toUpperCase(),now=new Date().toISOString(),token=newToken();db.applications[id]={id,email,passwordHash:hashPassword(temporaryPassword),tokenHash:crypto.createHash('sha256').update(token).digest('hex'),tokenIssuedAt:now,status:'approved',createdAt:now,updatedAt:now,reviewedAt:now,publicName:name,firstName:name.split(' ')[0],lastName:name.split(' ').slice(1).join(' '),country:'',timezone:'Asia/Phnom_Penh',headline:'',about:'',experience:'',education:'',teachingLanguages:[],spokenLanguages:[],specialties:[],certificates:[],availability:{},ageGroup:'18+',guardianConsent:false,equipmentConfirmed:true,internetConfirmed:true,agreementAccepted:true,mustChangePassword:true,reviewHistory:[{at:now,type:'approved',note:'Existing iSpeak teacher account created by admin.'}]};const tdb=loadTeachers();const t=ensureTeacher(tdb,name);if(t){t.applicationId=id;if(t.active==null)t.active=true;saveTeachers(tdb)}saveApplications(db);return json(res,200,{ok:true,application:applicationPublic(db.applications[id])})}
   const a=db.applications[String(body.applicationId||'')];if(!a)return json(res,404,{error:'Application not found.'});
   if(body.action==='review'){const decision=String(body.decision||'');if(!['approved','changes_requested','rejected'].includes(decision))return json(res,400,{error:'Invalid review decision.'});const note=String(body.note||'').trim().slice(0,2000);a.status=decision;a.reviewNote=note;a.reviewedAt=new Date().toISOString();a.updatedAt=a.reviewedAt;a.reviewHistory=a.reviewHistory||[];a.reviewHistory.push({at:a.reviewedAt,type:decision,note});if('identityVerified' in body)a.identityVerified=Boolean(body.identityVerified);if(decision==='approved'){a.publicName=String(a.publicName||`${a.firstName} ${a.lastName}`).trim();const tdb=loadTeachers();if(!tdb.teachers[a.publicName])tdb.teachers[a.publicName]={timezone:a.timezone||'Asia/Phnom_Penh',availability:a.availability||{},bookings:[],applicationId:a.id,active:true};const t=tdb.teachers[a.publicName];t.applicationId=a.id;t.lessonRate=STUDENT_LESSON_PRICE;t.payRate=TEACHER_LESSON_PAY;if(body.active!=null)t.active=Boolean(body.active);saveTeachers(tdb)}saveApplications(db);return json(res,200,{ok:true,application:{...applicationPublic(a),profileScore:applicationScore(a)}})}
   if(body.action==='teacherSettings'){if(a.status!=='approved')return json(res,409,{error:'Approve this teacher first.'});const name=String(a.publicName||`${a.firstName} ${a.lastName}`).trim(),tdb=loadTeachers(),t=ensureTeacher(tdb,name);if(!t)return json(res,404,{error:'Teacher profile not found.'});if('payRate' in body){const r=Number(body.payRate);if(!Number.isFinite(r)||r<0||r>500)return json(res,400,{error:'Invalid teacher pay rate.'});t.payRate=r}if('active' in body)t.active=Boolean(body.active);if('identityVerified' in body)a.identityVerified=Boolean(body.identityVerified);saveTeachers(tdb);saveApplications(db);return json(res,200,{ok:true,payRate:Number(t.payRate||0),active:t.active!==false,identityVerified:Boolean(a.identityVerified)})}
   if(body.action==='profileChanges'){if(a.status!=='approved')return json(res,409,{error:'Approve this teacher first.'});if(!a.pendingProfile)return json(res,409,{error:'No pending profile changes.'});const decision=String(body.decision||'');if(!['approved','rejected'].includes(decision))return json(res,400,{error:'Invalid profile-change decision.'});if(decision==='approved'){const p=a.pendingProfile;a.headline=p.headline??a.headline;a.about=p.about??a.about;a.specialties=Array.isArray(p.specialties)?p.specialties:a.specialties;if(p.photoUrl){deleteStoredUrl(a.photoUrl);a.photoUrl=p.photoUrl}if(p.videoUrl){deleteStoredUrl(a.videoUrl);a.videoUrl=p.videoUrl}}else{deleteStoredUrl(a.pendingProfile.photoUrl);deleteStoredUrl(a.pendingProfile.videoUrl)}a.profileReviewNote=String(body.note||'').trim().slice(0,1000);a.profileReviewedAt=new Date().toISOString();delete a.pendingProfile;a.updatedAt=a.profileReviewedAt;saveApplications(db);return json(res,200,{ok:true})}
   if(body.action==='inviteInterview'){if(a.status!=='submitted'&&a.status!=='changes_requested')return json(res,409,{error:'Interview invites are for reviewed applications awaiting a decision.'});const interviewUrl=String(body.interviewUrl||'').trim().slice(0,1000),when=String(body.when||'').trim().slice(0,200);if(!/^https?:\/\//i.test(interviewUrl))return json(res,400,{error:'Enter a valid interview link beginning with http:// or https://.'});a.interview={url:interviewUrl,when,status:'invited',invitedAt:new Date().toISOString()};a.updatedAt=a.interview.invitedAt;saveApplications(db);const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px"><h2 style="color:#0f766e">iSpeak Confidence — Final Teacher Interview</h2><p>Hello ${String(a.firstName||a.publicName||'Teacher').replace(/[<>]/g,'')},</p><p>Your teacher application has been reviewed and we would like to invite you to a final interview.</p>${when?`<p><b>Interview time:</b> ${when}</p>`:''}<p><a href="${interviewUrl}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:white;text-decoration:none;border-radius:8px">Join final interview</a></p><p>Please join a few minutes early with your camera and microphone ready.</p></div>`;smtpSendMail({to:a.email,subject:'iSpeak Confidence — Final teacher interview invitation',html}).catch(e=>console.warn('[interview invite email]',e.message));return json(res,200,{ok:true,interview:a.interview})}
   if(body.action==='paymentStatus'){if(a.status!=='approved')return json(res,409,{error:'Approve this teacher first.'});const name=String(a.publicName||`${a.firstName} ${a.lastName}`).trim(),tdb=loadTeachers(),t=ensureTeacher(tdb,name),b=(t?.bookings||[]).find(x=>x.id===String(body.bookingId||''));if(!b)return json(res,404,{error:'Booking not found.'});if(b.status!=='completed')return json(res,409,{error:'Only completed lessons can be marked paid.'});const ps=String(body.paymentStatus||'');if(!['pending','paid'].includes(ps))return json(res,400,{error:'Invalid payment status.'});b.paymentStatus=ps;if(ps==='paid')b.paidAt=new Date().toISOString();else delete b.paidAt;saveTeachers(tdb);return json(res,200,{ok:true})}
   return json(res,400,{error:'Unknown admin action.'})
 }
 if(pathname==='/api/teacher-student-messages'&&req.method==='POST'){
   const ta=authApplicant(req);if(!ta||ta.a.status!=='approved')return json(res,401,{error:'Approved teacher login required.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})};const teacher=String(ta.a.publicName||`${ta.a.firstName||''} ${ta.a.lastName||''}`.trim()),tdb=loadTeachers(),t=ensureTeacher(tdb,teacher);if(!t)return json(res,404,{error:'Teacher not found.'});const studentEmail=resolveTeacherStudentEmail(t,body);t.studentMessages=t.studentMessages||{};const thread=t.studentMessages[studentEmail];if(!thread)return json(res,404,{error:'Student conversation not found.'});if(body.action==='send'||body.action==='sendPaymentLink'){let text=String(body.text||'').trim().slice(0,3000);if(body.action==='sendPaymentLink')text=`I’m available for the time we discussed. The lesson price is $13 USD. You can pay securely using the official iSpeak Confidence payment link:\n${ISPEAK_MANUAL_PAYMENT_LINK}\nAfter payment, please message me here. I will confirm it and add the lesson to your iSpeak schedule.`;if(!text)return json(res,400,{error:'Message is empty.'});const check=await aiTeacherConductCheck(text,'student_message');let conduct=null;if(check.flagged)conduct=applyTeacherConductStrike(teacher,check.reason,text,'student_message');if(conduct)conduct={...conduct,ai:check.ai,confidence:check.confidence,category:check.category||''};thread.push({id:'TM-'+crypto.randomBytes(5).toString('hex'),from:'teacher',name:teacher,text,createdAt:new Date().toISOString(),conduct,paymentLink:body.action==='sendPaymentLink'?ISPEAK_MANUAL_PAYMENT_LINK:''});if(body.action==='sendPaymentLink')recordAnalytics(req,'payment_link_sent',{user:studentEmail,target:teacher,source:'teacher_chat'});t.studentMessages[studentEmail]=thread.slice(-300);saveTeachers(tdb);return json(res,200,{ok:true,messages:t.studentMessages[studentEmail].map(m=>{const c={...m};delete c.email;return c}),conduct})}return json(res,200,{studentRef:studentRefFor(studentEmail),studentName:userDisplayNameByEmail(studentEmail,thread.find(m=>m.from==='student')?.name||'Student'),messages:thread.map(m=>{const c={...m};delete c.email;return c}),paymentLink:ISPEAK_MANUAL_PAYMENT_LINK});
 }
 if(pathname==='/api/student-teacher-messages'&&req.method==='POST'){
   const au=authUser(req);if(!au)return json(res,401,{error:'Student login required.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})};const teacher=String(body.teacher||'').trim(),tdb=loadTeachers();if(body.action==='list'){const threads=[];for(const [teacherName,tv] of Object.entries(tdb.teachers||{})){const messages=tv?.studentMessages?.[au.email];if(!messages?.length)continue;const last=messages[messages.length-1]||{};threads.push({teacher:teacherName,preview:String(last.text||'').slice(0,140),lastAt:last.createdAt||'',unread:0});}threads.sort((a,b)=>String(b.lastAt).localeCompare(String(a.lastAt)));return json(res,200,{threads})}const t=tdb.teachers?.[teacher];if(!t||t.active===false)return json(res,404,{error:'Teacher is not available.'});t.studentMessages=t.studentMessages||{};let thread=t.studentMessages[au.email]||(t.studentMessages[au.email]=[]);if(body.action==='send'){const text=String(body.text||'').trim().slice(0,3000);if(!text)return json(res,400,{error:'Message is empty.'});thread.push({id:'SM-'+crypto.randomBytes(5).toString('hex'),from:'student',name:String(au.u?.state?.name||body.name||'Student').slice(0,120),email:au.email,text,createdAt:new Date().toISOString()});t.studentMessages[au.email]=thread.slice(-300);saveTeachers(tdb);thread=t.studentMessages[au.email]}return json(res,200,{teacher,messages:thread});
 }
 if(pathname==='/api/support-messages'&&req.method==='POST'){
   const au=authUser(req);if(!au)return json(res,401,{error:'Student login required.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})};const admin=['Nathan','Ounnoun'].includes(String(body.admin||''))?String(body.admin):'Nathan';const adb=loadApplications();adb.supportMessages=adb.supportMessages||{};const key=`${au.email}|${admin}`;const thread=adb.supportMessages[key]||(adb.supportMessages[key]=[]);if(body.action==='send'){const text=String(body.text||'').trim().slice(0,3000);if(!text)return json(res,400,{error:'Message is empty.'});thread.push({id:'SUP-'+crypto.randomBytes(5).toString('hex'),from:'student',name:String(au.u?.state?.name||'Student'),email:au.email,to:admin,text,createdAt:new Date().toISOString()});adb.supportMessages[key]=thread.slice(-300);saveApplications(adb)}return json(res,200,{admin,messages:thread});
 }
 if(pathname==='/api/admin-support-messages'&&req.method==='POST'){
   const au=authApplicant(req);if(!au||!isOwnerTeacherName(au.a.publicName))return json(res,403,{error:'Admin teacher access only.'});let body;try{body=JSON.parse(await readBody(req)||'{}')}catch{return json(res,400,{error:'Invalid JSON.'})};const admin=String(au.a.publicName||'').trim(),adb=au.db;adb.supportMessages=adb.supportMessages||{};const email=normEmail(body.studentEmail);if(body.action==='list'){const threads=Object.entries(adb.supportMessages).filter(([k])=>k.endsWith('|'+admin)).map(([k,messages])=>({studentEmail:k.split('|')[0],messages}));return json(res,200,{threads})}const key=`${email}|${admin}`,thread=adb.supportMessages[key]||(adb.supportMessages[key]=[]);if(body.action==='send'){const text=String(body.text||'').trim().slice(0,3000);if(!text)return json(res,400,{error:'Message is empty.'});thread.push({id:'SUP-'+crypto.randomBytes(5).toString('hex'),from:'admin',name:admin,email,to:email,text,createdAt:new Date().toISOString()});adb.supportMessages[key]=thread.slice(-300);saveApplications(adb)}return json(res,200,{studentEmail:email,messages:thread});
 }
 if(pathname==='/api/approved-teachers'&&req.method==='GET'){const db=loadApplications();const tdb=loadTeachers();const teachers=Object.values(db.applications).filter(a=>{if(a.status!=='approved')return false;const n=a.publicName||`${a.firstName} ${a.lastName}`;return tdb.teachers?.[n]?.active!==false}).map(a=>({id:a.id,name:a.publicName||`${a.firstName} ${a.lastName}`,country:a.country||'',timezone:a.timezone||'UTC',photoUrl:a.photoUrl,videoUrl:a.videoUrl,teachingLanguages:a.teachingLanguages||[],spokenLanguages:a.spokenLanguages||[],specialties:a.specialties||[],headline:a.headline||'',about:a.about||'',experience:a.experience||'',requestedRate:teacherListedRate(a.publicName||`${a.firstName} ${a.lastName}`,tdb.teachers?.[a.publicName||`${a.firstName} ${a.lastName}`]),reviews:teacherReviewSummary(a.publicName||`${a.firstName} ${a.lastName}`)}));return json(res,200,{teachers})}
 if(pathname==='/api/teacher-availability'&&req.method==='GET'){
   const u=new URL(req.url,`http://${req.headers.host||'localhost'}`),teacher=String(u.searchParams.get('teacher')||'').trim();const data=availableDays(teacher,60);if(!data)return json(res,404,{error:'Teacher not found.'});return json(res,200,data)
 }

 if(pathname==='/api/my-bookings'&&req.method==='GET'){
   const au=authUser(req);if(!au)return json(res,401,{error:'Account login required.'});const db=loadTeachers(),out=[];for(const t of Object.values(db.teachers||{}))for(const b of t.bookings||[])if((b.ownerEmail===au.email||(!b.ownerEmail&&normEmail(b.email)===au.email))&&b.status!=='payment_pending'&&b.paymentStatus!=='pending_verification')out.push({...b,...bookingClassroomMeta(b,t.timezone||'Asia/Phnom_Penh')});out.sort((a,b)=>String(a.created).localeCompare(String(b.created)));return json(res,200,{bookings:out})
 }
 if(pathname==='/api/checkout/quote')return json(res,410,{error:'Direct checkout is retired. Message the teacher to arrange a $13 lesson.'});
 if(pathname==='/api/booking'&&req.method==='POST') return json(res,410,{error:'Direct student booking is retired. Message the teacher first; the teacher confirms the time and adds the paid lesson to the schedule.'});

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
   const uiLanguage=['english','spanish','french','mandarin','japanese','khmer','arabic'].includes(String(body.uiLanguage||'').trim())?String(body.uiLanguage).trim():'english',displayCourseName=String(body.displayCourseName||'').trim().slice(0,180)||courseName;const p={name,email,courseName,displayCourseName,uiLanguage,certificateId:cert.id,completionDate:cert.date||completionDate};
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
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml; charset=utf-8','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.json':'application/json','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
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
 server.listen(port,()=>{console.log(`\niSpeak Confidence: http://localhost:${port}`);console.log('Revolut payment link: READY — single fixed $13 checkout link');console.log(process.env.GEMINI_API_KEY?`Gemini Smart AI: READY (${CHAT_MODEL})`:'Gemini Smart AI: OFF — add GEMINI_API_KEY to .env');console.log(process.env.GEMINI_API_KEY&&AI_CONDUCT_ENABLED?'Classroom AI conduct monitoring: READY':'Classroom AI conduct monitoring: FALLBACK RULES ONLY');console.log(process.env.SMTP_USER&&process.env.SMTP_APP_PASSWORD?'Certificate Email: READY':'Certificate Email: OFF — add SMTP_USER and SMTP_APP_PASSWORD to .env');console.log('Press Ctrl+C to stop.\n')});
}
server.on('error',e=>{if(e.code==='EADDRINUSE'){console.error(`Port ${PORT} is already in use. Close the older iSpeak server, then run start-v18-8-12.bat again.`);process.exitCode=1}else throw e});
initializePostgres().then(()=>listenOn(PORT)).catch(e=>{console.error('[iSpeak] Startup failed:',e.message);process.exitCode=1});
