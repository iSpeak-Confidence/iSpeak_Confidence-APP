(function(){
'use strict';

const ACADEMY_COURSES=[
  {code:'TESL',title:'Practical ESL & EFL Teaching'},
  {code:'LEAD',title:'School Leadership & Management'},
  {code:'CMGT',title:'Classroom Management & Positive Behaviour'},
  {code:'SEND',title:'Inclusive Education & SEND Support'},
  {code:'CURR',title:'Curriculum, Assessment & Instructional Planning'},
  {code:'PRIM',title:'Teaching Young Learners & Primary Education'},
  {code:'IELTS',title:'IELTS & Academic English Teaching'},
  {code:'EDTECH',title:'Educational Technology, AI & Digital Teaching'},
  {code:'COACH',title:'Teacher Mentoring & Instructional Coaching'},
  {code:'SAFE',title:'Safeguarding, Student Wellbeing & Pastoral Care'},
  {code:'CPDL',title:'Child Psychology, Development & Learning'},
  {code:'LPRI',title:'Literacy, Phonics & Reading Instruction'},
  {code:'PIEL',title:'Project-Based, Inquiry & Experiential Learning'}
];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateStamp=()=>{
  const d=new Date();
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
};
const idStamp=code=>{
  const d=new Date();
  return `ISC-${code}-30H-${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
};

function recipientName(){
  try{
    const raw=localStorage.getItem('isc-v17-5-0');
    const s=raw?JSON.parse(raw):{};
    return (s.name&&s.name!=='Student')?String(s.name):'Wesley Kruis';
  }catch{return 'Wesley Kruis'}
}

function certificateMarkup(course, name=recipientName(), sample=true){
  const id=idStamp(course.code)+(sample?'-SAMPLE':'');
  return `
  <div class="isc-academy-cert" data-academy-cert="${esc(course.code)}">
    <div class="cert-inner">
      <div class="cert-top">
        <div class="cert-brand"><img src="assets/logo.png" alt="iSpeak Confidence"><div><b>iSpeak Confidence</b><span>ACADEMY</span></div></div>
        <div class="cert-hours"><b>30</b><span>HOURS</span></div>
      </div>
      <div class="cert-angle"></div>
      <div class="cert-body">
        <h2>DIPLOMA OF PROFESSIONAL DEVELOPMENT</h2>
        <h3>THIS DIPLOMA IS PRESENTED TO</h3>
        <div class="cert-name">${esc(name)}</div>
        <p>for successfully completing the structured 30-hour professional development programme</p>
        <div class="cert-course">${esc(course.title)}</div>
        <div class="cert-meta">12 MODULES • APPLIED PORTFOLIO • FINAL ASSESSMENT</div>
      </div>
      <div class="cert-footer">
        <div><small>DATE AWARDED</small><b>${dateStamp()}</b></div>
        <div class="cert-director"><span class="cert-signature">Michael Carter</span><b>Michael Carter</b><small>COURSE DIRECTOR<br>iSpeak Confidence</small></div>
        <div><small>DIPLOMA ID</small><b>${esc(id)}</b></div>
      </div>
      ${sample?'<div class="cert-sample">SAMPLE</div>':''}
    </div>
  </div>`;
}

function downloadCertificate(course){
  const name=recipientName();
  const win=window.open('','_blank','noopener,noreferrer');
  if(!win)return alert('Please allow pop-ups to print or save the diploma.');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(course.title)}</title><link rel="stylesheet" href="${location.origin}/styles.css"><link rel="stylesheet" href="${location.origin}/academy-refresh-v18-9-1.css"></head><body class="academy-print-page">${certificateMarkup(course,name,false)}<script>setTimeout(()=>window.print(),350)<\/script></body></html>`);
  win.document.close();
}

function buildAcademy(){
  if(document.getElementById('academy'))return;
  const main=document.querySelector('main');
  if(!main)return;
  const section=document.createElement('section');
  section.id='academy';
  section.className='view';
  section.innerHTML=`
    <div class="academy-head">
      <span class="eyebrow">iSPEAK CONFIDENCE ACADEMY</span>
      <h1>Certificate Academy</h1>
      <p>Structured professional-development diplomas. Each programme is 30 hours with 12 modules, an applied portfolio and a final assessment.</p>
    </div>
    <div class="academy-notice"><b>Certificate design standard</b><span>Every Academy diploma uses the same approved navy, gold and white master template. Only course, recipient, date and diploma ID text changes.</span></div>
    <div class="academy-course-grid">${ACADEMY_COURSES.map(c=>`
      <article class="academy-course-card">
        <span>30 HOURS</span><h2>${esc(c.title)}</h2>
        <p>12 modules • Applied portfolio • Final assessment</p>
        <div><button class="secondary" data-academy-preview="${c.code}">Preview diploma</button><button class="primary" data-academy-print="${c.code}">Print / Save PDF</button></div>
      </article>`).join('')}
    </div>
    <dialog id="academyCertificateDialog" class="academy-cert-dialog"><button class="modal-close" data-academy-close aria-label="Close">×</button><div id="academyCertificateBody"></div></dialog>`;
  main.appendChild(section);

  const drawer=document.getElementById('drawer');
  if(drawer&&!drawer.querySelector('[data-view="academy"]')){
    const b=document.createElement('button');
    b.dataset.view='academy'; b.textContent='🎓 Certificate Academy';
    const profile=drawer.querySelector('[data-view="profile"]');
    drawer.insertBefore(b,profile||null);
  }

  document.addEventListener('click',e=>{
    const v=e.target.closest?.('[data-view="academy"]');
    if(v){
      document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
      section.classList.add('active');
      document.getElementById('drawer')?.classList.remove('open');
      document.getElementById('scrim')?.classList.remove('open');
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    const p=e.target.closest?.('[data-academy-preview]');
    if(p){
      const course=ACADEMY_COURSES.find(x=>x.code===p.dataset.academyPreview); if(!course)return;
      const d=document.getElementById('academyCertificateDialog');
      document.getElementById('academyCertificateBody').innerHTML=certificateMarkup(course);
      d.showModal();
      return;
    }
    const pr=e.target.closest?.('[data-academy-print]');
    if(pr){
      const course=ACADEMY_COURSES.find(x=>x.code===pr.dataset.academyPrint); if(course)downloadCertificate(course);
      return;
    }
    if(e.target.closest?.('[data-academy-close]'))document.getElementById('academyCertificateDialog')?.close();
  });
}

function installAudioFallback(audio){
  if(!audio||audio.dataset.iscFallbackBound)return;
  audio.dataset.iscFallbackBound='1';
  const makeDownload=()=>{
    const src=audio.currentSrc||audio.src||audio.querySelector('source')?.src;
    if(!src)return;
    let box=audio.parentElement?.querySelector?.('.isc-audio-download-fallback');
    if(!box){
      box=document.createElement('div');
      box.className='isc-audio-download-fallback';
      const a=document.createElement('a');
      a.className='secondary';
      a.textContent='⬇ Download Audio';
      a.setAttribute('download','');
      box.append(a);
      audio.insertAdjacentElement('afterend',box);
    }
    const a=box.querySelector('a'); a.href=src;
    box.hidden=false;
    audio.setAttribute('aria-describedby','audio-download-fallback');
  };
  const hideDownload=()=>{
    const box=audio.parentElement?.querySelector?.('.isc-audio-download-fallback');
    if(box)box.hidden=true;
  };
  ['error','abort'].forEach(ev=>audio.addEventListener(ev,makeDownload));
  audio.addEventListener('stalled',()=>setTimeout(()=>{if(audio.readyState<2)makeDownload()},1800));
  audio.addEventListener('canplay',hideDownload);
}

function installAudioFallbacks(){
  document.querySelectorAll('audio').forEach(installAudioFallback);
  const obs=new MutationObserver(muts=>{
    for(const m of muts)for(const n of m.addedNodes){
      if(n.nodeType!==1)continue;
      if(n.matches?.('audio'))installAudioFallback(n);
      n.querySelectorAll?.('audio').forEach(installAudioFallback);
    }
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
}

document.addEventListener('DOMContentLoaded',()=>{
  buildAcademy();
  installAudioFallbacks();
});
})();