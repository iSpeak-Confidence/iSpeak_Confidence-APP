const fs=require('fs');
const s=fs.readFileSync('app.js','utf8');
let fails=0; const ok=(name,v)=>{console.log((v?'PASS ':'FAIL ')+name);if(!v)fails++};
ok('JS contains multilingual Story Series marker',s.includes('V18.6.3 MULTILINGUAL STORY SERIES'));
for(const l of ['zh','es','fr','ja','ar']){
 ok(`${l} story UI pack`,new RegExp(`\\n ${l}:\\{choose:`).test(s));
 ok(`${l} translated book titles`,new RegExp(`\\n ${l}:\\{jess:\\[`).test(s));
 ok(`${l} translated chapter titles`,new RegExp(`\\n ${l}:\\{a:\\[`).test(s));
 ok(`${l} target-language prose pack`,new RegExp(`\\n ${l}:\\{open:\\[`).test(s));
}
ok('Mandarin learning-language mapping',s.includes("mandarin:'zh'"));
ok('Spanish learning-language mapping',s.includes("spanish:'es'"));
ok('French learning-language mapping',s.includes("french:'fr'"));
ok('Japanese learning-language mapping',s.includes("japanese:'ja'"));
ok('Arabic learning-language mapping',s.includes("arabic:'ar'"));
ok('Khmer remains protected pending approved text',s.includes("km:{name:'Khmer',chapters:8,restricted:true}"));
ok('Story buttons use CSP-safe delegated handlers',s.includes("e.target.closest('[data-hero-read]')")&&s.includes("e.target.closest('[data-story-nav]')"));
ok('Chapter selector wired',s.includes("e.target.closest('[data-story-chapter]')"));
ok('No inline onclick in generated Story Series',!s.slice(s.indexOf('/* === ISPEAK STORY LIBRARY V18.6.2 === */')).includes('onclick='));
ok('Cloud story progress save retained',s.includes('saveHeroProg')&&s.includes('state.heroReadingProgress'));
process.exit(fails?1:0);
