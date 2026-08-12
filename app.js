const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const courseOrderSafe=()=>['khmer','english','mandarin','spanish','french','japanese','arabic'];
const defaults={schemaVersion:1800,language:'khmer',xp:0,streak:0,completed:[],attempts:0,correct:0,dailyGoal:3,lastDay:'',activity:{},name:'Student',bookings:[],mascot:'jess',voice:true,roomMode:'talk',coins:20,mood:92,energy:88,ownedAccessories:['none'],accessory:'none',placement:{},studyCompleted:[],studyMinutes:0,email:'',certificates:{},unitMastery:{},placementDetail:{},uiLanguage:'english',onboardingDone:false,onboardingVersion:0,learningPlan:{reason:'Conversation',minutes:15,targetDate:'',targetLevel:'Beginner'},quests:{},missionProgress:{},pronunciationHistory:[],account:null,cloudSyncAt:null,khmerNativeSeen:[],libraryNotes:{},skillEvidence:{},errorHistory:[],learnerModel:{},translationFallbacks:{}};
const validMascots=['jess','jack','pedro','loulou','yuki','dariya','zayd'];
let loadedState={};
try{loadedState=JSON.parse(localStorage.getItem('isc-v17-5-0')||localStorage.getItem('isc-v17-3-0')||localStorage.getItem('isc-v17-2-1')||localStorage.getItem('isc-v17-2-0')||localStorage.getItem('isc-v16-0-6')||localStorage.getItem('isc-v15')||localStorage.getItem('isc-v13-4')||localStorage.getItem('isc-v9')||'{}')}catch{}
if(!validMascots.includes(loadedState.mascot))loadedState.mascot='jess';
const state=Object.assign({},defaults,loadedState);
function normalizeState(){
 if(!courseOrderSafe().includes(state.language))state.language='khmer';
 if(!courseOrderSafe().includes(state.uiLanguage))state.uiLanguage='english';
 if(!validMascots.includes(state.mascot))state.mascot='jess';
 for(const k of ['completed','bookings','studyCompleted','pronunciationHistory','khmerNativeSeen','errorHistory'])if(!Array.isArray(state[k]))state[k]=[];
 if(!state.skillEvidence||typeof state.skillEvidence!=='object')state.skillEvidence={};
 if(!state.learnerModel||typeof state.learnerModel!=='object')state.learnerModel={};
 if(!state.translationFallbacks||typeof state.translationFallbacks!=='object')state.translationFallbacks={};
 state.schemaVersion=1800;
 for(const k of ['activity','placement','certificates','unitMastery','placementDetail','learningPlan','quests','missionProgress','writingMastery','libraryNotes'])if(!state[k]||typeof state[k]!=='object'||Array.isArray(state[k]))state[k]={};
 state.dailyGoal=[1,3,5].includes(Number(state.dailyGoal))?Number(state.dailyGoal):3;
 state.xp=Math.max(0,Number(state.xp)||0);state.coins=Math.max(0,Number(state.coins)||0);state.streak=Math.max(0,Number(state.streak)||0);
}
normalizeState();
let __cloudTimer=null;
const localSave=()=>{state.schemaVersion=1750;localStorage.setItem('isc-v17-5-0',JSON.stringify(state));};
const save=()=>{localSave();render();if(state.account?.token){clearTimeout(__cloudTimer);__cloudTimer=setTimeout(()=>cloudSave().catch(()=>{}),900)}};
async function apiJSON(path,opts={}){const h={'Content-Type':'application/json',...(opts.headers||{})};if(state.account?.token)h.Authorization='Bearer '+state.account.token;const r=await fetch(path,{...opts,headers:h});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'Request failed');return d}
async function cloudSave(){if(!state.account?.token)return;const copy=JSON.parse(JSON.stringify(state));delete copy.account;const d=await apiJSON('/api/account/progress',{method:'PUT',body:JSON.stringify({state:copy})});state.cloudSyncAt=d.updatedAt||new Date().toISOString();localSave()}
async function cloudLoad(){if(!state.account?.token)return;const d=await apiJSON('/api/account/progress');if(d.state&&typeof d.state==='object'){const account=state.account;Object.assign(state,d.state);state.account=account;state.cloudSyncAt=d.updatedAt||null;normalizeState();syncBuddyWithLearningLanguage({clearConversation:true});localSave();render()}}

const esc=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const languages={
 khmer:{name:'Khmer',flag:'🇰🇭',native:'ភាសាខ្មែរ',lang:'km-KH',title:'Khmer Beginner Foundations',desc:'Useful everyday Khmer based on the lesson material supplied to iSpeak Confidence.',mascot:'dariya',writing:'ក',speech:['អរគុណ','Aw koun','Thank you'],cards:[['ថ្ងៃនេះ','Thngai nih','Today'],['ស្អែក','Saek','Tomorrow'],['ព្រឹក','Proek','Morning'],['ផ្ទះ','Pteah','Home'],['មិត្តភក្តិ','Mitt phek','Friend'],['ទៅត្រង់','Tov trang','Go straight']]},
 english:{name:'English',flag:'🇬🇧',native:'English',lang:'en-GB',title:'Practical Spoken English',desc:'Build natural everyday English for work, travel and real conversation.',mascot:'jess',writing:null,speech:['How are you today?','Everyday question','Ask about someone’s wellbeing'],cards:[['confident','Adjective','feeling sure of yourself'],['usually','Adverb','most of the time'],['because','Connector','gives a reason'],['available','Adjective','free and ready'],['recommend','Verb','suggest something']]},
 mandarin:{name:'Mandarin',flag:'🇨🇳',native:'中文',lang:'zh-CN',title:'Everyday Mandarin',desc:'Start speaking useful Mandarin for greetings, food, travel and daily life.',mascot:'jack',writing:'你',speech:['你好','Nǐ hǎo','Hello'],cards:[['你好','Nǐ hǎo','Hello'],['谢谢','Xièxie','Thank you'],['今天','Jīntiān','Today'],['朋友','Péngyou','Friend'],['水','Shuǐ','Water']]},
 spanish:{name:'Spanish',flag:'🇪🇸',native:'Español',lang:'es-ES',title:'Everyday Spanish',desc:'Build practical Spanish for introductions, food, travel and conversation.',mascot:'pedro',writing:null,speech:['¿Cómo estás?','How are you?','Everyday greeting'],cards:[['Hola','Greeting','Hello'],['Gracias','Phrase','Thank you'],['Hoy','Time','Today'],['Amigo','Noun','Friend'],['Agua','Noun','Water']]},
 french:{name:'French',flag:'🇫🇷',native:'Français',lang:'fr-FR',title:'Everyday French',desc:'Learn natural French phrases for daily situations and confident speaking.',mascot:'loulou',writing:null,speech:['Comment ça va ?','How are you?','Everyday greeting'],cards:[['Bonjour','Greeting','Hello'],['Merci','Phrase','Thank you'],['Aujourd’hui','Time','Today'],['Ami','Noun','Friend'],['Eau','Noun','Water']]},
 japanese:{name:'Japanese',flag:'🇯🇵',native:'日本語',lang:'ja-JP',title:'Everyday Japanese',desc:'Learn beginner Japanese for greetings, travel and simple daily conversation.',mascot:'yuki',writing:'あ',speech:['こんにちは','Konnichiwa','Hello'],cards:[['こんにちは','Konnichiwa','Hello'],['ありがとう','Arigatō','Thank you'],['今日','Kyō','Today'],['友達','Tomodachi','Friend'],['水','Mizu','Water']]},
 arabic:{name:'Arabic',flag:'🌐',native:'العربية',lang:'ar-SA',title:'Modern Standard Arabic',desc:'Build a strong Modern Standard Arabic foundation for reading, writing, listening and conversation.',mascot:'zayd',writing:'ا',rtl:true,speech:['مرحبا','marḥaban','Hello'],cards:[['مرحبا','marḥaban','Hello'],['شكرا','shukran','Thank you'],['اليوم','al-yawm','Today'],['صديق','ṣadīq','Friend'],['ماء','māʾ','Water']]}
};

const courses={
khmer:[
{id:'kh1',icon:'👋',title:'Greetings & Introductions',desc:'Hello, names and where you are from.',type:'quiz',word:'តើអ្នកឈ្មោះអ្វី?',reading:'Ta neak chhmuah avei?',q:'What does this ask?',choices:['What is your name?','Where is the market?','Are you hungry?','What time is it?'],a:'What is your name?'},
{id:'kh2',icon:'☀️',title:'Talking About Your Day',desc:'Today, tomorrow, morning and daily routines.',type:'quiz',word:'ថ្ងៃនេះ',reading:'Thngai nih',q:'Choose the meaning.',choices:['Today','Tomorrow','Night','Friend'],a:'Today'},
{id:'kh3',icon:'🍜',title:'Food & Ordering',desc:'Hungry, delicious, food and ordering.',type:'quiz',word:'ឃ្លាន',reading:'Khlean',q:'What does this mean?',choices:['Hungry','Full','Water','Sleep'],a:'Hungry'},
{id:'kh4',icon:'🎙️',title:'Speak: Thank You',desc:'Practice a useful phrase out loud.',type:'speech',word:'អរគុណ',reading:'Aw koun',meaning:'Thank you'},
{id:'kh5',icon:'✍️',title:'Khmer Letter Practice',desc:'Trace a Khmer character.',type:'writing',word:'ក'},
{id:'kh6',icon:'🗺️',title:'Directions',desc:'Straight, left, right, near and far.',type:'quiz',word:'ទៅត្រង់',reading:'Tov trang',q:'Choose the meaning.',choices:['Turn left','Go straight','Turn right','Far'],a:'Go straight'},
{id:'kh7',icon:'🛺',title:'Local Travel',desc:'Useful language for getting around.',type:'quiz',word:'ជិត',reading:'Chit',q:'What does this mean?',choices:['Near','Far','Left','Market'],a:'Near'},
{id:'kh8',icon:'💬',title:'Build Longer Sentences',desc:'Combine a subject, verb, object and time.',type:'quiz',word:'ខ្ញុំផឹកកាហ្វេរាល់ព្រឹក។',reading:'Khnhom phek ka-fae reall proek.',q:'Choose the best meaning.',choices:['I drink coffee every morning.','I work every night.','I buy rice tomorrow.','I am going home.'],a:'I drink coffee every morning.'}],
english:[
{id:'en1',icon:'👋',title:'Meet & Greet',desc:'Introduce yourself naturally.',type:'quiz',word:'Nice to meet you.',reading:'Conversation phrase',q:'Choose the natural reply.',choices:['Nice to meet you too.','I am table.','Five blue.','At kilograms.'],a:'Nice to meet you too.'},
{id:'en2',icon:'🗣️',title:'Everyday English',desc:'High-frequency daily questions.',type:'quiz',word:'How was your day?',reading:'Everyday question',q:'Choose the best answer.',choices:['It was good, thanks.','On the left.','Three bottles.','I am pencil.'],a:'It was good, thanks.'},
{id:'en3',icon:'🎙️',title:'Clear Speech',desc:'Practice a polite request.',type:'speech',word:'I would like a coffee, please.',reading:'Speak clearly',meaning:'Polite request'},
{id:'en4',icon:'🍽️',title:'Restaurants',desc:'Order food politely.',type:'quiz',word:'Could I see the menu, please?',reading:'Polite request',q:'Which sentence is most polite?',choices:['Give menu.','Could I see the menu, please?','Menu now!','You menu.'],a:'Could I see the menu, please?'},
{id:'en5',icon:'💼',title:'Work & Small Talk',desc:'Talk naturally with colleagues.',type:'quiz',word:'What do you do?',reading:'Common question',q:'What is usually being asked?',choices:['Their job','Their address','Their age','Their lunch'],a:'Their job'},
{id:'en6',icon:'✈️',title:'Travel English',desc:'Airports, hotels and transport.',type:'quiz',word:'Where is the check-in desk?',reading:'Travel question',q:'Where would you use this?',choices:['Airport','Gym','Pool','Classroom'],a:'Airport'},
{id:'en7',icon:'🧠',title:'Longer Answers',desc:'Connect ideas with because, but and so.',type:'quiz',word:'because',reading:'Linking word',q:'Complete: I stayed home ___ it was raining.',choices:['because','but','or','than'],a:'because'},
{id:'en8',icon:'🎧',title:'Clarification',desc:'Ask someone to repeat.',type:'quiz',word:'Could you say that again, please?',reading:'Clarification phrase',q:'When is this useful?',choices:['When you did not hear clearly','When saying goodbye','When ordering two coffees','When asking age'],a:'When you did not hear clearly'}],
mandarin:[
{id:'zh1',icon:'👋',title:'Hello & Introductions',desc:'Basic greetings and names.',type:'quiz',word:'你好',reading:'Nǐ hǎo',q:'What does this mean?',choices:['Hello','Goodbye','Thank you','Water'],a:'Hello'},
{id:'zh2',icon:'🙏',title:'Polite Phrases',desc:'Thank you and simple courtesy.',type:'quiz',word:'谢谢',reading:'Xièxie',q:'Choose the meaning.',choices:['Thank you','Sorry','Today','Friend'],a:'Thank you'},
{id:'zh3',icon:'🎙️',title:'Speak Mandarin',desc:'Practice a greeting.',type:'speech',word:'你好',reading:'Nǐ hǎo',meaning:'Hello'},
{id:'zh4',icon:'☀️',title:'Daily Life',desc:'Today and everyday language.',type:'quiz',word:'今天',reading:'Jīntiān',q:'What does this mean?',choices:['Today','Tomorrow','Yesterday','Night'],a:'Today'},
{id:'zh5',icon:'✍️',title:'Character Practice',desc:'Trace a beginner Chinese character.',type:'writing',word:'你'},
{id:'zh6',icon:'🍜',title:'Food & Drink',desc:'Useful restaurant vocabulary.',type:'quiz',word:'水',reading:'Shuǐ',q:'Choose the meaning.',choices:['Water','Rice','Tea','Coffee'],a:'Water'},
{id:'zh7',icon:'👥',title:'Friends & People',desc:'Talk about people around you.',type:'quiz',word:'朋友',reading:'Péngyou',q:'What does this mean?',choices:['Friend','Teacher','Family','Student'],a:'Friend'},
{id:'zh8',icon:'💬',title:'Mini Conversation',desc:'Respond naturally to a greeting.',type:'quiz',word:'你好吗？',reading:'Nǐ hǎo ma?',q:'Choose the best meaning.',choices:['How are you?','Where are you?','What time is it?','How much is it?'],a:'How are you?'}],
spanish:[
{id:'es1',icon:'👋',title:'Hola!',desc:'Greetings and introductions.',type:'quiz',word:'Hola',reading:'Greeting',q:'What does this mean?',choices:['Hello','Goodbye','Please','Tomorrow'],a:'Hello'},
{id:'es2',icon:'🙂',title:'How Are You?',desc:'Ask and answer how someone feels.',type:'quiz',word:'¿Cómo estás?',reading:'Everyday question',q:'Choose the meaning.',choices:['How are you?','What is your name?','Where are you?','How old are you?'],a:'How are you?'},
{id:'es3',icon:'🎙️',title:'Speak Spanish',desc:'Practice an everyday question.',type:'speech',word:'¿Cómo estás?',reading:'How are you?',meaning:'Everyday greeting'},
{id:'es4',icon:'🙏',title:'Polite Spanish',desc:'Thanks and useful courtesy.',type:'quiz',word:'Gracias',reading:'Phrase',q:'Choose the meaning.',choices:['Thank you','Sorry','Excuse me','Hello'],a:'Thank you'},
{id:'es5',icon:'☀️',title:'Daily Life',desc:'Talk about today.',type:'quiz',word:'Hoy',reading:'Time word',q:'What does this mean?',choices:['Today','Tomorrow','Yesterday','Morning'],a:'Today'},
{id:'es6',icon:'🍽️',title:'Food & Drink',desc:'Simple restaurant vocabulary.',type:'quiz',word:'Agua',reading:'Noun',q:'Choose the meaning.',choices:['Water','Bread','Coffee','Rice'],a:'Water'},
{id:'es7',icon:'👥',title:'Friends',desc:'Talk about people.',type:'quiz',word:'Amigo',reading:'Noun',q:'Choose the meaning.',choices:['Friend','Brother','Teacher','Waiter'],a:'Friend'},
{id:'es8',icon:'✈️',title:'Travel Basics',desc:'Useful questions while travelling.',type:'quiz',word:'¿Dónde está...?',reading:'Question starter',q:'What is it used to ask?',choices:['Where is...?','How much?','Who is it?','Why?'],a:'Where is...?'}],
french:[
{id:'fr1',icon:'👋',title:'Bonjour!',desc:'Greetings and introductions.',type:'quiz',word:'Bonjour',reading:'Greeting',q:'What does this mean?',choices:['Hello','Goodbye','Please','Tomorrow'],a:'Hello'},
{id:'fr2',icon:'🙂',title:'How Are You?',desc:'Ask how someone is doing.',type:'quiz',word:'Comment ça va ?',reading:'Everyday question',q:'Choose the meaning.',choices:['How are you?','What is your name?','Where are you?','How old are you?'],a:'How are you?'},
{id:'fr3',icon:'🎙️',title:'Speak French',desc:'Practice an everyday greeting.',type:'speech',word:'Comment ça va ?',reading:'How are you?',meaning:'Everyday greeting'},
{id:'fr4',icon:'🙏',title:'Polite French',desc:'Thanks and simple courtesy.',type:'quiz',word:'Merci',reading:'Phrase',q:'Choose the meaning.',choices:['Thank you','Sorry','Hello','Good night'],a:'Thank you'},
{id:'fr5',icon:'☀️',title:'Daily Life',desc:'Talk about today.',type:'quiz',word:'Aujourd’hui',reading:'Time word',q:'What does this mean?',choices:['Today','Tomorrow','Yesterday','Evening'],a:'Today'},
{id:'fr6',icon:'🍽️',title:'Food & Drink',desc:'Simple restaurant vocabulary.',type:'quiz',word:'Eau',reading:'Noun',q:'Choose the meaning.',choices:['Water','Coffee','Bread','Rice'],a:'Water'},
{id:'fr7',icon:'👥',title:'Friends',desc:'Talk about people.',type:'quiz',word:'Ami',reading:'Noun',q:'Choose the meaning.',choices:['Friend','Teacher','Brother','Waiter'],a:'Friend'},
{id:'fr8',icon:'✈️',title:'Travel Basics',desc:'Ask where something is.',type:'quiz',word:'Où est... ?',reading:'Question starter',q:'What is it used to ask?',choices:['Where is...?','How much?','When?','Why?'],a:'Where is...?'}],
japanese:[
{id:'ja1',icon:'👋',title:'Konnichiwa!',desc:'Greetings and introductions.',type:'quiz',word:'こんにちは',reading:'Konnichiwa',q:'What does this mean?',choices:['Hello','Goodbye','Thank you','Water'],a:'Hello'},
{id:'ja2',icon:'🙏',title:'Thank You',desc:'A very useful polite phrase.',type:'quiz',word:'ありがとう',reading:'Arigatō',q:'Choose the meaning.',choices:['Thank you','Sorry','Today','Friend'],a:'Thank you'},
{id:'ja3',icon:'🎙️',title:'Speak Japanese',desc:'Practice a greeting.',type:'speech',word:'こんにちは',reading:'Konnichiwa',meaning:'Hello'},
{id:'ja4',icon:'☀️',title:'Daily Life',desc:'Learn a basic time word.',type:'quiz',word:'今日',reading:'Kyō',q:'What does this mean?',choices:['Today','Tomorrow','Yesterday','Morning'],a:'Today'},
{id:'ja5',icon:'✍️',title:'Hiragana Practice',desc:'Trace a beginner hiragana character.',type:'writing',word:'あ'},
{id:'ja6',icon:'🍜',title:'Food & Drink',desc:'Useful basic vocabulary.',type:'quiz',word:'水',reading:'Mizu',q:'Choose the meaning.',choices:['Water','Tea','Rice','Coffee'],a:'Water'},
{id:'ja7',icon:'👥',title:'Friends',desc:'Talk about people.',type:'quiz',word:'友達',reading:'Tomodachi',q:'What does this mean?',choices:['Friend','Teacher','Family','Student'],a:'Friend'},
{id:'ja8',icon:'💬',title:'Simple Question',desc:'Recognize a common question.',type:'quiz',word:'元気ですか？',reading:'Genki desu ka?',q:'Choose the best meaning.',choices:['How are you?','What is your name?','Where is it?','How much?'],a:'How are you?'}]
};

const mascotProfiles={
 jess:{name:'Jess',animal:'Cat',image:'assets/mascots/jess-v13.png',flag:'🇬🇧',language:'English',lang:'en-GB',voice:'coral',desc:'Cheerful, kind and encouraging English conversation friend.',starters:['Hi Jess! How are you?','Can we practise English conversation?','Correct my English while we talk.']},
 jack:{name:'Jack Chen',animal:'Panda',image:'assets/mascots/jack-cutout.png',flag:'🇨🇳',language:'Mandarin',lang:'zh-CN',voice:'cedar',desc:'Smart, curious and patient Mandarin learning companion.',starters:['你好 Jack！','我想练习中文。','Can you teach me a useful Mandarin phrase?']},
 pedro:{name:'Pedro',animal:'Fox',image:'assets/mascots/pedro-v13-cutout.png',flag:'🇪🇸',language:'Spanish',lang:'es-ES',voice:'verse',desc:'Energetic and friendly Spanish conversation partner.',starters:['¡Hola Pedro!','Quiero practicar español.','Corrige mi español mientras hablamos.']},
 loulou:{name:'Loulou',animal:'Rabbit',image:'assets/mascots/loulou-v13-cutout.png',flag:'🇫🇷',language:'French',lang:'fr-FR',voice:'shimmer',desc:'Sweet, playful and supportive French companion.',starters:['Bonjour Loulou !','Je veux pratiquer le français.','Corrige mon français pendant la conversation.']},
 yuki:{name:'Yuki',animal:'Shiba dog',image:'assets/mascots/yuki-v13-cutout.png',flag:'🇯🇵',language:'Japanese',lang:'ja-JP',voice:'marin',desc:'Calm, helpful and cheerful Japanese learning friend.',starters:['こんにちは Yuki！','日本語を練習したいです。','Can you teach me beginner Japanese?']},
 dariya:{name:'Dariya',animal:'Cambodian girl',image:'assets/mascots/dariya-v13-complete-fixed.png',flag:'🇰🇭',language:'Khmer',lang:'km-KH',voice:'sage',desc:'Gentle, patient Cambodian Khmer learning companion.',starters:['សួស្តី Dariya!','I want to practise Khmer.','Help me practise the Khmer from my lessons.']},
 zayd:{name:'Zayd',animal:'Falcon',image:'assets/mascots/zayd-v13-complete-fixed.png',flag:'🌐',language:'Arabic (MSA)',lang:'ar-SA',voice:'cedar',desc:'Warm, patient Modern Standard Arabic learning companion.',starters:['مرحباً يا زيد','أريد أن أتعلم العربية.','Teach me beginner Modern Standard Arabic.']}
};


function buddyForLearningLanguage(lang=state.language){
 const key=courseOrderSafe().includes(lang)?lang:'english';
 return languages[key]?.mascot||'jess';
}
function syncBuddyWithLearningLanguage({clearConversation=false}={}){
 const expected=buddyForLearningLanguage(state.language);
 const changed=state.mascot!==expected;
 if(changed){
   if(typeof disconnectAI==='function')disconnectAI(false);
   state.mascot=expected;
   if(clearConversation&&typeof chatHistory!=='undefined')chatHistory=[];
 }
 return changed;
}
function changeLearningLanguage(lang,{view='learn',closeModal=false,notice=true}={}){
 if(!courseOrderSafe().includes(lang))return false;
 const changed=state.language!==lang;
 state.language=lang;
 syncBuddyWithLearningLanguage({clearConversation:changed});
 save();
 if(typeof renderLibrary==='function')renderLibrary();
 if(closeModal&&$('#modal')?.open)$('#modal').close();
 if(view)setView(view);
 if(notice)toast(`Now learning ${languages[lang].name} • Buddy: ${mascotProfiles[state.mascot].name}`);
 return true;
}

const commandPatterns={
 jump:[/\bjump\b/i,/跳/i,/salta/i,/saute/i,/ジャンプ|跳ん/i,/លោត/i],
 run:[/\brun\b/i,/跑/i,/corre/i,/cours/i,/走って|走る/i,/រត់/i],
 sit:[/\bsit( down)?\b/i,/坐下/i,/si[eé]ntate/i,/assis|assieds/i,/座って|座る/i,/អង្គុយ/i],
 lie:[/\blie( down)?\b/i,/躺下/i,/acu[eé]state/i,/allonge/i,/横になって/i,/ដេក/i],
 wave:[/\bwave\b/i,/挥手/i,/saluda/i,/fais signe|salue/i,/手を振って/i,/គ្រវីដៃ/i],
 dance:[/\bdance\b/i,/跳舞/i,/baila/i,/danse/i,/踊って|踊る/i,/រាំ/i],
 stand:[/\bstand( up)?\b/i,/站起来/i,/lev[aá]ntate/i,/debout|l[eè]ve-toi/i,/立って/i,/ឈរ/i],
 idle:[/\bstop\b/i,/停止|停下/i,/para/i,/arr[eê]te/i,/止まって/i,/ឈប់/i]
};

