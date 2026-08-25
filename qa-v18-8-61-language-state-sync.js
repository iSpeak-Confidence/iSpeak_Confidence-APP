const fs=require('fs');const s=fs.readFileSync('app.js','utf8');
const C=[
['canonical reverse index',/function canonicalInterfaceKey\(raw\)/],
['cache reset',/function resetLocalizationCaches\(\)/],
['ui switch resets cache',/state\.uiLanguage=k;\s*resetLocalizationCaches\(\);/],
['text base canonicalized',/if\(base\)base=canonicalInterfaceKey\(base\)/],
['attributes canonicalized',/base=canonicalInterfaceKey\(cur\)/],
['legacy selector pass canonicalized',/base=canonicalInterfaceKey\(raw\)/],
['learning language changes only through dedicated setter',/function changeLearningLanguage\(lang,[\s\S]*?state\.language=lang;/],
['setView does not assign ui language',/function setView\(name\)\{(?![^}]*state\.uiLanguage=)/],
['setView does not assign learning language',/function setView\(name\)\{(?![^}]*state\.language=)/],
['separate state fields retained',/language:'khmer'[\s\S]*uiLanguage:'english'/]
];let p=0;for(const [n,r] of C){let ok=r.test(s);console.log((ok?'PASS ':'FAIL ')+n);if(ok)p++}console.log(`${p}/${C.length}`);process.exit(p===C.length?0:1);
