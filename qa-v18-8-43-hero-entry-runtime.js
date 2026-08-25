const fs=require('fs');
const app=fs.readFileSync('app.js','utf8'), html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
let pass=0,fail=0;function t(n,v){if(v){console.log('PASS',n);pass++}else{console.error('FAIL',n);fail++}}
t('Hero card has stable hook',/id="openHeroesLibrary"[^>]*data-open-hero-stories="true"/.test(html));
t('Hero entry has direct binding',app.includes('function bindHeroStoriesEntry()')&&app.includes("btn.onclick=function(ev)"));
t('Hero entry safely activates library',app.includes('function openHeroStoriesSafely()')&&app.includes("setView('library')")&&app.includes('heroesHome();'));
t('Capture router no longer stopImmediatePropagation on hero entry',!app.includes("if(t.id==='openHeroesLibrary'){e.preventDefault();e.stopImmediatePropagation();heroesHome();return}"));
t('App bootstrap occurs after Story Series definitions',app.lastIndexOf('bootstrapISpeak();')>app.indexOf('const ISPEAK_HEROES=[')&&app.lastIndexOf('bootstrapISpeak();')>app.indexOf('function heroesHome()'));
t('Only one initial render bootstrap remains',!app.includes("render();checkAI();action('wave',800);offerPendingRevolutReturn();"));
t('Cache bust is V18.8.45',html.includes('app.js?v=18.8.45')&&sw.includes('ispeak-v18-8-45-hero-entry-hardening'));
console.log(`\nV18.8.45 Hero entry QA: ${pass}/${pass+fail} passed`);process.exit(fail?1:0);
