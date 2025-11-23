// Minimal JS pour gérer l'ajout d'entraînements et le stockage local
(function(){
  const form = document.getElementById('workoutForm');
  const list = document.getElementById('workoutList');
  const summary = document.getElementById('summary');
  const exercisesContainer = document.getElementById('exercisesContainer');
  const addExerciseBtn = document.getElementById('addExerciseBtn');
  const clearExercisesBtn = document.getElementById('clearExercisesBtn');

  function loadWorkouts(){
    try{ return JSON.parse(localStorage.getItem('workouts')||'[]'); }
    catch(e){ return []; }
  }

  function saveWorkouts(arr){
    localStorage.setItem('workouts', JSON.stringify(arr));
  }

  function escapeHtml(s){
    if(s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;', '`':'&#96;'}[c];});
  }

  function render(){
    const items = loadWorkouts();
    list.innerHTML = '';
    if(items.length===0){
      summary.textContent = "Aucune séance enregistrée.";
      return;
    }
    summary.textContent = `${items.length} séance(s) enregistrée(s)`;
    items.slice().reverse().forEach((w, i)=>{
      const li = document.createElement('li');
      li.className = 'list-group-item';
      // build exercises html
      let exercisesHtml = '';
      (w.exercises||[]).forEach((ex, exIdx)=>{
        exercisesHtml += `<div class="mb-2"><div class="fw-bold">${escapeHtml(ex.name)}</div><ul class="mb-0 small">`;
        (ex.sets||[]).forEach((s, sIdx)=>{
          exercisesHtml += `<li>Set ${sIdx+1}: ${escapeHtml(s.reps)} ${s.weight?('@ '+escapeHtml(s.weight)+' kg') : ''}</li>`;
        });
        exercisesHtml += `</ul></div>`;
      });

      li.innerHTML = `<div>
          <div class="fw-bold">${escapeHtml(w.date)}</div>
          <div class="small text-muted mb-2">${w.notes? escapeHtml(w.notes) : ''}</div>
          ${exercisesHtml}
        </div>
        <div class="mt-2"><button class="btn btn-sm btn-outline-light" data-index="${i}">Suppr</button></div>`;

      const btn = li.querySelector('button');
      btn.addEventListener('click', ()=>{ removeAt(items.length-1 - i); });
      list.appendChild(li);
    });
  }

  function removeAt(idx){
    const items = loadWorkouts();
    if(idx<0||idx>=items.length) return;
    if(!confirm('Supprimer cette séance ?')) return;
    items.splice(idx,1);
    saveWorkouts(items);
    render();
  }

  // --- Dynamic form builders ---
  function createSetRow(setData){
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-center mb-2 set-row';
    row.innerHTML = `
      <input type="text" class="form-control form-control-sm set-reps" placeholder="Rép (ex: 8)" value="${escapeHtml((setData&&setData.reps)||'')}" />
      <input type="number" class="form-control form-control-sm set-weight" placeholder="Poids (kg)" value="${escapeHtml((setData&&setData.weight)||'')}" />
      <button type="button" class="btn btn-sm btn-outline-light btn-remove-set">✖</button>
    `;
    const removeBtn = row.querySelector('.btn-remove-set');
    removeBtn.addEventListener('click', ()=>{ row.remove(); });
    return row;
  }

  function createExerciseCard(exData){
    const card = document.createElement('div');
    card.className = 'card mb-3 exercise-card';
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    cardBody.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <label class="form-label mb-0">Exercice</label>
        <button type="button" class="btn btn-sm btn-outline-light btn-remove-exercise">Suppr exercice</button>
      </div>
    `;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control mb-2 exercise-name';
    nameInput.placeholder = 'Nom de l\'exercice (ex: Développé couché)';
    nameInput.value = exData && exData.name ? exData.name : '';

    const setsContainer = document.createElement('div');
    setsContainer.className = 'sets-container mb-2';

    const addSetBtn = document.createElement('button');
    addSetBtn.type = 'button';
    addSetBtn.className = 'btn btn-sm btn-outline-light mb-2';
    addSetBtn.textContent = 'Ajouter une série';
    addSetBtn.addEventListener('click', ()=>{ setsContainer.appendChild(createSetRow()); });

    cardBody.appendChild(nameInput);
    cardBody.appendChild(setsContainer);
    cardBody.appendChild(addSetBtn);
    card.appendChild(cardBody);

    // remove exercise handler
    card.querySelector('.btn-remove-exercise').addEventListener('click', ()=>{ if(confirm('Supprimer cet exercice ?')) card.remove(); });

    // initialize sets
    const initialSets = (exData && exData.sets && exData.sets.length) ? exData.sets : [{}];
    initialSets.forEach(s=> setsContainer.appendChild(createSetRow(s)));

    return card;
  }

  function addExercise(exData){
    exercisesContainer.appendChild(createExerciseCard(exData));
  }

  addExerciseBtn.addEventListener('click', ()=> addExercise());
  clearExercisesBtn.addEventListener('click', ()=>{ if(confirm('Réinitialiser tous les exercices ?')){ exercisesContainer.innerHTML=''; addExercise(); } });

  // form submit: collect structured data
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value.trim();
    if(!date){ alert('Remplis la date.'); return; }

    const exerciseCards = Array.from(document.querySelectorAll('.exercise-card'));
    const exercises = [];
    exerciseCards.forEach(card=>{
      const name = card.querySelector('.exercise-name').value.trim();
      if(!name) return; // skip empty
      const sets = [];
      const setRows = Array.from(card.querySelectorAll('.set-row'));
      setRows.forEach(r=>{
        const reps = r.querySelector('.set-reps').value.trim();
        const weight = r.querySelector('.set-weight').value.trim();
        if(!reps && !weight) return; // skip empty rows
        sets.push({ reps, weight });
      });
      if(sets.length>0) exercises.push({ name, sets });
    });

    if(exercises.length===0){ alert('Ajoute au moins un exercice avec au moins une série.'); return; }

    const items = loadWorkouts();
    items.push({ date, notes, exercises });
    saveWorkouts(items);

    // reset form: clear date/notes and rebuild exercises container with one empty exercise
    form.reset();
    exercisesContainer.innerHTML = '';
    addExercise();
    render();
  });

  // initial state
  addExercise();
  render();

})();
