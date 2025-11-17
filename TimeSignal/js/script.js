// elementos principais
const listaTarefasEl = document.getElementById('listaTarefas');
const barraProgresso = document.getElementById('barraProgresso');
const audioInicio = document.getElementById('audioInicio');
const audioFim = document.getElementById('audioFim');

let permissoesLiberadas = false;

// UTIL — mostrar mensagens temporárias
function toast(text){
  const el = document.createElement('div');
  el.className = 'alert-msg';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=> el.classList.add('show'), 10);
  setTimeout(()=> { el.classList.remove('show'); setTimeout(()=> el.remove(),300); }, 2000);
}

// CARD explicativo toggle
function toggleCardInfo(){
  const box = document.getElementById('cardInfo');
  if (!box) return;
  box.style.maxHeight = (box.style.maxHeight === '0px' || !box.style.maxHeight) ? '800px' : '0';
}

// PERMISSÃO áudio
function pedirPermissaoAudio(){
  audioInicio.play().then(()=>{
    audioInicio.pause(); audioInicio.currentTime = 0;
    permissoesLiberadas = true;
    document.getElementById('permissaoAudio').style.display = 'none';
    toast('Permissão de áudio concedida');
  }).catch(()=> {
    alert('Navegador bloqueou reprodução automática. Clique novamente para liberar.');
  });
}

/* ============================
   TAREFAS (mantive funcionalidades)
   ============================ */
function adicionarTarefa(){
  const titulo = document.getElementById('tituloInput').value.trim();
  const inicio = document.getElementById('horarioInicio').value;
  const fim = document.getElementById('horarioFim').value;
  const urgencia = document.getElementById('urgenciaInput').value;

  if(!titulo || !inicio || !fim){ toast('Preencha todos os campos'); return; }

  const t = { id: Date.now(), titulo, inicio, fim, urgencia };
  const lista = JSON.parse(localStorage.getItem('tarefasTS') || '[]');
  lista.push(t);
  localStorage.setItem('tarefasTS', JSON.stringify(lista));

  criarItemTarefa(t);
  configurarAlarmes(t);
  atualizarProgresso();

  document.getElementById('tituloInput').value = '';
}

function criarItemTarefa(t){
  const li = document.createElement('li');
  li.className = `list-group-item urg-${t.urgencia}`;
  li.dataset.id = t.id;
  li.innerHTML = `
    <div><strong>${t.titulo}</strong><br><small>${t.inicio} → ${t.fim}</small></div>
    <div>
      <button class="btn-concluir">✔</button>
      <button class="btn-excluir">🗑</button>
    </div>`;
  li.querySelector('.btn-excluir').addEventListener('click', ()=>{
    li.remove();
    excluirTarefa(t.id);
    toast('Tarefa excluída');
    atualizarProgresso();
  });
  li.querySelector('.btn-concluir').addEventListener('click', ()=>{
    li.remove();
    excluirTarefa(t.id);
    salvarProdutividade(t);
    atualizarProdutividade();
    toast('Tarefa concluída');
    atualizarProgresso();
  });
  listaTarefasEl.appendChild(li);
}

function carregarTarefas(){
  const lista = JSON.parse(localStorage.getItem('tarefasTS') || '[]');
  listaTarefasEl.innerHTML = '';
  lista.forEach(t=> criarItemTarefa(t));
}

function excluirTarefa(id){
  let lista = JSON.parse(localStorage.getItem('tarefasTS') || '[]');
  lista = lista.filter(x=> x.id !== id);
  localStorage.setItem('tarefasTS', JSON.stringify(lista));
}

function limparTodas(){
  if(!confirm('Tem certeza que quer apagar todas as tarefas?')) return;
  localStorage.removeItem('tarefasTS');
  listaTarefasEl.innerHTML = '';
  atualizarProgresso();
  toast('Todas as tarefas apagadas');
}

function configurarAlarmes(tarefa){
  function agendar(horario, audio){
    const [h,m] = horario.split(':').map(Number);
    const agora = new Date();
    const when = new Date();
    when.setHours(h, m, 0, 0);
    const delta = when - agora;
    if(delta > 0){
      setTimeout(()=> { if(permissoesLiberadas) audio.play(); }, delta);
    }
  }
  agendar(tarefa.inicio, audioInicio);
  agendar(tarefa.fim, audioFim);
}

/* produtividade (tarefas) */
function salvarProdutividade(t){
  const lista = JSON.parse(localStorage.getItem('produtividadeTS') || '[]');
  lista.push({...t, data: new Date().toLocaleDateString()});
  localStorage.setItem('produtividadeTS', JSON.stringify(lista));
}
function atualizarProdutividade(){
  const lista = JSON.parse(localStorage.getItem('produtividadeTS') || '[]');
  const rel = document.getElementById('relatorioProdutividade');
  const listaConcl = document.getElementById('listaConcluidas');
  rel.innerHTML = lista.length === 0 ? 'Nenhuma tarefa concluída ainda.' : `${lista.length} tarefas concluídas`;
  listaConcl.innerHTML = lista.map(x=> `<div class="card p-2 mb-2"><strong>${x.titulo}</strong> — ${x.data}</div>`).join('');
}

