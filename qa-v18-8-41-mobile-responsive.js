const fs=require('fs');
const css=fs.readFileSync('styles.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['mobile hardening marker',/V18\.8\.41 — mobile responsiveness hardening/.test(css)],
 ['mobile body blocks horizontal page overflow',/@media\(max-width:760px\)[\s\S]*?body\{overflow-x:hidden\}/.test(css)],
 ['mobile touch controls reach 44px',/\.icon-btn,\.modal-close\{min-width:44px;min-height:44px/.test(css)],
 ['mobile chat input can shrink',/\.chat-input input\{min-width:0;min-height:44px\}/.test(css)],
 ['teacher tabs remain reachable by horizontal scrolling',/\.teacher-portal-tabs\{display:flex;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap/.test(css)],
 ['hero actions stack rather than clip',/\.hero-actions\{display:grid;grid-template-columns:1fr/.test(css)],
 ['small phone lesson grid uses minmax',/\.node\{grid-template-columns:58px minmax\(0,1fr\)/.test(css)],
 ['drawer constrained to phone width',/#drawer\{width:min\(280px,88vw\)/.test(css)],
 ['existing app stylesheet remains wired',html.includes('styles.css?v=18.8.38')],
 ['existing service worker cache contract remains intact',sw.includes('/styles.css?v=18.8.38')&&sw.includes('ispeak-v18-8-38-play-ready')]
];
let fail=0;for(const [name,ok] of checks){console.log(ok?'PASS':'FAIL',name);if(!ok)fail++}if(fail)process.exit(1);console.log(`V18.8.41 mobile responsive QA: ${checks.length}/${checks.length} passed`);
