const fs=require('fs');const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('styles.css','utf8'),html=fs.readFileSync('index.html','utf8');let p=0,f=0;function t(n,c){if(c){p++;console.log('PASS',n)}else{f++;console.error('FAIL',n)}}
t('Writing instruction has explicit readable dark-app contrast',css.includes('#writingInstruction.feedback')&&css.includes('color:#123b31!important'));
t('Practice pool follows reached units rather than fixed first-three cap',app.includes('function practiceUnitLimit')&&!app.includes("Math.max(3,state.placementDetail"));
t('Speaking room is multi-item',app.includes('function openSpeakingPracticeRoom')&&app.includes('SPEAKING ROOM • ${i+1}/${items.length}'));
t('Listening room is multi-item',app.includes('function openListeningPracticeRoom')&&app.includes('LISTENING ROOM • ${i+1}/${items.length}'));
t('Practice speech routes to full room',app.includes("if(kind==='speech'){openSpeakingPracticeRoom();return}"));
t('Practice listen routes to full room',app.includes("if(kind==='listen'){openListeningPracticeRoom();return}"));
t('IELTS persistent routing exists',app.includes('V18.8.37 critical interaction router')&&app.includes("[data-ielts-skill]"));
t('Library persistent routing exists',app.includes("[data-view=\"library\"]")&&app.includes("#openClassicLibrary"));
t('Mobile IELTS/library grids collapse to one column',css.includes('.ielts-level-grid,.ielts-skill-grid,.ielts-unit-list,.mock-list,.mock-sections{grid-template-columns:1fr!important')&&css.includes('.library-paths,.library-grid,.library-ai-tools{grid-template-columns:1fr!important'));
t('New app cache busting is active',html.includes('app.js?v=18.8.38')&&html.includes('styles.css?v=18.8.38'));
console.log(`\nV18.8.38 interaction QA: ${p}/${p+f} passed`);process.exit(f?1:0);
