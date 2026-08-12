const fs=require('fs');const path=require('path');const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
let pass=0,fail=0;function ok(n,c){if(c){console.log('PASS',n);pass++}else{console.error('FAIL',n);fail++}}
ok('Buddy derives from learning language',app.includes('function buddyForLearningLanguage')&&app.includes('languages[key]?.mascot'));
ok('Central learning-language change syncs buddy',app.includes('function changeLearningLanguage')&&app.includes('syncBuddyWithLearningLanguage({clearConversation:changed})'));
ok('Course cards use central language change',app.includes("changeLearningLanguage(b.dataset.lang,{view:'learn',notice:true})"));
ok('Settings language change uses central helper',app.includes("changeLearningLanguage(b.dataset.modalLang,{view:'learn',closeModal:true,notice:true})"));
ok('Onboarding syncs buddy',app.includes('state.language=chosen;syncBuddyWithLearningLanguage({clearConversation:true})'));
ok('Cloud load repairs stale buddy',app.includes('normalizeState();syncBuddyWithLearningLanguage({clearConversation:true});localSave();render()'));
ok('Buddy renderer enforces target language',app.includes('function renderMascot(){\n syncBuddyWithLearningLanguage();'));
ok('Buddy target banner exists',html.includes('id="buddyTarget"'));
ok('Chat placeholder is target aware',app.includes('Message ${p.name} in ${learning.name}'));
ok('Interface language remains separate',app.includes('state.uiLanguage')&&app.includes('applyInterfaceLanguage'));
ok('Buddy route still uses selected mascot',app.includes('fetch(`/api/chat/${state.mascot}`'));
ok('Speech recognition follows buddy language',app.includes('rec.lang=mascotProfiles[state.mascot].lang'));
ok('V17.4.2 cache',sw.includes('ispeak-v17-4-2-core'));
ok('V17.4.2 title',html.includes('iSpeak Confidence V17.4.2'));
ok('Server reports V17.4.2',server.includes("version:'V17.4.2'"));
ok('Placement records V17.4.2',app.includes("version:'17.4.2'};save();"));

ok('Top Log In visible',html.includes('id="topLogin"'));
ok('Top Sign Up visible',html.includes('id="topSignup"'));
ok('Home Create free account visible',html.includes('id="heroSignup"'));
ok('Home Log in visible',html.includes('id="heroLogin"'));
ok('Account tabs implemented',app.includes('authLoginTab')&&app.includes('authSignupTab'));
ok('Password visibility control implemented',app.includes('showAccountPassword'));
ok('Guest welcome hides after sign in',app.includes("$('#guestWelcome').hidden=signedIn"));
console.log(`\n${pass}/${pass+fail} checks passed`);process.exit(fail?1:0);
