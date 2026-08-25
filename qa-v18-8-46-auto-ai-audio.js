const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),server=fs.readFileSync('server.js','utf8'),gradle=fs.readFileSync('android-app/app/build.gradle','utf8');
let failed=0;function t(name,ok){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failed++;}
t('manual Gemini button removed',!html.includes('id="aiConnect"'));
t('automatic Gemini copy present',html.includes('Gemini AI connects automatically'));
t('AI readiness uses /api/status',app.includes("fetch('/api/status'"));
t('chat auto-checks AI readiness',app.includes('await ensureAIReady()'));
t('legacy verify does not call Gemini',/pathname==='\/api\/verify'[\s\S]*?configured=Boolean\(process\.env\.GEMINI_API_KEY\)/.test(server));
t('recorded audio hardened with fetch/blob',app.includes('async function playAudioUrl')&&app.includes("cache:'force-cache'")&&app.includes('URL.createObjectURL(blob)'));
t('Khmer recordings use hardened playback',app.includes("playAudioUrl(hit.audio,{fallbackText:text,languageTag:'km-KH'})"));
t('Play versionCode is 3',gradle.includes('versionCode 3'));
t('Play versionName is 18.8.46',gradle.includes("versionName '18.8.46'"));
if(failed)process.exit(1);
