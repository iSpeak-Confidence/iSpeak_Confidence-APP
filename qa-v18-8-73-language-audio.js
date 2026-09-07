const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const pkg=require('./package.json');
let passed=0,failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'} ${name}`);condition?passed++:failed++}
const deviceStart=app.indexOf('function playDeviceSpeech');
const verifiedStart=app.indexOf('function playVerifiedLanguageAudio');
const localBranch=app.indexOf("if(!preferLocal)",deviceStart);
const browserStart=app.indexOf('new SpeechSynthesisUtterance',localBranch+20);
const serverFallback=app.indexOf('playServerSpeech(safeText,safeLang',browserStart);
check('all seven learning-language voice tags remain configured',[
  "lang:'km-KH'","lang:'en-GB'","lang:'zh-CN'","lang:'es-ES'",
  "lang:'fr-FR'","lang:'ja-JP'","lang:'ar-SA'"
].every(tag=>app.includes(tag)));
check('Learn audio has an immediate local-speech branch with network fallback',localBranch>deviceStart&&browserStart>localBranch&&serverFallback>browserStart);
check('standalone Listening Practice keeps its existing audio path',app.includes("const instantLearnAudio=t.id!=='practiceListenPlay'")&&app.includes('preferLocal:instantLearnAudio'));
check('Android native speech remains the first path',app.indexOf('window.iSpeakAndroid.speakWithRate',deviceStart)<browserStart);
check('Khmer exact human recording remains preferred',app.indexOf('exactKhmerHumanClip(text)',verifiedStart)>verifiedStart);
check('Khmer missing recording uses proven server voice instead of staying silent',app.includes("return playServerSpeech(text,'km-KH',{quiet:true}).then(ok=>ok||playDeviceSpeech"));
check('missing installed language voice falls back to server speech',app.includes('if(voices.length&&!matchingVoice)throw new Error'));
check('Learn and Listening controls share the fixed audio router',app.includes("t.matches('[data-play-language-audio],.hear-anchor')")&&app.includes('playVerifiedLanguageAudio(spoken,{preferLocal:instantLearnAudio})'));
check('release cache is V18.8.73',pkg.version==='18.8.73'&&html.includes('app.js?v=18.8.73')&&sw.includes('ispeak-v18-8-73-language-audio'));
console.log(`V18.8.73 language audio QA: ${passed}/${passed+failed} passed`);
process.exit(failed?1:0);
