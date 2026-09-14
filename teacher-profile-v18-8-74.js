// V18.8.74 — immediate self-service teacher profile editing.
(function(){
  // Retire only the automatic first-run learning-path popup.
  if(typeof state==='object'&&state){state.onboardingDone=true;state.onboardingVersion=Math.max(15,Number(state.onboardingVersion)||0);if(typeof localSave==='function')localSave()}

  window.renderTeacherProfileEditor=function(b,d){
    const p=d.profile||{},headline=p.headline||'',about=p.about||'',specialties=p.specialties||[];
    b.innerHTML=`<div class="portal-section-head"><div><span class="eyebrow">PUBLIC PROFILE</span><h3>Make a strong first impression</h3><p>Your saved profile is published to students immediately.</p></div><button id="editPortalProfile" class="secondary portal-profile-edit" type="button" aria-label="Edit public profile">✏️ Edit profile</button></div>
    <div class="teacher-profile-editor-shell"><aside class="teacher-profile-preview-card public-style">${p.photoUrl?`<img src="${p.photoUrl}" alt="${esc(d.teacher)}">`:'<div class="portal-profile-placeholder">👤</div>'}<div class="teacher-preview-copy"><span class="eyebrow">PUBLIC STUDENT VIEW</span><h3>Teacher ${esc(d.teacher)}</h3><div class="teacher-rating-summary">New on iSpeak · Public profile</div><b>${esc(headline||'Add a clear teaching headline')}</b><p>${esc(about||'Tell students who you help, what lessons feel like and what they can expect.')}</p><div class="teacher-specialties">${specialties.length?specialties.map(x=>`<span>${esc(x)}</span>`).join(''):'<span>Add your specialties</span>'}</div>${p.videoUrl?`<video class="portal-profile-video" src="${p.videoUrl}" controls preload="metadata"></video>`:''}</div></aside>
    <section id="teacherProfileEditForm" class="teacher-profile-form-card" hidden><label>Teaching headline<input id="portalHeadline" maxlength="140" value="${esc(headline)}"></label><label>About me<textarea id="portalAbout" rows="9">${esc(about)}</textarea></label><label>Specialties<input id="portalSpecialties" value="${esc(specialties.join(', '))}" placeholder="Conversation, IELTS, Business English"></label><div class="teacher-media-section"><div>${p.photoUrl?`<img class="application-photo-preview" src="${p.photoUrl}" alt="Current photo">`:''}<label>Change profile photo<input id="portalPhoto" type="file" accept="image/jpeg,image/png,image/webp"></label><small>JPG, PNG or WebP • maximum 4 MB</small></div><div>${p.videoUrl?`<video class="application-video-preview" src="${p.videoUrl}" controls></video>`:''}<label>Change introduction video<input id="portalVideo" type="file" accept="video/mp4,video/webm"></label><small>MP4 or WebM • maximum 55 MB</small></div></div><div class="info-panel"><b>Updates are immediate</b><p>Details, specialties, photo and video go live when Save changes succeeds. No admin approval is required.</p></div><div class="profile-edit-actions"><button id="cancelPortalProfile" class="secondary" type="button">Cancel</button><button id="savePortalProfile" class="primary" type="button">Save changes</button></div></section></div>`;
    const edit=$('#editPortalProfile'),form=$('#teacherProfileEditForm');
    edit.onclick=()=>{form.hidden=false;edit.hidden=true;$('#portalHeadline').focus()};
    $('#cancelPortalProfile').onclick=()=>openApprovedTeacherDashboard('profile');
    $('#savePortalProfile').onclick=async()=>{
      const btn=$('#savePortalProfile');if(btn.disabled)return;btn.disabled=true;btn.textContent='Saving…';
      try{
        const photoFile=$('#portalPhoto').files?.[0],videoFile=$('#portalVideo').files?.[0];
        if(photoFile&&photoFile.size>4000000)throw new Error('Profile photo must be 4 MB or smaller.');
        if(videoFile&&videoFile.size>55000000)throw new Error('Introduction video must be 55 MB or smaller.');
        const photo=await fileAsData(photoFile),video=await fileAsData(videoFile);
        const result=await apiJSON('/api/teacher-application/portal',{method:'POST',headers:{Authorization:`Bearer ${appAuthToken()}`},body:JSON.stringify({action:'profile',headline:$('#portalHeadline').value,about:$('#portalAbout').value,specialties:$('#portalSpecialties').value.split(',').map(x=>x.trim()).filter(Boolean),photo,video})});
        if(!result?.ok)throw new Error('The profile was not saved.');
        toast('Profile updated and published.');await loadApprovedTeachers();openApprovedTeacherDashboard('profile');
      }catch(e){toast(e.message||'Could not update teacher profile.');btn.disabled=false;btn.textContent='Save changes'}
    };
  };
})();