/* progresso */
function atualizarProgresso(){
  const tarefas = JSON.parse(localStorage.getItem('tarefasTS') || '[]').length;
  const concl = JSON.parse(localStorage.getItem('produtividadeTS') || '[]').length;
  const total = tarefas + concl;
  const pct = total === 0 ? 0 : Math.round((concl / total) * 100);
  barraProgresso.style.width = pct + '%';
  barraProgresso.textContent = pct + '%';
}

/* carregar inicial */
document.addEventListener('DOMContentLoaded', ()=>{
  carregarTarefas();
  carregarObservacoes();
  atualizarProdutividade();
  atualizarProgresso();
});

/* export básico */
function exportarDados(){
  const data = {
    tarefas: JSON.parse(localStorage.getItem('tarefasTS')||'[]'),
    produtividade: JSON.parse(localStorage.getItem('produtividadeTS')||'[]'),
    observacoes: JSON.parse(localStorage.getItem('observacoesTS')||'[]'),
    obsConcluidas: JSON.parse(localStorage.getItem('observacoesConcluidasTS')||'[]')
  };
  const blob = new Blob([JSON.stringify(data, null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `timesignal_export_${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

/* ============================
   OBSERVAÇÕES (lista + histórico)
   ============================ */
const listaObsEl = document.getElementById('listaObservacoes');
const histObsEl = document.getElementById('historicoObservacoes');

function adicionarObservacao(){
  const texto = document.getElementById('obsInput').value.trim();
  const urg = document.getElementById('obsUrgencia').value;
  if(!texto){ toast('Escreva uma anotação'); return; }
  const o = { id: Date.now(), texto, urg };
  const lista = JSON.parse(localStorage.getItem('observacoesTS') || '[]');
  lista.push(o);
  localStorage.setItem('observacoesTS', JSON.stringify(lista));
  document.getElementById('obsInput').value = '';
  criarItemObs(o);
  toast('Anotação adicionada');
}

function criarItemObs(o){
  const li = document.createElement('li');
  li.className = 'obs-item list-group-item';
  li.dataset.id = o.id;
  const dotClass = o.urg === 'normal' ? 'obs-normal' : (o.urg === 'importante' ? 'obs-importante' : 'obs-urgente');
  li.innerHTML = `
    <div class="obs-dot ${dotClass}"></div>
    <div class="obs-content"><div>${escapeHtml(o.texto)}</div></div>
    <div>
      <button class="btn-concluir">✔</button>
      <button class="btn-excluir">🗑</button>
    </div>
  `;
  li.querySelector('.btn-excluir').addEventListener('click', ()=>{
    li.remove();
    excluirObservacao(o.id);
    toast('Anotação excluída');
  });
  li.querySelector('.btn-concluir').addEventListener('click', ()=>{
    li.remove();
    moverObsParaHistorico(o);
    toast('Anotação concluída');
  });
  listaObsEl.appendChild(li);
}

function carregarObservacoes(){
  listaObsEl.innerHTML = '';
  histObsEl.innerHTML = '';
  const lista = JSON.parse(localStorage.getItem('observacoesTS') || '[]');
  lista.forEach(o=> criarItemObs(o));
  const concl = JSON.parse(localStorage.getItem('observacoesConcluidasTS') || '[]');
  concl.forEach(o=>{
    const card = document.createElement('div'); card.className='card p-2 mb-2';
    card.innerHTML = `<strong>${escapeHtml(o.texto)}</strong> <small class="text-muted">— ${o.data}</small>`;
    histObsEl.appendChild(card);
  });
}

function excluirObservacao(id){
  let lista = JSON.parse(localStorage.getItem('observacoesTS') || '[]');
  lista = lista.filter(x=> x.id !== id);
  localStorage.setItem('observacoesTS', JSON.stringify(lista));
}

function moverObsParaHistorico(o){
  const listaConcl = JSON.parse(localStorage.getItem('observacoesConcluidasTS') || '[]');
  listaConcl.push({...o, data: new Date().toLocaleDateString()});
  localStorage.setItem('observacoesConcluidasTS', JSON.stringify(listaConcl));
  // remover da lista ativa
  excluirObservacao(o.id);
  // atualizar visual do histórico
  carregarObservacoes();
}

function limparObservacoes(){
  if(!confirm('Deseja realmente apagar todas as observações?')) return;
  localStorage.removeItem('observacoesTS');
  localStorage.removeItem('observacoesConcluidasTS');
  listaObsEl.innerHTML = '';
  histObsEl.innerHTML = '';
  toast('Observações apagadas');
}

function exportarObservacoes(){
  const data = {
    observacoes: JSON.parse(localStorage.getItem('observacoesTS')||'[]'),
    concluidas: JSON.parse(localStorage.getItem('observacoesConcluidasTS')||'[]')
  };
  const blob = new Blob([JSON.stringify(data, null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `observacoes_${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

/* util: escapar texto para evitar HTML injection simples */
function escapeHtml(str){
  return str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
