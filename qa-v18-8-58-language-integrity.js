const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const lesson=fs.readFileSync('language-support-v17-5.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
let pass=0,fail=0;
function check(name,cond){if(cond){console.log('PASS',name);pass++}else{console.error('FAIL',name);fail++}}
const guaranteed=['spanish','french','japanese','arabic','khmer'];
check('GLOBAL_L10N_8 is merged into live translation dictionary',/Object\.entries\(GLOBAL_L10N_8\).*APP_UI_TEXT_EXTRA/.test(app));
check('V18.8.58 core learner UI dictionary exists',app.includes('const V1858_CORE='));
check('screenshot-critical translation guarantee exists',app.includes('const V1858_GUARANTEE='));
const guaranteeSlice=app.slice(app.indexOf('const V1858_GUARANTEE='),app.indexOf('Object.assign(APP_UI_TEXT_EXTRA.mandarin',app.indexOf('const V1858_GUARANTEE='))>0?app.indexOf('Object.assign(APP_UI_TEXT_EXTRA.mandarin',app.indexOf('const V1858_GUARANTEE=')):app.indexOf('function dynamicAppTr')); 
for(const l of guaranteed)check(`${l} guaranteed language map`,guaranteeSlice.includes(`\"${l}\":`));
check('mandarin screenshot-critical map',app.includes("mandarin:{\n  'Read something great'")&&app.includes("'Pinyin (English alphabet)':'拼音（拉丁字母）'"));
const critical=[
 'Pinyin (English alphabet)','Chinese characters','Foundation stage: romanization is available so you can learn sounds and meaning before keyboard skills.',
 'Learn before you answer','Study the meaning, listen to the full expression, say it aloud, and notice how it is written. The check below only uses language introduced in this unit.',
 'STAY CONNECTED','Follow iSpeak Confidence for language learning, updates and community content. You can also follow Live Rich Cambodia on YouTube.',
 'Photo or typed homework · guided help · all 7 languages','Open-ended real-life speaking practice','MY ISPEAK ACCOUNT','PASSWORD RECOVERY','NEW DEVICE VERIFICATION'
];
for(const k of critical)check(`critical phrase covered: ${k.slice(0,35)}`,app.includes(JSON.stringify(k))||app.includes(`'${k.replaceAll("'","\\'")}'`));
check('script buttons carry explicit unit/day/session IDs',/data-course-script="romanized" data-unit="\$\{unitIndex\}" data-day="\$\{dayIndex\}" data-session="\$\{sessionIndex\}"/.test(app));
check('critical script router persists chosen mode',app.includes("state.courseScriptMode[state.language]=mode;localSave()"));
check('critical script router rerenders exact active session',app.includes('openStudySession(u,d,ss)'));
check('script selection is passed active session IDs',app.includes('courseScriptChoiceMarkup(unitIndex,dayIndex,sessionIndex)'));
check('native mode no longer overlays romanization on anchor cards',!app.includes("courseScriptMode()==='native'&&x.reading?`<div class=\"romanization\">"));
check('course expression is controlled by saved script mode',/courseScriptMode\(\)==='romanized'.*x\?\.reading/.test(app));
check('Khmer lesson dictionary is no longer empty',!/khmer\s*:\s*\{\s*\}/.test(lesson));
check('Khmer has guided lesson instructions',lesson.includes("khmer:{")&&lesson.includes("guided:"));
check('library metadata is localized at render time',app.includes("appTr(b.format||'Complete book')")&&app.includes("appTr(b.level)"));
check('library AI tools localized at render time',app.includes("appTr('Homework Helper')")&&app.includes("appTr('Open-ended real-life speaking practice')"));
check('student password recovery uses app language',app.includes("appTr('PASSWORD RECOVERY')")&&app.includes("appTr('VERIFY YOUR EMAIL')"));
check('student signed-in account uses app language',app.includes("appTr('MY ISPEAK ACCOUNT')")&&app.includes("appTr('Sync now')"));
check('student message hub uses app language',app.includes("appTr('MY MESSAGES')")&&app.includes("appTr('MESSAGE YOUR TEACHER')"));
check('socials modal uses app language',app.includes("appTr('STAY CONNECTED')")&&app.includes("appTr('Links open in the official app when available, or in your browser.')"));
check('version 18.8.58 in index',index.includes('18.8.58'));
check('version 18.8.58 service worker cache',sw.includes('18-8-58')||sw.includes('18.8.58'));
check('Android versionName 18.8.58',gradle.includes("versionName '18.8.58'")||gradle.includes('versionName "18.8.58"'));
check('Android versionCode 13+',/versionCode\s+(1[3-9]|[2-9]\d+)/.test(gradle));
console.log(`Language integrity QA: ${pass}/${pass+fail} passed`);process.exit(fail?1:0);
