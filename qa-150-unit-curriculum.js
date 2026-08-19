const assert=require('assert');global.window={};require('./curriculum-data.js');require('./curriculum-expansion-v17-4.js');const C=window.ISC_CURRICULUM;
assert.equal(C.days,150);assert.equal(C.sessionsPerDay,8);assert.equal(C.activityCountPerLanguage,1200);
const langs=['english','khmer','mandarin','spanish','french','japanese','arabic'];
for(const lang of langs){const us=C.languages[lang].units;assert.equal(us.length,150,`${lang} units`);assert.equal(new Set(us.map(x=>x.id)).size,150,`${lang} ids`);assert.equal(new Set(us.map(x=>x.title)).size,150,`${lang} titles`);for(const [i,u] of us.entries()){assert(u.anchors?.length,`${lang} ${i+1} anchors`);assert(u.goal&&u.canDo&&u.transfer,`${lang} ${i+1} pedagogy`);assert(['new-material','spaced-retrieval','cumulative-mastery'].includes(u.reviewPolicy));}}
console.log('PASS 150-unit curriculum: 7 languages × 150 units × 8 blocks = 8,400 blocks');
