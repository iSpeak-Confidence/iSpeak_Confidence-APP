const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
let p=0,f=0;function ok(n,c){if(c){console.log('PASS',n);p++}else{console.error('FAIL',n);f++}}
ok('drawer localization targets data-view',/\#drawer \[data-view\], \.bottom-nav \[data-view\]/.test(app));
ok('home actions use exact data-view selectors',/\.hero-actions \[data-view="learn"\]/.test(app)&&/\.hero-actions \[data-view="teachers"\]/.test(app));
ok('daily goal uses actual hero-card',/\.hero-card \.eyebrow/.test(app)&&/localizedGoalText\(\)/.test(app));
ok('goal translations cover all 7 languages',['english','khmer','mandarin','spanish','french','japanese','arabic'].every(x=>new RegExp(x+':').test(app.slice(app.indexOf('function localizedGoalText'),app.indexOf('function applyFullInterfaceLanguage')))));
ok('guest banner explicitly localized',/guestTitle.*Save your progress on every device/.test(app)&&/guestCopy.*Create a free account or log in/.test(app));
ok('support/social shell localized',/supportChatBtn/.test(app)&&/ourSocialsBtn/.test(app));
ok('draw reapplies full shell localization',/renderCertificates\(\);applyInterfaceLanguage\(\);applyFullInterfaceLanguage\(\)/.test(app));
ok('web cache bumped',/app\.js\?v=18\.8\.56/.test(html)&&/18-8-56/.test(sw));
ok('native Android TTS fix retained',/iSpeakAndroid\/18\.8\.56/.test(fs.readFileSync('android-app/app/src/main/java/com/ispeakconfidence/app/MainActivity.java','utf8')));
ok('native script default fix retained',/defaultScriptMode/.test(app)||/romanized/.test(app));
console.log(`V18.8.56 global interface QA: ${p}/${p+f} passed`);process.exit(f?1:0);
