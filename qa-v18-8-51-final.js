const fs=require('fs'),vm=require('vm'),path=require('path');
const read=f=>fs.readFileSync(f,'utf8');
const app=read('app.js'),html=read('index.html'),css=read('styles.css'),sw=read('sw.js'),server=read('server.js'),gradle=read('android-app/app/build.gradle'),manifest=read('android-app/app/src/main/AndroidManifest.xml'),main=read('android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java');
let n=0,fail=0; function ok(name,c){n++; if(c) console.log('PASS',name); else {fail++; console.log('FAIL',name)}}
// version / cache integrity
ok('web asset version 18.8.51',/styles\.css\?v=18\.8\.51/.test(html)&&/app\.js\?v=18\.8\.51/.test(html));
ok('service worker registration/cache current',/sw\.js\?v=18\.8\.51/.test(app)&&/ispeak-v18-8-51-release-audit/.test(sw));
ok('server status current',/version:'18\.8\.51'/.test(server));
ok('Android build version is new',/versionCode 6/.test(gradle)&&/versionName ['\"]18\.8\.51['\"]/.test(gradle));
// user-reported mobile faults
ok('learning-language change retries auto-scroll',/function changeLearningLanguage[\s\S]*requestAnimationFrame\(\(\)=>requestAnimationFrame\(land\)\)[\s\S]*setTimeout\(land,260\)/.test(app));
ok('learning auto-scroll targets current unit card',/function scrollToCurrentLearningUnit[\s\S]*scrollIntoView/.test(app)&&/currentLearningUnitIndex/.test(app));
ok('Writing Academy has Android touch tracing',/traceCanvas[\s\S]*ontouchstart[\s\S]*ontouchmove/.test(app));
ok('quick Writing Practice also has Android touch tracing',/function openWriting\([\s\S]*c\.ontouchstart[\s\S]*c\.ontouchmove[\s\S]*finishTrace/.test(app));
ok('Android rotation preserves WebView activity',/configChanges="[^"]*orientation[^"]*screenSize/.test(manifest)&&/onConfigurationChanged/.test(main)&&/restoreState/.test(main));
ok('Android native TTS bridge exists',/@JavascriptInterface public void speakWithRate/.test(main)&&/playDeviceSpeech[\s\S]*iSpeakAndroid/.test(app));
ok('Android recorded audio has native fallback',/playAudioUrlWithFallback/.test(main)&&/playAudioUrlWithFallback/.test(app)&&/speakNative\(fallbackText/.test(main));
// IELTS structure and routing
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('ielts-data.js'),ctx);const C=ctx.window.ISC_IELTS;
ok('IELTS has six progressive levels',Array.isArray(C?.levels)&&C.levels.length===6);
const counts=C.levels.map(l=>(C.course[l.id]||[]).length);ok('IELTS has 12 units per level / 72 total',counts.every(x=>x===12)&&counts.reduce((a,b)=>a+b,0)===72);
const topics=C.levels.flatMap(l=>C.course[l.id].map(u=>u.topic));ok('IELTS unit topics are unique',new Set(topics).size===72);
ok('IELTS level courses are genuinely separate',C.levels.every((l,i)=>i===0||C.course[l.id][0].id!==C.course[C.levels[i-1].id][0].id));
ok('IELTS Academic/General controls update real curriculum panel',/function renderIELTSLevelCourse/.test(app)&&/General Reading \+ Letter Writing/.test(app)&&/Academic Reading \+ Academic Task 1/.test(app));
ok('IELTS mode changes affect Reading content',/function ieltsReadingForMode/.test(app)&&/ieltsGeneralReading/.test(app));
ok('IELTS mode changes affect Writing Task 1',/st\.mode==='academic'\?u\.writing\.academicTask1:u\.writing\.generalTask1/.test(app));
ok('IELTS level selection does not auto-mix lower units',/The units below are only from/.test(app)&&/units=C\.course\[level\.id\]/.test(app));
ok('IELTS selected-level course is visible on main page',/id="ieltsLevelCourse"/.test(html)&&/ielts-current-units/.test(css));
ok('IELTS Android capture routes mode, level, unit, skill and block',/dataset\.ieltsMode/.test(app)&&/dataset\.ieltsLevel/.test(app)&&/dataset\.ieltsCourseUnit/.test(app)&&/dataset\.ieltsSkill/.test(app)&&/dataset\.ieltsBlock/.test(app));
// core curriculum
const cctx={window:{}};vm.createContext(cctx);vm.runInContext(read('curriculum-data.js'),cctx);vm.runInContext(read('curriculum-expansion-v17-4.js'),cctx);const cur=cctx.window.ISC_CURRICULUM;
ok('seven language courses exist',Object.keys(cur.languages||{}).length===7);
ok('all language courses have 150 units',Object.values(cur.languages||{}).every(x=>x.units?.length===150));
// authentication / booking / support
ok('teacher login const reassignment crash is absent',!/const token=newToken\(\);\s*token=issueSession/.test(server));
ok('passwords are server-side scrypt hashed',/crypto\.scryptSync/.test(server));
ok('client does not store teacher password/credentials in localStorage',!/localStorage\.setItem\(\s*['\"][^'\"]*(password|credential)[^'\"]*['\"]/i.test(app));
ok('support socials page contains all four requested destinations',/youtube\.com\/@ispeakconfidence/.test(app)&&/youtube\.com\/@michael-live\.rich\.cambodia/.test(app)&&/tiktok\.com\/@ispeakconfidence/.test(app)&&/facebook\.com\/share\/1DFc5Jv4ui/.test(app));
ok('Android external social navigation bridge exists',/openExternalUrl/.test(main)&&/openExternalUrl/.test(app));
ok('booking data is server-backed and shared',/\/api\/student-teacher-messages/.test(server)&&/\/api\/my-bookings/.test(server)&&/loadTeachers\(\)/.test(server));
// HTML / asset integrity
const ids=[...html.matchAll(/\bid=["']([^"']+)/g)].map(m=>m[1]);ok('no duplicate static HTML ids',new Set(ids).size===ids.length);
const refs=[...html.matchAll(/(?:src|href)=["']([^"']+)/g)].map(m=>m[1]).filter(x=>!x.startsWith('http')&&!x.startsWith('#')&&!x.startsWith('mailto:')&&!x.startsWith('tel:'));
ok('all static index assets exist',refs.every(r=>fs.existsSync(path.join('.',r.split('?')[0].replace(/^\//,'')))));
ok('account deletion route remains present',/delete-account\.html/.test(html)||fs.existsSync('delete-account.html'));
console.log(`FINAL V18.8.51 AUDIT: ${n-fail}/${n} passed`);process.exit(fail?1:0);
