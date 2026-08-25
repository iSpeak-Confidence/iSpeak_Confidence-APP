const fs=require('fs');const s=fs.readFileSync('app.js','utf8');
const checks=[
 ['render-time UI dictionary',s.includes('const RENDER_UI=')],
 ['all seven render languages',['english','khmer','mandarin','spanish','french','japanese','arabic'].every(k=>new RegExp('\\b'+k+':\\{').test(s.slice(s.indexOf('const RENDER_UI='),s.indexOf('function renderT'))))],
 ['dynamic course label localized',s.includes('localizedCourseName(state.language).toUpperCase()')&&s.includes('rui.course')],
 ['dynamic course title localized',s.includes('rui.path')],
 ['dynamic course description localized',s.includes("$('#courseDesc').textContent=rui.desc")],
 ['unit metadata localized',s.includes('const unitMeta=`${rui.unit}')&&s.includes('rui.guided')],
 ['unit title generated in My Language',s.includes('localizedUnitTitle(u)')],
 ['unit goal generated in My Language',s.includes('localizedUnitGoal(u)')],
 ['auth UI dictionary',s.includes('const AUTH_UI=')],
 ['all seven auth languages',['english','khmer','mandarin','spanish','french','japanese','arabic'].every(k=>new RegExp('\\b'+k+':\\{').test(s.slice(s.indexOf('const AUTH_UI='),s.indexOf('function authT'))))],
 ['login modal uses selected UI language',s.includes("const signup=kind==='register',a=AUTH_UI[state.uiLanguage]||AUTH_UI.english")],
 ['forgot password label localized',s.includes('${esc(a.forgot)}')],
 ['auth show hide localized',s.includes("authT('hide')")&&s.includes("authT('show')")],
 ['auth validation localized',s.includes("authT('needName')")&&s.includes("authT('needEmail')")&&s.includes("authT('needPassword')")],
 ['modal localizes injected UI',s.includes("localizeDocument($('#modalBody'))")],
 ['android native TTS fix retained',s.includes('window.iSpeakAndroid')]
];
let pass=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++}console.log(`${pass}/${checks.length}`);process.exit(pass===checks.length?0:1)