const courseOrder=['khmer','english','mandarin','spanish','french','japanese','arabic'];
const longCourse=window.ISC_CURRICULUM;
const supportLayer=window.ISC_SUPPORT||null;
function supportLangName(k=state.uiLanguage){return supportLayer?.meta?.[k]?.native||languages?.[k]?.name||'English'}
function supportT(k){return supportLayer?.t?.(state.uiLanguage,k)||k}
function lessonT(k){return supportLayer?.lessonT?.(state.uiLanguage,k)||k}
function supportResult(raw,target=state.language){return supportLayer?.translateMeaning?.(raw,state.uiLanguage,target)||{text:String(raw||''),verified:state.uiLanguage==='english',fallback:state.uiLanguage!=='english'}}
function supportMeaning(raw,target=state.language){return supportResult(raw,target).text}
function supportMeaningMarkup(raw,target=state.language){const r=supportResult(raw,target);return `<div class="support-meaning ${r.fallback?'support-fallback':''}"><small>${esc(supportT('meaning'))} • ${esc(supportLangName())}</small><span>${esc(r.text)}</span>${r.fallback?`<i title="${esc(supportT('fallback'))}">EN</i>`:''}</div>`}
function directionMarkup(){const d=supportLayer?.direction?.(state.uiLanguage,state.language);return d?`<div class="language-direction"><span><b>${esc(supportT('support'))}</b> ${d.support.flag} ${esc(d.support.native)}</span><strong>→</strong><span><b>${esc(supportT('target'))}</b> ${d.target.flag} ${esc(d.target.native)}</span></div>`:''}
function refreshDirectionUI(){document.querySelectorAll('[data-direction-summary]').forEach(x=>x.innerHTML=directionMarkup());const h=document.querySelector('#dualLanguageHint');if(h)h.textContent=supportT('supportHint');const ft=document.querySelector('#headerLanguageSwitcher .flag-menu-title');if(ft)ft.textContent=supportT('iSpeak')}
function localDateOffset(days=0){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function learnerSkill(lang,skill){state.learnerModel=state.learnerModel||{};const lk=state.learnerModel[lang]||(state.learnerModel[lang]={skills:{},updatedAt:null});lk.skills=lk.skills||{};return lk.skills[skill]||(lk.skills[skill]={attempts:0,successes:0,independent:0,transfer:0,errors:0,lastSeen:null,lastSuccess:null});}
function recordLearningEvidence(skill,ok,{independent=false,transfer=false,target='',source='activity'}={}){const m=learnerSkill(state.language,skill);m.attempts++;if(ok){m.successes++;if(independent)m.independent++;if(transfer)m.transfer++;m.lastSuccess=new Date().toISOString()}else{m.errors++;state.errorHistory=state.errorHistory||[];state.errorHistory.push({language:state.language,skill,date:localDateOffset(0),target:String(target||'').slice(0,180),source});state.errorHistory=state.errorHistory.slice(-250)}m.lastSeen=new Date().toISOString();state.learnerModel[state.language].updatedAt=m.lastSeen;const accuracy=m.attempts?m.successes/m.attempts:0,depth=Math.min(1,(m.independent+m.transfer*1.5)/Math.max(4,m.attempts));state.skillEvidence=state.skillEvidence||{};state.skillEvidence[`${state.language}:${skill}`]=Math.round(Math.min(100,(accuracy*.72+depth*.28)*100));}
function learningConfidence(lang,skill){const m=state.learnerModel?.[lang]?.skills?.[skill];if(!m||!m.attempts)return state.skillEvidence?.[`${lang}:${skill}`]||0;const accuracy=m.successes/m.attempts,depth=Math.min(1,(m.independent+m.transfer*1.5)/Math.max(4,m.attempts));return Math.round(Math.min(100,(accuracy*.72+depth*.28)*100))}
const studyTypes=longCourse.sessionTypes;
const studyDone=(lang=state.language)=>state.studyCompleted.filter(x=>x.startsWith(lang+'-')&&/-d1-s[1-8]$/.test(x)).length;
const totalStudySessions=longCourse.days*longCourse.sessionsPerDay;

const certificateCodes={khmer:'KH',english:'EN',mandarin:'ZH',spanish:'ES',french:'FR',japanese:'JA',arabic:'AR'};
const certificateCourseNames={khmer:'KHMER 30-UNIT MASTERY COURSE',english:'ENGLISH 30-UNIT MASTERY COURSE',mandarin:'MANDARIN CHINESE 30-UNIT MASTERY COURSE',spanish:'SPANISH 30-UNIT MASTERY COURSE',french:'FRENCH 30-UNIT MASTERY COURSE',japanese:'JAPANESE 30-UNIT MASTERY COURSE',arabic:'ARABIC (MSA) 30-UNIT MASTERY COURSE'};
function certificateId(lang){
 const code=certificateCodes[lang]||'XX', stamp=new Date().getFullYear();
 const seed=(crypto?.randomUUID?.()||Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,8).toUpperCase();
 return `ISC-${code}-${stamp}-${seed}`;
}
function courseComplete(lang){return studyDone(lang)>=totalStudySessions}
function certificatePayload(lang){
 const c=state.certificates?.[lang];
 return {name:state.name||'Student',email:state.email||'',language:languages[lang].name,languageKey:lang,courseName:certificateCourseNames[lang],certificateId:c?.id||'',completionDate:c?.date||today(),completedSessions:studyDone(lang),plannedActivities:240};
}
async function maybeAwardCertificate(lang){
 if(!courseComplete(lang))return;
 state.certificates=state.certificates||{};
 if(!state.certificates[lang])state.certificates[lang]={id:certificateId(lang),date:today(),emailed:false,awarded:true};
 save();
 const c=state.certificates[lang];
 if(state.email&&!c.emailed){
   try{
     if(!state.account?.token)return;
     const j=await apiJSON('/api/certificate/email',{method:'POST',body:JSON.stringify(certificatePayload(lang))});
     if(j.ok){c.id=j.certificateId||c.id;c.emailed=true;c.emailedAt=new Date().toISOString();save();toast(`${languages[lang].name} certificate emailed to ${state.email}`)}
   }catch(e){console.warn('Certificate email not sent automatically',e)}
 }
 setTimeout(()=>openCertificate(lang,true),250);
}
function certificateHTML(lang,printMode=false){
 const p=certificatePayload(lang);
 return `<div class="digital-certificate ${printMode?'print-certificate':''}">
   <div class="cert-corner cert-corner-a"></div><div class="cert-corner cert-corner-b"></div>
   <div class="cert-brand"><img src="assets/logo.png" alt="iSpeak Confidence"><span>iSpeak Confidence</span></div>
   <div class="cert-title">CERTIFICATE</div><div class="cert-subtitle">OF COMPLETION</div>
   <div class="cert-rule"></div><div class="cert-small">THIS IS TO CERTIFY THAT</div>
   <div class="cert-name">${esc(p.name)}</div>
   <div class="cert-small">HAS SUCCESSFULLY COMPLETED THE</div>
   <div class="cert-course">${esc(p.courseName)}</div>
   <p class="cert-copy">Awarded for completing all 240 structured learning blocks in the 30-unit iSpeak Confidence mastery pathway, covering speaking, listening, reading, writing, vocabulary, grammar and conversation.</p>
   <div class="cert-stats"><div><b>240</b><span>Learning Blocks</span></div><div><b>30</b><span>Units</span></div><div><b>100%</b><span>Course Completion</span></div></div>
   <div class="cert-bottom"><div><small>COMPLETION DATE</small><b>${esc(p.completionDate)}</b></div><div class="cert-seal">iS<br><small>CONFIDENCE</small></div><div class="cert-id"><small>CERTIFICATE ID</small><b>${esc(p.certificateId)}</b></div></div>
   <div class="cert-signature"><span>Nathan</span><small>iSpeak Confidence</small></div>
 </div>`;
}
function openCertificate(lang,justAwarded=false){
 if(!courseComplete(lang))return toast('Complete 100% of this language course to unlock the certificate.');
 state.certificates=state.certificates||{};
 if(!state.certificates[lang]){state.certificates[lang]={id:certificateId(lang),date:today(),emailed:false,awarded:true};save()}
 const c=state.certificates[lang];
 modal(`${justAwarded?'<div class="certificate-unlocked">🏆 Certificate unlocked!</div>':''}${certificateHTML(lang)}
 <div class="certificate-actions"><button id="printCertificate" class="primary">🖨️ Print / Save as PDF</button><button id="emailCertificate" class="secondary">✉️ ${c.emailed?'Email again':'Email certificate'}</button></div>
 <p id="certificateEmailStatus" class="certificate-email-status">${c.emailed&&state.email?`Last sent to ${esc(state.email)}`:'Your certificate email uses the address saved in Profile & Settings.'}</p>`);
 $('#printCertificate').onclick=()=>printCertificate(lang);
 $('#emailCertificate').onclick=()=>emailCertificate(lang);
}
function printCertificate(lang){
 const w=window.open('','_blank','width=1200,height=850');
 if(!w)return toast('Please allow pop-ups to print your certificate.');
 w.document.write(`<!doctype html><html><head><title>${certificateCourseNames[lang]} Certificate</title><link rel="stylesheet" href="${location.origin}/styles.css"></head><body class="certificate-print-page">${certificateHTML(lang,true)}</body></html>`);
 w.document.close();w.onload=()=>setTimeout(()=>w.print(),300);
}
async function emailCertificate(lang){
 if(!state.email){
   const el=$('#certificateEmailStatus');if(el)el.textContent='Add your email address in Profile & Settings first.';
   return;
 }
 const el=$('#certificateEmailStatus');if(el)el.textContent='Sending certificate…';
 try{
   if(!state.account?.token)throw new Error('Sign in first so the server can verify your course completion.');
   const j=await apiJSON('/api/certificate/email',{method:'POST',body:JSON.stringify(certificatePayload(lang))});
   state.certificates[lang].id=j.certificateId||state.certificates[lang].id;
   state.certificates[lang].emailed=true;state.certificates[lang].emailedAt=new Date().toISOString();save();
   if(el)el.textContent=`Certificate sent to ${state.email}.`;toast('Certificate emailed successfully.');
 }catch(e){if(el)el.textContent=e.message;toast(e.message)}
}
function renderCertificates(){
 const grid=$('#certificateGrid');if(!grid)return;
 grid.innerHTML=courseOrder.map(k=>{const done=studyDone(k),complete=done>=totalStudySessions,c=state.certificates?.[k];return `<article class="certificate-card ${complete?'unlocked':'locked'}"><div class="certificate-card-icon">${complete?'🏆':'🔒'}</div><div><b>${languages[k].flag} ${languages[k].name}</b><span>${complete?'Certificate earned':`${done}/${totalStudySessions} sessions`}</span>${c?`<small>${esc(c.id)}</small>`:''}</div><button class="${complete?'primary':'secondary'}" data-cert="${k}" ${complete?'':'disabled'}>${complete?'View certificate':'Locked'}</button></article>`}).join('');
 $$('[data-cert]',grid).forEach(b=>b.onclick=()=>openCertificate(b.dataset.cert));
}

const commandLabels={jump:'Jumping!',run:'Running!',sit:'Sitting down…',lie:'Lying down…',wave:'Waving!',dance:'Dancing!',stand:'Standing up!',idle:'Ready'};
let animTimer=null, aiConnected=false, chatHistory=[], currentAudio=null;

function detectedCommand(text){for(const [name,patterns] of Object.entries(commandPatterns)){if(patterns.some(r=>r.test(text)))return name}return null}

// V16.1.0 Digital Library — internal reader, no external tabs.
const libraryBooks={
 english:[
  {id:"alice-easy",title:"Alice in Wonderland — Easy Retelling",author:"J. C. Gorham after Lewis Carroll",level:"Beginner",icon:"🐇",featured:true,dataFile:"library-books/processed/alice-easy.json",chapterCount:12,format:"Complete adapted classic",source:"Project Gutenberg #19551"},
  {id:"alice",title:"Alice’s Adventures in Wonderland",author:"Lewis Carroll",level:"Intermediate",icon:"🎩",featured:true,dataFile:"library-books/processed/alice.json",chapterCount:12,format:"Complete novel",source:"Project Gutenberg #11"},
  {id:"lookingglass",title:"Through the Looking-Glass",author:"Lewis Carroll",level:"Intermediate",icon:"🪞",dataFile:"library-books/processed/lookingglass.json",chapterCount:12,format:"Complete novel",source:"Project Gutenberg #12"},
  {id:"treasure",title:"Treasure Island",author:"Robert Louis Stevenson",level:"Intermediate",icon:"🏴‍☠️",featured:true,dataFile:"library-books/processed/treasure.json",chapterCount:34,format:"Complete novel",source:"Project Gutenberg #120"},
  {id:"sherlock",title:"The Adventures of Sherlock Holmes",author:"Arthur Conan Doyle",level:"Intermediate",icon:"🔎",featured:true,dataFile:"library-books/processed/sherlock.json",chapterCount:12,format:"12 complete stories",source:"Project Gutenberg #1661"},
  {id:"pride",title:"Pride and Prejudice",author:"Jane Austen",level:"Advanced",icon:"🌹",featured:true,dataFile:"library-books/processed/pride.json",chapterCount:61,format:"Complete novel",source:"Project Gutenberg #1342"},
  {id:"persuasion",title:"Persuasion",author:"Jane Austen",level:"Advanced",icon:"✉️",dataFile:"library-books/processed/persuasion.json",chapterCount:24,format:"Complete novel",source:"Project Gutenberg #105"}
 ],
 french:[{id:"candide-fr",title:"Candide, ou l’optimisme",author:"Voltaire",level:"Advanced",icon:"🌍",featured:true,dataFile:"library-books/processed/candide-fr.json",chapterCount:30,format:"Complete classic",source:"Project Gutenberg #4650"}],
 spanish:[{id:"don-quijote-es",title:"Don Quijote",author:"Miguel de Cervantes",level:"Advanced",icon:"🐴",featured:true,dataFile:"library-books/processed/don-quijote-es.json",chapterCount:126,format:"Complete novel",source:"Project Gutenberg #2000"}],
 mandarin:[{id:"journey-west-zh",title:"西遊記",author:"吳承恩",level:"Advanced",icon:"🐒",featured:true,dataFile:"library-books/processed/journey-west-zh.json",chapterCount:100,format:"Complete classic",source:"Project Gutenberg #23962"}],
 japanese:[{id:"rashomon-ja",title:"羅生門",author:"芥川龍之介",level:"Advanced",icon:"🏯",featured:true,dataFile:"library-books/processed/rashomon-ja.json",chapterCount:1,format:"Complete short story",source:"Project Gutenberg #1982"}],
 arabic:[{id:"hayy-ar",title:"حي بن يقظان",author:"ابن طفيل",level:"Advanced",icon:"🌴",featured:true,dataFile:"library-books/processed/hayy-ar.json",chapterCount:12,format:"Complete classic • 12 reading sections",source:"Hindawi public-domain text"}],
 khmer:[{id:"khmer-folktales-v1",title:"ប្រជុំរឿងព្រេងខ្មែរ — ភាគទី១",author:"វិទ្យាស្ថានពុទ្ធសាសនបណ្ឌិត្យ",level:"Intermediate",icon:"🇰🇭",featured:true,dataFile:"library-books/processed/khmer-folktales-v1.json",chapterCount:34,format:"34 complete folktales",source:"Wikisource • CC BY-SA"}]
};
const libraryCatalog={
 french:["Candide — Voltaire","Les Misérables — Victor Hugo","Le Comte de Monte-Cristo — Alexandre Dumas","Vingt mille lieues sous les mers — Jules Verne","Le Tour du monde en quatre-vingts jours — Jules Verne"],
 spanish:["Don Quijote de la Mancha — Miguel de Cervantes","Lazarillo de Tormes — Anónimo","La vida es sueño — Calderón de la Barca","Don Juan Tenorio — José Zorrilla","Marianela — Benito Pérez Galdós"],
 mandarin:["三字經","論語","道德經","西遊記","紅樓夢"],
 japanese:["方丈記","徒然草","枕草子","竹取物語","おくのほそ道"],
 arabic:["ألف ليلة وليلة","مقدمة ابن خلدون","طوق الحمامة","حي بن يقظان"],khmer:["ប្រជុំរឿងព្រេងខ្មែរ — ភាគទី១ • ៣៤ រឿង"]
};
let libraryFilter="All",libraryQuery="",librarySort="featured";
function libraryProgressKey(id){return `isc-library-${state.language}-${id}`}
function getBookProgress(id){try{return JSON.parse(localStorage.getItem(libraryProgressKey(id)))||{page:0,bookmarkPage:null,totalPages:null}}catch(e){return{page:0,bookmarkPage:null,totalPages:null}}}
function renderLibrary(){
 const grid=$('#libraryGrid'),note=$('#libraryNotice');if(!grid)return;
 const lang=state.language,meta=languages[lang]||languages.english,all=libraryBooks[lang]||[];
 note.innerHTML=`<b>Relaxed reading.</b> ${esc(meta.name)} books open inside iSpeak Confidence. Your reading position, bookmark and reader settings are saved on this device.`;
 let books=all.filter(b=>(libraryFilter==='All'||String(b.level).split('/').map(x=>x.trim()).includes(libraryFilter))&&(!libraryQuery||`${b.title} ${b.author}`.toLowerCase().includes(libraryQuery)));
 if(librarySort==='az')books.sort((a,b)=>a.title.localeCompare(b.title));else if(librarySort==='level')books.sort((a,b)=>a.level.localeCompare(b.level));else books.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
 grid.innerHTML=books.map(b=>{const pr=getBookProgress(b.id);const total=b.chapters?b.chapters.reduce((n,c)=>n+c.pages.length,0):(pr.totalPages||null);const progress=total?Math.round((pr.page||0)/Math.max(1,total-1)*100):0;return `<article class="library-book premium-book">
 <div class="book-art"><span>${b.icon}</span><div class="book-glow"></div><small>${esc(b.level)}</small></div>
 <div class="book-info"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><div class="library-book-meta"><span>${esc(b.format||'Complete book')}</span><span>${b.chapterCount||1} ${b.chapterCount===1?'section':'chapters/sections'}</span></div><div class="book-progress"><i style="width:${progress}%"></i></div><small>${pr.page?`Continue reading • page ${pr.page+1}`:'Ready to read offline'}${b.source?` • ${esc(b.source)}`:''}</small><button class="primary library-read" data-read="${b.id}">${pr.page?'Continue':'Read book'}</button></div></article>`}).join('');
 if(!books.length){const planned=libraryCatalog[lang]||[];grid.innerHTML=`<div class="library-empty"><b>No bundled ${esc(meta.name)} books yet.</b><span>${planned.length?`Planned classics: ${planned.map(esc).join(' • ')}`:'We are waiting for legally cleared material.'}</span></div>`}
 $$('[data-read]',grid).forEach(x=>x.onclick=()=>openReader(x.dataset.read));
}

async function ensureBookLoaded(b){
 if(Array.isArray(b.chapters)&&b.chapters.length)return b;
 if(b.dataFile){
   const res=await fetch(b.dataFile);
   if(!res.ok)throw new Error("Could not load this offline book.");
   const data=await res.json();
   if(!Array.isArray(data.chapters)||!data.chapters.length)throw new Error("This book file is empty or unreadable.");
   b.chapters=data.chapters.filter(c=>c&&c.title&&Array.isArray(c.pages)&&c.pages.length);
   if(!b.chapters.length)throw new Error("This book has no readable sections.");
   return b;
 }
 if(!b.file)throw new Error("Book file is missing.");
 const res=await fetch(b.file);if(!res.ok)throw new Error("Could not load this offline book.");
 let text=await res.text();
 text=text.replace(/\r/g,"").replace(/\u000c/g,"\n\n").replace(/\n{4,}/g,"\n\n").trim();
 const paras=text.split(/\n\s*\n/).map(x=>x.replace(/\n+/g," ").trim()).filter(x=>x.length>2);
 const pages=[];let buf="";
 for(const para of paras){
   if((buf.length+para.length)>1800&&buf){pages.push(buf);buf=""}
   buf+=(buf?"\n\n":"")+para;
 }
 if(buf)pages.push(buf);
 if(!pages.length)throw new Error("This book file is empty or unreadable.");
 b.chapters=[{title:b.title,pages}];
 return b;
}

async function openReader(id){
 let b=(libraryBooks[state.language]||[]).find(x=>x.id===id);if(!b)return;
 try{b=await ensureBookLoaded(b)}catch(e){toast(e.message||"Could not load book");return;}
 const chapterStarts=[];let chapterCursor=0;
 b.chapters.forEach((c,ci)=>{chapterStarts.push(chapterCursor);chapterCursor+=c.pages.length});
 const pages=b.chapters.flatMap((c,ci)=>c.pages.map((text,pi)=>({text,chapter:c.title,chapterIndex:ci,chapterPage:pi+1})));
 let pref;try{pref=JSON.parse(localStorage.getItem('isc-reader-settings'))||{}}catch(e){pref={}}
 let pr=getBookProgress(id),page=Math.min(pr.page||0,pages.length-1),font=pref.font||21,night=!!pref.night,serif=pref.serif!==false;
 const body=$('#modalBody');$('#modal').classList.add('reader-dialog');
 function saveReader(){localStorage.setItem(libraryProgressKey(id),JSON.stringify({page,bookmarkPage:Number.isInteger(pr.bookmarkPage)?pr.bookmarkPage:null,totalPages:pages.length}));localStorage.setItem('isc-reader-settings',JSON.stringify({font,night,serif}))}
 function draw(){
  const left=pages[page],right=pages[page+1],pct=Math.round((page+1)/pages.length*100);
  body.innerHTML=`<div class="reader-shell reader-lang-${esc(state.language)} ${night?'reader-night':''} ${serif?'reader-serif':'reader-sans'}" dir="${state.language==='arabic'?'rtl':'ltr'}">
   <header class="reader-top"><button id="readerBack">← Library</button><div><b>${esc(b.title)}</b><small>${esc(b.author)} • ${left.chapterIndex+1}/${b.chapters.length}</small></div><div class="reader-actions"><button id="readerBookmark" title="Bookmark">${Number.isInteger(pr.bookmarkPage)?'★':'☆'}</button><button id="readerFontDown">A−</button><button id="readerFontUp">A+</button><button id="readerTheme">${night?'☀':'☾'}</button></div></header>
   <div class="reader-book" style="--reader-font:${font}px">
    <article class="reader-page"><small>${esc(left.chapter)}</small>${left.chapterPage===1?`<h2>${esc(left.chapter)}</h2>`:''}<p id="readerLeftText">${esc(left.text)}</p><b class="page-no">${page+1}</b></article>
    <article class="reader-page">${right?`<small>${esc(right.chapter)}</small><p>${esc(right.text)}</p><b class="page-no">${page+2}</b>`:''}</article>
   </div>
   <div class="reader-nav"><button id="readerFirst">|‹ First</button><button id="readerPrev">‹ Prev</button><div><b>${Math.min(page+2,pages.length)} / ${pages.length}</b><span>${pct}%</span></div><button id="readerNext">Next ›</button><button id="readerLast">Last ›|</button></div>
   <input id="readerRange" class="reader-range" type="range" min="0" max="${Math.max(0,pages.length-1)}" value="${page}">
   <footer class="reader-footer"><button id="readerContents">☷ Contents</button><button id="readerSavePhrase">＋ Save selected phrase</button><button id="readerNotes">📝 Study notes</button><button id="readerBookmark2">${Number.isInteger(pr.bookmarkPage)?'★ Bookmarked':'☆ Bookmark'}</button><button id="readerTypeface">${serif?'Serif':'Sans'}</button><button id="readerTheme2">${night?'☀ Day mode':'☾ Night mode'}</button></footer>
  </div>`;
  const isSinglePage=()=>window.matchMedia('(max-width: 800px)').matches;
  const step=n=>{page=Math.max(0,Math.min(pages.length-1,n));if(!isSinglePage()&&page%2)page--;saveReader();draw()};
  $('#readerBack').onclick=()=>{$('#modal').close();$('#modal').classList.remove('reader-dialog');renderLibrary()};
  $('#readerPrev').onclick=()=>step(page-(isSinglePage()?1:2));$('#readerNext').onclick=()=>step(page+(isSinglePage()?1:2));$('#readerFirst').onclick=()=>step(0);$('#readerLast').onclick=()=>step(pages.length-1);
  $('#readerRange').oninput=e=>step(+e.target.value);
  const bm=()=>{pr.bookmarkPage=Number.isInteger(pr.bookmarkPage)?null:page;saveReader();draw()};$('#readerBookmark').onclick=bm;$('#readerBookmark2').onclick=bm;
  $('#readerFontDown').onclick=()=>{font=Math.max(16,font-1);saveReader();draw()};$('#readerFontUp').onclick=()=>{font=Math.min(32,font+1);saveReader();draw()};
  const theme=()=>{night=!night;saveReader();draw()};$('#readerTheme').onclick=theme;$('#readerTheme2').onclick=theme;
  $('#readerTypeface').onclick=()=>{serif=!serif;saveReader();draw()};
  $('#readerSavePhrase').onclick=()=>{const sel=String(window.getSelection?.()||'').trim();if(!sel)return toast('Highlight a useful word or phrase on the page first.');if(sel.length>180)return toast('Select one useful word or short phrase, not a full paragraph.');const key=`${state.language}:${id}`;state.libraryNotes[key]=Array.isArray(state.libraryNotes[key])?state.libraryNotes[key]:[];if(!state.libraryNotes[key].some(x=>x.text===sel)){state.libraryNotes[key].push({text:sel,page:page+1,chapter:left.chapter,date:today()});save();toast('Saved to your reading notebook.')}else toast('That phrase is already in your notebook.')};
  $('#readerNotes').onclick=()=>{const key=`${state.language}:${id}`,notes=state.libraryNotes[key]||[];const panel=document.createElement('div');panel.className='reader-toc-panel reader-notes-panel';panel.innerHTML=`<div class="reader-toc-head"><div><small>READING NOTEBOOK</small><b>${esc(b.title)}</b></div><button id="closeReaderNotes" aria-label="Close reading notebook">×</button></div><div class="reader-toc-list">${notes.length?notes.map((n,i)=>`<button data-note-page="${n.page-1}"><span>${i+1}</span><b>${esc(n.text)}</b><small>${esc(n.chapter)} • page ${n.page}</small></button>`).join(''):'<p class="booking-hint">Highlight useful words or phrases while reading, then save them here. The app will not force them into a repetition queue.</p>'}</div>`;body.querySelector('.reader-shell').appendChild(panel);$('#closeReaderNotes').onclick=()=>panel.remove();$$('[data-note-page]',panel).forEach(btn=>btn.onclick=()=>step(+btn.dataset.notePage));};
  $('#readerContents').onclick=()=>{
   const existing=body.querySelector('.reader-toc-panel');if(existing){existing.remove();return}
   const panel=document.createElement('div');panel.className='reader-toc-panel';
   panel.innerHTML=`<div class="reader-toc-head"><div><small>CONTENTS</small><b>${esc(b.title)}</b></div><button id="closeReaderToc" aria-label="Close table of contents">×</button></div><div class="reader-toc-list">${b.chapters.map((c,i)=>`<button data-reader-chapter="${i}" class="${i===left.chapterIndex?'active':''}"><span>${i+1}</span><b>${esc(c.title)}</b><small>${c.pages.length} ${c.pages.length===1?'page':'pages'}</small></button>`).join('')}</div>`;
   body.querySelector('.reader-shell').appendChild(panel);
   $('#closeReaderToc').onclick=()=>panel.remove();
   $$('[data-reader-chapter]',panel).forEach(btn=>btn.onclick=()=>step(chapterStarts[+btn.dataset.readerChapter]||0));
  };
 }
 draw();$('#modal').showModal();
}

function setView(name){if(name==='library')renderLibrary();$$('.view,.page').forEach(v=>v.classList.remove('active'));const id=name==='ielts'?'page-ielts':name;const v=$('#'+id);if(v){v.style.display='';v.classList.add('active')}$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));closeDrawer();window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-lib-filter]').forEach(b=>b.onclick=()=>{libraryFilter=b.dataset.libFilter;$$('[data-lib-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLibrary()});
const libSearch=$('#librarySearch');if(libSearch)libSearch.oninput=e=>{libraryQuery=e.target.value.trim().toLowerCase();renderLibrary()};
const libSort=$('#librarySort');if(libSort)libSort.onchange=e=>{librarySort=e.target.value;renderLibrary()};




function khmerCommonVoiceEntries(){return Array.isArray(window.ISPEAK_KHMER_COMMONVOICE)?window.ISPEAK_KHMER_COMMONVOICE:[]}
function exactKhmerHumanClip(text){const n=String(text||'').normalize('NFC').trim();return khmerCommonVoiceEntries().find(x=>String(x.sentence||'').normalize('NFC').trim()===n)||null}
function playVerifiedLanguageAudio(text){
 if(state.language==='khmer'){const hit=exactKhmerHumanClip(text);if(!hit){toast('No verified human recording matches this exact Khmer text yet.');return false}const a=new Audio(hit.audio);a.play().catch(()=>toast('This recording could not play on this device.'));return true}
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=languages[state.language].lang;u.rate=.9;speechSynthesis.speak(u);return true}catch(e){toast('Audio is unavailable on this device.');return false}
}

function khmerBeginnerPlacementItems(){
 // These beginner forms/romanisations come from the Khmer material supplied in this project.
 return [
  {target:'បាទ',reading:'Baat',meaning:'Yes (male speaker)'},
  {target:'ចាស',reading:'Chah',meaning:'Yes (female speaker)'},
  {target:'សួស្តី',reading:"Sous'dey",meaning:'Hello (casual)'},
  {target:'ជំរាបសួរ',reading:'Chum reap sour',meaning:'Hello (formal / older people)'},
  {target:'សូម',reading:'Soum',meaning:'Please'},
  {target:'អរគុណ',reading:'Ar-kun',meaning:'Thank you'},
  {target:'លាហើយ',reading:'Lea haey',meaning:'Goodbye (casual)'},
  {target:'ខ្ញុំ',reading:'Khnyom',meaning:'I / me'}
 ];
}
function khmerPlacementListeningItems(){
 const wanted=[
  'ខ្ញុំ ញ៉ាំអាហារពេលព្រឹក ។',
  'គាត់និយាយប្រាំភាសា ។',
  'សក់របស់គាត់ខ្លី។',
  'អ្នកចូលចិត្តដំរី ។',
  'ថ្ងៃនេះភ្លៀងខ្លាំង ហើយមានខ្យល់ ។',
  'តើត្រូវការថែមអំពិលទេ?'
 ];
 const all=khmerCommonVoiceEntries();
 return wanted.map(t=>all.find(x=>String(x.sentence||'').normalize('NFC').trim()===t.normalize('NFC').trim())).filter(Boolean);
}
const khmerAdvancedConversationChallenges=[
 {title:'Explain a changed plan',prompt:'You were supposed to meet someone earlier, but something went wrong. Respond in natural Khmer: explain what happened, apologize, and suggest a new time.',requirements:['explain what happened','apologize appropriately','suggest a new time'],difficulty:4},
 {title:'Give a reasoned opinion',prompt:'A friend asks whether living in Phnom Penh or the countryside is better. Respond in natural Khmer, give your opinion, and support it with at least two reasons.',requirements:['state a clear opinion','give at least two reasons','connect the ideas naturally'],difficulty:4},
 {title:'Tell a past experience',prompt:'Tell someone in natural Khmer about a recent experience that did not go as planned. Explain what happened first, what problem occurred, and what you did afterward.',requirements:['describe a past situation','explain the problem','say what happened afterward'],difficulty:4},
 {title:'Explain consequences',prompt:'A friend is repeatedly arriving late for work or study. In natural Khmer, explain what problems this could cause and what they should change.',requirements:['explain likely consequences','give practical advice','support the advice with a reason'],difficulty:4},
 {title:'Polite disagreement',prompt:'Someone gives an opinion you disagree with. Respond in natural Khmer without being rude: acknowledge their view, disagree clearly, and explain why.',requirements:['acknowledge the other view','disagree politely','justify the disagreement'],difficulty:5},
 {title:'Clarify a misunderstanding',prompt:'Someone misunderstood what you said and now thinks you cancelled an important plan. In natural Khmer, correct the misunderstanding, explain what you actually meant, and check that they understand.',requirements:['correct the misunderstanding','explain the intended meaning','check understanding'],difficulty:5},
 {title:'Detailed advice',prompt:'A friend is deciding whether to change jobs or continue studying. In natural Khmer, ask or consider the important details, give balanced advice, and explain the advantages and disadvantages.',requirements:['address both options','give balanced advice','explain advantages and disadvantages'],difficulty:5},
 {title:'Resolve a complaint',prompt:'You paid for or booked something, but what you received is different from what was agreed. In natural Khmer, explain the problem precisely, ask for a solution, and respond to a possible compromise.',requirements:['describe the mismatch precisely','request a reasonable solution','negotiate a compromise'],difficulty:5},
 {title:'Persuade and negotiate',prompt:'Two people want different plans for an important day. In natural Khmer, explain your preference, respond to the other person’s concern, propose a compromise, and try to reach agreement.',requirements:['state and justify a preference','respond to the other concern','propose a workable compromise'],difficulty:5},
 {title:'Very advanced conversation',prompt:'A complicated plan has failed because of a misunderstanding, a delay, and conflicting expectations. Respond in natural Khmer as if speaking to the other person: reconstruct what happened, take responsibility where appropriate, clarify what you did not mean, disagree politely with one point, propose a fair solution, and ask a useful follow-up question.',requirements:['reconstruct a multi-part situation','clarify and take appropriate responsibility','disagree politely','propose a fair solution','ask a relevant follow-up question'],difficulty:5}
];
function advancedCourseChallenge(unitIndex){
 if(unitIndex<20)return null;
 const base=khmerAdvancedConversationChallenges[Math.min(9,unitIndex-20)];
 const language=languages[state.language]?.name||state.language;
 return {...base,prompt:base.prompt.replace(/in natural Khmer/gi,`in natural ${language}`).replace(/in Khmer/gi,`in ${language}`),language};
}
function khmerAdvancedCourseChallenge(unitIndex){return advancedCourseChallenge(unitIndex);}
function buildKhmerPlacementQuestions(){
 const shuffle=a=>a.map(v=>({v,r:(globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.random())})).sort((a,b)=>a.r-b.r).map(x=>x.v);
 const beginner=khmerBeginnerPlacementItems();
 const qs=[];
 // Q1-8: beginner-friendly spoken Khmer. Script + romanisation are both visible.
 beginner.forEach((x,i)=>{
  const ds=beginner.filter(y=>y!==x).sort((a,b)=>Math.abs(a.meaning.length-x.meaning.length)-Math.abs(b.meaning.length-x.meaning.length)).slice(0,3);
  qs.push({type:'context',skill:i<4?'Beginner spoken Khmer':'Beginner comprehension',q:`What does this Khmer expression mean? “${x.target}”`,reading:x.reading,choices:shuffle([x.meaning,...ds.map(y=>y.meaning)]),a:x.meaning,difficulty:i<4?1:2,unit:1});
 });
 // Q9-14: guaranteed verified human Khmer listening.
 const listening=khmerPlacementListeningItems();
 listening.forEach((clip,i)=>{
  const others=listening.filter(x=>x!==clip).slice(0,3);
  qs.push({type:'listeningChoice',skill:'Human listening',q:'Listen to the Khmer recording. Which complete Khmer sentence did you hear?',spoken:clip.sentence,clipAudio:clip.audio,choices:shuffle([clip.sentence,...others.map(x=>x.sentence)]),a:clip.sentence,difficulty:i<2?2:3,unit:Math.min(20,8+i)});
 });
 // Q15-20: bridge into independent reading. Romanisation disappears progressively.
 const units=(longCourse.languages.khmer?.units||[]).slice(0,20),pool=[],seen=new Set();
 const norm=x=>String(x||'').normalize('NFC').trim().replace(/[.!?？؟។]+$/,'').replace(/\s+/g,' ').toLowerCase();
 units.forEach((u,ui)=>(u.anchors||[]).forEach(a=>{const target=String(a.target||'').trim(),raw=String(a.meaning||''),parts=raw.split(' / '),reading=String(a.reading||(parts.length>1?parts[0]:'')),meaning=String(parts.length>1?parts.slice(1).join(' / '):raw).trim();if(target&&meaning&&!seen.has(norm(target))&&!beginner.some(b=>norm(b.target)===norm(target))){seen.add(norm(target));pool.push({target,reading,meaning,unit:ui+1})}}));
 const bridge=[];for(let i=0;i<6;i++){const idx=Math.min(pool.length-1,Math.floor(i*(pool.length-1)/5));if(pool[idx]&&!bridge.some(z=>norm(z.target)===norm(pool[idx].target)))bridge.push(pool[idx])}
 for(const x of pool){if(bridge.length>=6)break;if(!bridge.some(z=>norm(z.target)===norm(x.target)))bridge.push(x)}
 bridge.slice(0,6).forEach((item,i)=>qs.push({type:'meaningProduction',skill:i<3?'Reading + romanisation':'Independent Khmer reading',q:i<3?`Type the complete ${supportLangName()} meaning of: “${item.target}”`:`Without romanisation, explain the complete ${supportLangName()} meaning of: “${item.target}”`,reading:i<3?item.reading:'',a:item.meaning,difficulty:i<3?3:4,unit:item.unit}));
 // Q21-30: progressively harder real-world conversation. No romanisation and no answer choices.
 khmerAdvancedConversationChallenges.forEach((c,i)=>qs.push({type:'conversationProduction',skill:i<4?'Advanced conversation':'Very advanced conversation',q:c.prompt,requirements:c.requirements,difficulty:c.difficulty,unit:21+i,title:c.title}));
 return qs.slice(0,30);
}
function buildPlacementQuestions(lang){
 if(lang==='khmer')return buildKhmerPlacementQuestions();
 const units=(longCourse.languages[lang]?.units||[]).slice(0,30);
 const cleanMeaning=x=>String(x||'').split(' / ').pop().trim()||String(x||'').trim();
 const norm=x=>String(x||'').normalize('NFC').trim().replace(/[.!?？؟។]+$/,'').replace(/\s+/g,' ').toLowerCase();
 const tokens=x=>new Set(norm(x).split(/[^\p{L}\p{N}]+/u).filter(Boolean));
 const pool=[];const seen=new Set();
 units.forEach((u,ui)=>(u.anchors||[]).forEach((a,ai)=>{const target=String(a.target||'').trim(),meaning=cleanMeaning(a.meaning),reading=String(a.reading||'').trim();if(!target||!meaning||seen.has(norm(target)))return;seen.add(norm(target));pool.push({target,meaning,reading,unit:ui+1,anchor:ai})}));
 if(pool.length<30)return [];
 const isQuestion=x=>/[?？؟]\s*$/.test(String(x||''));
 const words=x=>String(x||'').trim().split(/\s+/).filter(Boolean).length;
 const overlap=(a,b)=>{const A=tokens(a),B=tokens(b);let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(1,new Set([...A,...B]).size)};
 const shapeScore=(a,b)=>{const q=isQuestion(a)===isQuestion(b)?3:-20;const wd=Math.abs(words(a)-words(b));const ld=Math.abs(String(a||'').length-String(b||'').length);return q+(2-Math.min(2,wd))+(2-Math.min(2,ld/12))+overlap(a,b)*5};
 const shuffle=a=>a.map(v=>({v,r:(globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.random())})).sort((a,b)=>a.r-b.r).map(x=>x.v);
 const distract=(item,field)=>pool.filter(x=>x!==item&&norm(x[field])!==norm(item[field])&&isQuestion(x[field])===isQuestion(item[field])).filter((x,i,a)=>a.findIndex(y=>norm(y[field])===norm(x[field]))===i).sort((a,b)=>shapeScore(b[field],item[field])-shapeScore(a[field],item[field])||Math.abs(a.unit-item.unit)-Math.abs(b.unit-item.unit)).slice(0,3);
 const chosen=[];for(let i=0;i<30;i++){const idx=Math.min(pool.length-1,Math.floor(i*(pool.length-1)/29));let j=idx;while(j<pool.length&&chosen.some(z=>norm(z.target)===norm(pool[j].target)))j++;if(j<pool.length)chosen.push(pool[j])}
 for(const x of pool){if(chosen.length>=30)break;if(!chosen.some(z=>norm(z.target)===norm(x.target)))chosen.push(x)}
 const base=chosen.slice(0,20).map((item,qi)=>{
   const difficulty=qi<5?1:qi<10?2:qi<16?3:4;
   if(qi<4){const ds=distract(item,'meaning');if(ds.length<3)return {type:'meaningProduction',skill:'Comprehension',q:`Type the complete ${supportLangName()} meaning of: “${item.target}”`,a:item.meaning,difficulty,unit:item.unit};return {type:'context',skill:'Whole-expression comprehension',q:`Choose the meaning of the complete expression: “${item.target}”`,choices:shuffle([item.meaning,...ds.map(x=>x.meaning)]),a:item.meaning,difficulty,unit:item.unit,reading:item.reading};}
   if(qi<8){const ds=distract(item,'target');if(ds.length<3)return {type:'production',skill:'Active production',q:`Write the complete ${languages[lang].name} expression for: “${supportMeaning(item.meaning,lang)}”`,a:item.target,difficulty,unit:item.unit};return {type:'active',skill:'Active recall',q:`Which complete ${languages[lang].name} expression communicates: “${supportMeaning(item.meaning,lang)}”?`,choices:shuffle([item.target,...ds.map(x=>x.target)]),a:item.target,difficulty,unit:item.unit};}
   if(qi<14)return {type:'listening',skill:'Listening',q:`Listen to the complete expression and type its full ${supportLangName()} meaning.`,spoken:item.target,a:item.meaning,difficulty,unit:item.unit};
   return {type:'meaningProduction',skill:'Independent comprehension',q:`Without answer choices, type the complete ${supportLangName()} meaning of: “${item.target}”`,a:item.meaning,difficulty,unit:item.unit,reading:qi<17?item.reading:''};
 });
 const language=languages[lang].name;
 const advanced=khmerAdvancedConversationChallenges.map((c,i)=>({type:'conversationProduction',skill:i<4?'Advanced conversation':'Very advanced conversation',q:c.prompt.replace(/in natural Khmer/gi,`in natural ${language}`).replace(/in Khmer/gi,`in ${language}`),requirements:c.requirements,difficulty:c.difficulty,unit:21+i,title:c.title}));
 return [...base,...advanced];
}
function playPlacementAudio(text){
 if(state.language==='khmer')return playVerifiedLanguageAudio(text);
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=languages[state.language].lang;u.rate=.9;speechSynthesis.speak(u)}catch(e){toast('Audio is unavailable on this device.')}
}
function startAdvancedPlacement(){
 const qs=buildPlacementQuestions(state.language);
 if(qs.length<30)return toast('Placement material is not ready for this course.');
 let i=0,score=0,skills={},levelCorrect=[0,0,0,0,0],levelTotal=[0,0,0,0,0];
 const draw=()=>{
   const x=qs[i];
   modal(`${directionMarkup()}<span class="eyebrow">PROGRESSIVE PLACEMENT TEST</span><h2>Question ${i+1} / 30</h2>
   <div class="placement-meta"><span>${x.skill}</span><span>Difficulty ${x.difficulty}/5</span><span>Unit ${x.unit}</span></div>
   <h3 class="placement-question">${esc(x.q)}</h3>${(x.type==='listening'||x.type==='listeningChoice')?`<button id="placementAudio" class="primary placement-audio">🔊 Play audio</button><p class="placement-note">The phrase is hidden so this question tests listening rather than word recognition.</p>`:(x.reading?`<p class="placement-reading">${esc(x.reading)}</p>`:'')}
   ${x.type==='conversationProduction'?`<div class="placement-production advanced-placement"><p><b>${esc(x.title||'Conversation challenge')}</b></p><ul>${(x.requirements||[]).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><textarea id="placementTyped" rows="6" autocomplete="off" placeholder="Respond naturally in the language being tested. There is no single memorized answer."></textarea><button id="placementSubmit" class="primary">Evaluate response</button><p id="placementEval" class="placement-note"></p></div>`:(x.type==='production'||x.type==='meaningProduction')?`<div class="placement-production"><input id="placementTyped" autocomplete="off" placeholder="Type the complete answer without help"><button id="placementSubmit" class="primary">Submit answer</button></div>`:`<div class="answer-grid placement-answers">${x.choices.map(c=>`<button data-place-v151="${esc(c)}">${esc(x.type==='context'?supportMeaning(c,state.language):c)}</button>`).join('')}</div>`}
   <p class="placement-note">Difficulty increases continuously. Later questions remove answer choices and require full production.</p>`);
   if($('#placementAudio'))$('#placementAudio').onclick=()=>{if(x.clipAudio){const a=new Audio(x.clipAudio);a.play().catch(()=>toast('This recording could not play on this device.'))}else playPlacementAudio(x.spoken)};
   const recordPlacement=(ok)=>{skills[x.skill]=skills[x.skill]||{right:0,total:0};skills[x.skill].total++;levelTotal[x.difficulty-1]++;if(ok){score++;skills[x.skill].right++;levelCorrect[x.difficulty-1]++}try{speechSynthesis.cancel()}catch(e){}i++;i<30?draw():finish()};
   if($('#placementSubmit'))$('#placementSubmit').onclick=async()=>{
     const answer=$('#placementTyped').value.trim();if(!answer)return toast('Write your response first.');
     if(x.type==='conversationProduction'){
       const btn=$('#placementSubmit'),out=$('#placementEval');btn.disabled=true;btn.textContent='Evaluating…';out.textContent=`Checking communication, detail and natural ${languages[state.language]?.name||'language'}…`;
       try{const r=await apiJSON('/api/placement-evaluate',{method:'POST',body:JSON.stringify({language:languages[state.language].name,prompt:x.q,response:answer,requirements:x.requirements,difficulty:x.difficulty})});out.textContent=`${r.pass?'Pass':'Not yet'} • ${r.feedback||''}`;setTimeout(()=>recordPlacement(Boolean(r.pass)),700)}catch(e){out.textContent='AI evaluation is unavailable. This advanced question cannot be safely auto-scored right now.';btn.disabled=false;btn.textContent='Try evaluation again'}return;
     }
     const norm=v=>String(v||'').normalize('NFC').trim().replace(/[.!?？។]+$/,'').replace(/\s+/g,' ').toLowerCase();const sa=(x.type==='meaningProduction'||x.type==='listening')?supportMeaning(x.a,state.language):x.a;recordPlacement(norm(answer)===norm(x.a)||norm(answer)===norm(sa));
   };
   $$('[data-place-v151]',$('#modalBody')).forEach(b=>b.onclick=()=>{
     recordPlacement(b.dataset.placeV151===x.a);
   });
 };
 const finish=()=>{
   const pct=Math.round(score/30*100);
   let highest=1;
   for(let d=0;d<5;d++){if(levelTotal[d]&&levelCorrect[d]/levelTotal[d]>=.75)highest=d+1;else break}
   const unit=Math.max(1,Math.min(30,Math.round((highest-1)*6+(levelCorrect[highest-1]/Math.max(1,levelTotal[highest-1]))*6)));
   state.placement[state.language]=score;state.placementDetail=state.placementDetail||{};
   state.placementDetail[state.language]={score,total:30,pct,unit,skills,difficulty:{right:levelCorrect,total:levelTotal},date:today(),version:'18.0.1'};save();
   modal(`<span class="eyebrow">PLACEMENT RESULT</span><h2>${pct}% • Recommended Unit ${unit}</h2>
   <div class="skill-result-grid">${Object.entries(skills).map(([k,v])=>`<div><b>${k}</b><span>${Math.round(v.right/v.total*100)}%</span></div>`).join('')}</div>
   <h3>Difficulty performance</h3><div class="skill-result-grid">${levelTotal.map((n,j)=>`<div><b>Level ${j+1}</b><span>${n?Math.round(levelCorrect[j]/n*100):0}%</span></div>`).join('')}</div>
   <p><b>Unit ${unit} is now your starting point.</b> Earlier units are marked as Placement Passed only to show your starting level; the mark is a status label, not a checkbox. Later units remain locked until you progress normally. This placement applies only to ${languages[state.language].name}; IELTS is separate.</p><button id="placementDone" class="primary wide">Continue</button>`);
   $('#placementDone').onclick=()=>$('#modal').close();
 };
 draw();
}


function languageFlagMarkup(k,alt=''){
 const l=UI_LANGS[k]||UI_LANGS.english;
 return `<img class="language-flag-img" src="${l.flagFile}" alt="${esc(alt||l.name+' flag')}">`;
}

function renderHeaderLanguageSwitcher(){
 let wrap=$('#headerLanguageSwitcher');
 if(!wrap){const h=document.querySelector('.topbar');if(!h)return;wrap=document.createElement('div');wrap.id='headerLanguageSwitcher';wrap.className='header-language-switcher';h.insertBefore(wrap,h.querySelector('.topstats'))}
 const current=courseOrder.includes(state.uiLanguage)?state.uiLanguage:'english';
 const l=UI_LANGS[current]||UI_LANGS.english;
 wrap.innerHTML=`<button id="flagSwitch" class="flag-switch-button" title="Change language">${languageFlagMarkup(current)}<small>${l.name}</small>⌄</button><div id="flagMenu" class="flag-menu"><div class="flag-menu-title">${esc(supportT('iSpeak'))}</div>${courseOrder.map(k=>`<button data-ui-lang="${k}">${languageFlagMarkup(k)}<b>${UI_LANGS[k].name}</b><small>${UI_LANGS[k].native}</small></button>`).join('')}</div>`;
 $('#flagSwitch').onclick=()=>$('#flagMenu').classList.toggle('open');
 $$('[data-ui-lang]',wrap).forEach(b=>b.onclick=()=>{
   const k=b.dataset.uiLang;if(!courseOrder.includes(k)||!languages[k])return;
   state.uiLanguage=k;
   save();
   $('#flagMenu').classList.remove('open');
   renderHeaderLanguageSwitcher();applyFullInterfaceLanguage();applyInterfaceLanguage();
   toast(`${supportT('support')}: ${UI_LANGS[k].name}`);
 });
}

const FULL_UI={
 english:{
  home:'Home',learn:'Learn',practice:'Practice',chat:'Chat',teachers:'Teachers',progress:'Progress',
  profile:'Profile & Settings',headline:'Learn a language. Build real confidence.',
  sub:'Interactive lessons, speaking practice, game-style conversation buddies and private lessons with real teachers.',
  start:'Start Learning',meet:'Meet the teachers',daily:'YOUR DAILY GOAL',lessons:'lessons',
  completeMore:'Complete 3 more lessons today.',choose:'CHOOSE A COURSE',want:'What do you want to learn?',
  reward:'YOUR COURSE REWARD',certificate:'Your Certificate of Completion',
  certificateText:'Complete 100% of your course to unlock your personalized iSpeak Confidence digital certificate.',
  placement:'Placement Test',writing:'Writing Academy',games:'Games',stories:'Stories & Dialogues',
leaderboard:'Leaderboard',appLanguage:'App language'
 },
 khmer:{
  home:'ទំព័រដើម',learn:'រៀន',practice:'អនុវត្ត',chat:'ជជែក',teachers:'គ្រូបង្រៀន',progress:'វឌ្ឍនភាព',
  profile:'ប្រវត្តិរូប និងការកំណត់',headline:'រៀនភាសា។ បង្កើតទំនុកចិត្តពិតប្រាកដ។',
  sub:'មេរៀនអន្តរកម្ម ការអនុវត្តនិយាយ មិត្តសន្ទនាបែបហ្គេម និងមេរៀនឯកជនជាមួយគ្រូពិត។',
  start:'ចាប់ផ្តើមរៀន',meet:'ជួបគ្រូបង្រៀន',daily:'គោលដៅប្រចាំថ្ងៃ',lessons:'មេរៀន',
  completeMore:'បញ្ចប់មេរៀន 3 ទៀតថ្ងៃនេះ។',choose:'ជ្រើសរើសវគ្គសិក្សា',want:'តើអ្នកចង់រៀនអ្វី?',
  reward:'រង្វាន់វគ្គសិក្សារបស់អ្នក',certificate:'វិញ្ញាបនបត្របញ្ចប់ការសិក្សា',
  certificateText:'បញ្ចប់វគ្គសិក្សា 100% ដើម្បីដោះសោវិញ្ញាបនបត្រឌីជីថល iSpeak Confidence របស់អ្នក។',
  placement:'តេស្តកម្រិត',writing:'ការសរសេរ',games:'ហ្គេម',stories:'រឿង និងសន្ទនា',
  leaderboard:'តារាងពិន្ទុ',appLanguage:'ភាសាកម្មវិធី'
 },
 mandarin:{
  home:'首页',learn:'学习',practice:'练习',chat:'聊天',teachers:'教师',progress:'学习进度',
  profile:'个人资料与设置',headline:'学习语言，建立真正的自信。',
  sub:'互动课程、口语练习、游戏式对话伙伴以及真人教师一对一课程。',
  start:'开始学习',meet:'认识教师',daily:'今日目标',lessons:'课程',
  completeMore:'今天再完成3节课。',choose:'选择课程',want:'你想学习什么？',
  reward:'你的课程奖励',certificate:'结业证书',
  certificateText:'完成100%的课程即可解锁你的个性化 iSpeak Confidence 数字证书。',
  placement:'水平测试',writing:'书写练习',games:'游戏',stories:'故事与对话',
  leaderboard:'排行榜',appLanguage:'应用语言'
 },
 spanish:{
  home:'Inicio',learn:'Aprender',practice:'Práctica',chat:'Chat',teachers:'Profesores',progress:'Progreso',
  profile:'Perfil y ajustes',headline:'Aprende un idioma. Gana confianza de verdad.',
  sub:'Lecciones interactivas, práctica oral, compañeros de conversación y clases privadas con profesores reales.',
  start:'Empezar a aprender',meet:'Conoce a los profesores',daily:'TU OBJETIVO DIARIO',lessons:'lecciones',
  completeMore:'Completa 3 lecciones más hoy.',choose:'ELIGE UN CURSO',want:'¿Qué quieres aprender?',
  reward:'TU RECOMPENSA DEL CURSO',certificate:'Tu certificado de finalización',
  certificateText:'Completa el 100% del curso para desbloquear tu certificado digital personalizado de iSpeak Confidence.',
  placement:'Prueba de nivel',writing:'Escritura',games:'Juegos',stories:'Historias y diálogos',
  leaderboard:'Clasificación',appLanguage:'Idioma de la aplicación'
 },
 french:{
  home:'Accueil',learn:'Apprendre',practice:'Pratique',chat:'Discussion',teachers:'Professeurs',progress:'Progrès',
  profile:'Profil et paramètres',headline:'Apprenez une langue. Gagnez une vraie confiance.',
  sub:'Leçons interactives, pratique orale, partenaires de conversation et cours privés avec de vrais professeurs.',
  start:'Commencer',meet:'Voir les professeurs',daily:'VOTRE OBJECTIF DU JOUR',lessons:'leçons',
  completeMore:"Terminez encore 3 leçons aujourd’hui.",choose:'CHOISISSEZ UN COURS',want:'Que voulez-vous apprendre ?',
  reward:'VOTRE RÉCOMPENSE',certificate:'Votre certificat de réussite',
  certificateText:'Terminez 100 % du cours pour débloquer votre certificat numérique iSpeak Confidence personnalisé.',
  placement:'Test de niveau',writing:'Écriture',games:'Jeux',stories:'Histoires et dialogues',
  leaderboard:'Classement',appLanguage:"Langue de l’application"
 },
 japanese:{
  home:'ホーム',learn:'学習',practice:'練習',chat:'チャット',teachers:'先生',progress:'進捗',
  profile:'プロフィールと設定',headline:'言語を学び、本物の自信を身につけよう。',
  sub:'インタラクティブなレッスン、会話練習、ゲーム形式の会話パートナー、実際の先生との個人レッスン。',
  start:'学習を始める',meet:'先生を見る',daily:'今日の目標',lessons:'レッスン',
  completeMore:'今日はあと3レッスン完了しましょう。',choose:'コースを選ぶ',want:'何を学びたいですか？',
  reward:'コース修了特典',certificate:'修了証',
  certificateText:'コースを100%修了すると、あなた専用のiSpeak Confidenceデジタル修了証が解除されます。',
  placement:'レベルチェック',writing:'文字を書く',games:'ゲーム',stories:'ストーリーと会話',
  leaderboard:'ランキング',appLanguage:'アプリの言語'
 },
 arabic:{
  home:'الرئيسية',learn:'تعلّم',practice:'تدرّب',chat:'الدردشة',teachers:'المعلمون',progress:'التقدم',
  profile:'الملف الشخصي والإعدادات',headline:'تعلّم لغة. وابنِ ثقة حقيقية.',
  sub:'دروس تفاعلية وتدريب على المحادثة وشركاء محادثة بأسلوب الألعاب ودروس خاصة مع معلمين حقيقيين.',
  start:'ابدأ التعلّم',meet:'تعرّف على المعلمين',daily:'هدفك اليومي',lessons:'دروس',
  completeMore:'أكمل 3 دروس أخرى اليوم.',choose:'اختر دورة',want:'ماذا تريد أن تتعلم؟',
  reward:'مكافأة دورتك',certificate:'شهادة إتمام الدورة',
  certificateText:'أكمل 100% من الدورة لفتح شهادة iSpeak Confidence الرقمية المخصصة لك.',
  placement:'اختبار تحديد المستوى',writing:'الكتابة',games:'الألعاب',stories:'القصص والحوارات',
  leaderboard:'لوحة الصدارة',appLanguage:'لغة التطبيق'
 }
};
function uiT(key){return (FULL_UI[state.uiLanguage]||FULL_UI.english)[key]||FULL_UI.english[key]||key}
function applyFullInterfaceLanguage(){
 const t=FULL_UI[state.uiLanguage]||FULL_UI.english;
 document.documentElement.lang=state.uiLanguage==='mandarin'?'zh':state.uiLanguage==='japanese'?'ja':state.uiLanguage==='khmer'?'km':state.uiLanguage==='arabic'?'ar':state.uiLanguage==='spanish'?'es':state.uiLanguage==='french'?'fr':'en';
 document.documentElement.dir=state.uiLanguage==='arabic'?'rtl':'ltr';
 const navMap={home:'home',learn:'learn',practice:'practice',chat:'chat',teachers:'teachers',progress:'progress',settings:'profile'};
 $$('[data-nav]').forEach(el=>{const k=navMap[el.dataset.nav];if(k&&t[k]){const icon=el.querySelector('span,svg,i');const iconHtml=icon?icon.outerHTML:'';el.innerHTML=iconHtml+(iconHtml?' ':'')+t[k]}});
 const h=$('.hero h1'); if(h) h.textContent=t.headline;
 const hp=$('.hero p'); if(hp) hp.textContent=t.sub;
 const start=$('[data-nav="learn"].primary, .hero .primary'); if(start) start.textContent=t.start;
 const meet=$('.hero .secondary'); if(meet) meet.textContent=t.meet;
 const daily=$('.goal-card .eyebrow'); if(daily) daily.textContent=t.daily;
 const sh=$('.section-head .eyebrow'); if(sh) sh.textContent=t.choose;
 const h2=$('.section-head h2'); if(h2) h2.textContent=t.want;
 $$('[data-practice]').forEach(el=>{
   const map={writing:'writing',games:'games',stories:'stories',review:'review'};
   const k=map[el.dataset.practice];
   if(k&&t[k]){const title=el.querySelector('b,h3,strong');if(title)title.textContent=t[k]}
 });
 const lb=$('[data-nav="leaderboard"]'); if(lb) lb.textContent=t.leaderboard;
 document.body.classList.toggle('rtl-ui',state.uiLanguage==='arabic');
}

const UI_LANGS={
 english:{name:'English',native:'English',flag:'🇬🇧',flagFile:'/assets/flags/gb.svg',dir:'ltr'},
 khmer:{name:'Khmer',native:'ភាសាខ្មែរ',flag:'🇰🇭',flagFile:'/assets/flags/kh.svg',dir:'ltr'},
 mandarin:{name:'Mandarin',native:'中文',flag:'🇨🇳',flagFile:'/assets/flags/cn.svg',dir:'ltr'},
 spanish:{name:'Spanish',native:'Español',flag:'🇪🇸',flagFile:'/assets/flags/es.svg',dir:'ltr'},
 french:{name:'French',native:'Français',flag:'🇫🇷',flagFile:'/assets/flags/fr.svg',dir:'ltr'},
 japanese:{name:'Japanese',native:'日本語',flag:'🇯🇵',flagFile:'/assets/flags/jp.svg',dir:'ltr'},
 arabic:{name:'Arabic',native:'العربية',flag:'🇸🇦',flagFile:'/assets/flags/sa.svg',dir:'rtl'}
};
const UI_TEXT={
 english:{Home:'Home',Learn:'Learn',Practice:'Practice',Chat:'Chat',Teachers:'Teachers',Progress:'Progress','Profile & Settings':'Profile & Settings','Start learning':'Start learning','Meet the teachers':'Meet the teachers','YOUR DAILY GOAL':'YOUR DAILY GOAL','CHOOSE A COURSE':'CHOOSE A COURSE','What do you want to learn?':'What do you want to learn?','INTERACTIVE COURSES':'INTERACTIVE COURSES','Train your skills':'Train your skills','Speaking':'Speaking','Listening':'Listening','Flashcards':'Flashcards','Writing':'Writing','Games':'Games','Stories':'Stories','Check my level':'Check my level','I’m completely new':'I’m completely new','Writing Academy':'Writing Academy','Course progress':'Course progress','Achievements':'Achievements','Certificates of Completion':'Certificates of Completion','Leaderboard':'Leaderboard','YOUR PROGRESS':'YOUR PROGRESS','Keep building confidence':'Keep building confidence','Edit':'Edit','Learning language':'Learning language','Daily goal':'Daily goal','Audio & microphone check':'Audio & microphone check','My lesson requests':'My lesson requests','Enter buddy room':'Enter buddy room','Conversation':'Conversation','Hold to talk':'Hold to talk','Connect Gemini AI':'Connect Gemini AI','Talk':'Talk','Care':'Care','Wardrobe':'Wardrobe','Actions':'Actions'},
 spanish:{Home:'Inicio',Learn:'Aprender',Practice:'Practicar',Chat:'Chat',Teachers:'Profesores',Progress:'Progreso','Profile & Settings':'Perfil y ajustes','Start learning':'Empezar a aprender','Meet the teachers':'Conocer a los profesores','YOUR DAILY GOAL':'TU OBJETIVO DIARIO','CHOOSE A COURSE':'ELIGE UN CURSO','What do you want to learn?':'¿Qué quieres aprender?','INTERACTIVE COURSES':'CURSOS INTERACTIVOS','Train your skills':'Entrena tus habilidades',Speaking:'Hablar',Listening:'Escuchar',Flashcards:'Tarjetas',Writing:'Escritura',Games:'Juegos',Stories:'Historias','Check my level':'Comprobar mi nivel','I’m completely new':'Soy principiante','Writing Academy':'Academia de escritura','Course progress':'Progreso del curso',Achievements:'Logros','Certificates of Completion':'Certificados de finalización',Leaderboard:'Clasificación','YOUR PROGRESS':'TU PROGRESO','Keep building confidence':'Sigue ganando confianza',Edit:'Editar','Learning language':'Idioma de aprendizaje','Daily goal':'Objetivo diario','Audio & microphone check':'Comprobar audio y micrófono','My lesson requests':'Mis solicitudes de clases','Enter buddy room':'Entrar a la sala','Conversation':'Conversación','Hold to talk':'Mantén pulsado para hablar','Connect Gemini AI':'Conectar IA Gemini',Talk:'Hablar',Care:'Cuidar',Wardrobe:'Ropa',Actions:'Acciones'},
 french:{Home:'Accueil',Learn:'Apprendre',Practice:'Pratiquer',Chat:'Discussion',Teachers:'Professeurs',Progress:'Progrès','Profile & Settings':'Profil et paramètres','Start learning':'Commencer','Meet the teachers':'Rencontrer les professeurs','YOUR DAILY GOAL':'VOTRE OBJECTIF DU JOUR','CHOOSE A COURSE':'CHOISISSEZ UN COURS','What do you want to learn?':'Que voulez-vous apprendre ?','INTERACTIVE COURSES':'COURS INTERACTIFS','Train your skills':'Entraînez vos compétences',Speaking:'Expression orale',Listening:'Écoute',Flashcards:'Cartes mémoire',Writing:'Écriture',Games:'Jeux',Stories:'Histoires','Check my level':'Tester mon niveau','I’m completely new':'Je débute','Writing Academy':'Atelier d’écriture','Course progress':'Progression du cours',Achievements:'Réussites','Certificates of Completion':'Certificats de réussite',Leaderboard:'Classement','YOUR PROGRESS':'VOS PROGRÈS','Keep building confidence':'Continuez à gagner en confiance',Edit:'Modifier','Learning language':'Langue étudiée','Daily goal':'Objectif quotidien','Audio & microphone check':'Test audio et microphone','My lesson requests':'Mes demandes de cours','Enter buddy room':'Entrer dans la salle','Conversation':'Conversation','Hold to talk':'Maintenir pour parler','Connect Gemini AI':'Connecter Gemini AI',Talk:'Parler',Care:'Soins',Wardrobe:'Tenues',Actions:'Actions'},
 mandarin:{Home:'首页',Learn:'学习',Practice:'练习',Chat:'聊天',Teachers:'老师',Progress:'进度','Profile & Settings':'个人资料与设置','Start learning':'开始学习','Meet the teachers':'认识老师','YOUR DAILY GOAL':'今日目标','CHOOSE A COURSE':'选择课程','What do you want to learn?':'你想学什么？','INTERACTIVE COURSES':'互动课程','Train your skills':'训练你的技能',Speaking:'口语',Listening:'听力',Flashcards:'单词卡',Writing:'书写',Games:'游戏',Stories:'故事','Check my level':'测试我的水平','I’m completely new':'我是初学者','Writing Academy':'书写学院','Course progress':'课程进度',Achievements:'成就','Certificates of Completion':'结业证书',Leaderboard:'排行榜','YOUR PROGRESS':'你的进度','Keep building confidence':'继续建立自信',Edit:'编辑','Learning language':'学习语言','Daily goal':'每日目标','Audio & microphone check':'音频与麦克风检查','My lesson requests':'我的课程申请','Enter buddy room':'进入伙伴房间','Conversation':'对话','Hold to talk':'按住说话','Connect Gemini AI':'连接 Gemini AI',Talk:'对话',Care:'照顾',Wardrobe:'装扮',Actions:'动作'},
 japanese:{Home:'ホーム',Learn:'学ぶ',Practice:'練習',Chat:'チャット',Teachers:'先生',Progress:'進捗','Profile & Settings':'プロフィールと設定','Start learning':'学習を始める','Meet the teachers':'先生を見る','YOUR DAILY GOAL':'今日の目標','CHOOSE A COURSE':'コースを選ぶ','What do you want to learn?':'何を学びたいですか？','INTERACTIVE COURSES':'インタラクティブコース','Train your skills':'スキルを練習',Speaking:'スピーキング',Listening:'リスニング',Flashcards:'単語カード',Writing:'書く',Games:'ゲーム',Stories:'ストーリー','Check my level':'レベルチェック','I’m completely new':'完全な初心者です','Writing Academy':'ライティング・アカデミー','Course progress':'コース進捗',Achievements:'実績','Certificates of Completion':'修了証',Leaderboard:'ランキング','YOUR PROGRESS':'あなたの進捗','Keep building confidence':'自信を伸ばそう',Edit:'編集','Learning language':'学習言語','Daily goal':'毎日の目標','Audio & microphone check':'音声・マイク確認','My lesson requests':'レッスン申請','Enter buddy room':'バディルームへ','Conversation':'会話','Hold to talk':'押して話す','Connect Gemini AI':'Gemini AI に接続',Talk:'話す',Care:'ケア',Wardrobe:'着せ替え',Actions:'アクション'},
 arabic:{Home:'الرئيسية',Learn:'تعلّم',Practice:'تدرّب',Chat:'الدردشة',Teachers:'المعلّمون',Progress:'التقدّم','Profile & Settings':'الملف الشخصي والإعدادات','Start learning':'ابدأ التعلّم','Meet the teachers':'تعرّف على المعلّمين','YOUR DAILY GOAL':'هدفك اليومي','CHOOSE A COURSE':'اختر دورة','What do you want to learn?':'ماذا تريد أن تتعلّم؟','INTERACTIVE COURSES':'دورات تفاعلية','Train your skills':'درّب مهاراتك',Speaking:'التحدّث',Listening:'الاستماع',Flashcards:'بطاقات المراجعة',Writing:'الكتابة',Games:'الألعاب',Stories:'القصص','Check my level':'اختبر مستواي','I’m completely new':'أنا مبتدئ تماماً','Writing Academy':'أكاديمية الكتابة','Course progress':'تقدّم الدورة',Achievements:'الإنجازات','Certificates of Completion':'شهادات الإكمال',Leaderboard:'لوحة الصدارة','YOUR PROGRESS':'تقدّمك','Keep building confidence':'واصل بناء الثقة',Edit:'تعديل','Learning language':'لغة التعلّم','Daily goal':'الهدف اليومي','Audio & microphone check':'فحص الصوت والميكروفون','My lesson requests':'طلبات دروسي','Enter buddy room':'ادخل غرفة الصديق','Conversation':'محادثة','Hold to talk':'اضغط مطولاً للتحدث','Connect Gemini AI':'اتصل بـ Gemini AI',Talk:'تحدث',Care:'العناية',Wardrobe:'الملابس',Actions:'الحركات'},
 khmer:{Home:'ទំព័រដើម',Learn:'រៀន',Practice:'អនុវត្ត',Chat:'ជជែក',Teachers:'គ្រូ',Progress:'វឌ្ឍនភាព','Profile & Settings':'ប្រវត្តិរូប និងការកំណត់','Start learning':'ចាប់ផ្តើមរៀន','Meet the teachers':'ស្គាល់គ្រូ','YOUR DAILY GOAL':'គោលដៅប្រចាំថ្ងៃ','CHOOSE A COURSE':'ជ្រើសរើសវគ្គសិក្សា','What do you want to learn?':'តើអ្នកចង់រៀនអ្វី?','INTERACTIVE COURSES':'វគ្គសិក្សាអន្តរកម្ម','Train your skills':'អនុវត្តជំនាញ',Speaking:'និយាយ',Listening:'ស្តាប់',Flashcards:'កាតពាក្យ',Writing:'សរសេរ',Games:'ហ្គេម',Stories:'រឿង','Check my level':'ពិនិត្យកម្រិត','I’m completely new':'ខ្ញុំទើបចាប់ផ្តើម','Writing Academy':'ការអនុវត្តសរសេរ','Course progress':'វឌ្ឍនភាពវគ្គសិក្សា',Achievements:'សមិទ្ធផល','Certificates of Completion':'វិញ្ញាបនបត្របញ្ចប់ការសិក្សា',Leaderboard:'តារាងចំណាត់ថ្នាក់','YOUR PROGRESS':'វឌ្ឍនភាពរបស់អ្នក','Keep building confidence':'បន្តបង្កើនទំនុកចិត្ត',Edit:'កែសម្រួល','Learning language':'ភាសាដែលកំពុងរៀន','Daily goal':'គោលដៅប្រចាំថ្ងៃ','Audio & microphone check':'ពិនិត្យសំឡេង និងមីក្រូហ្វូន','My lesson requests':'សំណើមេរៀនរបស់ខ្ញុំ','Enter buddy room':'ចូលបន្ទប់មិត្តរៀន','Conversation':'ការសន្ទនា','Hold to talk':'ចុចសង្កត់ដើម្បីនិយាយ','Connect Gemini AI':'ភ្ជាប់ Gemini AI',Talk:'និយាយ',Care:'ថែទាំ',Wardrobe:'សម្លៀកបំពាក់',Actions:'សកម្មភាព'}
};
function tr(s){const d=UI_TEXT[state.uiLanguage]||UI_TEXT.english;return d[s]||s}
function applyInterfaceLanguage(){
 const cfg=UI_LANGS[state.uiLanguage]||UI_LANGS.english;
 document.documentElement.lang=state.uiLanguage==='mandarin'?'zh':state.uiLanguage==='japanese'?'ja':state.uiLanguage==='arabic'?'ar':state.uiLanguage==='khmer'?'km':state.uiLanguage==='spanish'?'es':state.uiLanguage==='french'?'fr':'en';
 document.documentElement.dir=cfg.dir;
 document.body.classList.toggle('rtl-ui',cfg.dir==='rtl');
 const selectors=['.bottom-nav span','#drawer button','.hero-actions button','.hero-card .eyebrow','.section-head .eyebrow','.section-head h2','#learn .title .eyebrow','#learn .title h1','#practice .title h1','.practice-grid b','#progress .title .eyebrow','#progress .title h1','#progress .progress-card>h2','#profile .settings button','.room-nav b','.chathead b','#aiConnect'];
 document.querySelectorAll(selectors.join(',')).forEach(el=>{const base=el.dataset.i18nBase||el.textContent.trim();if(!el.dataset.i18nBase)el.dataset.i18nBase=base;el.textContent=tr(base)});
}

function renderLanguages(){
 const html=courseOrder.map(k=>{const l=languages[k],done=studyDone(k);return `<button class="language-card ${state.language===k?'active':''}" data-lang="${k}"><span class="learning-card-label">${esc(supportT('imLearning'))}</span><span class="flag">${l.flag}</span><b>${l.name}</b><small>${l.native}</small><em>${done}/${totalStudySessions} sessions • ${Math.round(done/8)} study days</em></button>`}).join('');
 $('#homeLanguages').innerHTML=html; $('#languageSwitch').innerHTML=html;
 $$('[data-lang]').forEach(b=>b.onclick=()=>{changeLearningLanguage(b.dataset.lang,{view:'learn',notice:true})});
}
function openKhmerFoundations(){
 const consonants='ក ខ គ ឃ ង ច ឆ ជ ឈ ញ ដ ឋ ឌ ឍ ណ ត ថ ទ ធ ន ប ផ ព ភ ម យ រ ល វ ស ហ ឡ អ'.split(' ');
 const vowels='ា ិ ី ឹ ឺ ុ ូ ួ ើ ឿ ៀ េ ែ ៃ ោ ៅ ុំ ំ ាំ ះ ុះ េះ ោះ'.split(' ');
 const starter=khmerBeginnerPlacementItems();
 modal(`<span class="eyebrow">KHMER FOUNDATIONS</span><h2>Start Khmer from the beginning</h2>
 <p>This foundation path teaches useful spoken Khmer and introduces the writing system before the main course expects independent Khmer reading.</p>
 <h3>1. Essential spoken Khmer</h3><div class="anchor-grid">${starter.map(x=>`<div class="anchor-card"><div class="big">${x.target}</div><div class="romanization">${esc(x.reading)}</div><p>${esc(x.meaning)}</p></div>`).join('')}</div>
 <h3>2. Khmer consonants • 33 characters</h3><p>Learn these in small groups. Recognition comes first; tracing and writing follow in Writing Academy.</p><div class="khmer-script-grid">${consonants.map((x,i)=>`<span><b>${x}</b><small>${i+1}</small></span>`).join('')}</div>
 <h3>3. Dependent vowels</h3><div class="khmer-script-grid">${vowels.map(x=>`<span><b>${x}</b></span>`).join('')}</div>
 <h3>4. See how symbols combine</h3><div class="anchor-grid"><div class="anchor-card"><div class="big">ក + ា = កា</div><p>Consonant + dependent vowel</p></div><div class="anchor-card"><div class="big">ក + ិ = កិ</div><p>Consonant + dependent vowel</p></div><div class="anchor-card"><div class="big">ខ + ា = ខា</div><p>Consonant + dependent vowel</p></div><div class="anchor-card"><div class="big">ខ + ិ = ខិ</div><p>Consonant + dependent vowel</p></div></div>
 <button id="khmerStartWriting" class="primary wide">✍️ Start Khmer Writing Academy</button><button id="khmerFoundationDone" class="secondary wide">Continue to Khmer course</button>`);
 $('#khmerStartWriting').onclick=()=>openWritingAcademy();$('#khmerFoundationDone').onclick=()=>$('#modal').close();
}
function khmerFoundationBanner(){
 if(state.language!=='khmer')return '';
 return `<section class="khmer-foundation-banner"><div><span class="eyebrow">NEW TO KHMER?</span><h3>Khmer Script & Spoken Foundations</h3><p>Start with useful spoken Khmer such as <b>Baat</b>, <b>Chah</b> and <b>Chum reap sour</b>, then learn the 33 consonants and dependent vowels before independent reading.</p></div><div class="khmer-foundation-actions"><button class="primary" data-khmer-foundations>Start foundations</button><button class="secondary" data-khmer-writing>Practice alphabet writing</button></div></section>`;
}
function renderPath(){
 const l=languages[state.language],units=longCourse.languages[state.language].units,done=studyDone();
 const placement=state.placementDetail?.[state.language]||null;
 const placedUnit=placement?Math.max(1,Math.min(30,Number(placement.unit)||1)):1;
 // Placement affects only the currently selected normal language course.
 // Units before the recommended start are reviewable "Placement Passed" units.
 // The recommended unit is the active starting point.
 // Units after the learner's current progression point remain locked.
 const currentUnitIndex=placement?placedUnit-1:0;
 $('#courseLabel').textContent=`${l.flag} ${l.name.toUpperCase()} • 30-UNIT MASTERY COURSE`;
 $('#courseTitle').textContent=`${l.name}: 30-unit structured pathway`;
 $('#courseDesc').textContent=`30 units • one substantial guided lesson per unit • 8 progressive blocks. Each unit teaches new material, requires production, and then moves forward instead of scheduling spaced review.`;
 $('#path').innerHTML=khmerFoundationBanner()+units.map((u,i)=>{
   const unitDone=state.studyCompleted.filter(x=>x.startsWith(`${state.language}-u${i+1}-d1-`)).length;
   const pct=Math.round(unitDone/8*100);
   const placementPassed=!!placement&&i<currentUnitIndex;
   const recommended=!!placement&&i===currentUnitIndex;
   const previousDone=i===0||state.studyCompleted.filter(x=>x.startsWith(`${state.language}-u${i}-d1-`)).length>=8;
   const progressed=i<=currentUnitIndex||previousDone||unitDone>0;
   const unlocked=placementPassed||recommended||progressed;
   const status=unitDone===8?'Complete ✓':placementPassed?'Placement Passed ✓':recommended?'Start Here ›':unlocked?`${unitDone}/8 ›`:'Locked';
   const icon=unitDone===8?'✓':placementPassed?'✓':recommended?'▶':unlocked?(i<10?'🌱':i<20?'🚀':'🏆'):'🔒';
   return `<button class="lesson-card long-unit ${unitDone===8?'done':''} ${placementPassed?'placement-passed':''} ${recommended?'placement-start':''} ${unlocked?'':'locked-unit'}" data-unit="${i}" ${unlocked?'':'disabled'}><span class="lesson-icon">${icon}</span><span><small>UNIT ${i+1} • GUIDED LESSON ${i+1}${placementPassed?' • PLACEMENT PASSED':recommended?' • RECOMMENDED START':''}</small><b>${esc(u.title)}</b><em>${esc(u.goal)} • 8 progressive learning blocks</em><i class="unit-bar"><u style="width:${pct}%"></u></i></span><strong>${status}</strong></button>`;
 }).join('');
 $$('[data-khmer-foundations]',$('#path')).forEach(b=>b.onclick=openKhmerFoundations);
 $$('[data-khmer-writing]',$('#path')).forEach(b=>b.onclick=openWritingAcademy);
 $$('[data-unit]').forEach(b=>b.onclick=()=>{if(!b.disabled)openLongUnit(Number(b.dataset.unit))});
}

function findLesson(id){for(const arr of Object.values(courses)){const x=arr.find(y=>y.id===id);if(x)return x}}
function markDone(id,xp=20){if(!state.completed.includes(id))state.completed.push(id);state.xp+=xp;state.coins=(state.coins||0)+Math.max(3,Math.round(xp/5));state.mood=Math.min(100,(state.mood||80)+2);const d=today();state.activity[d]=(state.activity[d]||0)+1;if(state.lastDay!==d){const y=localDateOffset(-1);state.streak=state.lastDay===y?state.streak+1:1;state.lastDay=d}save();$('#modal').close();toast(`Complete! +${xp} XP`)}
function modal(html){const m=$('#modal');$('#modalBody').innerHTML=html;if(!m.open)m.showModal()}
$('#modalClose').onclick=()=>{stopIELTSAudio();stopTeacherIntroVideo();$('#modal').close();$('#modal').classList.remove('reader-dialog')};
$('#modal').addEventListener('close',()=>{stopIELTSAudio();stopTeacherIntroVideo();$('#modal').classList.remove('reader-dialog')});
function openLesson(id){const x=findLesson(id);if(!x)return;if(x.type==='speech')return openSpeech(x,id);if(x.type==='writing')return openWriting(x,id);modal(`<span class="eyebrow">QUICK LESSON</span><h2>${esc(x.title)}</h2><div class="word"><div class="big">${x.word}</div><p>${x.reading||''}</p></div><h3>${esc(x.q)}</h3><div class="answer-grid">${x.choices.map(c=>`<button data-answer="${esc(c)}">${esc(c)}</button>`).join('')}</div><div id="feedback"></div><button id="finishQuiz" class="primary wide" disabled>Continue</button>`);const finish=$('#finishQuiz');$$('[data-answer]',$('#modalBody')).forEach(b=>b.onclick=()=>{state.attempts++;if(b.dataset.answer===x.a){state.correct++;$$('[data-answer]',$('#modalBody')).forEach(q=>q.disabled=true);b.classList.add('correct');$('#feedback').innerHTML='<div class="feedback"><b>Correct!</b></div>';finish.disabled=false;finish.onclick=()=>markDone(id,20)}else{b.classList.add('wrong');b.disabled=true;$('#feedback').innerHTML='<div class="feedback">Try another answer.</div>'}save()})}
function openSpeech(x,id){modal(`<span class="eyebrow">SPEAKING PRACTICE</span><h2>Repeat this</h2><div class="word"><div class="big">${x.word}</div><p>${x.reading||''}</p><small>${x.meaning||''}</small></div><button id="speakPractice" class="primary wide">🎙️ Start microphone</button><p id="speechFeedback">Chrome gives the best speech-recognition support.</p><button id="speechFinish" class="secondary wide" disabled>Finish +15 XP</button>`);$('#speakPractice').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('#speechFeedback').textContent='Speech recognition is unavailable in this browser.';$('#speechFinish').disabled=false;return}const r=new SR();r.lang=languages[state.language].lang;r.interimResults=false;$('#speechFeedback').textContent='Listening…';r.onresult=e=>{$('#speechFeedback').textContent=`I heard: “${e.results[0][0].transcript}”`;$('#speechFinish').disabled=false};r.onerror=()=>{$('#speechFeedback').textContent='Could not hear that clearly. Try again.'};r.start()};$('#speechFinish').onclick=()=>markDone(id,15)}
function openWriting(x,id){
 modal(`<span class="eyebrow">WRITING PRACTICE</span><h2>Trace the character</h2><div class="trace-stage"><div class="trace-guide">${x.word}</div><canvas id="trace"></canvas></div><p id="quickTraceNote">Make a clear, substantial tracing attempt.</p><button id="clearTrace" class="secondary">Clear</button><button id="finishTrace" class="primary" disabled>Finish +15 XP</button>`);
 const c=$('#trace'),p=c.parentElement,r=p.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;const ctx=c.getContext('2d');ctx.scale(d,d);ctx.lineWidth=12;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#18d5cf';let down=false,moves=0,dist=0,last=null,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const pos=e=>{const q=c.getBoundingClientRect();return[(e.clientX-q.left),(e.clientY-q.top)]};
 const reset=()=>{ctx.clearRect(0,0,r.width,r.height);moves=0;dist=0;last=null;minX=Infinity;minY=Infinity;maxX=-Infinity;maxY=-Infinity;$('#finishTrace').disabled=true};
 const check=()=>{const w=maxX-minX,h=maxY-minY;$('#finishTrace').disabled=!(moves>=10&&dist>=100&&Math.max(w,h)>=60&&Math.min(w,h)>=16)};
 c.onpointerdown=e=>{down=true;last=pos(e);ctx.beginPath();ctx.moveTo(...last);c.setPointerCapture?.(e.pointerId);e.preventDefault()};
 c.onpointermove=e=>{if(!down)return;const q=pos(e);moves++;if(last)dist+=Math.hypot(q[0]-last[0],q[1]-last[1]);last=q;minX=Math.min(minX,q[0]);minY=Math.min(minY,q[1]);maxX=Math.max(maxX,q[0]);maxY=Math.max(maxY,q[1]);ctx.lineTo(...q);ctx.stroke();check();e.preventDefault()};
 c.onpointerup=()=>down=false;c.onpointercancel=()=>down=false;$('#clearTrace').onclick=reset;$('#finishTrace').onclick=()=>markDone(id,15)
}
function action(kind,duration=1700){const c=$('#buddyCharacter');if(!c)return;clearTimeout(animTimer);c.className=`buddy-character ${kind}`;$('#status').textContent=commandLabels[kind]||({listening:'Listening…',thinking:'Thinking…',speaking:`${mascotProfiles[state.mascot].name} is speaking…`}[kind]||'Ready');if(!['idle','sit','lie','stand','listening','speaking'].includes(kind))animTimer=setTimeout(()=>action('idle'),duration)}
$$('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action,b.dataset.action==='lie'?2800:1900));
function renderMascot(){
 syncBuddyWithLearningLanguage();
 const p=mascotProfiles[state.mascot],learning=languages[state.language];
 $('#mascotPick').innerHTML=Object.entries(mascotProfiles).map(([k,m])=>`<button data-mascot="${k}" class="${state.mascot===k?'active':''}"><img src="${m.image}" alt="${m.name}"><b>${m.name}</b><small>${m.flag} ${m.language}</small></button>`).join('');
 $$('[data-mascot]').forEach(b=>b.onclick=()=>{
   const k=Object.keys(languages).find(lang=>languages[lang].mascot===b.dataset.mascot);
   if(k)changeLearningLanguage(k,{view:null,notice:true});
   clearChat(false);
 });
 $('#buddyImage').src=p.image;$('#buddyImage').alt=`${p.name} mascot`;$('#mascotName').textContent=p.name;$('#mascotLang').textContent=`${p.flag} ${p.language}`;$('#mascotDesc').textContent=p.desc;
 if($('#buddyTarget'))$('#buddyTarget').textContent=`Learning ${learning.flag} ${learning.name} • Chat with ${p.name}`;
 if($('#chatText'))$('#chatText').placeholder=`Message ${p.name} in ${learning.name}…`;
 if($('#profileMascotImage'))$('#profileMascotImage').src=p.image;if($('#profileMascotName'))$('#profileMascotName').textContent=p.name;if($('#profileMascotLanguage'))$('#profileMascotLanguage').textContent=`${p.flag} ${p.language}`;if($('#profileMascotPersonality'))$('#profileMascotPersonality').textContent=p.desc;
 $('#prompts').innerHTML=p.starters.map(s=>`<button data-prompt="${esc(s)}">${esc(s)}</button>`).join('');$$('[data-prompt]').forEach(b=>b.onclick=()=>handleChat(b.dataset.prompt));$('#voice').textContent=state.voice?'🔊':'🔇';document.documentElement.style.setProperty('--room-accent',({jess:'#ff9ec0',jack:'#ef6a5a',pedro:'#f4b83f',loulou:'#a98be8',yuki:'#66a8e8',dariya:'#f0a536',zayd:'#d7ad48'})[state.mascot]||'#72cfd0')
}
function addBubble(text,who){const log=$('#log');$('.empty',log)?.remove();const d=document.createElement('div');d.className=`bubble ${who}`;d.innerHTML=`${esc(text)}<small>${who==='user'?'You':mascotProfiles[state.mascot].name}</small>`;log.appendChild(d);log.scrollTop=log.scrollHeight}
function reactToText(text,who='user'){const cmd=detectedCommand(text);if(cmd){action(cmd,cmd==='lie'?2800:1900);return cmd}if(who==='bot'){if(/hello|hi|hola|bonjour|你好|こんにちは|សួស្តី/i.test(text))action('wave',1200);else if(/great|excellent|bravo|很好|すごい|អស្ចារ្យ|bien|super/i.test(text))action('jump',1000);else action('speaking',1800)}return null}

function setAIState(mode,text){const e=$('#aiState');e.className=`ai-state ${mode}`;e.textContent=text;$('#aiConnect').textContent=aiConnected?'Disconnect Gemini':'✨ Connect Gemini AI'}
async function checkAI(){try{const r=await fetch('/api/status');const j=await r.json();setAIState(j.aiConfigured?'ready':'offline',j.aiConfigured?`Gemini ready • ${j.model}`:'Gemini key not configured');return j.aiConfigured}catch{setAIState('offline','Server not running');return false}}
async function connectAI(){if(aiConnected){aiConnected=false;setAIState('ready','Gemini ready');addBubble('Gemini conversation disconnected. Local movement commands still work.','system');return}$('#aiConnect').disabled=true;setAIState('connecting','Verifying Gemini…');try{const r=await fetch('/api/verify');const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Gemini verification failed');aiConnected=true;setAIState('online','Gemini AI connected');action('wave',900);addBubble(`Hi! I’m ${mascotProfiles[state.mascot].name}. I’m ready for a real conversation.`,`bot`)}catch(e){aiConnected=false;setAIState('error','Gemini connection failed');addBubble(`Gemini error: ${e.message}`,'system')}finally{$('#aiConnect').disabled=false}}
function disconnectAI(update=true){aiConnected=false;chatHistory=[];if(currentAudio){currentAudio.pause();currentAudio=null}if(update)checkAI();action('idle')}
async function speakGemini(text){if(!state.voice||!text)return;try{if(currentAudio){currentAudio.pause();currentAudio=null}const r=await fetch(`/api/tts/${state.mascot}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(!r.ok)throw new Error('TTS unavailable');const blob=await r.blob();currentAudio=new Audio(URL.createObjectURL(blob));currentAudio.onplay=()=>action('speaking',99999);currentAudio.onended=()=>{action('idle');currentAudio=null};await currentAudio.play()}catch(e){console.warn(e);const u=new SpeechSynthesisUtterance(text);u.lang=mascotProfiles[state.mascot].lang;speechSynthesis.cancel();speechSynthesis.speak(u)}}
async function handleChat(text){const t=text?.trim();if(!t)return;addBubble(t,'user');const localCmd=reactToText(t,'user');if(!aiConnected){if(localCmd)addBubble(`${mascotProfiles[state.mascot].name} understood: ${localCmd}. Connect Gemini for conversation too.`,'system');else addBubble('Gemini AI is disconnected. Press “Connect Gemini AI” for conversation.','system');return}action('thinking',99999);try{const r=await fetch(`/api/chat/${state.mascot}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:t,history:chatHistory})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Gemini failed');let reply=String(j.reply||'').trim();
reply=reply.replace(/^```[a-z]*\s*|\s*```$/gi,'').trim();
if(/^\s*[\[{]/.test(reply)){reply=reply.replace(/^\s*[\[{]+/,'').replace(/[\]}]+\s*$/,'').replace(/^["']?(reply|text|message)["']?\s*:\s*/i,'').replace(/^["']|["']$/g,'').trim()}
if(!reply||reply==='"'||reply==="'")reply='I’m here — please say that again.';if(j.action&&commandLabels[j.action])action(j.action,j.action==='lie'?2800:1900);if(reply){addBubble(reply,'bot');chatHistory.push({role:'user',text:t},{role:'assistant',text:reply});chatHistory=chatHistory.slice(-12);if(j.correction)addBubble(`Correction: ${j.correction}`,'coach');await speakGemini(reply)}}catch(e){console.error(e);setAIState('error','Gemini error');addBubble(`Gemini error: ${e.message}`,'system');action('idle')}}
$('#chatForm').onsubmit=e=>{e.preventDefault();const i=$('#chatText'),t=i.value;i.value='';handleChat(t)};$('#aiConnect').onclick=connectAI;$('#voice').onclick=()=>{state.voice=!state.voice;save();if(!state.voice&&currentAudio){currentAudio.pause();currentAudio=null}};function clearChat(){chatHistory=[];$('#log').innerHTML='<div class="empty">Connect Gemini AI, then speak naturally or type. Voice commands can also make your buddy jump, run, sit, lie down, wave, dance, stand or stop.</div>';action('wave',700)}$('#clear').onclick=clearChat;
let mediaRecorder=null,mediaStream=null,audioChunks=[],holdRecording=false,holdPointer=null;
const talkBtn=$('#talk');
function supportedRecordType(){const types=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];return types.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported?.(t))||''}
async function startHoldRecording(e){e?.preventDefault();if(holdRecording)return;if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return startSpeechFallback();try{if(currentAudio){currentAudio.pause();currentAudio=null}if('speechSynthesis'in window)speechSynthesis.cancel();mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});const mime=supportedRecordType();mediaRecorder=mime?new MediaRecorder(mediaStream,{mimeType:mime}):new MediaRecorder(mediaStream);audioChunks=[];holdRecording=true;holdPointer=e?.pointerId??null;talkBtn.classList.add('recording');talkBtn.querySelector('b').textContent='Listening… release to send';talkBtn.querySelector('small').textContent='Keep holding while you speak';action('listening',99999);if(e?.pointerId!=null)try{talkBtn.setPointerCapture(e.pointerId)}catch{};mediaRecorder.ondataavailable=x=>{if(x.data&&x.data.size)audioChunks.push(x.data)};mediaRecorder.onerror=()=>{toast('Microphone recording failed. Try again.');resetHoldRecording()};mediaRecorder.onstop=async()=>{const type=mediaRecorder?.mimeType||mime||'audio/webm';const blob=new Blob(audioChunks,{type});mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;holdRecording=false;talkBtn.classList.remove('recording');talkBtn.querySelector('b').textContent='Hold to talk';talkBtn.querySelector('small').textContent='Hold, speak, then release';if(blob.size<700){toast('That recording was too short. Hold the button while you speak.');action('idle');return}action('thinking',99999);setAIState(aiConnected?'online':'ready','Transcribing your speech…');try{const r=await fetch(`/api/transcribe/${state.mascot}`,{method:'POST',headers:{'Content-Type':type},body:blob});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not transcribe');const transcript=String(j.transcript||'').trim();if(!transcript)throw new Error('No speech detected');toast(`Heard: ${transcript}`);await handleChat(transcript)}catch(err){console.error(err);toast('I could not understand that recording. Try again.');setAIState(aiConnected?'online':'ready',aiConnected?'Gemini AI connected':'Gemini ready');action('idle')}};mediaRecorder.start(120)}catch(err){console.error(err);toast('Microphone could not start. Check browser permission.');resetHoldRecording()}}
function stopHoldRecording(e){e?.preventDefault();if(!holdRecording||!mediaRecorder)return;try{if(mediaRecorder.state!=='inactive')mediaRecorder.stop()}catch{resetHoldRecording()}}
function resetHoldRecording(){try{mediaStream?.getTracks().forEach(t=>t.stop())}catch{}mediaStream=null;holdRecording=false;talkBtn.classList.remove('recording');talkBtn.querySelector('b').textContent='Hold to talk';talkBtn.querySelector('small').textContent='Hold, speak, then release';action('idle')}
function startSpeechFallback(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('This browser does not support microphone recording here. Try Chrome.');const rec=new SR();rec.lang=mascotProfiles[state.mascot].lang;rec.interimResults=false;action('listening',99999);rec.onresult=x=>handleChat(x.results[0][0].transcript);rec.onerror=()=>{toast('I could not hear that clearly.');action('idle')};rec.start()}
talkBtn.addEventListener('pointerdown',startHoldRecording);talkBtn.addEventListener('pointerup',stopHoldRecording);talkBtn.addEventListener('pointercancel',stopHoldRecording);talkBtn.addEventListener('lostpointercapture',e=>{if(holdRecording&&holdPointer===e.pointerId)stopHoldRecording(e)});talkBtn.addEventListener('contextmenu',e=>e.preventDefault());

$('#buddyCharacter').onclick=()=>{action('wave',1000);toast(`${mascotProfiles[state.mascot].name} says hello!`)};
$$('[data-room]').forEach(b=>b.onclick=()=>{const m=b.dataset.room;$$('[data-room]').forEach(x=>x.classList.toggle('active',x===b));$('#carePanel').classList.toggle('open',m==='care');$('#wardrobePanel').classList.toggle('open',m==='wardrobe');if(m==='talk')$('#chatPanel').classList.toggle('open',true);if(m==='learn'){syncBuddyWithLearningLanguage();save();setView('learn')}if(m==='practice'){syncBuddyWithLearningLanguage();save();setView('practice')}if(m==='actions')$('#actionTray').classList.toggle('open')});
$$('[data-care]').forEach(b=>b.onclick=()=>{const k=b.dataset.care;if(k==='feed'){state.energy=Math.min(100,(state.energy||80)+16);state.coins=Math.max(0,(state.coins||0)-2);action('jump',800)}if(k==='play'){state.mood=Math.min(100,(state.mood||80)+15);state.energy=Math.max(0,(state.energy||80)-6);action('dance',1200)}if(k==='rest'){state.energy=100;action('lie',2200)}if(k==='encourage'){state.mood=Math.min(100,(state.mood||80)+10);action('wave',900)}save()});
$$('[data-accessory]').forEach(b=>b.onclick=()=>{const a=b.dataset.accessory,cost=a==='star'?30:a==='cap'?80:0;state.ownedAccessories=state.ownedAccessories||['none'];if(!state.ownedAccessories.includes(a)){if((state.coins||0)<cost)return toast(`You need ${cost} coins.`);state.coins-=cost;state.ownedAccessories.push(a);toast('Accessory unlocked!')}state.accessory=a;save()});



function writingSet(){
 const latinUpper='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(x=>[x,'Uppercase letter']);const latinLower='abcdefghijklmnopqrstuvwxyz'.split('').map(x=>[x,'Lowercase letter']);const latin=[...latinUpper,...latinLower];
 const spanish=[...latin,['Ñ','eñe'],['á','accent'],['é','accent'],['í','accent'],['ó','accent'],['ú','accent'],['ü','diéresis'],['¿','opening question'],['¡','opening exclamation']];
 const french=[...latin,['à','accent grave'],['â','accent circonflexe'],['æ','ligature'],['ç','cédille'],['é','accent aigu'],['è','accent grave'],['ê','accent circonflexe'],['ë','tréma'],['î','accent circonflexe'],['ï','tréma'],['ô','accent circonflexe'],['œ','ligature'],['ù','accent grave'],['û','accent circonflexe'],['ü','tréma'],['ÿ','tréma']];
 const hira='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('').map(x=>[x,'Hiragana']);
 const kata='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('').map(x=>[x,'Katakana']);
 const arabic='ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('').map(x=>[x,'Arabic letter']);
 // Khmer characters below come from the supplied consonant material already embedded in this project.
 const khmer='ក ខ គ ឃ ង ច ឆ ជ ឈ ញ ដ ឋ ឌ ឍ ណ ត ថ ទ ធ ន ប ផ ព ភ ម យ រ ល វ ស ហ ឡ អ'.split(' ').map(x=>[x,'Khmer consonant']);
 const vowels='ា ិ ី ឹ ឺ ុ ូ ួ ើ ឿ ៀ េ ែ ៃ ោ ៅ ុំ ំ ាំ ះ ុះ េះ ោះ'.split(' ').map(x=>[x,'Khmer dependent vowel']);
 const chinese=[];const seen=new Set();
 for(const u of (longCourse.languages.mandarin?.units||[]))for(const a of (u.anchors||[]))for(const ch of String(a.target||'')){if(/[\u3400-\u9fff]/.test(ch)&&!seen.has(ch)){seen.add(ch);chinese.push([ch,String(a.reading||'Character')])}}
 return {english:latin,khmer:[...khmer,...vowels],mandarin:chinese,spanish,japanese:[...hira,...kata],french,arabic}[state.language]||latin;
}
function openWritingAcademy(){
 const set=writingSet();if(!set.length)return toast('Writing material is not ready for this language.');
 state.writingMastery=state.writingMastery||{};state.writingMastery[state.language]=state.writingMastery[state.language]||{};
 let index=Math.max(0,set.findIndex(x=>!state.writingMastery[state.language][x[0]]?.mastered));if(index<0)index=0;
 let current=set[index][0],stage=0,drew=false,ink=0,strokeDistance=0,lastPoint=null,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const stageNames=['1. Recognize','2. Trace','3. Copy','4. Memory'];
 modal(`<span class="eyebrow">WRITING ACADEMY • CHARACTER PATH</span><h2>${languages[state.language].name} writing</h2>
 <p>Master each character once, then move forward automatically. Completed characters stay marked and are not forced back into the learning path.</p>
 <div class="writing-progress"><b id="writingProgress"></b><span id="writingCharacterLabel"></span></div>
 <div class="writing-stage-bar">${stageNames.map((s,i)=>`<span data-write-stage="${i}">${s}</span>`).join('')}</div>
 <div class="writing-grid">${set.map((x,i)=>`<button class="writing-card ${state.writingMastery[state.language][x[0]]?.mastered?'mastered':''} ${i>index&&!state.writingMastery[state.language][x[0]]?.mastered?'future':''}" data-write-index="${i}"><b>${x[0]}</b><span>${x[1]}</span><small>${state.writingMastery[state.language][x[0]]?.mastered?'✓ Mastered':''}</small></button>`).join('')}</div>
 <div id="writingInstruction" class="feedback"></div><canvas id="traceCanvas" width="700" height="300"></canvas>
 <div class="writing-controls"><button id="writingNext" class="primary">Begin</button><button id="clearTrace" class="secondary">Clear</button></div>`);
 const c=$('#traceCanvas'),ctx=c.getContext('2d');let drawing=false;
 const guideForStage=()=>stage===1;
 const redraw=()=>{ctx.clearRect(0,0,c.width,c.height);drew=false;ink=0;strokeDistance=0;lastPoint=null;minX=Infinity;minY=Infinity;maxX=-Infinity;maxY=-Infinity;if(guideForStage()){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#fff';ctx.font='200px "Noto Sans Khmer","Noto Sans JP","Noto Sans Arabic",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(current,c.width/2,c.height/2);ctx.restore()}};
 const selectIndex=i=>{const next=Math.max(0,Math.min(set.length-1,i));if(next>index&&!state.writingMastery[state.language][set[next][0]]?.mastered)return toast('Master the current character before moving ahead.');index=next;current=set[index][0];stage=0;update();setTimeout(()=>document.querySelector(`[data-write-index="${index}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'}),40)};
 const update=()=>{
   $$('[data-write-stage]',$('#modalBody')).forEach((x,i)=>x.classList.toggle('active',i===stage));
   $$('[data-write-index]',$('#modalBody')).forEach((x,i)=>x.classList.toggle('active',i===index));
   $('#writingProgress').textContent=`Character ${index+1} of ${set.length}`;$('#writingCharacterLabel').textContent=set[index][1];
   const instructions=[`Recognize <b>${esc(current)}</b>. Say its sound/name before continuing.`,`Trace directly over <b>${esc(current)}</b>.`,`Copy <b>${esc(current)}</b> while looking at the model card.`,`Write <b>${esc(current)}</b> from memory. The guide is hidden.`];
   $('#writingInstruction').innerHTML=instructions[stage];$('#writingNext').textContent=stage===3?(index===set.length-1?'Complete character':'Master & next character'):'Next stage';redraw();
 };
 const pos=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.onpointerdown=e=>{drawing=true;drew=true;const p=pos(e);lastPoint=p;minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);ctx.beginPath();ctx.moveTo(...p);c.setPointerCapture?.(e.pointerId)};
 c.onpointermove=e=>{if(!drawing)return;const p=pos(e);ink++;if(lastPoint)strokeDistance+=Math.hypot(p[0]-lastPoint[0],p[1]-lastPoint[1]);lastPoint=p;minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#18d5cf';ctx.lineTo(...p);ctx.stroke()};
 c.onpointerup=()=>drawing=false;c.onpointercancel=()=>drawing=false;
 $$('[data-write-index]',$('#modalBody')).forEach(b=>b.onclick=()=>{const i=Number(b.dataset.writeIndex);if(i!==index)return toast(i<index?'This character is already mastered. Continue with the current character.':'Master the current character before moving ahead.');selectIndex(i)});
 $('#clearTrace').onclick=redraw;
 $('#writingNext').onclick=()=>{
   if(stage>0){const w=maxX-minX,h=maxY-minY;if(!drew||ink<10||strokeDistance<110||Math.max(w,h)<65||Math.min(w,h)<18)return toast('Make a clear, substantial character attempt before moving on.');}
   if(stage<3){stage++;update();return}
   const rec=state.writingMastery[state.language][current]||{attempts:0};rec.attempts++;rec.last=today();rec.mastered=true;state.writingMastery[state.language][current]=rec;state.xp+=20;state.activity[today()]=(state.activity[today()]||0)+1;save();
   const card=$(`[data-write-index="${index}"]`,$('#modalBody'));if(card){card.classList.add('mastered');const sm=card.querySelector('small');if(sm)sm.textContent='✓ Mastered'}
   if(index<set.length-1){toast('Character mastered • moving to the next one');index++;current=set[index][0];stage=0;update();setTimeout(()=>document.querySelector(`[data-write-index="${index}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'}),80)}else{save();modal(`<span class="eyebrow">WRITING PATH COMPLETE</span><h2>✓ ${esc(languages[state.language].name)} character set completed</h2><p>You have mastered all ${set.length} characters in this writing set.</p><button id="writingDone" class="primary wide">Done</button>`);$('#writingDone').onclick=()=>$('#modal').close()}
 };
 update();
}

function unitPool(lang=state.language){
 const units=longCourse.languages[lang]?.units||[];const all=[];
 units.slice(0,Math.max(3,state.placementDetail?.[lang]?.unit||3)).forEach(u=>(u.anchors||[]).forEach(a=>all.push({target:String(a.target||''),meaning:String(a.meaning||''),unit:u.title})));
 return all.filter(x=>x.target&&x.meaning);
}
function openGames(){
 const pool=unitPool();if(pool.length<4)return toast('Complete more learning material to unlock games.');
 modal(`<span class="eyebrow">GAMES • SKILL POWERED</span><h2>Choose a challenge</h2><p>Different games test different abilities. Recognition alone is not treated as mastery.</p>
 <div class="game-mode-grid">
 <button data-game-mode="match"><b>🎯 Meaning Match</b><span>Target → meaning</span></button>
 <button data-game-mode="reverse"><b>🔄 Active Recall</b><span>Meaning → target</span></button>
 <button data-game-mode="listen"><b>🎧 Listening Hunt</b><span>Hear it → meaning</span></button>
 <button data-game-mode="dictation"><b>⌨️ Dictation</b><span>Hear it → type it</span></button>
 <button data-game-mode="reconstruct"><b>🧩 Reconstruct</b><span>Build the expression in order</span></button>
 <button data-game-mode="error"><b>🕵️ Error Detective</b><span>Find the correct form</span></button>
 <button data-game-mode="produce"><b>🧠 Production</b><span>Meaning → type from memory</span></button>
 <button data-game-mode="speed"><b>⚡ Mixed Speed Round</b><span>12 rapid recognition questions</span></button>
 </div>`);
 $$('[data-game-mode]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(state.language==='khmer'&&['listen','dictation'].includes(b.dataset.gameMode))return openKhmerNativeListening();runGameMode(b.dataset.gameMode,pool)});
}
function gameTokens(text){const t=String(text||'').trim();if(/\s/.test(t))return t.split(/\s+/);return Array.from(t)}
function runGameMode(mode,pool){
 const norm=v=>String(v||'').normalize('NFC').trim().replace(/[.!?？។،؟]+$/,'').replace(/\s+/g,' ').toLowerCase();
 const unique=pool.filter((x,i,a)=>a.findIndex(y=>y.target===x.target&&y.meaning===x.meaning)===i);
 const shuffled=unique.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
 const rounds=Math.min(mode==='speed'?12:8,shuffled.length);if(rounds<4)return toast('More unique material is needed before this game unlocks.');
 let round=0,score=0;const record=(ok,skill)=>{if(ok){score++;state.xp+=skill==='produce'||skill==='dictation'?8:5}recordLearningEvidence(skill,ok,{independent:skill==='produce'||skill==='dictation',target:shuffled[round]?.target||'',source:'game'})};
 const finish=()=>{save();modal(`<span class="eyebrow">SKILL GAME COMPLETE</span><h2>${score}/${rounds}</h2><p>${score===rounds?'Excellent. You demonstrated this skill without misses.':'Good work. Missed items are recorded as skill evidence, but they are not placed into a forced repetition queue.'}</p><button class="primary wide" id="gameDone">Done</button>`);$('#gameDone').onclick=()=>$('#modal').close()};
 const next=(ok,skill)=>{record(ok,skill);round++;round<rounds?draw():finish()};
 const draw=()=>{
   const target=shuffled[round],wrong=unique.filter(x=>x.target!==target.target&&x.meaning!==target.meaning).sort(()=>Math.random()-.5).slice(0,3);
   if(mode==='produce'){modal(`<span class="eyebrow">🧠 PRODUCTION • ${round+1}/${rounds}</span><h2>${esc(supportMeaning(target.meaning,state.language))}</h2><p>Produce the complete expression from memory. No answer choices.</p><input id="gameTyped" autocomplete="off" placeholder="Type the target-language expression"><button id="gameSubmit" class="primary wide">Submit</button>`);$('#gameSubmit').onclick=()=>next(norm($('#gameTyped').value)===norm(target.target),'mastery');return}
   if(mode==='dictation'){modal(`<span class="eyebrow">⌨️ DICTATION • ${round+1}/${rounds}</span><h2>Listen, then type exactly what you hear</h2><button id="gameListen" class="primary wide">🔊 Play expression</button><input id="gameTyped" autocomplete="off" placeholder="Type what you heard"><button id="gameSubmit" class="primary wide">Submit</button>`);$('#gameListen').onclick=()=>playVerifiedLanguageAudio(target.target);$('#gameSubmit').onclick=()=>next(norm($('#gameTyped').value)===norm(target.target),'listen');return}
   if(mode==='reconstruct'){
     const toks=gameTokens(target.target),mixed=toks.map((v,i)=>({v,i,r:Math.random()})).sort((a,b)=>a.r-b.r);let chosen=[];
     modal(`<span class="eyebrow">🧩 RECONSTRUCT • ${round+1}/${rounds}</span><h2>${esc(supportMeaning(target.meaning,state.language))}</h2><p>Put the target expression back into its correct order.</p><div id="rebuildAnswer" class="story-context">—</div><div class="answer-grid">${mixed.map((x,i)=>`<button data-token="${i}">${esc(x.v)}</button>`).join('')}</div><button id="rebuildSubmit" class="primary wide">Check order</button>`);
     $$('[data-token]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(b.disabled)return;const item=mixed[+b.dataset.token];chosen.push(item.v);b.disabled=true;$('#rebuildAnswer').textContent=chosen.join(/\s/.test(target.target)?' ':'')});$('#rebuildSubmit').onclick=()=>next(norm(chosen.join(/\s/.test(target.target)?' ':''))===norm(target.target),'grammar');return
   }
   if(mode==='error'){
     const toks=gameTokens(target.target);let bad=toks.slice();if(bad.length>1){const i=Math.floor(Math.random()*(bad.length-1));[bad[i],bad[i+1]]=[bad[i+1],bad[i]]}else bad=[...bad,'?'];const joiner=/\s/.test(target.target)?' ':'';const correct=target.target,incorrect=bad.join(joiner);const choices=[correct,incorrect].sort(()=>Math.random()-.5);
     modal(`<span class="eyebrow">🕵️ ERROR DETECTIVE • ${round+1}/${rounds}</span><h2>Which form is correct?</h2><p>${esc(supportMeaning(target.meaning,state.language))}</p><div class="answer-grid">${choices.map(c=>`<button data-error-answer="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);$$('[data-error-answer]',$('#modalBody')).forEach(b=>b.onclick=()=>next(norm(b.dataset.errorAnswer)===norm(correct),'grammar'));return
   }
   let prompt=target.target,answer=target.meaning,choices=[answer,...wrong.map(x=>x.meaning)],skill='learn';if(mode==='reverse'){prompt=target.meaning;answer=target.target;choices=[answer,...wrong.map(x=>x.target)];skill='mastery'}if(mode==='listen'){prompt='Listen to the whole expression';skill='listen'}
   modal(`<span class="eyebrow">${mode==='speed'?'⚡ SPEED ROUND':mode==='listen'?'🎧 LISTENING HUNT':mode==='reverse'?'🔄 ACTIVE RECALL':'🎯 MEANING MATCH'} • ${round+1}/${rounds}</span><h2>${mode==='listen'?'Listen carefully':esc(prompt)}</h2>${mode==='listen'?'<button id="gameListen" class="secondary wide">🔊 Play</button>':''}<div class="answer-grid">${choices.sort(()=>Math.random()-.5).map(c=>`<button data-game-answer="${esc(c)}">${esc(c)}</button>`).join('')}</div><p>Score: ${score}</p>`);
   if(mode==='listen')$('#gameListen').onclick=()=>playVerifiedLanguageAudio(target.target);$$('[data-game-answer]',$('#modalBody')).forEach(b=>b.onclick=()=>next(b.dataset.gameAnswer===answer,skill));
 };draw();
}



function openStory(){
 const units=longCourse.languages[state.language].units||[],idx=Math.min(units.length-1,Math.max(0,Math.floor(studyDone()/8))),u=units[idx],a=studyAnchors(u).filter((x,i,arr)=>arr.findIndex(y=>y.target===x.target)===i);if(a.length<2)return toast('Complete more of this unit to unlock its dialogue mission.');
 const lines=a.slice(0,Math.min(6,a.length)),norm=v=>String(v||'').normalize('NFC').trim().replace(/[.!?？។،؟]+$/,'').replace(/\s+/g,' ').toLowerCase();let stage=0,score=0;
 const dialogue=()=>lines.slice(0,4).map((x,i)=>`<div class="dialogue-line"><b>${i%2===0?'A':'B'}</b><span>${esc(x.target)}</span><button data-story-audio="${i}" title="Listen" aria-label="Listen to line ${i+1}">🔊</button></div>`).join('');
 const shell=(challenge)=>modal(`<span class="eyebrow">INTERACTIVE STORY • ${esc(u.title)}</span><h2>${esc(u.canDo||'Use the unit skill in a real situation')}</h2><div class="story-context"><b>Situation</b><br>${esc(u.transfer||'Use the unit language in a new situation.')}</div><div class="story-card dialogue-mission">${dialogue()}</div><div id="storyChallenge">${challenge}</div>`);
 const wireAudio=()=>$$('[data-story-audio]',$('#modalBody')).forEach(b=>b.onclick=()=>playVerifiedLanguageAudio(lines[+b.dataset.storyAudio].target));
 const draw=()=>{
   if(stage===0){const x=lines[0],wrong=lines.slice(1).map(y=>y.meaning).filter(Boolean).slice(0,3);shell(`<p><b>1/4 • Understand</b></p><h3>What does this line mean?</h3><div class="word"><div class="big">${esc(x.target)}</div></div><div class="answer-grid">${[x.meaning,...wrong].sort(()=>Math.random()-.5).map(c=>`<button data-story-choice="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);wireAudio();$$('[data-story-choice]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(b.dataset.storyChoice===x.meaning)score++;stage++;draw()});return}
   if(stage===1){const best=lines[Math.min(1,lines.length-1)],opts=[best,...lines.filter(x=>x.target!==best.target).slice(0,3)].sort(()=>Math.random()-.5);shell(`<p><b>2/4 • Decide</b></p><h3>The other person needs a useful response. Which line best moves the conversation forward?</h3><div class="branch-story-choice">${opts.map(x=>`<button data-story-decision="${esc(x.target)}"><b>${esc(x.target)}</b><span>${esc(supportMeaning(x.meaning,state.language))}</span></button>`).join('')}</div>`);wireAudio();$$('[data-story-decision]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(norm(b.dataset.storyDecision)===norm(best.target))score++;stage++;draw()});return}
   if(stage===2){const x=lines[Math.min(2,lines.length-1)],others=lines.filter(y=>y.target!==x.target).slice(0,3);shell(`<p><b>3/4 • Listen</b></p><h3>Listen without reading the target line.</h3><button id="storyListen" class="primary wide">🔊 Play line</button><div class="answer-grid">${[x,...others].sort(()=>Math.random()-.5).map(y=>`<button data-story-listen="${esc(y.target)}">${esc(supportMeaning(y.meaning,state.language))}</button>`).join('')}</div>`);wireAudio();$('#storyListen').onclick=()=>playVerifiedLanguageAudio(x.target);$$('[data-story-listen]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(norm(b.dataset.storyListen)===norm(x.target))score++;stage++;draw()});return}
   shell(`<p><b>4/4 • Transfer</b></p><h3>Respond to the situation in your own words.</h3><p>Do not copy one of the displayed lines. Use the same communication skill in a new response.</p><textarea id="storyTyped" rows="5" placeholder="Write a natural response in ${esc(languages[state.language].name)}"></textarea><button id="storySubmit" class="primary wide">Finish story mission</button>`);wireAudio();$('#storySubmit').onclick=()=>{const v=$('#storyTyped').value.trim(),copied=lines.some(x=>norm(x.target)===norm(v)),ok=meaningfulProduction(v,state.language==='mandarin'||state.language==='japanese'?4:12)&&!copied;if(ok)score++;state.xp+=score===4?35:15;recordLearningEvidence('conversation',ok,{independent:true,transfer:true,target:v,source:'story'});save();modal(`<span class="eyebrow">STORY MISSION COMPLETE</span><h2>${score}/4</h2><p>${score===4?'Excellent — you understood, chose, listened and transferred the skill independently.':'Good attempt. Your result informs your skill evidence; it is not added to a forced repetition schedule.'}</p><button id="storyDone" class="primary wide">Done</button>`);$('#storyDone').onclick=()=>$('#modal').close()};
 };draw();
}

function openMasteryTest(unitIndex,dayIndex,sessionIndex){
 const u=longCourse.languages[state.language].units[unitIndex],units=longCourse.languages[state.language].units||[];
 const current=studyAnchors(u).filter((x,i,a)=>a.findIndex(y=>y.target===x.target)===i),nearby=[];
 for(let k=Math.max(0,unitIndex-2);k<=Math.min(units.length-1,unitIndex+2);k++)for(const x of studyAnchors(units[k]))if(!nearby.some(y=>y.target===x.target))nearby.push(x);
 if(!current.length)return;
 const modes=['meaning','listen','reverse','produce'];let tasks=[];current.forEach(x=>modes.forEach(kind=>tasks.push({kind,x})));
 // A mastery checkpoint must be substantive even in early two-anchor units.
 if(tasks.length<8){const extra=nearby.filter(x=>!current.some(c=>c.target===x.target));for(const x of extra){tasks.push({kind:'produce',x});if(tasks.length>=8)break}}
 tasks=tasks.slice(0,Math.max(8,Math.min(12,tasks.length)));let i=0,right=0;
 const norm=v=>String(v||'').normalize('NFC').trim().replace(/[.!?？។،؟]+$/,'').replace(/\s+/g,' ').toLowerCase();
 const finish=()=>{const pct=Math.round(right/tasks.length*100),pass=pct>=80;state.unitMastery=state.unitMastery||{};state.unitMastery[`${state.language}-${unitIndex+1}`]={pct,pass,date:today(),tasks:tasks.length};save();if(pass)completeStudy(unitIndex,dayIndex,sessionIndex);else{modal(`<h2>${pct}% — Not mastered yet</h2><p>You answered ${right}/${tasks.length} correctly. You need 80%. Nothing is placed into scheduled repetition: revisit the unit only to fix the skill that was missing, then take a fresh mixed checkpoint.</p><button id="retryMaster" class="primary wide">Try a fresh test</button>`);$('#retryMaster').onclick=()=>openMasteryTest(unitIndex,dayIndex,sessionIndex)}};
 const advance=ok=>{if(ok)right++;i++;i<tasks.length?draw():finish()};
 const draw=()=>{const t=tasks[i],x=t.x,distractors=nearby.filter(y=>y.target!==x.target&&y.meaning!==x.meaning).slice().sort(()=>Math.random()-.5).slice(0,3);
  if(t.kind==='produce'){modal(`<span class="eyebrow">UNIT MASTERY • INDEPENDENT PRODUCTION</span><h2>${i+1}/${tasks.length}</h2><p>Produce the complete expression from meaning.</p><h3>${esc(supportMeaning(x.meaning,state.language))}</h3><input id="masterTyped" autocomplete="off" placeholder="Type the complete ${esc(languages[state.language].name)} expression"><button id="masterSubmit" class="primary wide">Submit</button>`);$('#masterSubmit').onclick=()=>advance(norm($('#masterTyped').value)===norm(x.target));return}
  if(t.kind==='listen'){if(state.language==='khmer'&&!exactKhmerHumanClip(x.target)){t.kind='reverse';return draw()}modal(`<span class="eyebrow">UNIT MASTERY • LISTENING</span><h2>${i+1}/${tasks.length}</h2><p>Listen to the complete expression and choose its meaning.</p><button id="masterListen" class="primary wide">🔊 Play</button><div class="answer-grid">${[x.meaning,...distractors.map(y=>y.meaning)].sort(()=>Math.random()-.5).map(c=>`<button data-master-answer="${esc(c)}">${esc(supportMeaning(c,state.language))}</button>`).join('')}</div>`);$('#masterListen').onclick=()=>playVerifiedLanguageAudio(x.target);$$('[data-master-answer]',$('#modalBody')).forEach(b=>b.onclick=()=>advance(b.dataset.masterAnswer===x.meaning));return}
  if(t.kind==='reverse'){modal(`<span class="eyebrow">UNIT MASTERY • ACTIVE RECALL</span><h2>${i+1}/${tasks.length}</h2><p>Which complete expression matches this meaning?</p><h3>${esc(x.meaning)}</h3><div class="answer-grid">${[x.target,...distractors.map(y=>y.target)].sort(()=>Math.random()-.5).map(c=>`<button data-master-target="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);$$('[data-master-target]',$('#modalBody')).forEach(b=>b.onclick=()=>advance(b.dataset.masterTarget===x.target));return}
  modal(`<span class="eyebrow">UNIT MASTERY • COMPREHENSION</span><h2>${i+1}/${tasks.length}</h2><div class="word"><div class="big">${esc(x.target)}</div></div><p>Choose the meaning of the complete expression.</p><div class="answer-grid">${[x.meaning,...distractors.map(y=>y.meaning)].sort(()=>Math.random()-.5).map(c=>`<button data-master-meaning="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);$$('[data-master-meaning]',$('#modalBody')).forEach(b=>b.onclick=()=>advance(b.dataset.masterMeaning===x.meaning));
 };draw();
}



function openKhmerNativeListening(){
 const all=khmerCommonVoiceEntries();if(!all.length)return toast('Verified Khmer listening recordings are not installed in this build.');
 state.khmerNativeSeen=Array.isArray(state.khmerNativeSeen)?state.khmerNativeSeen:[];const seen=new Set(state.khmerNativeSeen);
 const remaining=all.filter(x=>!seen.has(x.audio));
 if(!remaining.length){modal('<span class="eyebrow">NATIVE KHMER LISTENING</span><h2>✓ Listening corpus completed</h2><p>You have completed every verified human recording included in this pathway. The app will not recycle them automatically.</p><button id="nativeDone" class="primary wide">Done</button>');$('#nativeDone').onclick=()=>$('#modal').close();return}
 const item=remaining[0],len=String(item.sentence).length;
 const candidates=all.filter(x=>x.audio!==item.audio).sort((a,b)=>Math.abs(String(a.sentence).length-len)-Math.abs(String(b.sentence).length-len)).slice(0,12);
 const shuffle=a=>a.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);const choices=shuffle([item,...shuffle(candidates).slice(0,3)]);
 modal(`<span class="eyebrow">NATIVE KHMER • HUMAN RECORDING</span><h2>Listening ${seen.size+1} / ${all.length}</h2><p>Listen to the complete recording and choose the exact Khmer transcript. These recordings come from the validated Common Voice Khmer material supplied to this project.</p><button id="nativePlay" class="primary wide">🔊 Play human recording</button><div class="answer-grid native-khmer-answers">${choices.map(x=>`<button data-native-audio="${esc(x.audio)}">${esc(x.sentence)}</button>`).join('')}</div><p id="nativeResult"></p>`);
 $('#nativePlay').onclick=()=>{const a=new Audio(item.audio);a.play().catch(()=>toast('Recording could not play.'))};
 $$('[data-native-audio]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(b.dataset.nativeAudio!==item.audio){$('#nativeResult').textContent='Not correct. Listen to the entire recording again.';return}state.khmerNativeSeen.push(item.audio);state.xp+=8;save();$('#nativeResult').innerHTML='<b>Correct.</b> This recording is now complete and will not be repeated.';setTimeout(openKhmerNativeListening,650)});
}
$$('[data-practice]').forEach(b=>b.onclick=()=>{const kind=b.dataset.practice,l=languages[state.language];
 if(kind==='speech')openSpeech({title:'Speaking practice',word:l.speech[0],reading:l.speech[1],meaning:l.speech[2]},`practice-${state.language}`);
 if(kind==='cards'){let i=0;const pool=unitPool().filter((x,j,a)=>a.findIndex(y=>y.target===x.target)===j).slice(0,20);const cards=pool.length?pool:l.cards.map(c=>({target:c[0],meaning:c[2],reading:c[1]}));const draw=()=>{const c=cards[i];modal(`<span class="eyebrow">VOCABULARY CHALLENGE • ONE PASS</span><h2>${i+1}/${cards.length}</h2><p>Recall the meaning before revealing it. This item will not loop back into the same session.</p><div class="word"><div class="big">${c.target}</div><p>${c.reading||''}</p><div id="cardMeaning" style="display:none"><b>${esc(c.meaning)}</b></div></div><button id="revealCard" class="secondary">Reveal answer</button><button id="cardNext" class="primary wide">Next new item</button>`);$('#revealCard').onclick=()=>$('#cardMeaning').style.display='block';$('#cardNext').onclick=()=>{i++;if(i>=cards.length){state.xp+=15;save();$('#modal').close();toast('Vocabulary challenge complete +15 XP')}else draw()}};draw()}
 if(kind==='listen'&&state.language==='khmer'){openKhmerNativeListening();return}
 if(kind==='listen'){const pool=unitPool(),x=pool[0]||{target:l.speech[0],meaning:l.speech[2]};modal(`<h2>Listening practice</h2><p>Listen without reading first, then choose the meaning and repeat it aloud.</p><button id="playListen" class="primary wide">🔊 Play phrase</button><div class="answer-grid">${[x.meaning,...pool.slice(1,4).map(y=>y.meaning)].map(c=>`<button data-listen-practice="${esc(c)}">${esc(c)}</button>`).join('')}</div><p id="listenPracticeResult"></p>`);$('#playListen').onclick=()=>{playVerifiedLanguageAudio(x.target)};$$('[data-listen-practice]',$('#modalBody')).forEach(b=>b.onclick=()=>{if(b.dataset.listenPractice===x.meaning){$('#listenPracticeResult').textContent='Correct.';state.xp+=5;save()}else{$('#listenPracticeResult').textContent='Not quite. Listen to the complete phrase again, then continue with new material.'}})}
 if(kind==='pronunciation'){const p=unitPool();if(p.length)openPronunciationCoach(p[0].target);else toast('Complete some course material first.')}
 if(kind==='writing')openWritingAcademy();
 if(kind==='games')openGames();
 if(kind==='stories')openStory();
});



let studyBlockStartedAt=0;
function studyId(unitIndex,dayIndex,sessionIndex){return `${state.language}-u${unitIndex+1}-d${dayIndex+1}-s${sessionIndex+1}`}
function completeStudy(unitIndex,dayIndex,sessionIndex){
 const id=studyId(unitIndex,dayIndex,sessionIndex),lang=state.language,wasComplete=courseComplete(lang);
 if(!state.studyCompleted.includes(id)){state.studyCompleted.push(id);const elapsed=studyBlockStartedAt?Math.max(1,Math.min(60,Math.round((Date.now()-studyBlockStartedAt)/60000))):1;state.studyMinutes=(state.studyMinutes||0)+elapsed;state.xp+=25;state.coins=(state.coins||0)+5;const skillKey=studyTypes[sessionIndex]?.key||'learn';recordLearningEvidence(skillKey,true,{independent:['transfer','grammar','conversation','mastery'].includes(skillKey),transfer:skillKey==='transfer',source:'guided-block'});const d=today();state.activity[d]=(state.activity[d]||0)+1;if(state.lastDay!==d){const y=new Date();y.setDate(y.getDate()-1);const yd=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;state.streak=state.lastDay===yd?(state.streak||0)+1:1;state.lastDay=d}}
 updateQuestProgress('lesson',1);save();toast('Learning activity complete • +25 XP');
 if(!wasComplete&&courseComplete(lang)){maybeAwardCertificate(lang);return}
 openStudyDay(unitIndex,dayIndex);
}
function openLongUnit(unitIndex){
 const u=longCourse.languages[state.language].units[unitIndex];const done=state.studyCompleted.filter(x=>x.startsWith(`${state.language}-u${unitIndex+1}-d1-`)).length;
 modal(`<span class="eyebrow">UNIT ${unitIndex+1} • 8 PROGRESSIVE BLOCKS</span><h2>${esc(u.title)}</h2><p>${esc(u.goal)}</p>${u.canDo?`<div class="can-do-card"><b>🎯 Can-do outcome</b><span>${esc(u.canDo)}</span></div>`:''}<div class="day-grid"><button class="study-day" id="openUnitLesson"><b>Guided lesson ${unitIndex+1}</b><span>${done}/8 blocks</span><small>Learn → listen → speak → read/write → transfer → grammar → conversation → mastery</small></button></div><div class="study-summary"><b>No scheduled spaced repetition</b><span>Master the unit material, prove you can transfer the skill to a new situation, then move forward.</span></div>`);
 $('#openUnitLesson').onclick=()=>openStudyDay(unitIndex,0);
}
function openStudyDay(unitIndex,dayIndex){
 const u=longCourse.languages[state.language].units[unitIndex],dayNo=unitIndex+1;
 modal(`<span class="eyebrow">${languages[state.language].flag} UNIT ${dayNo} OF 30</span><h2>${esc(u.title)}</h2><p>${esc(u.goal)}</p><div class="session-grid">${studyTypes.map((s,i)=>{const done=state.studyCompleted.includes(studyId(unitIndex,dayIndex,i));const priorDone=i===0||state.studyCompleted.includes(studyId(unitIndex,dayIndex,i-1));const unlocked=done||priorDone;return `<button class="study-session ${done?'done':''} ${unlocked?'':'locked-session'}" data-study-session="${i}" ${unlocked?'':'disabled'}><span>${done?'✓':unlocked?s.icon:'🔒'}</span><b>${i+1}. ${s.name}</b><small>${unlocked?s.desc:'Complete the previous block first.'}</small></button>`}).join('')}</div><button id="backUnit" class="secondary wide">← Unit overview</button>`);
 $$('[data-study-session]',$('#modalBody')).forEach(b=>b.onclick=()=>openStudySession(unitIndex,dayIndex,Number(b.dataset.studySession)));
 $('#backUnit').onclick=()=>openLongUnit(unitIndex);
}
function studyAnchors(u){return (u.anchors||[]).map(x=>{const raw=String(x.meaning||'');const split=state.language==='khmer'&&raw.includes(' / ');const parts=split?raw.split(' / '):[raw];const meaning=String(split?parts.slice(1).join(' / '):raw);return {target:String(x.target||''),reading:String(x.reading||(split?parts[0]:'')),meaning,support:supportMeaning(meaning,state.language)}})}
function sourceBlock(u){
 if(state.language!=='khmer'||!u.source)return '';
 return `<details class="source-material"><summary>📖 Supplied Khmer source material for this unit</summary><pre>${esc(u.source.slice(0,3600))}</pre></details>`;
}
function meaningfulProduction(value,minChars=18){
 const text=String(value||'').normalize('NFC').trim();if(text.length<minChars)return false;
 const tokens=text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];if(tokens.length<3)return false;
 const unique=new Set(tokens);if(tokens.length>=6&&unique.size/Math.max(1,tokens.length)<0.45)return false;
 const longest=tokens.reduce((m,x)=>Math.max(m,x.length),0);return longest>1;
}
function meaningfulIELTSWriting(text,minWords){
 const words=String(text||'').trim().match(/[A-Za-zÀ-ÖØ-öø-ÿ'-]+/g)||[];if(words.length<minWords)return false;
 const unique=new Set(words.map(x=>x.toLowerCase()));if(unique.size/words.length<0.28)return false;
 const sentences=String(text||'').split(/[.!?]+/).map(x=>x.trim()).filter(x=>x.split(/\s+/).length>=5);return sentences.length>=Math.max(3,Math.floor(minWords/80));
}
function finishBlockButton(unitIndex,dayIndex,sessionIndex,requireId=''){
 return `<button class="primary wide finish-study" data-finish="${sessionIndex}" ${requireId?`data-require="${requireId}" disabled`:''}>Complete this learning block</button>`;
}
function wireFinish(unitIndex,dayIndex,sessionIndex){
 const btn=$('.finish-study',$('#modalBody'));if(btn&&btn.dataset.require){const field=$('#'+btn.dataset.require);if(field){const normal=v=>String(v||'').normalize('NFC').trim().replace(/[.!?？؟។]+$/,'').replace(/\s+/g,' ').toLowerCase();const check=()=>{const v=String(field.value||'').trim(),exact=field.dataset.exact;btn.disabled=exact?normal(v)!==normal(exact):!meaningfulProduction(v,18)};field.addEventListener('input',check);check()}}
 const b=$('[data-finish]',$('#modalBody'));if(b)b.onclick=()=>completeStudy(unitIndex,dayIndex,sessionIndex);
}
function openStudySession(unitIndex,dayIndex,sessionIndex){
 studyBlockStartedAt=Date.now();
 const u=longCourse.languages[state.language].units[unitIndex],s=studyTypes[sessionIndex],anchors=studyAnchors(u),dayNo=unitIndex+1;
 // Rotate targets by block so expanded units teach genuinely new language instead of recycling anchor 1.
 const pick=(offset=0)=>anchors.length?anchors[(sessionIndex+offset)%anchors.length]:{target:'',meaning:''};
 const a=pick(0),b=pick(1);
 let body='';
 if(s.key==='learn')body=`<div class="study-plan"><b>${esc(lessonT('guided'))}</b><ol><li>${esc(lessonT('understand'))}</li><li>${esc(lessonT('connect'))}</li><li>${esc(lessonT('useContext'))}</li><li>${esc(lessonT('produceNoCopy'))}</li><li>${esc(lessonT('completeTask'))}</li></ol></div><div class="anchor-grid">${anchors.map(x=>`<div class="anchor-card"><div class="big">${x.target}</div>${x.reading?`<div class="romanization">${esc(x.reading)}</div>`:''}${supportMeaningMarkup(x.meaning,state.language)}<button class="secondary hear-anchor" data-hear="${esc(x.target)}">🔊 Listen</button></div>`).join('')}</div>${sourceBlock(u)}<div class="production-gate"><b>${esc(lessonT('productionCheck'))}</b><p>${esc(lessonT('withoutCopy'))} <strong>${esc(a.support||supportMeaning(a.meaning))}</strong></p><input id="learnProof" data-exact="${esc(a.target)}" autocomplete="off" placeholder="${esc(lessonT('typeTarget'))}"></div>${finishBlockButton(unitIndex,dayIndex,sessionIndex,'learnProof')}`;
 if(s.key==='listen'){const dp=(longCourse.languages[state.language]?.units||[]).flatMap(x=>studyAnchors(x)).filter(x=>x.target!==a.target&&x.meaning!==a.meaning).slice(Math.max(0,unitIndex*2),Math.max(0,unitIndex*2)+8);const opts=[a.meaning,...dp.map(x=>x.meaning).filter(x=>x!==a.meaning).slice(0,3)].sort(()=>Math.random()-.5);body=`<div class="study-plan"><b>${esc(lessonT('listeningLab'))}</b><p>${esc(lessonT('listenInstruction'))}</p></div><button id="listenA" class="primary wide">🔊 Play expression</button><div class="answer-grid">${opts.map(x=>`<button data-listen-answer="${esc(x)}">${esc(supportMeaning(x,state.language))}</button>`).join('')}</div><p id="listenResult"></p><label>${esc(lessonT('dictation'))}<input id="listenProof" data-exact="${esc(a.target)}" autocomplete="off" placeholder="Type the complete expression"></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'listenProof')}`};
 if(s.key==='speak')body=`<div class="study-plan"><b>${esc(lessonT('speakingLab'))}</b><ol><li>${esc(lessonT('slowRepeat'))}</li><li>${esc(lessonT('shadow'))}</li><li>${esc(lessonT('fromSupport'))}</li><li>${esc(lessonT('changeDetail'))}</li><li>${esc(lessonT('recordBest'))}</li></ol></div><div class="anchor-card">${supportMeaningMarkup(a.meaning,state.language)}<div class="big">${a.target}</div></div><button id="courseSpeak" class="primary wide">🎙️ ${esc(lessonT('speakingCheck'))}</button><p id="courseSpeakResult">Chrome gives the best microphone support.</p><input id="speakProof" data-exact="${esc(a.target)}" type="hidden">${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'speakProof')}`;
 if(s.key==='readwrite')body=`<div class="study-plan"><b>${esc(lessonT('readWrite'))}</b><p>${esc(lessonT('readInstruction'))}</p></div><div class="anchor-grid">${anchors.map(x=>`<div class="anchor-card"><div class="big">${x.target}</div>${x.reading?`<div class="romanization">${esc(x.reading)}</div>`:''}${supportMeaningMarkup(x.meaning,state.language)}</div>`).join('')}</div><label>${esc(lessonT('writeFromMemory'))} <strong>${esc(b.support||supportMeaning(b.meaning))}</strong><input id="studyWriting" data-exact="${esc(b.target)}" autocomplete="off" placeholder="${esc(lessonT('typeTarget'))}"></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'studyWriting')}`;
 if(s.key==='build'){const adv=advancedCourseChallenge(unitIndex);body=adv?`<div class="study-plan advanced-course-challenge"><b>Advanced Response Building</b><p>${esc(adv.prompt)}</p><ol><li>Plan the key information you need to communicate.</li><li>Connect reasons, details and consequences instead of giving one short sentence.</li><li>Write a complete response in the target language in your own words.</li></ol></div><label>Build your response<textarea id="buildProof" rows="7" placeholder="Build a connected response in the target language"></textarea></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'buildProof')}`:`<div class="study-plan"><b>${esc(lessonT('transfer'))}</b><p>${esc(u.transfer||'Use the unit skill in a new situation without copying a model answer.')}</p><ol><li>${esc(lessonT('dontCopy'))}</li><li>${esc(lessonT('reuseSkill'))}</li><li>${esc(lessonT('twoIdeas'))}</li></ol></div><h3>${esc(lessonT('quickMeaning'))}</h3><div class="answer-grid"><button data-build="yes">${esc(a.support||supportMeaning(a.meaning))}</button><button data-build="no">${esc(b.support||supportMeaning(b.meaning))}</button></div><p id="buildResult"></p><label>${esc(lessonT('yourTransfer'))}<textarea id="buildProof" rows="5" placeholder="Respond to the new situation in the target language"></textarea></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'buildProof')}`;}
 if(s.key==='grammar'){const adv=advancedCourseChallenge(unitIndex);body=adv?`<div class="study-plan advanced-course-challenge"><b>Advanced Communication Patterns</b><p>At this level, grammar is used to manage meaning in a real conversation rather than complete an isolated pattern.</p><ul><li>Connect ideas clearly.</li><li>Give reasons and consequences.</li><li>Use appropriate politeness for the situation.</li><li>Clarify or qualify what you mean when needed.</li></ul><p><strong>Scenario:</strong> ${esc(adv.prompt)}</p></div><label>Write a second, differently worded response in the target language<textarea id="grammarProof" rows="7" placeholder="Express the same goal naturally in a different way in the target language"></textarea></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'grammarProof')}`:`<div class="study-plan"><b>${esc(lessonT('grammar'))}</b><p><strong>${esc(lessonT('focus'))}</strong> ${esc(u.grammarFocus||'Use the grammar patterns supported by this unit.')}</p>${u.cultureNote?`<div class="culture-note"><b>🌍 Usage & culture</b><span>${esc(u.cultureNote)}</span></div>`:''}<ol><li>${esc(lessonT('noticeGrammar'))}</li><li>${esc(lessonT('meaningPoliteness'))}</li><li>${esc(lessonT('newExamples'))}</li><li>${esc(lessonT('questionResponse'))}</li></ol></div><div class="anchor-grid">${anchors.map(x=>`<div class="anchor-card"><div class="big">${x.target}</div>${x.reading?`<div class="romanization">${esc(x.reading)}</div>`:''}${supportMeaningMarkup(x.meaning,state.language)}</div>`).join('')}</div><label>${esc(lessonT('applyGrammar'))}<textarea id="grammarProof" rows="4" placeholder="Create a new example, not a copied anchor"></textarea></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'grammarProof')}`;}
 if(s.key==='conversation'){const adv=advancedCourseChallenge(unitIndex);body=adv?`<div class="study-plan advanced-course-challenge"><b>Advanced ${esc(adv.language)} Conversation • ${esc(adv.title)}</b><p>${esc(adv.prompt)}</p><p><strong>Your response must:</strong></p><ul>${adv.requirements.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p>No romanisation or model answer is provided at this stage. Communicate the ideas naturally rather than memorising one sentence.</p></div><button id="launchConversation" class="primary wide">💬 Practise this scenario with ${esc(mascotProfiles[languages[state.language].mascot].name)}</button><label>After the conversation, write the response you used in the target language<textarea id="conversationProof" rows="6" placeholder="Write a substantial natural response in the target language"></textarea></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'conversationProof')}`:`<div class="study-plan"><b>${esc(lessonT('conversation'))}</b><p>${esc(lessonT('conversationInstruction'))}</p></div><div class="anchor-grid">${anchors.map(x=>`<div class="anchor-card"><div class="big">${x.target}</div>${x.reading?`<div class="romanization">${esc(x.reading)}</div>`:''}${supportMeaningMarkup(x.meaning,state.language)}</div>`).join('')}</div><button id="launchConversation" class="primary wide">💬 ${esc(lessonT('openBuddy'))}</button><label>${esc(lessonT('afterConversation'))}<textarea id="conversationProof" rows="3"></textarea></label>${sourceBlock(u)}${finishBlockButton(unitIndex,dayIndex,sessionIndex,'conversationProof')}`;}
 if(s.key==='mastery')body=`<div class="study-plan"><b>${esc(lessonT('mastery'))}</b><p>${esc(lessonT('masteryInstruction'))}</p></div><button id="startMastery" class="primary wide">🏆 ${esc(lessonT('startMastery'))}</button>${sourceBlock(u)}`;
 modal(`${directionMarkup()}<span class="eyebrow">DAY ${dayNo} • BLOCK ${sessionIndex+1}/8</span><h2>${s.icon} ${s.name}</h2><p>${esc(u.title)} — ${esc(u.goal)}</p>${body}<button id="backDay" class="secondary wide">← Back to Day ${dayNo}</button>`);
 $$('.hear-anchor',$('#modalBody')).forEach(x=>x.onclick=()=>{const t=x.dataset.hear;playVerifiedLanguageAudio(t)});
 if($('#listenA'))$('#listenA').onclick=()=>{playVerifiedLanguageAudio(a.target)};
 $$('[data-listen-answer]',$('#modalBody')).forEach(x=>x.onclick=()=>$('#listenResult').textContent=x.dataset.listenAnswer===a.meaning?'Correct — now type the expression you heard.':'Not correct. Listen to the whole expression again.');
 $$('[data-build]',$('#modalBody')).forEach(x=>x.onclick=()=>$('#buildResult').textContent=x.dataset.build==='yes'?'Correct. Now produce five new variations.':'Try again.');
 if($('#startMastery'))$('#startMastery').onclick=()=>openMasteryTest(unitIndex,dayIndex,sessionIndex);
 if($('#courseSpeak'))$('#courseSpeak').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('#courseSpeakResult').textContent='Speech recognition is unavailable here; practise aloud and use Hold to Talk in the Buddy Room.';return}const r=new SR();r.lang=languages[state.language].lang;r.interimResults=false;$('#courseSpeakResult').textContent='Listening…';r.onresult=e=>{const heard=e.results[0][0].transcript;$('#courseSpeakResult').textContent=`I heard: “${heard}”`;const f=$('#speakProof');if(f){f.value=heard;f.dispatchEvent(new Event('input'))}};r.onerror=()=>$('#courseSpeakResult').textContent='Could not hear clearly. Try again.';r.start()};
 if($('#launchConversation'))$('#launchConversation').onclick=()=>{syncBuddyWithLearningLanguage({clearConversation:true});save();$('#modal').close();setView('mascots');const adv=advancedCourseChallenge(unitIndex);const prompt=adv?`Advanced ${adv.language} conversation challenge: ${adv.prompt} Keep the conversation natural, ask unpredictable follow-up questions, and make me explain, clarify and justify my ideas in the target language. Do not give me a model answer first.`:`Let's practise Unit ${unitIndex+1}: ${u.title}. Please keep me on this topic and make me use today's expressions.`;setTimeout(()=>{const input=$('#chatText');if(input)input.value=prompt},150)};
 if(s.key!=='mastery')wireFinish(unitIndex,dayIndex,sessionIndex);
 $('#backDay').onclick=()=>openStudyDay(unitIndex,dayIndex);
}

$('#startNew').onclick=()=>{state.studyCompleted=state.studyCompleted.filter(x=>!x.startsWith(state.language+'-'));save();toast(`Starting the 30-unit ${languages[state.language].name} pathway from Unit 1.`)};
$('#placementTest').onclick=startAdvancedPlacement;const wa=$('#writingAcademy');if(wa)wa.onclick=openWritingAcademy;

let bookingAvailability=[];
const learnerTimeZone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}};
function zonedLocalToUtc(date,time,sourceZone='UTC'){
 const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
 const partsAt=dt=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:sourceZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(dt).filter(x=>x.type!=='literal').map(x=>[x.type,+x.value]));
 for(let i=0;i<3;i++){const p=partsAt(guess),seen=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute),wanted=Date.UTC(y,m-1,d,hh,mm);guess=new Date(guess.getTime()+(wanted-seen));}
 return guess;
}
function bookingLocalParts(date,time,sourceZone='Asia/Phnom_Penh'){
 const utc=zonedLocalToUtc(date,time,sourceZone),zone=learnerTimeZone(),fmt=new Intl.DateTimeFormat([],{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});return {label:fmt.format(utc),zone,instant:utc};
}
function bookingLocalTime(date,time,sourceZone){return bookingLocalParts(date,time,sourceZone).label}

function localTimeLabel(time){const [h,m]=String(time).split(':').map(Number);const d=new Date();d.setHours(h||0,m||0,0,0);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function formatBookDay(date){const d=new Date(date+'T12:00:00');return {dow:d.toLocaleDateString([],{weekday:'short'}),day:d.toLocaleDateString([],{day:'numeric'}),month:d.toLocaleDateString([],{month:'short'})}}
async function loadTeacherAvailability(teacher){
 try{return await apiJSON(`/api/teacher-availability?teacher=${encodeURIComponent(teacher)}`)}catch(e){console.warn(e);return {teacher,timezone:'Asia/Phnom_Penh',days:[]}}
}
function renderBookingDays(data,preferredDate='',preferredTime=''){
 bookingAvailability=(data.days||[]).map(d=>({...d,timezone:data.timezone||'Asia/Phnom_Penh'}));const wrap=$('#bookingDays');const first=bookingAvailability.find(x=>x.slots.length);const chosen=bookingAvailability.find(x=>x.date===preferredDate&&x.slots.length)||first;
 wrap.innerHTML=bookingAvailability.map(d=>{const f=formatBookDay(d.date);return `<button type="button" class="booking-day ${chosen&&d.date===chosen.date?'active':''}" data-book-day="${esc(d.date)}" ${d.slots.length?'':'disabled'}><b>${esc(f.dow)}</b><strong>${esc(f.day)}</strong><span>${esc(f.month)}</span><small>${d.slots.length?`${d.slots.length} open`:'Full'}</small></button>`}).join('')||'<p>No availability has been published yet.</p>';
 $$('[data-book-day]',wrap).forEach(b=>b.onclick=()=>{ $$('[data-book-day]',wrap).forEach(x=>x.classList.remove('active'));b.classList.add('active');renderBookingSlots(b.dataset.bookDay)});
 if(chosen)renderBookingSlots(chosen.date,preferredTime);else $('#bookingSlots').innerHTML='<p class="booking-hint">This teacher has no open times in the next 60 days.</p>';
}
function renderBookingSlots(date,preferredTime=''){
 const day=bookingAvailability.find(x=>x.date===date),wrap=$('#bookingSlots');$('#bookDate').value='';$('#bookTime').value='';$('#bookingSubmit').disabled=true;$('#bookingSelection').textContent='No time selected yet.';
 wrap.innerHTML=day&&day.slots.length?day.slots.map(t=>`<button type="button" class="booking-slot ${preferredTime===t?'active':''}" data-book-slot="${esc(t)}">${esc(bookingLocalTime(date,t,day?.timezone))}</button>`).join(''):'<p class="booking-hint">No available times on this day.</p>';
 const choose=b=>{ $$('[data-book-slot]',wrap).forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#bookDate').value=date;$('#bookTime').value=b.dataset.bookSlot;$('#bookingSubmit').disabled=false;const d=new Date(date+'T12:00:00');$('#bookingSelection').innerHTML=`<b>${esc(bookingLocalTime(date,b.dataset.bookSlot,day?.timezone))}</b><span>Your local time • ${esc(learnerTimeZone())}</span>`};
 $$('[data-book-slot]',wrap).forEach(b=>b.onclick=()=>choose(b));const preferred=$(`[data-book-slot="${preferredTime}"]`,wrap);if(preferred)choose(preferred);
}
async function openTeacherBooking(teacher,subject,preferredDate='',preferredTime=''){
 const form=$('#bookingForm');if(!form)return;form.dataset.teacher=teacher;form.dataset.subject=subject;
 $('#bookingTitle').textContent=`Book with Teacher ${teacher}`;$('#bookingSub').textContent=`Choose one of ${teacher}'s available times. Trial lesson: $6.`;$('#bookName').value=state.name==='Student'?'':state.name;$('#bookEmail').value=state.email||'';$('#bookDate').value='';$('#bookTime').value='';$('#bookMessage').value='';$('#bookType').selectedIndex=0;$('#bookingSubmit').disabled=true;$('#bookingDays').innerHTML='<p>Loading available times…</p>';$('#bookingSlots').innerHTML='<p class="booking-hint">Loading…</p>';$('#bookingTimeZone').textContent=`Times are converted automatically to your timezone: ${learnerTimeZone()}.`;$('#booking').showModal();
 const data=await loadTeacherAvailability(teacher);renderBookingDays(data,preferredDate,preferredTime);$('#bookingTimeZone').textContent=`Times converted from ${data.timezone||'Asia/Phnom_Penh'} to your timezone: ${learnerTimeZone()} • Booked times disappear automatically.`;
}
$$('.book-btn').forEach(b=>b.onclick=()=>openTeacherBooking(b.dataset.teacher,b.dataset.subject));
async function hydrateTeacherAvailabilityPreviews(){
 const boxes=$$('[data-availability-preview]');await Promise.all(boxes.map(async box=>{const teacher=box.dataset.availabilityPreview,slots=box.querySelector('.availability-preview-slots');try{const data=await loadTeacherAvailability(teacher);const next=[];for(const day of data.days||[]){for(const time of day.slots||[]){next.push({date:day.date,time});if(next.length===3)break}if(next.length===3)break}if(!next.length){slots.innerHTML='<small>No open times in the next 60 days.</small>';return}slots.innerHTML=next.map(x=>{const f=formatBookDay(x.date);return `<button type="button" class="availability-preview-slot" data-preview-date="${esc(x.date)}" data-preview-time="${esc(x.time)}"><span>${esc(f.dow)} ${esc(f.day)} ${esc(f.month)}</span><b>${esc(bookingLocalTime(x.date,x.time,data.timezone))}</b></button>`}).join('');$$('[data-preview-date]',slots).forEach(btn=>btn.onclick=e=>{e.stopPropagation();const p=teacherProfiles[teacher];openTeacherBooking(teacher,p?p.subject:'Private lesson',btn.dataset.previewDate,btn.dataset.previewTime)})}catch(e){slots.innerHTML='<small>Availability temporarily unavailable.</small>'}}))
}
hydrateTeacherAvailabilityPreviews();

const teacherProfiles={
 Nathan:{subject:'English',country:'Ireland 🇮🇪',role:'English Teacher',photo:'assets/nathan.jpg',video:'assets/nathan-intro.mp4',intro:'Practical, supportive English lessons focused on speaking clearly and building real confidence.',details:'6 years of teaching experience. Qualifications listed in iSpeak Confidence include TEFL, IELTS Preparation, Primary Education Training and a Diploma in Physical Fitness.',specialties:['Speaking','IELTS','Grammar','Confidence'],motto:'Believe • Leadership • Inspiration • Success'},
 Ounnoun:{subject:'Khmer',country:'Cambodia 🇰🇭',role:'Khmer Teacher',photo:'assets/ounnoun.jpg',video:'assets/ounnoun-intro.mp4',intro:'Friendly private Khmer lessons focused on useful conversation and confident communication.',details:'Private Khmer teaching through iSpeak Confidence with lessons focused on practical communication and learner confidence.',specialties:['Conversation','Everyday Khmer','Confidence','Private Lessons'],motto:''},
 'Jessica':{subject:'Khmer / English / Chinese',country:'Cambodia 🇰🇭',role:'Khmer, English & Chinese Teacher',photo:'assets/jessica.png',video:'assets/jessica-intro.mp4',intro:'Multilingual lessons for learners who want practical communication, stronger language skills and structured support.',details:'4+ years of teaching experience. Holds a Bachelor degree in English Literature and an Engineering degree in Civil Engineering. Has taught Khmer to foreigners and English to adult learners from beginner to advanced, plus beginner-level Chinese.',specialties:['Khmer','English','Chinese','Conversation'],motto:''},
 'An Sievly':{subject:'Khmer / English',country:'Cambodia 🇰🇭',role:'Khmer & English Teacher',photo:'assets/an-sievly.png',video:'assets/an-sievly-intro.mp4',intro:'Supportive Khmer and English lessons with a focus on communication and learner development.',details:'Khmer and English teacher with part-time homeschool teaching experience and General English Program training at the Australian Center for Education.',specialties:['Khmer','English','TEFL','Conversation'],motto:''}
};
async function hydrateApprovedTeachers(){
 try{const d=await apiJSON('/api/approved-teachers'),grid=$('.teacher-cinema-grid');if(!grid)return;for(const t of d.teachers||[]){if(!t.name||teacherProfiles[t.name])continue;const subject=(t.teachingLanguages||[]).join(' / ')||'Private lesson';teacherProfiles[t.name]={subject,country:t.country||'',role:`${(t.teachingLanguages||[]).join(', ')||'Language'} Teacher`,photo:t.photoUrl||'',video:t.videoUrl||'',intro:t.headline||'Approved iSpeak Confidence teacher.',details:t.about||t.experience||'',specialties:(t.specialties||[]).slice(0,4),motto:''};const card=document.createElement('article');card.className='teacher-cinema-card';card.dataset.teacherCard=t.name;card.innerHTML=`<img class="teacher-cinema-photo" src="${esc(t.photoUrl||'assets/logo.png')}" alt="Teacher ${esc(t.name)}"><div class="teacher-cinema-shade"></div><div class="teacher-cinema-copy"><span class="teacher-language-badge">${esc((t.teachingLanguages||[]).join(' • ')||'LANGUAGE TEACHER')}</span><h2>${esc(t.name)}</h2><p class="teacher-role">${esc(teacherProfiles[t.name].role)}</p><div class="teacher-specialties">${teacherProfiles[t.name].specialties.map(x=>`<span>${esc(x)}</span>`).join('')}</div><p class="teacher-quick">${esc(t.headline||t.about||'Approved iSpeak Confidence teacher.')}</p><div class="teacher-actions">${t.videoUrl?`<button class="teacher-ghost intro-btn" data-intro="${esc(t.name)}">▶ Watch introduction</button>`:''}<button class="teacher-ghost profile-btn" data-profile="${esc(t.name)}">View profile</button><button class="primary book-btn" data-teacher="${esc(t.name)}" data-subject="${esc(subject)}">Book Trial — $6</button></div><div class="teacher-availability-preview" data-availability-preview="${esc(t.name)}"><div class="availability-preview-head"><b>Next available times</b><span>Live schedule</span></div><div class="availability-preview-slots"><small>Checking availability…</small></div></div></div>`;grid.appendChild(card);card.querySelector('.intro-btn')?.addEventListener('click',()=>openTeacherIntro(t.name));card.querySelector('.profile-btn')?.addEventListener('click',()=>openTeacherProfile(t.name));card.querySelector('.book-btn')?.addEventListener('click',()=>openTeacherBooking(t.name,subject));}
 await hydrateTeacherAvailabilityPreviews();
 }catch(e){console.warn('Approved teacher hydration failed',e)}
}
function stopTeacherIntroVideo(){const v=$('#modalBody video');if(v){try{v.pause();v.currentTime=0}catch(e){}}}
function openTeacherIntro(name){const p=teacherProfiles[name];if(!p)return;stopTeacherIntroVideo();modal(`<div class="teacher-video-modal"><span class="eyebrow">${esc(p.subject.toUpperCase())} TEACHER INTRODUCTION</span><h2>${esc(name)}</h2><p>${esc(p.intro)}</p><video id="teacherIntroVideo" controls autoplay playsinline preload="metadata" src="${esc(p.video)}"></video><div class="teacher-modal-actions"><button id="introProfile" class="secondary">View profile</button><button id="introBook" class="primary">Check availability</button></div></div>`);$('#introProfile').onclick=()=>openTeacherProfile(name);$('#introBook').onclick=()=>{stopTeacherIntroVideo();$('#modal').close();openTeacherBooking(name,p.subject)}}
function openTeacherProfile(name){const p=teacherProfiles[name];if(!p)return;stopTeacherIntroVideo();modal(`<div class="teacher-profile-modal"><img src="${esc(p.photo)}" alt="Teacher ${esc(name)}"><div><span class="eyebrow">${esc(p.role.toUpperCase())} • ${esc(p.country)}</span><h2>Teacher ${esc(name)}</h2><p>${esc(p.intro)}</p><div class="teacher-specialties">${p.specialties.map(x=>`<span>${esc(x)}</span>`).join('')}</div><p>${esc(p.details)}</p>${p.motto?`<p class="motto">${esc(p.motto)}</p>`:''}<div class="teacher-modal-actions">${p.video?'<button id="profileIntro" class="secondary">▶ Watch introduction</button>':''}<button id="profileBook" class="primary">Check availability</button></div><small>Trial: $6 • Regular private lessons: $11/hour.</small></div></div>`);const profileIntro=$('#profileIntro');if(profileIntro)profileIntro.onclick=()=>openTeacherIntro(name);$('#profileBook').onclick=()=>{$('#modal').close();openTeacherBooking(name,p.subject)}}
$$('.intro-btn').forEach(b=>b.onclick=()=>openTeacherIntro(b.dataset.intro));$$('.profile-btn').forEach(b=>b.onclick=()=>openTeacherProfile(b.dataset.profile));
let teacherShowcaseIndex=0;function setTeacherShowcase(index){const cards=$$('[data-teacher-card]'),dots=$$('[data-teacher-dot]');if(!cards.length)return;teacherShowcaseIndex=(index+cards.length)%cards.length;cards.forEach((c,i)=>c.classList.toggle('active',i===teacherShowcaseIndex));dots.forEach((d,i)=>d.classList.toggle('active',i===teacherShowcaseIndex))}
const teacherPrev=$('#teacherPrev'),teacherNext=$('#teacherNext');if(teacherPrev)teacherPrev.onclick=()=>setTeacherShowcase(teacherShowcaseIndex-1);if(teacherNext)teacherNext.onclick=()=>setTeacherShowcase(teacherShowcaseIndex+1);$$('[data-teacher-dot]').forEach(d=>d.onclick=()=>setTeacherShowcase(+d.dataset.teacherDot));
$('#bookingClose').onclick=()=>$('#booking').close();
$('#bookingForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,submit=$('#bookingSubmit');if(!$('#bookDate').value||!$('#bookTime').value)return toast('Choose an available time first.');const r={teacher:f.dataset.teacher,subject:f.dataset.subject,name:$('#bookName').value.trim(),email:$('#bookEmail').value.trim(),date:$('#bookDate').value,time:$('#bookTime').value,type:$('#bookType').value,message:$('#bookMessage').value.trim(),created:new Date().toISOString()};submit.disabled=true;submit.textContent='Booking…';try{const result=await apiJSON('/api/booking',{method:'POST',body:JSON.stringify(r)});state.bookings.push({...r,status:result.status||'pending',bookingId:result.bookingId});if(state.name==='Student')state.name=r.name;if(!state.email)state.email=r.email;save();$('#booking').close();toast('Booking request received. Your selected time is now held.')}catch(err){toast(err.message||'That time is no longer available.');const data=await loadTeacherAvailability(r.teacher);renderBookingDays(data)}finally{submit.textContent='Book selected time'}};


const APPLICATION_LANGUAGES=['English','Khmer','Mandarin Chinese','Spanish','French','Japanese','Arabic'];
function appAuthToken(){return localStorage.getItem('isc-teacher-application-token')||''}
async function fileAsData(file){if(!file)return null;return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:r.result});r.onerror=()=>reject(new Error('Could not read file.'));r.readAsDataURL(file)})}
function applicationLanding(){modal(`<span class="eyebrow">TEACH WITH ISPEAK CONFIDENCE</span><h2>Apply to become an iSpeak teacher</h2><p>Create a professional tutor application, save your progress, upload your introduction video and qualifications, set your availability, and track the review status.</p><div class="application-feature-grid"><div>👤<b>Professional profile</b><small>Photo, headline, bio & experience</small></div><div>🎥<b>Intro video</b><small>Show students how you teach</small></div><div>📅<b>Availability</b><small>Choose when you can teach</small></div><div>✅<b>Application review</b><small>Track approval or requested changes</small></div></div><button id="newTeacherApplication" class="primary wide">Start a new application</button><button id="existingTeacherApplication" class="secondary wide">Continue my application</button><small class="muted">Applications are reviewed by iSpeak Confidence before a teacher can be published to students.</small>`);$('#newTeacherApplication').onclick=applicationRegister;$('#existingTeacherApplication').onclick=applicationLogin}
function applicationRegister(){modal(`<span class="eyebrow">TEACHER APPLICATION</span><h2>Create your application account</h2><label>Email<input id="appEmail" type="email" autocomplete="email"></label><label>Password<input id="appPassword" type="password" autocomplete="new-password" minlength="8"></label><button id="appCreate" class="primary wide">Create application</button><button id="appBack" class="text-btn">Back</button>`);$('#appBack').onclick=applicationLanding;$('#appCreate').onclick=async()=>{try{const d=await apiJSON('/api/teacher-application/register',{method:'POST',body:JSON.stringify({email:$('#appEmail').value,password:$('#appPassword').value})});localStorage.setItem('isc-teacher-application-token',d.token);openApplicationDashboard(d.application)}catch(e){toast(e.message||'Could not create application.')}}}
function applicationLogin(){modal(`<span class="eyebrow">TEACHER APPLICATION</span><h2>Continue your application</h2><label>Email<input id="appEmail" type="email" autocomplete="email"></label><label>Password<input id="appPassword" type="password" autocomplete="current-password"></label><button id="appLogin" class="primary wide">Sign in</button><button id="appBack" class="text-btn">Back</button>`);$('#appBack').onclick=applicationLanding;$('#appLogin').onclick=async()=>{try{const d=await apiJSON('/api/teacher-application/login',{method:'POST',body:JSON.stringify({email:$('#appEmail').value,password:$('#appPassword').value})});localStorage.setItem('isc-teacher-application-token',d.token);openApplicationDashboard(d.application)}catch(e){toast(e.message||'Could not sign in.')}}}
async function loadMyApplication(){try{return (await apiJSON('/api/teacher-application/me',{headers:{Authorization:`Bearer ${appAuthToken()}`}})).application}catch(e){localStorage.removeItem('isc-teacher-application-token');throw e}}
function statusLabel(s){return ({draft:'Draft',submitted:'Under review',changes_requested:'Changes requested',approved:'Approved',rejected:'Not approved'})[s]||s}
async function openApplicationDashboard(existing){let a=existing;try{if(!a||!a.id)a=await loadMyApplication()}catch{return applicationLogin()}const locked=['submitted','approved'].includes(a.status),score=a.profileScore||0;modal(`<div class="application-dashboard"><div class="application-status-head"><div><span class="eyebrow">APPLICATION ${esc(a.id||'')}</span><h2>${esc(statusLabel(a.status))}</h2><p>${a.status==='submitted'?'Your application is with iSpeak Confidence for review.':a.status==='approved'?'Congratulations. Your application has been approved and your teacher account is ready for onboarding.':a.status==='changes_requested'?'Please update the requested items and submit again.':'Build a complete professional teacher profile, then submit it for review.'}</p>${a.reviewNote?`<div class="review-note"><b>Review note</b><p>${esc(a.reviewNote)}</p></div>`:''}</div><div class="profile-score"><b>${score}%</b><span>Profile ready</span></div></div><div class="application-tabs"><button class="active" data-app-tab="profile">Profile</button><button data-app-tab="media">Photo & video</button><button data-app-tab="background">Background</button><button data-app-tab="availability">Availability</button><button data-app-tab="review">Review</button></div><div id="applicationTabBody"></div></div>`);const renderTab=t=>{const b=$('#applicationTabBody');if(t==='profile')b.innerHTML=applicationProfileForm(a,locked);if(t==='media')b.innerHTML=applicationMediaForm(a,locked);if(t==='background')b.innerHTML=applicationBackgroundForm(a,locked);if(t==='availability')b.innerHTML=applicationAvailabilityForm(a,locked);if(t==='review')b.innerHTML=applicationReviewView(a,locked);bindApplicationActions(a,locked,t)};$$('[data-app-tab]',$('#modalBody')).forEach(x=>x.onclick=()=>{$$('[data-app-tab]',$('#modalBody')).forEach(y=>y.classList.toggle('active',y===x));renderTab(x.dataset.appTab)});renderTab('profile')}
function applicationProfileForm(a,l){const opts=APPLICATION_LANGUAGES.map(x=>`<label class="app-check"><input type="checkbox" data-teach-lang value="${x}" ${(a.teachingLanguages||[]).includes(x)?'checked':''} ${l?'disabled':''}>${x}</label>`).join('');return `<div class="application-section"><h3>1. Your teacher profile</h3><div class="two-col"><label>First name<input id="taFirst" value="${esc(a.firstName||'')}" ${l?'disabled':''}></label><label>Last name<input id="taLast" value="${esc(a.lastName||'')}" ${l?'disabled':''}></label><label>Public teacher name<input id="taPublic" value="${esc(a.publicName||'')}" placeholder="e.g. Jessica" ${l?'disabled':''}></label><label>Country<input id="taCountry" value="${esc(a.country||'')}" ${l?'disabled':''}></label><label>Phone<input id="taPhone" value="${esc(a.phone||'')}" ${l?'disabled':''}></label><label>Timezone<input id="taTimezone" value="${esc(a.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Phnom_Penh')}" ${l?'disabled':''}></label></div><h4>What can you teach?</h4><div class="app-check-grid">${opts}</div><label>Other languages you speak<input id="taSpoken" value="${esc((a.spokenLanguages||[]).join(', '))}" placeholder="English, Khmer, Chinese" ${l?'disabled':''}></label><label>Profile headline<input id="taHeadline" maxlength="120" value="${esc(a.headline||'')}" placeholder="Experienced Khmer teacher focused on confident conversation" ${l?'disabled':''}></label><label>About you<textarea id="taAbout" rows="7" ${l?'disabled':''} placeholder="Tell students who you are, how you teach, and how you can help them. Aim for at least 160 characters.">${esc(a.about||'')}</textarea></label>${!l?'<button id="saveTeacherApplication" class="primary wide">Save profile</button>':''}</div>`}
function applicationMediaForm(a,l){return `<div class="application-section"><h3>2. Photo & introduction video</h3><p>Use a clear, professional headshot and a friendly introduction video. Students should be able to see and hear you clearly.</p><div class="media-preview-grid"><div>${a.photoUrl?`<img class="application-photo-preview" src="${a.photoUrl}" alt="Profile preview">`:'<div class="application-placeholder">📷<b>Profile photo</b></div>'}<label>Profile photo<input id="taPhoto" type="file" accept="image/jpeg,image/png,image/webp" ${l?'disabled':''}></label><small>JPG, PNG or WebP • maximum 4 MB</small></div><div>${a.videoUrl?`<video class="application-video-preview" src="${a.videoUrl}" controls></video>`:'<div class="application-placeholder">🎥<b>Intro video</b></div>'}<label>Introduction video<input id="taVideo" type="file" accept="video/mp4,video/webm" ${l?'disabled':''}></label><small>MP4 or WebM • maximum 55 MB</small></div></div>${!l?'<button id="saveTeacherApplication" class="primary wide">Upload & save</button>':''}</div>`}
function applicationBackgroundForm(a,l){return `<div class="application-section"><h3>3. Teaching background</h3><label>Teaching experience<textarea id="taExperience" rows="6" ${l?'disabled':''} placeholder="Describe your teaching experience, learner ages/levels, online teaching experience and results.">${esc(a.experience||'')}</textarea></label><label>Education<textarea id="taEducation" rows="4" ${l?'disabled':''} placeholder="Degrees, universities and relevant study.">${esc(a.education||'')}</textarea></label><label>Specialties<input id="taSpecialties" value="${esc((a.specialties||[]).join(', '))}" placeholder="Conversation, IELTS, Business English, Beginner Khmer" ${l?'disabled':''}></label><div>${(a.certificates||[]).map(c=>`<a class="certificate-file" href="${c.url}" target="_blank">📄 ${esc(c.name)}</a>`).join('')}</div><label>Certificates / qualifications<input id="taCertificates" type="file" accept="application/pdf,image/jpeg,image/png" multiple ${l?'disabled':''}></label><small>Up to 5 files per save • PDF/JPG/PNG • 10 MB each</small><div class="two-col"><label>Requested hourly rate (USD)<input id="taRate" type="number" min="1" max="100" step="0.5" value="${esc(a.requestedRate||'')}" ${l?'disabled':''}></label><label>Currency<input value="USD" disabled></label></div>${!l?'<button id="saveTeacherApplication" class="primary wide">Save background</button>':''}</div>`}
function applicationAvailabilityForm(a,l){const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],times=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];return `<div class="application-section"><h3>4. Weekly availability</h3><p>Select the times you can reliably teach each week. You can change this after approval.</p><div class="availability-editor">${days.map((d,di)=>`<div class="availability-row"><b>${d}</b><div>${times.map(t=>`<label class="time-check"><input type="checkbox" data-ta-day="${di}" value="${t}" ${(a.availability?.[String(di)]||[]).includes(t)?'checked':''} ${l?'disabled':''}><span>${localTimeLabel(t)}</span></label>`).join('')}</div></div>`).join('')}</div>${!l?'<button id="saveTeacherApplication" class="primary wide">Save availability</button>':''}</div>`}
function applicationReviewView(a,l){const checks=[['Name',a.firstName&&a.lastName],['Teaching language',(a.teachingLanguages||[]).length],['Headline',String(a.headline||'').length>=25],['About section',String(a.about||'').length>=160],['Experience',String(a.experience||'').length>=100],['Professional photo',a.photoUrl],['Introduction video',a.videoUrl],['Availability',a.availability&&Object.values(a.availability).some(v=>v.length)],['Requested rate',Number(a.requestedRate)>0]];return `<div class="application-section"><h3>5. Review & submit</h3><div class="application-checklist">${checks.map(([n,ok])=>`<div class="${ok?'done':''}"><span>${ok?'✓':'○'}</span><b>${n}</b></div>`).join('')}</div><div class="application-preview-card">${a.photoUrl?`<img src="${a.photoUrl}">`:''}<div><span class="eyebrow">PROFILE PREVIEW</span><h2>${esc(a.publicName||[a.firstName,a.lastName].filter(Boolean).join(' ')||'Your name')}</h2><h4>${esc(a.headline||'Your teaching headline')}</h4><p>${esc(a.about||'Your description will appear here.')}</p><small>${esc((a.teachingLanguages||[]).join(' • '))}</small></div></div>${a.status==='approved'?'<div class="success-panel"><b>✓ Approved</b><p>Your teacher account is active. You can now manage your availability and student bookings using your application login.</p><button id="approvedTeacherDashboard" class="primary wide">Open my teacher dashboard</button></div>':a.status==='submitted'?'<div class="info-panel"><b>Application under review</b><p>You cannot edit it until iSpeak approves it or requests changes.</p></div>':'<button id="submitTeacherApplication" class="primary wide">Submit application for review</button>'}</div>`}
async function bindApplicationActions(a,l,tab){const approvedDash=$('#approvedTeacherDashboard');if(approvedDash)approvedDash.onclick=()=>openApprovedTeacherDashboard();const save=$('#saveTeacherApplication');if(save)save.onclick=async()=>{save.disabled=true;save.textContent='Saving…';try{const payload={};if(tab==='profile'){payload.firstName=$('#taFirst').value;payload.lastName=$('#taLast').value;payload.publicName=$('#taPublic').value;payload.country=$('#taCountry').value;payload.phone=$('#taPhone').value;payload.timezone=$('#taTimezone').value;payload.teachingLanguages=$$('[data-teach-lang]',$('#modalBody')).filter(x=>x.checked).map(x=>x.value);payload.spokenLanguages=$('#taSpoken').value.split(',').map(x=>x.trim()).filter(Boolean);payload.headline=$('#taHeadline').value;payload.about=$('#taAbout').value}else if(tab==='media'){payload.photo=await fileAsData($('#taPhoto')?.files?.[0]);payload.video=await fileAsData($('#taVideo')?.files?.[0])}else if(tab==='background'){payload.experience=$('#taExperience').value;payload.education=$('#taEducation').value;payload.specialties=$('#taSpecialties').value.split(',').map(x=>x.trim()).filter(Boolean);payload.requestedRate=$('#taRate').value;payload.currency='USD';payload.newCertificates=[];for(const f of Array.from($('#taCertificates')?.files||[]).slice(0,5))payload.newCertificates.push(await fileAsData(f))}else if(tab==='availability'){payload.availability={};$$('[data-ta-day]',$('#modalBody')).forEach(x=>{if(x.checked)(payload.availability[x.dataset.taDay]||(payload.availability[x.dataset.taDay]=[])).push(x.value)})}const d=await apiJSON('/api/teacher-application/save',{method:'POST',headers:{Authorization:`Bearer ${appAuthToken()}`},body:JSON.stringify(payload)});toast('Application saved.');openApplicationDashboard(d.application)}catch(e){toast(e.message||'Could not save application.')}finally{if(save){save.disabled=false;save.textContent='Save'}}};const submit=$('#submitTeacherApplication');if(submit)submit.onclick=async()=>{try{const d=await apiJSON('/api/teacher-application/submit',{method:'POST',headers:{Authorization:`Bearer ${appAuthToken()}`},body:'{}'});toast('Application submitted for review.');openApplicationDashboard()}catch(e){toast(e.message||'Please complete the required sections first.')}}}
async function openApprovedTeacherDashboard(){let data;try{data=await apiJSON('/api/teacher-application/portal',{method:'POST',headers:{Authorization:`Bearer ${appAuthToken()}`},body:JSON.stringify({action:'dashboard'})})}catch(e){return toast(e.message||'Could not open your teacher dashboard.')};const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];modal(`<span class="eyebrow">TEACHER DASHBOARD • ${esc(data.teacher)}</span><h2>Lessons & availability</h2><p>Manage your own weekly teaching schedule and student bookings.</p><div class="portal-summary"><div><b>${data.bookings.length}</b><span>Bookings</span></div><div><b>${data.openSlotCount}</b><span>Open times / week</span></div></div><h3>Weekly availability</h3><div class="availability-editor">${days.map((d,di)=>`<div class="availability-row"><b>${d}</b><div>${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'].map(t=>`<label class="time-check"><input type="checkbox" data-approved-av-day="${di}" value="${t}" ${(data.availability[String(di)]||[]).includes(t)?'checked':''}><span>${localTimeLabel(t)}</span></label>`).join('')}</div></div>`).join('')}</div><button id="approvedSaveAvailability" class="primary wide">Save availability</button><h3>Student bookings</h3><div class="portal-bookings">${data.bookings.length?data.bookings.map(b=>`<article><div><b>${esc(b.date)} • ${esc(localTimeLabel(b.time))}</b><span>${esc(b.name)} • ${esc(b.type)}</span><small>${esc(b.email)}</small></div><select data-approved-booking-status="${esc(b.id)}"><option ${b.status==='pending'?'selected':''}>pending</option><option ${b.status==='confirmed'?'selected':''}>confirmed</option><option ${b.status==='completed'?'selected':''}>completed</option><option ${b.status==='cancelled'?'selected':''}>cancelled</option></select></article>`).join(''):'<p>No bookings yet.</p>'}</div><button id="backToTeacherApplication" class="secondary wide">Back to my application</button>`);$('#approvedSaveAvailability').onclick=async()=>{const av={};$$('[data-approved-av-day]',$('#modalBody')).forEach(x=>{if(x.checked)(av[x.dataset.approvedAvDay]||(av[x.dataset.approvedAvDay]=[])).push(x.value)});try{await apiJSON('/api/teacher-application/portal',{method:'POST',headers:{Authorization:`Bearer ${appAuthToken()}`},body:JSON.stringify({action:'availability',availability:av,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});toast('Availability saved.')}catch(e){toast(e.message||'Could not save availability.')}};$$('[data-approved-booking-status]',$('#modalBody')).forEach(sel=>sel.onchange=async()=>{try{await apiJSON('/api/teacher-application/portal',{method:'POST',headers:{Authorization:`Bearer ${appAuthToken()}`},body:JSON.stringify({action:'bookingStatus',bookingId:sel.dataset.approvedBookingStatus,status:sel.value})});toast('Booking updated.')}catch(e){toast(e.message||'Could not update booking.')}});$('#backToTeacherApplication').onclick=()=>openApplicationDashboard()}
function applicationAdminLogin(){modal(`<span class="eyebrow">ISPEAK ADMIN</span><h2>Teacher applications</h2><label>Admin PIN<input id="applicationAdminPin" type="password" autocomplete="current-password"></label><button id="openApplicationAdmin" class="primary wide">Open applications</button><small>Production requires ADMIN_PORTAL_PIN in the server environment.</small>`);$('#openApplicationAdmin').onclick=()=>openApplicationsAdmin($('#applicationAdminPin').value)}
async function openApplicationsAdmin(pin){let d;try{d=await apiJSON('/api/admin/applications',{method:'POST',body:JSON.stringify({action:'list',pin})})}catch(e){return toast(e.message||'Could not open applications.')};modal(`<span class="eyebrow">ISPEAK ADMIN</span><h2>Teacher applications</h2><div class="admin-application-list">${d.applications.length?d.applications.map(a=>`<button data-review-app="${a.id}"><div><b>${esc(a.publicName||`${a.firstName||''} ${a.lastName||''}`.trim()||a.email)}</b><span>${esc(a.email)}</span></div><div><strong>${a.profileScore}%</strong><small>${esc(statusLabel(a.status))}</small></div></button>`).join(''):'<p>No teacher applications yet.</p>'}</div>`);$$('[data-review-app]',$('#modalBody')).forEach(b=>b.onclick=()=>reviewApplication(pin,d.applications.find(a=>a.id===b.dataset.reviewApp)))}
function reviewApplication(pin,a){modal(`<span class="eyebrow">APPLICATION ${esc(a.id)}</span><h2>${esc(a.publicName||`${a.firstName||''} ${a.lastName||''}`)}</h2><div class="admin-review-profile">${a.photoUrl?`<img src="${a.photoUrl}">`:''}<div><b>${esc(a.headline||'')}</b><p>${esc(a.about||'')}</p><small>${esc((a.teachingLanguages||[]).join(' • '))}</small></div></div>${a.videoUrl?`<video class="application-video-preview" src="${a.videoUrl}" controls></video>`:''}<h3>Experience</h3><p>${esc(a.experience||'')}</p><h3>Education</h3><p>${esc(a.education||'')}</p><p><b>Requested rate:</b> $${esc(a.requestedRate||'—')}/hour</p><p><b>Profile score:</b> ${a.profileScore}%</p><label>Review note<textarea id="adminReviewNote" rows="4" placeholder="Explain approval, requested changes, or reason for rejection.">${esc(a.reviewNote||'')}</textarea></label><div class="review-actions"><button data-decision="changes_requested" class="secondary">Request changes</button><button data-decision="rejected" class="danger">Reject</button><button data-decision="approved" class="primary">Approve teacher</button></div><button id="backApplications" class="text-btn">Back to applications</button>`);$('#backApplications').onclick=()=>openApplicationsAdmin(pin);$$('[data-decision]',$('#modalBody')).forEach(b=>b.onclick=async()=>{try{await apiJSON('/api/admin/applications',{method:'POST',body:JSON.stringify({action:'review',pin,applicationId:a.id,decision:b.dataset.decision,note:$('#adminReviewNote').value})});toast(`Application ${b.dataset.decision.replace('_',' ')}.`);openApplicationsAdmin(pin)}catch(e){toast(e.message||'Review could not be saved.')}})}

function teacherPortalLogin(){modal(`<span class="eyebrow">TEACHER PORTAL</span><h2>Manage lessons & availability</h2><p>Teachers can publish their weekly times and review student bookings.</p><label>Teacher<select id="portalTeacher">${Object.keys(teacherProfiles).map(n=>`<option>${esc(n)}</option>`).join('')}</select></label><label>Portal PIN<input id="portalPin" type="password" inputmode="numeric" autocomplete="current-password"></label><button id="portalLogin" class="primary wide">Open teacher dashboard</button><small>The portal PIN is set by iSpeak Confidence in the server environment.</small>`);$('#portalLogin').onclick=()=>openTeacherDashboard($('#portalTeacher').value,$('#portalPin').value)}
async function openTeacherDashboard(teacher,pin){let data;try{data=await apiJSON('/api/teacher/portal',{method:'POST',body:JSON.stringify({action:'dashboard',teacher,pin})})}catch(e){return toast(e.message||'Could not open teacher portal.')};sessionStorage.setItem('isc-teacher-pin',pin);const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];modal(`<span class="eyebrow">TEACHER PORTAL • ${esc(teacher)}</span><h2>Your teaching schedule</h2><div class="portal-summary"><div><b>${data.bookings.length}</b><span>Bookings</span></div><div><b>${data.openSlotCount}</b><span>Open times / week</span></div></div><h3>Weekly availability</h3><p class="portal-help">Tick the hours you can teach. Students will only see these times, and booked times disappear automatically.</p><div class="availability-editor">${days.map((d,di)=>`<div class="availability-row"><b>${d}</b><div>${['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(t=>`<label class="time-check"><input type="checkbox" data-av-day="${di}" value="${t}" ${(data.availability[String(di)]||[]).includes(t)?'checked':''}><span>${localTimeLabel(t)}</span></label>`).join('')}</div></div>`).join('')}</div><button id="saveAvailability" class="primary wide">Save availability</button><h3>Student bookings</h3><div class="portal-bookings">${data.bookings.length?data.bookings.map(b=>`<article><div><b>${esc(b.date)} • ${esc(localTimeLabel(b.time))}</b><span>${esc(b.name)} • ${esc(b.type)}</span><small>${esc(b.email)}</small></div><select data-booking-status="${esc(b.id)}"><option ${b.status==='pending'?'selected':''}>pending</option><option ${b.status==='confirmed'?'selected':''}>confirmed</option><option ${b.status==='completed'?'selected':''}>completed</option><option ${b.status==='cancelled'?'selected':''}>cancelled</option></select></article>`).join(''):'<p>No bookings yet.</p>'}</div>`);$('#saveAvailability').onclick=async()=>{const av={};$$('[data-av-day]',$('#modalBody')).forEach(x=>{if(x.checked)(av[x.dataset.avDay]||(av[x.dataset.avDay]=[])).push(x.value)});try{await apiJSON('/api/teacher/portal',{method:'POST',body:JSON.stringify({action:'availability',teacher,pin,availability:av})});toast('Availability saved.')}catch(e){toast(e.message||'Could not save availability.')}};$$('[data-booking-status]',$('#modalBody')).forEach(sel=>sel.onchange=async()=>{try{await apiJSON('/api/teacher/portal',{method:'POST',body:JSON.stringify({action:'bookingStatus',teacher,pin,bookingId:sel.dataset.bookingStatus,status:sel.value})});toast('Booking updated.')}catch(e){toast(e.message||'Could not update booking.')}})}
hydrateApprovedTeachers();
const portalBtn=$('#teacherPortalBtn');if(portalBtn)portalBtn.onclick=teacherPortalLogin;const applyTeacherBtn=$('#applyTeacherBtn');if(applyTeacherBtn)applyTeacherBtn.onclick=()=>appAuthToken()?openApplicationDashboard():applicationLanding();const applicationAdminBtn=$('#applicationAdminBtn');if(applicationAdminBtn){applicationAdminBtn.hidden=new URLSearchParams(location.search).get('admin')!=='1';applicationAdminBtn.onclick=applicationAdminLogin;}
$('#accountCentre').onclick=openAccountCentre;const topLogin=$('#topLogin'),topSignup=$('#topSignup'),topAccount=$('#topAccount'),heroLogin=$('#heroLogin'),heroSignup=$('#heroSignup');if(topLogin)topLogin.onclick=()=>openAccountCentre('login');if(topSignup)topSignup.onclick=()=>openAccountCentre('register');if(topAccount)topAccount.onclick=()=>openAccountCentre();if(heroLogin)heroLogin.onclick=()=>openAccountCentre('login');if(heroSignup)heroSignup.onclick=()=>openAccountCentre('register');$('#personalPlan').onclick=openLearningPlan;$('#dailyQuests').onclick=openDailyQuests;$('#realLifeMissions').onclick=openRealLifeMissions;$('#offlineCentre').onclick=openOfflineCentre;$('#privacyCentre').onclick=openPrivacyCentre;$('#edit').onclick=()=>{modal(`<h2>Edit profile</h2><p>Your name appears on earned certificates. Your email is used to send them after 100% course completion.</p><label>Your name<input id="newName" value="${esc(state.name)}"></label><label>Email<input id="newEmail" type="email" value="${esc(state.email||'')}" placeholder="you@example.com"></label><button id="saveName" class="primary wide">Save profile</button>`);$('#saveName').onclick=()=>{state.name=$('#newName').value.trim()||'Student';state.email=$('#newEmail').value.trim();save();$('#modal').close();toast('Profile saved')}};$('#chooseLang').onclick=()=>{modal(`<div data-direction-summary>${directionMarkup()}</div><h2>${esc(supportT('target'))}</h2><div class="language-grid">${courseOrder.map(k=>{const l=languages[k];return `<button class="language-card" data-modal-lang="${k}"><span class="flag">${l.flag}</span><b>${l.name}</b><small>${l.native}</small></button>`}).join('')}</div>`);$$('[data-modal-lang]',$('#modalBody')).forEach(b=>b.onclick=()=>{changeLearningLanguage(b.dataset.modalLang,{view:'learn',closeModal:true,notice:true})})};$('#toggleGoal').onclick=()=>{state.dailyGoal=state.dailyGoal===1?3:state.dailyGoal===3?5:1;save()};$('#audioCheck').onclick=()=>modal(`<h2>Audio check</h2><p>${navigator.mediaDevices?.getUserMedia?'✅':'⚠️'} Microphone access</p><p>${window.MediaRecorder?'✅':'⚠️'} Press-and-hold audio recording</p><p>${window.SpeechRecognition||window.webkitSpeechRecognition?'✅':'⚠️'} Speech-recognition fallback</p>`);$('#requests').onclick=async()=>{let rows=state.bookings;try{if(state.account?.token){const d=await apiJSON('/api/my-bookings',{headers:{Authorization:`Bearer ${state.account.token}`}});rows=d.bookings||rows;state.bookings=rows;save()}}catch(e){console.warn(e)}modal(`<h2>My lesson requests</h2>${rows.length?rows.slice().reverse().map(x=>`<p><b>${esc(x.teacher)} — ${esc(x.subject)}</b><br>${esc(x.date)} at ${esc(x.time)}<br><small>Status: ${esc(x.status||'pending')}</small></p>`).join(''):'<p>No requests yet.</p>'}`)};
function renderProgress(){
 $('#courseProgress').innerHTML=courseOrder.map(k=>{const l=languages[k],done=studyDone(k),p=Math.round(done/totalStudySessions*100);return `<div class="course-row"><b>${l.flag} ${l.name}</b><div class="bar"><i style="width:${p}%"></i></div><span>${p}%</span></div>`}).join('');
 const skills=[['listen','Listening'],['speak','Speaking'],['readwrite','Reading & Writing'],['grammar','Grammar'],['learn','Vocabulary & Meaning'],['conversation','Conversation'],['mastery','Transfer & Mastery']];
 const box=$('#skillGraph');if(box)box.innerHTML=skills.map(([key,label])=>{const direct=learningConfidence(state.language,key);const completed=state.studyCompleted.filter(id=>id.startsWith(`${state.language}-`)&&id.endsWith(`-s${Math.max(1,studyTypes.findIndex(x=>x.key===key)+1)}`)).length;const evidence=Math.min(100,Math.max(direct,Math.round(completed/30*100)));return `<div class="skill-row"><div><b>${esc(label)}</b><span>${evidence<35?'Building':evidence<75?'Developing':'Strong evidence'}</span></div><div class="bar"><i style="width:${evidence}%"></i></div><strong>${evidence}%</strong></div>`}).join('');
 const insightBox=$('#learnerInsights');if(insightBox){const lm=state.learnerModel?.[state.language]?.skills||{};const ranked=Object.entries(lm).filter(([,v])=>v.attempts>=2).map(([k,v])=>({k,v,confidence:learningConfidence(state.language,k)})).sort((a,b)=>a.confidence-b.confidence);const weak=ranked.slice(0,3),strong=[...ranked].sort((a,b)=>b.confidence-a.confidence).slice(0,2);const cov=supportLayer?.coverage?.(state.uiLanguage,state.language);insightBox.innerHTML=`<div class="intelligence-head"><b>Learning intelligence</b><span>${cov?`${cov.verified}/${cov.total} verified support meanings • ${cov.pct}%`:''}</span></div><div class="intelligence-grid"><div><strong>Focus next</strong>${weak.length?weak.map(x=>`<p>${esc(x.k)} <b>${x.confidence}%</b></p>`).join(''):'<p>Complete more skill activities to build a reliable profile.</p>'}</div><div><strong>Strongest evidence</strong>${strong.length?strong.map(x=>`<p>${esc(x.k)} <b>${x.confidence}%</b></p>`).join(''):'<p>No strong evidence yet.</p>'}</div></div><small>This model uses accuracy plus independent/transfer performance. It does not force scheduled repetition.</small>`;}
}

function certificatePreviewCard(){
 const done=studyDone(state.language);
 const pct=Math.min(100,Math.round(done/totalStudySessions*100));
 const l=languages[state.language];
 const earned=pct===100;
 const code=certificateCodes[state.language]||'XX';
 return `<section class="certificate-showcase">
   <div class="certificate-showcase-copy">
     <span class="eyebrow">${uiT("reward")}</span>
     <h2>${earned?'🏆 '+uiT('certificate'):uiT('certificate')}</h2>
     <p>${uiT('certificateText')}</p>
     <div class="cert-preview-progress">
       <div><i style="width:${pct}%"></i></div>
       <b>${pct}% complete</b>
       <span>${done}/${totalStudySessions} sessions</span>
     </div>
     <span class="cert-lock-state">${earned?'🏆 UNLOCKED':'🔒 PREVIEW • LOCKED UNTIL 100%'}</span>
   </div>
   <div class="professional-cert-preview">
     <div class="cert-frame-inner">
       <div class="cert-preview-brand">
         <img src="assets/logo.png" alt="iSpeak Confidence logo">
         <div><b>iSpeak Confidence</b><small>Speak. Learn. Connect.</small></div>
       </div>
       <div class="cert-preview-rule"></div>
       <span class="cert-preview-kicker">CERTIFICATE</span>
       <strong>OF COMPLETION</strong>
       <small class="cert-preview-certified">THIS CERTIFIES THAT</small>
       <div class="cert-preview-name">${esc(state.name||'Student Name')}</div>
       <small class="cert-preview-certified">HAS SUCCESSFULLY COMPLETED THE</small>
       <div class="cert-preview-course">${esc(l.name.toUpperCase())} 30-UNIT MASTERY COURSE</div><small class="cert-preview-certified">240 PROGRESSIVE LEARNING BLOCKS COMPLETED</small>
       <div class="cert-preview-meta">
         <span><b>240</b><small>Learning Blocks</small></span>
         <span class="cert-preview-seal">iS</span>
         <span><b>100%</b><small>Completion</small></span>
       </div>
       <div class="cert-preview-footer"><span>Certificate ID: ISC-${code}-XXXXXXXX</span><span>iSpeak Confidence • Speak. Learn. Connect.</span><span>${earned?'VERIFIED • AWARDED':'VERIFICATION PREVIEW'}</span></div>
       ${earned?'':'<div class="certificate-watermark">PREVIEW • LOCKED</div>'}
     </div>
   </div>
 </section>`;
}


const questTemplates=[
 {id:'lessons',icon:'📚',title:'Complete 3 learning activities',type:'lesson',goal:3,reward:30},
 {id:'produce',icon:'🧠',title:'Complete 2 mastery productions',type:'lesson',goal:2,reward:35},
 {id:'speak',icon:'🎙️',title:'Finish 2 pronunciation practices',type:'pronunciation',goal:2,reward:35},
 {id:'mission',icon:'🌍',title:'Complete 1 real-life mission',type:'mission',goal:1,reward:40}
];
function dailyQuestState(){
 const d=today();state.quests=state.quests||{};if(!state.quests[d])state.quests[d]={progress:{},claimed:[]};return state.quests[d]
}
function updateQuestProgress(type,n=1){const q=dailyQuestState();q.progress[type]=(q.progress[type]||0)+n}
function openDailyQuests(){
 const q=dailyQuestState();
 modal(`<span class="eyebrow">DAILY QUESTS</span><h2>Today's challenges</h2><p>Complete varied learning tasks instead of repeating one easy activity.</p><div class="quest-list">${questTemplates.map(x=>{const p=Math.min(x.goal,q.progress[x.type]||0),done=p>=x.goal,claimed=q.claimed.includes(x.id);return `<article><b>${x.icon} ${x.title}</b><span>${p}/${x.goal}</span><div class="bar"><i style="width:${p/x.goal*100}%"></i></div><button data-claim-quest="${x.id}" ${!done||claimed?'disabled':''}>${claimed?'Claimed':`Claim +${x.reward} XP`}</button></article>`}).join('')}</div>`);
 $$('[data-claim-quest]',$('#modalBody')).forEach(b=>b.onclick=()=>{const x=questTemplates.find(q=>q.id===b.dataset.claimQuest),qs=dailyQuestState();if((qs.progress[x.type]||0)>=x.goal&&!qs.claimed.includes(x.id)){qs.claimed.push(x.id);state.xp+=x.reward;save();openDailyQuests()}});
}
const missions=[
 {id:'restaurant',icon:'🍽️',title:'Order at a restaurant',steps:['Greet the server','Ask for the menu','Order food and a drink','Ask for the bill']},
 {id:'hotel',icon:'🏨',title:'Check into a hotel',steps:['Say you have a reservation','Give your name','Ask about breakfast','Ask where the lift is']},
 {id:'airport',icon:'✈️',title:'Airport journey',steps:['Find check-in','Ask about the gate','Confirm boarding time','Ask about baggage']},
 {id:'interview',icon:'💼',title:'Job interview',steps:['Introduce yourself','Describe your experience','Explain a strength','Ask a professional question']},
 {id:'doctor',icon:'🩺',title:'Doctor appointment',steps:['Explain the problem','Describe when it started','Answer a follow-up','Confirm the advice']},
 {id:'taxi',icon:'🚕',title:'Taxi ride',steps:['Say your destination','Ask the travel time','Clarify the route','Confirm the fare']}
];
function openRealLifeMissions(){
 modal(`<span class="eyebrow">REAL-LIFE MISSIONS</span><h2>Use ${languages[state.language].name} in a situation</h2><div class="mission-grid">${missions.map(m=>`<button data-mission="${m.id}"><b>${m.icon} ${m.title}</b><span>${state.missionProgress?.[state.language]?.[m.id]?'✓ Completed':'4-step role-play'}</span></button>`).join('')}</div>`);
 $$('[data-mission]',$('#modalBody')).forEach(b=>b.onclick=()=>runMission(missions.find(m=>m.id===b.dataset.mission)));
}
function runMission(m){
 let i=0;
 const draw=()=>ieltsModal(m.title,`<span class="eyebrow">STEP ${i+1}/4</span><h3>${m.steps[i]}</h3><p>Say or type an appropriate response in ${languages[state.language].name}. The goal is communication, not memorising one fixed sentence.</p><textarea id="missionReply" rows="4" placeholder="Type your response..."></textarea><button id="missionSpeak" class="secondary wide">🎙️ Speak response</button><button id="missionNext" class="primary wide">${i===3?'Complete mission':'Next step'}</button>`);
 const bind=()=>{const sp=$('#missionSpeak');if(sp)sp.onclick=()=>startSpeechCapture(t=>{$('#missionReply').value=t});$('#missionNext').onclick=async()=>{const reply=$('#missionReply').value.trim();if(!reply)return toast('Give a response before continuing.');const btn=$('#missionNext');btn.disabled=true;btn.textContent='Checking communication…';try{const r=await apiJSON('/api/placement-evaluate',{method:'POST',body:JSON.stringify({language:languages[state.language].name,prompt:`Real-life ${m.title}: ${m.steps[i]}`,response:reply,requirements:[m.steps[i],'respond appropriately in the target language'],difficulty:i<2?2:3})});if(!r.pass){toast(r.feedback||'Make the response clearer and try again.');btn.disabled=false;btn.textContent=i===3?'Complete mission':'Next step';return}}catch(e){toast('AI checking is unavailable. Your response was saved, but this mission cannot be passed without a reliable check.');btn.disabled=false;btn.textContent=i===3?'Complete mission':'Next step';return}if(i<3){i++;draw();bind()}else{state.missionProgress=state.missionProgress||{};state.missionProgress[state.language]=state.missionProgress[state.language]||{};state.missionProgress[state.language][m.id]=today();state.xp+=40;updateQuestProgress('mission',1);save();$('#modal').close();toast('Mission complete • +40 XP')}}};draw();bind();
}
function startSpeechCapture(done){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('Speech recognition is not available in this browser. You can type instead.');
 const r=new SR();r.lang=languages[state.language].lang;r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>done(e.results[0][0].transcript);r.onerror=()=>toast('I could not hear that clearly. Try again.');r.start();
}
function similarity(a,b){a=String(a).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'').trim();b=String(b).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,'').trim();if(!a||!b)return 0;const A=a.split(/\s+/),B=b.split(/\s+/);let hit=0;A.forEach(w=>{if(B.includes(w))hit++});return Math.round(100*(2*hit)/(A.length+B.length))}
function openPronunciationCoach(target){
 modal(`<span class="eyebrow">PRONUNCIATION COACH • PRACTICE ESTIMATE</span><h2>Say this clearly</h2><div class="word"><div class="big">${esc(target)}</div></div><button id="pronModel" class="secondary wide">🔊 Hear model</button><button id="pronRecord" class="primary wide">🎙️ Speak now</button><div id="pronResult"></div><p class="muted">This practice score compares recognized speech with the target phrase. It is not a clinical or official pronunciation assessment.</p>`);
 $('#pronModel').onclick=()=>{stopIELTSAudio();playVerifiedLanguageAudio(target)};
 $('#pronRecord').onclick=()=>startSpeechCapture(t=>{const accuracy=similarity(target,t),fluency=Math.min(100,Math.max(55,accuracy+5)),clarity=Math.round((accuracy+fluency)/2);state.pronunciationHistory=state.pronunciationHistory||[];state.pronunciationHistory.push({language:state.language,target,heard:t,accuracy,fluency,clarity,date:new Date().toISOString()});updateQuestProgress('pronunciation',1);state.xp+=accuracy>=80?15:5;save();$('#pronResult').innerHTML=`<div class="score-cards"><article><b>${accuracy}%</b><span>Recognition accuracy</span></article><article><b>${fluency}%</b><span>Fluency estimate</span></article><article><b>${clarity}%</b><span>Practice score</span></article></div><p>I heard: <b>${esc(t)}</b></p><p>${accuracy>=90?'Excellent match.':accuracy>=75?'Good. Try once more for a cleaner match.':'Slow down, listen to the model, and retry.'}</p>`});
}
function openLearningPlan(){
 const p=state.learningPlan||{};
 modal(`<span class="eyebrow">PERSONAL LEARNING PLAN</span><h2>What are you learning for?</h2><label>Goal<select id="planReason">${['Conversation','Travel','Work','School','Exam','Living abroad'].map(x=>`<option ${p.reason===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Daily study time<select id="planMinutes">${[5,10,15,20,30,45].map(x=>`<option value="${x}" ${Number(p.minutes)===x?'selected':''}>${x} minutes</option>`).join('')}</select></label><label>Target level<select id="planLevel">${['Beginner','Elementary','Intermediate','Upper-intermediate','Advanced'].map(x=>`<option ${p.targetLevel===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Target date<input id="planDate" type="date" value="${esc(p.targetDate||'')}"></label><button id="savePlan" class="primary wide">Save my plan</button><button id="planPlacement" class="secondary wide">Take placement test</button>`);
 $('#savePlan').onclick=()=>{state.learningPlan={reason:$('#planReason').value,minutes:Number($('#planMinutes').value),targetLevel:$('#planLevel').value,targetDate:$('#planDate').value};state.onboardingDone=true;state.onboardingVersion=15;localSave();render();$('#modal').close();toast('Learning plan saved')};$('#planPlacement').onclick=()=>startAdvancedPlacement();
}
function openOnboarding(){
 modal(`<span class="eyebrow">WELCOME TO iSPEAK CONFIDENCE</span><h2>Build your learning path</h2><p>Choose your language first, then tell us your goal. You can start from Unit 1 or take the placement test.</p><div class="language-grid">${courseOrder.map(k=>{const l=languages[k];return `<button data-onboard-lang="${k}" class="language-card"><span class="flag">${l.flag}</span><b>${l.name}</b><small>${l.native}</small></button>`}).join('')}</div><button id="onboardNext" class="primary wide">Continue</button>`);
 let chosen=state.language;$$('[data-onboard-lang]',$('#modalBody')).forEach(b=>b.onclick=()=>{chosen=b.dataset.onboardLang;$$('[data-onboard-lang]',$('#modalBody')).forEach(x=>x.classList.toggle('selected',x===b))});$('#onboardNext').onclick=()=>{state.language=chosen;syncBuddyWithLearningLanguage({clearConversation:true});localSave();openLearningPlan()};
}
function openAccountCentre(mode='login'){
 if(state.account?.token){modal(`<span class="eyebrow">MY ISPEAK ACCOUNT</span><h2>${esc(state.account.email)}</h2><p>Your progress is saved to this account and can be synchronized across devices.</p><p>Last sync: ${state.cloudSyncAt?new Date(state.cloudSyncAt).toLocaleString():'Not synced yet'}</p><button id="syncNow" class="primary wide">Sync now</button><button id="logoutAccount" class="secondary wide">Log out</button><button id="deleteAccount" class="danger wide">Delete account & cloud data</button>`);$('#syncNow').onclick=async()=>{try{await cloudSave();toast('Cloud progress synced');openAccountCentre()}catch(e){toast(e.message)}};$('#logoutAccount').onclick=()=>{state.account=null;localSave();render();$('#modal').close();toast('Logged out')};$('#deleteAccount').onclick=async()=>{if(!confirm('Permanently delete this iSpeak account and its cloud progress?'))return;try{await apiJSON('/api/account',{method:'DELETE',body:'{}'});state.account=null;localSave();render();$('#modal').close();toast('Account deleted')}catch(e){toast(e.message)}};return}
 const renderAuth=(kind)=>{
   const signup=kind==='register';
   modal(`<span class="eyebrow">ISPEAK CONFIDENCE ACCOUNT</span><h2>${signup?'Create your free account':'Welcome back'}</h2><p>${signup?'Save progress, certificates, bookings and learning history across your devices.':'Log in to continue from your saved progress.'}</p><div class="auth-title-row"><button id="authLoginTab" class="${signup?'':'active'}">Log In</button><button id="authSignupTab" class="${signup?'active':''}">Sign Up</button></div><label>Email address<input id="accountEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></label><label>Password<div class="password-row"><input id="accountPassword" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="8" placeholder="At least 8 characters"><button id="showAccountPassword" class="password-toggle" type="button">Show</button></div></label><button id="accountSubmit" class="primary wide">${signup?'Create free account':'Log in'}</button><div class="auth-switch"><span>${signup?'Already have an account?':'New to iSpeak?'}</span> <button id="authSwitch" type="button">${signup?'Log in':'Create account'}</button></div><p class="muted auth-note">${signup?'By creating an account you agree to the Terms of Use and Privacy Policy.':'Your local guest progress stays on this device until you sign in.'}</p>`);
   $('#authLoginTab').onclick=()=>renderAuth('login');$('#authSignupTab').onclick=()=>renderAuth('register');$('#authSwitch').onclick=()=>renderAuth(signup?'login':'register');
   $('#showAccountPassword').onclick=()=>{const f=$('#accountPassword'),show=f.type==='password';f.type=show?'text':'password';$('#showAccountPassword').textContent=show?'Hide':'Show'};
   const go=async()=>{const email=$('#accountEmail').value.trim(),password=$('#accountPassword').value;if(!email)return toast('Enter your email address');if(password.length<8)return toast('Password must be at least 8 characters');try{const d=await apiJSON('/api/account/'+kind,{method:'POST',body:JSON.stringify({email,password})});state.account={email:d.email,token:d.token};localSave();if(kind==='login')await cloudLoad();else await cloudSave();$('#modal').close();render();toast(kind==='login'?'Welcome back':'Account created — your progress is now saved')}catch(e){toast(e.message)}};
   $('#accountSubmit').onclick=go;$('#accountPassword').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go()}};
   setTimeout(()=>$('#accountEmail')?.focus(),60);
 };
 renderAuth(mode==='register'?'register':'login');
}
function openOfflineCentre(){
 const online=navigator.onLine;
 modal(`<span class="eyebrow">OFFLINE LEARNING</span><h2>${online?'Ready for offline study':'You are offline'}</h2><p>The app shell, curriculum, IELTS data and local progress can work without a connection after the app has been loaded once. AI chat, cloud sync, tutor requests and server speech features require a connection.</p><button id="cacheOffline" class="primary wide">Prepare app for offline use</button><p class="muted">Your latest local progress remains on this device and syncs after you reconnect and sign in.</p>`);
 $('#cacheOffline').onclick=async()=>{if(!('caches' in window))return toast('Offline cache is not supported here.');try{const c=await caches.open('ispeak-v17-3-0-core');await c.addAll(['/','/index.html','/styles.css','/app.js','/curriculum-data.js','/ielts-data.js','/khmer-commonvoice-data.js','/manifest.webmanifest','/assets/logo.png','/assets/icon-192.png','/assets/icon-512.png','/assets/mascots/jess-v13.png','/assets/mascots/jack-cutout.png','/assets/mascots/pedro-v13-cutout.png','/assets/mascots/loulou-v13-cutout.png','/assets/mascots/yuki-v13-cutout.png','/assets/mascots/dariya-v13-complete-fixed.png','/assets/mascots/zayd-v13-complete-fixed.png','/assets/nathan.jpg','/assets/ounnoun.jpg','/assets/jessica.png','/assets/an-sievly.png']);toast('Core app saved for offline use')}catch{toast('Open the app through the BAT/server first, then try again.')}};
}
function openPrivacyCentre(){
 modal(`<span class="eyebrow">PRIVACY & SAFETY</span><h2>Your controls</h2><p><b>Microphone:</b> used only when you choose speaking/audio features. Browser permission is required.</p><p><b>Learning data:</b> guest progress stays on this device. Signed-in progress is stored on the iSpeak server for synchronization.</p><p><b>AI:</b> text/audio submitted to AI features may be sent to the configured AI provider to produce the requested response.</p><p><b>Children:</b> do not collect unnecessary personal information. A production release aimed at children requires age-appropriate consent and store-policy configuration.</p><p><b>Account deletion:</b> signed-in users can permanently delete their account and cloud progress from Account & Cloud Sync.</p><div class="privacy-links"><button id="showPrivacy" class="secondary">Privacy Policy</button><button id="showTerms" class="secondary">Terms of Use</button><button id="reportProblem" class="secondary">Report a problem</button></div>`);
 $('#showPrivacy').onclick=()=>window.open('/privacy.html','_blank');$('#showTerms').onclick=()=>window.open('/terms.html','_blank');$('#reportProblem').onclick=()=>{location.href='mailto:ispeakconfidence@gmail.com?subject=iSpeak%20Confidence%20Problem%20Report'};
}
function render(){renderLibrary();setTimeout(()=>{renderIELTS();renderMilestoneCertificates()},0);
 setTimeout(applyFullInterfaceLanguage,0);renderLanguages();renderHeaderLanguageSwitcher();refreshDirectionUI();renderPath();renderMascot();const hp=$('#homeCertificatePreview');if(hp)hp.innerHTML=certificatePreviewCard();const l=languages[state.language];if($('#practiceLanguage'))$('#practiceLanguage').textContent=`Currently practising: ${l.flag} ${l.name}`;if($('#writingLabel'))$('#writingLabel').textContent=l.writing?'Character tracing':'Latin alphabet practice';if($('#xp'))$('#xp').textContent=state.xp;if($('#xp2'))$('#xp2').textContent=state.xp;if($('#streak'))$('#streak').textContent=state.streak;if($('#streak2'))$('#streak2').textContent=state.streak;if($('#petXP'))$('#petXP').textContent=`${state.xp} XP`;if($('#petStreak'))$('#petStreak').textContent=`${state.streak} day`;if($('#petCoins'))$('#petCoins').textContent=state.coins||0;if($('#petMood'))$('#petMood').textContent=`${state.mood||0}%`;if($('#petEnergy'))$('#petEnergy').textContent=`${state.energy||0}%`;if($('#buddyAccessory'))$('#buddyAccessory').textContent=state.accessory==='star'?'⭐':state.accessory==='cap'?'🎓':'';if($('#done'))$('#done').textContent=studyDone();if($('#acc'))$('#acc').textContent=state.attempts?Math.round(state.correct/state.attempts*100)+'%':'--';const n=state.activity[today()]||0;if($('#goalCount'))$('#goalCount').textContent=`${Math.min(n,state.dailyGoal)}/${state.dailyGoal}`;if($('#goalText'))$('#goalText').textContent=n>=state.dailyGoal?'Daily goal complete. Great work!':`Complete ${state.dailyGoal-n} more lesson${state.dailyGoal-n===1?'':'s'} today.`;if($('#profileName'))$('#profileName').textContent=state.name;if($('#initial'))$('#initial').textContent=(state.name||'S')[0].toUpperCase();if($('#profileSummary'))$('#profileSummary').textContent=`Learning ${l.flag} ${l.name} • 30-unit mastery pathway • ${studyDone()}/${totalStudySessions} activities`;if($('#settingLang'))$('#settingLang').textContent=`${l.flag} ${l.name} ›`;if($('#settingGoal'))$('#settingGoal').textContent=`${state.dailyGoal} activities ›`;if($('#requestCount'))$('#requestCount').textContent=`${state.bookings.length} ›`;if($('#accountStatus'))$('#accountStatus').textContent=state.account?.email?`${state.account.email} ›`:'Guest ›';const signedIn=!!state.account?.token;if($('#topLogin'))$('#topLogin').hidden=signedIn;if($('#topSignup'))$('#topSignup').hidden=signedIn;if($('#topAccount')){$('#topAccount').hidden=!signedIn;$('#topAccount').textContent=signedIn?'My Account':'My Account'}if($('#guestWelcome'))$('#guestWelcome').hidden=signedIn;if($('#questStatus')){const q=dailyQuestState(),done=questTemplates.filter(x=>(q.progress[x.type]||0)>=x.goal).length;$('#questStatus').textContent=`${done}/${questTemplates.length} ›`}renderCertificates();applyInterfaceLanguage();$('#badges').innerHTML=`<div class="${studyDone()?'':'locked'}">🌱 <b>First Steps</b><br><small>Complete a lesson</small></div><div class="${state.streak>=3?'':'locked'}">🔥 <b>On a Roll</b><br><small>3-day streak</small></div><div class="${state.xp>=100?'':'locked'}">🎙️ <b>Speak Up</b><br><small>Earn 100 XP</small></div>`;renderProgress()}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2300)}
function closeDrawer(){$('#drawer').classList.remove('open');$('#scrim').classList.remove('show')}$('#menuBtn').onclick=()=>{$('#drawer').classList.add('open');$('#scrim').classList.add('show')};$('#closeDrawer').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;
render();checkAI();action('wave',800);


const COURSE_MILESTONES=[25,50,75,100];
function milestoneAwards(lang=state.language){
 const pct=Math.min(100,Math.floor(studyDone(lang)/totalStudySessions*100));
 return COURSE_MILESTONES.map(m=>({milestone:m,earned:pct>=m,id:`ISC-${certificateCodes[lang]||'XX'}-${m}-${new Date().getFullYear()}`}));
}
function renderMilestoneCertificates(){
 const host=document.querySelector('#milestoneCertificates'); if(!host)return;
 const l=languages[state.language], awards=milestoneAwards();
 host.innerHTML=awards.map(a=>`<article class="milestone-cert ${a.earned?'earned':'locked'}">
   <div class="mini-cert-logo"><img src="assets/logo.png" alt="iSpeak Confidence"></div>
   <small>${a.milestone===100?'COURSE COMPLETION':'COURSE MILESTONE'}</small>
   <b>${a.milestone}%</b><h3>${esc(l.name)}</h3>
   <span>${a.earned?'🏆 Earned':'🔒 Locked'}</span>
   <i>${a.earned?a.id:`Unlocks at ${a.milestone}% completion`}</i>
  </article>`).join('');
}


let ieltsMode=localStorage.getItem('isc_ielts_mode')||'academic';
let ieltsLevel=localStorage.getItem('isc_ielts_level')||'foundation';
function ieltsState(){
 let x={};
 try{
   const raw=localStorage.getItem('isc_ielts_progress');
   x=raw?JSON.parse(raw):{};
   if(!x||typeof x!=='object'||Array.isArray(x))x={};
 }catch(e){
   x={};
   try{localStorage.removeItem('isc_ielts_progress')}catch(_){}
 }
 x.completed=Array.isArray(x.completed)?x.completed:[];
 x.answers=(x.answers&&typeof x.answers==='object')?x.answers:{};
 x.mockHistory=Array.isArray(x.mockHistory)?x.mockHistory:[];
 x.mode=(x.mode==='general'||x.mode==='academic')?x.mode:'academic';
 x.level=(window.ISC_IELTS?.levels||[]).some(l=>l.id===x.level)?x.level:'foundation';
 return x;
}
function saveIELTSState(x){
 try{localStorage.setItem('isc_ielts_progress',JSON.stringify(x))}catch(e){console.warn('IELTS progress could not be saved',e)}
}
function stopIELTSAudio(){
 try{speechSynthesis.cancel()}catch(e){}
 try{
   document.querySelectorAll('audio').forEach(a=>{a.pause();a.currentTime=0});
 }catch(e){}
}
function ieltsModal(title,body){
 stopIELTSAudio();
 modal(`<div class="ielts-dialog"><h2>${title}</h2>${body}</div>`);
}
function initIELTSPage(){
 try{renderIELTS()}catch(e){
   console.error('IELTS render failed',e);
   const levels=document.querySelector('#ieltsLevels');
   if(levels)levels.innerHTML='<div class="ielts-load-error"><b>IELTS could not start.</b><span>'+String(e.message||e)+'</span></div>';
 }
}
function renderIELTS(){
 const C=window.ISC_IELTS;
 const levels=document.querySelector('#ieltsLevels'),skills=document.querySelector('#ieltsSkills');
 if(!C||!Array.isArray(C.levels)||!C.course){
   if(levels)levels.innerHTML='<div class="ielts-load-error"><b>IELTS content did not load.</b><span>Check that ielts-data.js is present, then restart the app.</span></div>';
   if(skills)skills.innerHTML='';
   return;
 }
 const st=ieltsState();ieltsMode=st.mode;ieltsLevel=st.level;
 if(levels)levels.innerHTML=C.levels.map((l,i)=>{const done=st.completed.filter(x=>x.startsWith(l.id+'-')).length;return `<button class="ielts-level-card ${st.level===l.id?'active':''}" data-ielts-level="${l.id}"><span>${i===0?'🌱':i<3?'📈':i<5?'🚀':'🏆'}</span><small>LEVEL ${i+1}</small><b>${l.name}</b><i>${l.target}</i><em>${done}/${l.units*8} lesson blocks completed</em></button>`}).join('');
 if(skills)skills.innerHTML=C.skills.map((s,i)=>`<button class="ielts-skill-card" data-ielts-skill="${s}"><span>${['🎧','📖','✍️','🎙️','🧠','🧩','⏱️'][i]}</span><b>${s}</b><small>Open targeted ${s.toLowerCase()} training</small></button>`).join('');
 document.querySelectorAll('[data-ielts-level]').forEach(b=>b.onclick=()=>{st.level=b.dataset.ieltsLevel;saveIELTSState(st);ieltsLevel=st.level;renderIELTS();openIELTSLevel(st.level)});
 document.querySelectorAll('[data-ielts-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.ieltsMode===st.mode);b.onclick=()=>{st.mode=b.dataset.ieltsMode;saveIELTSState(st);renderIELTS()}});
 document.querySelectorAll('[data-ielts-skill]').forEach(b=>b.onclick=()=>openIELTSSkill(b.dataset.ieltsSkill));
 const cur=C.levels.find(x=>x.id===st.level);const e=document.querySelector('#ieltsCurrentLevel');if(e)e.textContent=`${cur?.name||'Foundation'} • ${st.mode==='academic'?'Academic':'General Training'}`;
 const d=document.querySelector('#ieltsDiagnostic');if(d)d.onclick=openIELTSDiagnostic;
 ['ieltsMocks','ieltsMocks2'].forEach(id=>{const x=document.getElementById(id);if(x)x.onclick=openIELTSMocks});
}
function openIELTSLevel(levelId){
 const C=window.ISC_IELTS,st=ieltsState(),level=C.levels.find(x=>x.id===levelId),units=C.course[levelId];
 ieltsModal(`${level.name} • ${st.mode==='academic'?'Academic':'General Training'}`,`<p class="muted">${level.target}. Every unit contains eight substantive study blocks.</p><div class="notice"><b>Difficulty focus:</b> ${level.bandFocus||''} • Mastery pass mark: ${level.masteryPass||75}%</div><div class="ielts-unit-list">${units.map(u=>{const done=st.completed.filter(x=>x.startsWith(u.id+'-')).length;return `<button class="ielts-unit-open" data-open-ielts-unit="${u.id}"><b>${u.number}. ${u.topic}</b><small>${done}/8 completed • Listening • Reading • Writing • Speaking • Vocabulary • Grammar • Strategy • Mastery</small><span>${u.reading.questionType} • ${u.listening.questionType}</span></button>`}).join('')}</div>`);
 document.querySelectorAll('[data-open-ielts-unit]').forEach(b=>b.onclick=()=>openIELTSUnit(levelId,b.dataset.openIeltsUnit));
}
function openIELTSUnit(levelId,unitId){
 const C=window.ISC_IELTS,st=ieltsState(),u=C.course[levelId].find(x=>x.id===unitId);
 const blocks=[
 ['listening','🎧 Listening',u.listening.questionType],['reading','📖 Reading',u.reading.questionType],
 ['writing','✍️ Writing',st.mode==='academic'?'Academic Task 1 + Task 2':'General Training Task 1 + Task 2'],
 ['speaking','🎙️ Speaking','Parts 1, 2 and 3'],['vocabulary','🧠 Vocabulary',`${u.vocabulary.length} topic words + paraphrasing`],
 ['grammar','🧩 Grammar',u.grammar.focus],['strategy','⏱️ Exam Strategy','Timed method and checking routine'],['mastery','🏆 Mastery','8-question mixed checkpoint']
 ];
 ieltsModal(`${u.number}. ${u.topic}`,`<p class="muted">${u.target}</p><div class="ielts-block-grid">${blocks.map(x=>`<button data-ielts-block="${x[0]}"><b>${x[1]}</b><small>${x[2]}</small><span>${st.completed.includes(u.id+'-'+x[0])?'✓ Completed':'Start →'}</span></button>`).join('')}</div>`);
 document.querySelectorAll('[data-ielts-block]').forEach(b=>b.onclick=()=>openIELTSBlock(levelId,unitId,b.dataset.ieltsBlock));
}
function markIELTS(unitId,block){
 const st=ieltsState(),id=unitId+'-'+block;if(!st.completed.includes(id))st.completed.push(id);saveIELTSState(st);renderIELTS();
}
function ieltsPassThreshold(levelId,skill){
 const C=window.ISC_IELTS,idx=Math.max(0,C.levels.findIndex(x=>x.id===levelId));
 const base=skill==='reading'?[.70,.70,.75,.75,.80,.85]:[.70,.70,.75,.75,.80,.85];
 return base[idx]||.75;
}
function openIELTSBlock(levelId,unitId,block){
 const C=window.ISC_IELTS,st=ieltsState(),u=C.course[levelId].find(x=>x.id===unitId);
 if(block==='listening'){
   ieltsModal(`Listening • ${u.topic}`,`<div class="ielts-lesson-intro"><b>${u.listening.questionType}</b><p>${u.listening.strategy.join(' • ')}</p><p><strong>${u.listening.attemptRule||''}</strong> • Pass ${Math.round(ieltsPassThreshold(levelId,'listening')*100)}%</p></div><div class="audio-script-box"><button id="ieltsPlayListening" class="primary">🔊 Play practice recording</button><button id="ieltsShowTranscript" class="secondary">Show transcript after attempt</button><p id="ieltsTranscript" hidden>${u.listening.script}</p></div><div class="ielts-question-list">${u.listening.questions.map((q,i)=>`<label><b>${i+1}. ${q.q}</b><input data-listen-q="${i}" placeholder="Type your answer"></label>`).join('')}</div><button id="ieltsCheckListening" class="primary wide">Check answers</button><p id="ieltsListeningScore"></p>`);
   let listenPlays=0;document.querySelector('#ieltsPlayListening').onclick=()=>{if(u.difficulty>=3&&listenPlays>=1)return toast('One-play challenge: check your answers before using the transcript.');listenPlays++;stopIELTSAudio();const s=new SpeechSynthesisUtterance(u.listening.script);s.lang='en-GB';s.rate=.92;speechSynthesis.speak(s)};
   document.querySelector('#ieltsShowTranscript').onclick=()=>document.querySelector('#ieltsTranscript').hidden=false;
   document.querySelector('#ieltsCheckListening').onclick=()=>{let n=0;u.listening.questions.forEach((q,i)=>{const a=(document.querySelector(`[data-listen-q="${i}"]`).value||'').trim().toLowerCase();if(a.includes(String(q.a).toLowerCase()))n++});document.querySelector('#ieltsListeningScore').textContent=`${n}/${u.listening.questions.length} correct`;if(n>=Math.ceil(u.listening.questions.length*ieltsPassThreshold(levelId,'listening')))markIELTS(u.id,'listening')};
 }
 if(block==='reading'){
   ieltsModal(`Reading • ${u.topic}`,`<div class="ielts-reading-passage"><span class="eyebrow">${u.reading.questionType}</span><div class="notice">Target time: ${u.reading.timeTargetMinutes||15} minutes • Pass ${Math.round(ieltsPassThreshold(levelId,'reading')*100)}%</div><p>${u.reading.passage}</p></div><div class="ielts-question-list">${u.reading.questions.map((q,i)=>`<div><b>${i+1}. ${q.q}</b><div class="answer-grid">${q.choices.map(c=>`<button data-read-i="${i}" data-read-a="${c}">${c}</button>`).join('')}</div></div>`).join('')}</div><button id="ieltsFinishReading" class="primary wide">Finish reading block</button><p id="ieltsReadingScore"></p>`);
   const got={};document.querySelectorAll('[data-read-i]').forEach(b=>b.onclick=()=>{got[b.dataset.readI]=b.dataset.readA;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});
   document.querySelector('#ieltsFinishReading').onclick=()=>{let n=0;u.reading.questions.forEach((q,i)=>{if(got[i]===q.a)n++});document.querySelector('#ieltsReadingScore').textContent=`${n}/${u.reading.questions.length} correct`;if(n>=Math.ceil(u.reading.questions.length*ieltsPassThreshold(levelId,'reading')))markIELTS(u.id,'reading')};
 }
 if(block==='writing'){
   const t1=st.mode==='academic'?u.writing.academicTask1:u.writing.generalTask1;
   ieltsModal(`Writing • ${u.topic}`,`<div class="writing-task"><span class="pill">TASK 1 • recommended 20 min</span><h3>${t1}</h3><p>${st.mode==='academic'?'Write at least 150 words. Summarise the main features and make relevant comparisons.':'Write at least 150 words. Cover every bullet point and use an appropriate tone.'}</p><textarea id="ieltsW1" rows="8" placeholder="Write Task 1 here..."></textarea><span id="w1count">0 words</span></div><div class="writing-task"><span class="pill">TASK 2 • recommended 40 min</span><h3>${u.writing.task2}</h3><p>Write at least 250 words. Develop and support a clear response.</p><textarea id="ieltsW2" rows="12" placeholder="Write Task 2 here..."></textarea><span id="w2count">0 words</span></div><div class="criteria-box"><b>Self-check:</b>${u.writing.criteria.map(x=>`<label><input type="checkbox"> ${x}</label>`).join('')}</div><button id="ieltsSaveWriting" class="primary wide">Save writing practice</button><button id="ieltsMarkWriting" class="secondary wide">✨ Get AI estimated band & feedback</button><div id="ieltsWritingAI"></div>`);
   const count=(id,out)=>document.querySelector(id).oninput=e=>document.querySelector(out).textContent=`${e.target.value.trim()?e.target.value.trim().split(/\s+/).length:0} words`;count('#ieltsW1','#w1count');count('#ieltsW2','#w2count');
   document.querySelector('#ieltsSaveWriting').onclick=()=>{const w1=document.querySelector('#ieltsW1').value,w2=document.querySelector('#ieltsW2').value;if(meaningfulIELTSWriting(w1,150)&&meaningfulIELTSWriting(w2,250))markIELTS(u.id,'writing');else alert('Both tasks must meet the word minimum and contain varied, sentence-level writing. Repeated words or filler text will not count as completed practice.')};document.querySelector('#ieltsMarkWriting').onclick=()=>{const w1=document.querySelector('#ieltsW1').value.trim(),w2=document.querySelector('#ieltsW2').value.trim(),btn=document.querySelector('#ieltsMarkWriting'),out=document.querySelector('#ieltsWritingAI');if(w1.split(/\s+/).filter(Boolean).length<150||w2.split(/\s+/).filter(Boolean).length<250)return toast('Complete both IELTS writing tasks first.');markIELTSWithAI('writing',`Task 1: ${t1}\nTask 2: ${u.writing.task2}`,`TASK 1 RESPONSE:\n${w1}\n\nTASK 2 RESPONSE:\n${w2}`,st.mode==='academic'?'Academic Writing':'General Training Writing',out,btn)};
 }
 if(block==='speaking'){
   ieltsModal(`Speaking • ${u.topic}`,`<div class="speaking-part"><b>Part 1</b>${u.speaking.part1.map(x=>`<p>• ${x}</p>`).join('')}</div><div class="speaking-part"><b>Part 2 • 1 minute preparation, up to 2 minutes speaking</b><h3>${u.speaking.part2}</h3></div><div class="speaking-part"><b>Part 3</b>${u.speaking.part3.map(x=>`<p>• ${x}</p>`).join('')}</div><div class="criteria-box">${u.speaking.criteria.map(x=>`<label><input type="checkbox"> ${x}</label>`).join('')}</div><button id="ieltsSpeakDone" class="primary wide">Complete speaking practice</button>`);
   document.querySelector('#ieltsSpeakDone').onclick=()=>{const checks=[...document.querySelectorAll('.criteria-box input[type="checkbox"]')];if(checks.length&&!checks.every(x=>x.checked))return toast('Complete the four speaking-criteria self-checks first.');markIELTS(u.id,'speaking')};
 }
 if(block==='vocabulary'){
   ieltsModal(`Vocabulary • ${u.topic}`,`<div class="ielts-vocab-grid">${u.vocabulary.map(v=>`<article><b>${v.word}</b><span>${v.definition}</span><small>${v.example}</small></article>`).join('')}</div><h3>Production challenges</h3>${u.vocabPractice.map(x=>`<label class="production-task"><b>${x.type}</b><span>${x.prompt}</span><input placeholder="Write your answer"></label>`).join('')}<button id="ieltsVocabDone" class="primary wide">Complete vocabulary block</button>`);
   document.querySelector('#ieltsVocabDone').onclick=()=>{const vals=[...document.querySelectorAll('.production-task input')].map(x=>x.value.trim());if(vals.length&&vals.every(x=>meaningfulProduction(x,8)))markIELTS(u.id,'vocabulary');else toast('Complete every vocabulary production challenge with a meaningful answer first.');};
 }
 if(block==='grammar'){
   ieltsModal(`Grammar & Accuracy • ${u.grammar.focus}`,`<p>Work slowly first, then repeat under time pressure.</p><div class="grammar-drills">${u.grammar.drills.map((x,i)=>`<label><b>${i+1}. ${x}</b><textarea rows="3"></textarea></label>`).join('')}</div><button id="ieltsGrammarDone" class="primary wide">Complete accuracy block</button>`);
   document.querySelector('#ieltsGrammarDone').onclick=()=>{const vals=[...document.querySelectorAll('.grammar-drills textarea')].map(x=>x.value.trim());if(vals.length&&vals.every(x=>meaningfulProduction(x,18)))markIELTS(u.id,'grammar');else toast('Complete every grammar drill with a meaningful sentence or response first.');};
 }
 if(block==='strategy'){
   const steps=[...u.listening.strategy,...u.reading.strategy];
   ieltsModal(`Exam Strategy • ${u.topic}`,`<div class="strategy-list">${steps.map((x,i)=>`<article><b>${i+1}</b><span>${x}</span></article>`).join('')}</div><div class="notice">Timed sprint: give yourself 10 minutes to complete one reading question set or one listening section without pausing.</div><button id="ieltsStrategyDone" class="primary wide">Complete strategy block</button>`);
   document.querySelector('#ieltsStrategyDone').onclick=()=>markIELTS(u.id,'strategy');
 }
 if(block==='mastery'){
   const qs=[...u.reading.questions,...u.listening.questions.map(q=>({q:q.q,choices:[q.a,'Not stated','Another detail','Cannot tell'],a:q.a}))];
   ieltsModal(`Mastery Check • ${u.topic}`,`<p>Complete the mixed retrieval questions. Target: 75%.</p><div class="ielts-question-list">${qs.slice(0,8).map((q,i)=>`<div><b>${i+1}. ${q.q}</b><div class="answer-grid">${q.choices.map(c=>`<button data-master-i="${i}" data-master-a="${c}">${c}</button>`).join('')}</div></div>`).join('')}</div><button id="ieltsMasterDone" class="primary wide">Score mastery check</button><p id="ieltsMasterScore"></p>`);
   const got={};document.querySelectorAll('[data-master-i]').forEach(b=>b.onclick=()=>got[b.dataset.masterI]=b.dataset.masterA);
   document.querySelector('#ieltsMasterDone').onclick=()=>{let n=0;qs.slice(0,8).forEach((q,i)=>{if(got[i]===q.a)n++});const pct=Math.round(n/8*100);document.querySelector('#ieltsMasterScore').textContent=`${pct}%`;if(pct>=75)markIELTS(u.id,'mastery')};
 }
}
function openIELTSSkill(skill){
 const C=window.ISC_IELTS,st=ieltsState(),units=C.course[st.level];
 ieltsModal(`${skill} Skills Lab`,`<p class="muted">Choose a topic for focused ${skill.toLowerCase()} practice.</p><div class="ielts-unit-list">${units.map(u=>`<button data-skill-unit="${u.id}"><b>${u.topic}</b><small>${skill}</small></button>`).join('')}</div>`);
 document.querySelectorAll('[data-skill-unit]').forEach(b=>b.onclick=()=>openIELTSBlock(st.level,b.dataset.skillUnit,skill.toLowerCase()==='exam strategy'?'strategy':skill.toLowerCase()));
}
function openIELTSDiagnostic(){
 const C=window.ISC_IELTS;
 const units=C.levels.flatMap(l=>C.course[l.id].slice(0,2).map(u=>({u,level:l})));
 const items=[];
 units.forEach(({u,level},idx)=>{
   const rq=u.reading.questions[idx%u.reading.questions.length];
   items.push({type:'Reading',level:level.id,q:rq.q,choices:rq.choices,a:rq.a});
   const lq=u.listening.questions[idx%u.listening.questions.length];
   items.push({type:'Listening',level:level.id,q:lq.q,a:String(lq.a),script:u.listening.script});
 });
 const qs=items.slice(0,20);let i=0,right=0,byLevel={};
 const draw=()=>{
   const x=qs[i];byLevel[x.level]=byLevel[x.level]||{r:0,t:0};
   if(x.type==='Reading'){
     ieltsModal('IELTS Diagnostic',`<span class="eyebrow">${x.type} • ${i+1}/20</span><h3>${x.q}</h3><div class="answer-grid">${x.choices.map(c=>`<button data-diag-answer="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);
     document.querySelectorAll('[data-diag-answer]').forEach(b=>b.onclick=()=>answer(b.dataset.diagAnswer===x.a));
   }else{
     ieltsModal('IELTS Diagnostic',`<span class="eyebrow">${x.type} • ${i+1}/20</span><h3>Listen once, then answer:</h3><p>${x.q}</p><button id="diagPlay" class="secondary wide">🔊 Play once</button><input id="diagInput" placeholder="Type your answer"><button id="diagSubmit" class="primary wide">Submit</button>`);
     let played=false;document.querySelector('#diagPlay').onclick=()=>{if(played)return toast('Diagnostic listening is one-play only.');played=true;stopIELTSAudio();const s=new SpeechSynthesisUtterance(x.script);s.lang='en-GB';s.rate=.94;speechSynthesis.speak(s)};
     document.querySelector('#diagSubmit').onclick=()=>answer((document.querySelector('#diagInput').value||'').trim().toLowerCase().includes(x.a.toLowerCase()));
   }
 };
 const answer=ok=>{const x=qs[i];byLevel[x.level].t++;if(ok){right++;byLevel[x.level].r++}i++;if(i<qs.length)draw();else finish()};
 const finish=()=>{
   const pct=Math.round(right/qs.length*100);let rec=C.levels[0];
   C.levels.forEach(l=>{const s=byLevel[l.id];if(s&&s.t&&s.r/s.t>=.5)rec=l});
   const st=ieltsState();st.level=rec.id;st.diagnostic={score:right,total:qs.length,pct,recommended:rec.id,date:new Date().toISOString()};saveIELTSState(st);
   ieltsModal('Diagnostic result',`<span class="eyebrow">PRACTICE PLACEMENT • NOT AN OFFICIAL IELTS SCORE</span><h2>${right}/${qs.length} • ${pct}%</h2><h3>Recommended starting level: ${rec.name}</h3><p>${rec.bandFocus||rec.target}</p><p>This objective diagnostic samples Reading and Listening across increasing difficulty. Writing and Speaking are assessed through the dedicated practice blocks because they require extended production.</p><button id="diagDone" class="primary wide">Use this level</button>`);
   document.querySelector('#diagDone').onclick=()=>{document.querySelector('#modal').close();renderIELTS()};
 };
 draw();
}

function openIELTSMocks(){
 const C=window.ISC_IELTS,st=ieltsState(),list=C.mocks.filter(m=>m.mode===st.mode);
 ieltsModal(`Mock Test Centre • ${st.mode==='academic'?'Academic':'General Training'}`,`<p class="muted">Each full mock contains 40 Listening questions, 40 Reading questions, 2 Writing tasks and a 3-part Speaking simulation.</p><div class="mock-list">${list.map(m=>`<article><span>FULL MOCK</span><b>${m.name}</b><p>Listening 40 • Reading 40 • Writing 2 tasks • Speaking 3 parts</p><button data-open-mock="${m.id}" class="primary">Open Mock</button></article>`).join('')}</div>`);
 document.querySelectorAll('[data-open-mock]').forEach(b=>b.onclick=()=>openIELTSMock(b.dataset.openMock));
}
function openIELTSMock(id){
 const C=window.ISC_IELTS,m=C.mocks.find(x=>x.id===id);
 ieltsModal(m.name,`<div class="mock-sections"><button data-mock-part="listening"><b>🎧 Listening</b><span>40 questions • 4 parts • ~30 minutes</span></button><button data-mock-part="reading"><b>📖 Reading</b><span>40 questions • 60 minutes</span></button><button data-mock-part="writing"><b>✍️ Writing</b><span>2 tasks • 60 minutes</span></button><button data-mock-part="speaking"><b>🎙️ Speaking</b><span>3 parts • 11–14 minutes</span></button></div>`);
 document.querySelectorAll('[data-mock-part]').forEach(b=>b.onclick=()=>openMockPart(m,b.dataset.mockPart));
}
function renderIELTSAIMark(result,target){
 const c=result.criteria||{};const rows=Object.entries(c).map(([k,v])=>`<div><span>${esc(k)}</span><b>${v==null?'Not reliably scored':Number(v).toFixed(1)}</b></div>`).join('');
 target.innerHTML=`<div class="ielts-ai-result"><span class="eyebrow">AI-ESTIMATED MOCK RESULT</span><h2>Estimated band ${Number(result.overall||0).toFixed(1)}</h2><p class="muted">${esc(result.disclaimer||'Practice estimate only — not an official IELTS result.')}</p><div class="ielts-score-grid">${rows}</div><h3>What you did well</h3><ul>${(result.strengths||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>Improve next</h3><ul>${(result.improvements||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>Recommended next steps</h3><ul>${(result.nextSteps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p><b>Assessment confidence:</b> ${esc(result.confidence||'medium')} • ${result.doubleChecked?'AI score double-checked':''}</p></div>`;
}
async function markIELTSWithAI(skill,task,response,taskType,target,button){
 if(!response.trim())return toast('Complete your response before requesting AI marking.');button.disabled=true;const old=button.textContent;button.textContent='AI examiner is marking and double-checking…';target.innerHTML='<p class="muted">Checking your response against IELTS-style public assessment criteria…</p>';
 try{const r=await apiJSON('/api/ielts-evaluate',{method:'POST',body:JSON.stringify({skill,task,response,taskType})});renderIELTSAIMark(r,target)}catch(e){target.innerHTML=`<p class="error">${esc(e.message||'AI marking is unavailable right now.')}</p>`}finally{button.disabled=false;button.textContent=old}
}

async function markFullMockWriting(m,w1,w2,target,button){
 button.disabled=true;const old=button.textContent;button.textContent='AI examiner is marking Task 1 and Task 2 separately…';target.innerHTML='<p class="muted">Two independent double-checked assessments are running. Task 2 is weighted twice as heavily.</p>';
 try{
  const [t1,t2]=await Promise.all([
   apiJSON('/api/ielts-evaluate',{method:'POST',body:JSON.stringify({skill:'writing',task:m.writing.task1,response:w1,taskType:'IELTS Writing Task 1'})}),
   apiJSON('/api/ielts-evaluate',{method:'POST',body:JSON.stringify({skill:'writing',task:m.writing.task2,response:w2,taskType:'IELTS Writing Task 2'})})
  ]);
  const overall=Math.round((((Number(t1.overall)||0)+2*(Number(t2.overall)||0))/3)*2)/2;
  target.innerHTML=`<div class="ielts-ai-result"><span class="eyebrow">AI-ESTIMATED MOCK WRITING</span><h2>Weighted estimated band ${overall.toFixed(1)}</h2><p class="muted">Task 2 is weighted twice as heavily as Task 1. Practice estimate only — not an official IELTS result.</p><h3>Task 1 • ${Number(t1.overall||0).toFixed(1)}</h3><p>${esc(t1.summary||'')}</p><ul>${(t1.improvements||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>Task 2 • ${Number(t2.overall||0).toFixed(1)}</h3><p>${esc(t2.summary||'')}</p><ul>${(t2.improvements||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p><b>Both tasks double-checked by the AI mock examiner.</b></p></div>`;
 }catch(e){target.innerHTML=`<p class="error">${esc(e.message||'AI marking is unavailable right now.')}</p>`}finally{button.disabled=false;button.textContent=old}
}
function normaliseIELTSAnswer(v){
 return String(v||'').trim().toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ');
}
function speakMockScript(script){
 stopIELTSAudio();
 const lines=String(script||'').split(/\n+/).filter(Boolean);
 const voices=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang||''));
 let vi=0;
 lines.forEach(line=>{
   const u=new SpeechSynthesisUtterance(line.replace(/^[^:]{1,18}:\s*/,''));u.lang='en-GB';u.rate=.92;
   if(voices.length){u.voice=voices[vi%voices.length];vi++}
   speechSynthesis.speak(u);
 });
}
function mockBandGuide(raw,skill,mode){
 const n=Number(raw)||0;
 if(skill==='listening'){
   if(n>=39)return 'about Band 9';if(n>=37)return 'about Band 8.5';if(n>=35)return 'about Band 8';
   if(n>=32)return 'about Band 7.5';if(n>=30)return 'about Band 7';if(n>=26)return 'about Band 6.5';
   if(n>=23)return 'about Band 6';if(n>=18)return 'about Band 5.5';if(n>=16)return 'about Band 5';return 'below Band 5 range';
 }
 if(skill==='reading'&&mode==='academic'){
   if(n>=39)return 'about Band 9';if(n>=37)return 'about Band 8.5';if(n>=35)return 'about Band 8';
   if(n>=33)return 'about Band 7.5';if(n>=30)return 'about Band 7';if(n>=27)return 'about Band 6.5';
   if(n>=23)return 'about Band 6';if(n>=19)return 'about Band 5.5';if(n>=15)return 'about Band 5';return 'below Band 5 range';
 }
 return 'use the raw score as a practice indicator';
}
function openMockPart(m,part){
 if(part==='listening'){
   ieltsModal(`${m.name} • Listening`,`<div class="notice"><b>Practice simulation:</b> 4 parts • 40 questions • about 30 minutes. The audio uses voices available on your device, so use the linked official IELTS samples as your reference for real test audio and accent variety.</div>${m.listening.parts.map(p=>`<details class="mock-practice-part"><summary>Part ${p.part} • ${p.title} • 10 questions</summary><button class="secondary" data-play-mock="${p.part}">🔊 Play once</button><div class="ielts-question-list">${p.questions.map(q=>`<label><b>${q.n}. ${q.q}</b><input data-mock-listen="${q.n}" autocomplete="off" placeholder="Type your answer"></label>`).join('')}</div></details>`).join('')}<button id="mockCheckListening" class="primary wide">Finish Listening</button><div id="mockListeningScore"></div>`);
   m.listening.parts.forEach(p=>{const b=document.querySelector(`[data-play-mock="${p.part}"]`);if(b)b.onclick=()=>speakMockScript(p.script)});
   document.querySelector('#mockCheckListening').onclick=()=>{
     const all=m.listening.parts.flatMap(x=>x.questions);let n=0;
     all.forEach(q=>{const el=document.querySelector(`[data-mock-listen="${q.n}"]`);if(el&&normaliseIELTSAnswer(el.value)===normaliseIELTSAnswer(q.a))n++});
     document.querySelector('#mockListeningScore').innerHTML=`<div class="notice"><b>${n}/40 correct</b> • ${mockBandGuide(n,'listening',m.mode)}. <span class="muted">Band conversion is an approximate practice guide; official boundaries can vary slightly by test version.</span></div>`;
   };
 }
 if(part==='reading'){
   ieltsModal(`${m.name} • Reading`,`<div class="notice"><b>Timed practice:</b> 40 questions • 60 minutes. Academic mocks contain roughly 2,650 words across 3 passages; General Training uses progressively longer everyday/workplace/general texts.</div>${m.reading.parts.map(p=>`<details class="mock-practice-part"><summary>${m.mode==='academic'?'Passage':'Section'} ${p.passage}: ${p.title}</summary><div class="ielts-reading-passage">${p.text.split(/\n\n/).map(x=>`<p>${x}</p>`).join('')}</div><div class="ielts-question-list">${p.questions.map(q=>`<div><b>${q.n}. ${q.q}</b>${Array.isArray(q.choices)?`<div class="answer-grid">${q.choices.map(c=>`<button type="button" data-mock-read="${q.n}" data-answer="${c}">${c}</button>`).join('')}</div>`:`<input data-mock-read-input="${q.n}" placeholder="Type your answer">`}</div>`).join('')}</div></details>`).join('')}<button id="mockCheckReading" class="primary wide">Finish Reading</button><div id="mockReadingScore"></div>`);
   const got={};
   document.querySelectorAll('[data-mock-read]').forEach(b=>b.onclick=()=>{got[b.dataset.mockRead]=b.dataset.answer;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});
   document.querySelector('#mockCheckReading').onclick=()=>{
     const all=m.reading.parts.flatMap(x=>x.questions);let n=0;
     all.forEach(q=>{const v=got[q.n]??document.querySelector(`[data-mock-read-input="${q.n}"]`)?.value;if(normaliseIELTSAnswer(v)===normaliseIELTSAnswer(q.a))n++});
     document.querySelector('#mockReadingScore').innerHTML=`<div class="notice"><b>${n}/40 correct</b> • ${mockBandGuide(n,'reading',m.mode)}. <span class="muted">${m.mode==='general'?'General Training reading conversion differs from Academic; use the official scoring guide for the current conversion.':'Band conversion is an approximate practice guide; official boundaries can vary slightly by test version.'}</span></div>`;
   };
 }
 if(part==='writing'){
   ieltsModal(`${m.name} • Writing`,`<div class="writing-task"><b>Task 1 • about 20 minutes • minimum 150 words</b><p>${m.writing.task1}</p><textarea id="mockW1" rows="8" placeholder="Write Task 1 here..."></textarea></div><div class="writing-task"><b>Task 2 • about 40 minutes • minimum 250 words</b><p>${m.writing.task2}</p><textarea id="mockW2" rows="12" placeholder="Write Task 2 here..."></textarea></div><div class="notice">The AI estimate should consider the four published IELTS criteria. Task 2 carries more weight than Task 1. Practice estimates are not official IELTS scores.</div><button id="mockMarkWriting" class="primary wide">✨ Submit to AI Mock Examiner</button><div id="mockWritingResult"></div>`);
   document.querySelector('#mockMarkWriting').onclick=()=>{const w1=document.querySelector('#mockW1').value.trim(),w2=document.querySelector('#mockW2').value.trim(),btn=document.querySelector('#mockMarkWriting');if(w1.split(/\s+/).filter(Boolean).length<150||w2.split(/\s+/).filter(Boolean).length<250)return toast('Complete both tasks before AI marking: 150+ words for Task 1 and 250+ for Task 2.');markFullMockWriting(m,w1,w2,document.querySelector('#mockWritingResult'),btn)};
 }
 if(part==='speaking'){
   const part2=Array.isArray(m.speaking.part2)?m.speaking.part2:[m.speaking.part2];
   const prompts=[...m.speaking.part1,...part2,...m.speaking.part3].join('\n');
   ieltsModal(`${m.name} • Speaking`,`<div class="notice">Target total time: 11–14 minutes. Part 2 includes 1 minute to prepare and up to 2 minutes to speak.</div><div class="speaking-part"><b>Part 1</b>${m.speaking.part1.map(x=>`<p>${x}</p>`).join('')}</div><div class="speaking-part"><b>Part 2</b>${part2.map(x=>`<p>${x}</p>`).join('')}</div><div class="speaking-part"><b>Part 3</b>${m.speaking.part3.map(x=>`<p>${x}</p>`).join('')}</div><div class="notice">Type or paste a transcript of your complete attempt. The AI may estimate fluency/coherence, vocabulary and grammar from text, but pronunciation cannot be validly judged from a transcript and is not invented.</div><textarea id="mockSpeakingTranscript" rows="12" placeholder="Type or paste your speaking transcript here..."></textarea><button id="mockMarkSpeaking" class="primary wide">✨ Submit to AI Mock Examiner</button><div id="mockSpeakingResult"></div>`);
   document.querySelector('#mockMarkSpeaking').onclick=()=>{const text=document.querySelector('#mockSpeakingTranscript').value.trim(),btn=document.querySelector('#mockMarkSpeaking');if(text.split(/\s+/).filter(Boolean).length<80)return toast('Add a fuller speaking transcript before requesting a band estimate.');markIELTSWithAI('speaking',prompts,text,'Full IELTS Mock Speaking',document.querySelector('#mockSpeakingResult'),btn)};
 }
}


// IELTS_LEFT_NAV_PATCH
document.addEventListener('click',function(e){
 const b=e.target.closest('[data-nav="ielts"],[data-view="ielts"]');
 if(!b)return;
 e.preventDefault();
 document.querySelectorAll('.view,.page').forEach(p=>p.classList.remove('active'));
 const page=document.querySelector('#page-ielts');
 if(page){
   page.style.display='';
   page.classList.add('active');
 }
 document.querySelectorAll('[data-nav],[data-view]').forEach(x=>x.classList.remove('active'));
 b.classList.add('active');
 renderIELTS();
 window.scrollTo(0,0);
});

// IELTS_CONTROL_DELEGATION
document.addEventListener('click',function(e){
 const diagnostic=e.target.closest('#ieltsDiagnostic');
 if(diagnostic){e.preventDefault();openIELTSDiagnostic();return;}
 const mocks=e.target.closest('#ieltsMocks,#ieltsMocks2');
 if(mocks){e.preventDefault();openIELTSMocks();return;}
 const level=e.target.closest('[data-ielts-level]');
 if(level){
   e.preventDefault();
   const st=ieltsState();
   st.level=level.dataset.ieltsLevel;
   saveIELTSState(st);
   ieltsLevel=st.level;
   renderIELTS();
   openIELTSLevel(st.level);
   return;
 }
 const mode=e.target.closest('[data-ielts-mode]');
 if(mode){
   e.preventDefault();
   const st=ieltsState();
   st.mode=mode.dataset.ieltsMode;
   saveIELTSState(st);
   ieltsMode=st.mode;
   renderIELTS();
   return;
 }
});

setTimeout(()=>{if(!state.onboardingDone||Number(state.onboardingVersion||0)<15)openOnboarding()},650);

// PWA registration kept in external JS so the production CSP does not block it.
if('serviceWorker' in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('Service worker registration failed',err)));}
