
function formatBR(num, decimals=0){
  try{
    return Number(num||0).toLocaleString('pt-BR',{minimumFractionDigits:decimals, maximumFractionDigits:decimals});
  }catch(e){ return num; }
}

function __isLowStock(p){
  try{
    const limEl = document.getElementById('limiteBaixa');
    const lim = limEl ? Number(limEl.value||limEl.getAttribute('value')||0) : (typeof limiteBaixa!=='undefined'? Number(limiteBaixa):0);
    if (typeof p.estoqueBaixo === 'boolean') return p.estoqueBaixo;
    const q = Number(p.quantidade||p.qtd||p.qtdAtual||0);
    return q <= lim;
  } catch(e){ 
    return false; 
  }
}

// === Filtro centralizado de produtos (busca exata + estoque baixo) ===
const filtraProdutos = (lista, ctx={modo:'cards'}) => {
try {
    const buscar = $('#buscar') ? $('#buscar').value.trim().toLowerCase() : '';
    const ord = $('#ordenarPor') ? $('#ordenarPor').value : '';
    const filtrarEstoqueBaixo = (ord === 'estoqueBaixo') || (!!($('#filtroEstoqueBaixo') && $('#filtroEstoqueBaixo').checked));
    let out = Array.isArray(lista) ? [...lista] : [];

    if (ctx.modo==='cards' && filtrarEstoqueBaixo) {
      out = out.filter(p => __isLowStock(p));
      // ordenar por menor quantidade
      out.sort((a,b)=> (Number(a.quantidade)||0) - (Number(b.quantidade)||0));
    }

    if (buscar) {
      out = out.filter(p => String((p.nome || '').trim()).toLowerCase() === buscar);
    }

    // Ordenação de cards por critério selecionado
    if (ord === 'ultimaCompra') {
      out.sort((a,b)=> {
        const da = new Date(a.ultimaEntrada || a.dataEntrada || 0).getTime();
        const db = new Date(b.ultimaEntrada || b.dataEntrada || 0).getTime();
        return db - da; // mais recente primeiro
      });
    } else if (ord === 'ultimaVenda') {
      out.sort((a,b)=> {
        const da = new Date(a.ultimaSaida || 0).getTime();
        const db = new Date(b.ultimaSaida || 0).getTime();
        return db - da; // mais recente primeiro
      });
    } else if (ord === 'nome') {
      out.sort((a,b)=> String(a.nome||'').localeCompare(String(b.nome||'')));
    } else if (ord === 'preco') {
      out.sort((a,b)=> Number(a.preco||0) - Number(b.preco||0));
    } else if (ord === 'quantidade') {
      out.sort((a,b)=> Number(a.quantidade||0) - Number(b.quantidade||0));
    }

    return out;
  } catch (e) {
    return Array.isArray(lista) ? lista : [];
  }
};
// === fim filtro centralizado ===
const API = (window.API_BASE || 'http://localhost:8080') + '/api';




// ===== Flash visual no card do produto =====
const flashCard = (id) => {
  try {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (!card) return;
    card.classList.remove('flash');
    // força reflow para permitir repetir a animação
    void card.offsetWidth;
    card.classList.add('flash');
  } catch {}
};
// ===========================================
// ===== Estado Atual dos Produtos (linha única + filtros) =====
const upsertEstadoLinha = (prod) => {
  try {
    const tbody = $('#tEstado');
    if (!tbody || !prod) return;
    let tr = tbody.querySelector(`tr[data-id="${prod.id}"]`);
    const isNew = !tr;
    if (!tr) {
      tr = document.createElement('tr');
      tr.dataset.id = prod.id;
      tbody.appendChild(tr);
    // Efeito flash no TR do histórico
    tr.classList.remove('flash');
    void tr.offsetWidth;
    tr.classList.add('flash');
    }
    const produtoHTML = (() => {
      const base = `${prod.nome}`;
      return isNew ? base : base + ' <span class="badge-new">atualizado agora</span>';
    })();
    const valorTotal = (typeof prod.quantidade === 'number' && typeof prod.preco === 'number')
      ? moeda(prod.quantidade * prod.preco) : '—';

    tr.innerHTML = `
      <td>${produtoHTML}</td>
      <td>${prod.quantidade}</td>
      <td>${moeda(prod.preco)}</td>
      <td>${valorTotal}</td>
      <td>${prod.ultimaEntrada ? dtBR(prod.ultimaEntrada) : (prod.dataEntrada ? dtBR(prod.dataEntrada) : '—')}</td>
      <td>${prod.ultimaSaida ? dtBR(prod.ultimaSaida) : '—'}</td>
    `;

    // Efeito flash no TR
    tr.classList.remove('flash');
    void tr.offsetWidth;
    tr.classList.add('flash');

    // Remoção da badge após alguns segundos
    const badge = tr.querySelector('.badge-new');
    if (badge) {
      setTimeout(() => badge.classList.add('fade'), 1800);
      setTimeout(() => badge.remove(), 2400);
    }
  } catch {}
};

const applyEstadoFilters = (lista) => {
  try{
    let out = Array.isArray(lista) ? [...lista] : [];
    const buscar = $('#buscar') ? $('#buscar').value.trim().toLowerCase() : '';
    let ordenarPor = $('#ordenarPor') ? $('#ordenarPor').value : '';
    
    if (buscar) {
      out = out.filter(p => String((p.nome||'').trim()).toLowerCase() === buscar);
    }
    // ordenarPor likely accepts 'nome', 'preco', 'quantidade' (depends on your UI)
    if (ordenarPor === 'nome') {
      out.sort((a,b)=> String(a.nome||'').localeCompare(String(b.nome||'')));
    } else if (ordenarPor === 'preco') {
      out.sort((a,b)=> Number(a.preco||0) - Number(b.preco||0));
    } else if (ordenarPor === 'quantidade') {
      out.sort((a,b)=> Number(a.quantidade||0) - Number(b.quantidade||0));
    }

    // Ordenação de cards por critério selecionado
    if (ordenarPor === 'ultimasCompras') {
      out.sort((a,b)=> {
        const da = new Date(a.ultimaEntrada || a.dataEntrada || 0).getTime();
        const db = new Date(b.ultimaEntrada || b.dataEntrada || 0).getTime();
        return db - da; // mais recente primeiro
      });
    } else if (ordenarPor === 'ultimasVendas') {
      out.sort((a,b)=> {
        const da = new Date(a.ultimaSaida || 0).getTime();
        const db = new Date(b.ultimaSaida || 0).getTime();
        return db - da; // mais recente primeiro
      });
    } else if (ordenarPor === 'nome') {
      out.sort((a,b)=> String(a.nome||'').localeCompare(String(b.nome||'')));
    } else if (ordenarPor === 'preco') {
      out.sort((a,b)=> Number(a.preco||0) - Number(b.preco||0));
    } else if (ordenarPor === 'quantidade') {
      out.sort((a,b)=> Number(a.quantidade||0) - Number(b.quantidade||0));
    }

    return out;
  }catch{return lista||[]}
};


const getProdFieldForSort = (p, key) => {
  switch (key) {
    case 'atualizado': {
      const cand = p.atualizado || p.dataHora || p.ultimaEntrada || p.ultimaSaida || p.dataEntrada || p.dataAtualizacao;
      return cand ? new Date(cand).getTime() : 0;
    }
    case 'produto': return String(p.nome||'').toLowerCase();
    case 'quantidade': return Number(p.quantidade)||0;
    case 'preco': return Number(p.preco)||0;
    case 'valorTotal': return (Number(p.preco)||0) * (Number(p.quantidade)||0);
    case 'ultimaCompra': return p.ultimaEntrada ? new Date(p.ultimaEntrada).getTime() : 0;
    case 'ultimaVenda': return p.ultimaSaida ? new Date(p.ultimaSaida).getTime() : 0;
    default: return 0;
  }
};

const sortEstadoLista = (lista) => {
  if (!estadoSortKey) return lista;
  const dir = estadoSortDir === 'desc' ? -1 : 1;
  const arr = [...(lista||[])];
  arr.sort((a,b)=>{
    const va = getProdFieldForSort(a, estadoSortKey);
    const vb = getProdFieldForSort(b, estadoSortKey);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  // Atualiza caret visual
  try {
    document.querySelectorAll('section.estado-atual thead th.sortable').forEach(th=>{
      th.classList.remove('active');
      const c = th.querySelector('.caret'); if (c) c.textContent='';
    });
    const th = document.querySelector(`section.estado-atual thead th.sortable[data-key="${estadoSortKey}"]`);
    if (th) {
      th.classList.add('active');
      const c = th.querySelector('.caret'); if (c) c.textContent = (estadoSortDir==='desc'?'\u2193':'\u2191');
    }
  } catch {}
  return arr;
};

const renderEstadoAtual = (lista) => {
  
  try { if (estadoSortKey === 'atualizado') estadoSortKey = ''; } catch(e) {}
lista = sortEstadoLista(lista||[]);

  try {
    const tbody = $('#tEstado');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filtrada = applyEstadoFilters(lista||[]);
    filtrada.forEach(p => upsertEstadoLinha(p));
  } catch {}
};
// ======================================================================
// ===== Helpers de sincronização Produtos x Movimentações =====
const getProdutoById = (id) => {
  try { return (produtos || []).find(p => String(p.id) === String(id)); } catch { return null; }
};

const addMovLocal = ({tipo, nomeProduto, quantidade, valorUnitario}) => {
  try {
    const tbody = $('#tMovs');
    if (!tbody) return;
    const tr = document.createElement('tr');
    const agora = new Date();
    tr.innerHTML = `
      <td>${dtBR(agora)}</td>
      <td>${tipo}</td>
      <td>${nomeProduto} <span class="badge-new">novo</span></td>
      <td>${quantidade ?? '—'}</td>
      <td>${valorUnitario != null ? moeda(valorUnitario) : '—'}</td>
      <td>${(quantidade != null && valorUnitario != null) ? moeda(quantidade * valorUnitario) : '—'}</td>
    `;
    tbody.prepend(tr);
  } catch {}
};

const nomesRemovidosKey = 'movs_nomes_removidos';
const getNomesRemovidos = () => {
  try { return JSON.parse(localStorage.getItem(nomesRemovidosKey)) || []; } catch { return []; }
};
const setNomesRemovidos = (arr) => { try { localStorage.setItem(nomesRemovidosKey, JSON.stringify(arr)); } catch {} };
const addNomeRemovido = (nome) => { const list = getNomesRemovidos(); if (!list.includes(nome)) { list.push(nome); setNomesRemovidos(list); } };
const rmNomeRemovido = (nome) => { const list = getNomesRemovidos().filter(n => n !== nome); setNomesRemovidos(list); };
// =============================================================
// ===== Helper para exibir ID curto no formato "xxxxx-xxxxx" =====
const shortId = (raw) => {
  if (!raw) return '';
  const s = String(raw).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const base = (s.length >= 10 ? s : (s + Math.random().toString(36).slice(2) + s)).slice(0, 10);
  return base.slice(0,5) + '-' + base.slice(5,10);
};
// ===============================================================

// Formata data/hora no padrão Brasil dd/mm/aaaa hh:mm:ss
const dtBR = (valor) => {
  if (!valor) return '—';
  const d = new Date(valor);
  if (isNaN(d)) {
    // caso venha uma string já exibível, apenas normaliza o 'T'
    try { return String(valor).replace('T',' '); } catch { return String(valor); }
  }
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Utils
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const moeda = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(v ?? 0));
const showToast = (msg, ok=true) => {
  const t = $('#toast');
  t.textContent = msg;
  t.style.borderColor = ok ? 'rgba(68,211,164,.6)' : 'rgba(255,99,123,.6)';
  t.hidden = false;
  setTimeout(() => t.hidden = true, 2600);
};

const getJSON = async (url, opts={}) => {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) } });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.status === 204 ? null : res.json();
};

// Estado
let produtos = [];
let estadoSortKey = '';
let estadoSortDir = 'asc'; // 'asc' | 'desc'

let limiteBaixa = 0;

// Carregar dados iniciais
const carregarTudo = async () => {
  await Promise.all([carregarLimite(), listarProdutos(), carregarMovs()]);
};

const carregarLimite = async () => {
  const d = await getJSON(`${API}/config/limite-baixa`);
  limiteBaixa = d.limiteBaixa ?? 0;
  $('#limiteBaixa').value = limiteBaixa;
};

const salvarLimite = async () => {
  const v = Number($('#limiteBaixa').value || 0);
  const d = await getJSON(`${API}/config/limite-baixa/${v}`, { method:'PUT' });
  limiteBaixa = d.limiteBaixa ?? v;
  showToast('Limite de estoque baixo atualizado!');
  await listarProdutos();
};

// Produtos
const listarProdutos = async () => {
  const q = new URLSearchParams();
  const buscar = $('#buscar').value.trim();
  let ordenarPor = $('#ordenarPor').value;
    
  if (ordenarPor) q.set('ordenarPor', ordenarPor);

  produtos = await getJSON(`${API}/produtos${q.toString() ? '?'+q.toString() : ''}`);
  
  if(buscar){ produtos = produtos.filter(p=> String((p.nome||'').trim()).toLowerCase() === buscar.toLowerCase()); }
renderProdutos(produtos);
  renderEstadoAtual(produtos);
  renderEstadoAtual(produtos);
};


const criarCardProduto = (p) => {
  const el = document.createElement('div');
  el.className = 'card';
  if(__isLowStock(p)) { el.classList.add('low-stock'); }
  el.dataset.id = p.id;
  // Detecta estoque baixo: usa flag do backend OU compara com 'limiteBaixa'
  const isLow = (typeof p.estoqueBaixo === 'boolean' ? p.estoqueBaixo : (Number(p.quantidade)||0) <= (Number(limiteBaixa)||0));
  if (isLow) { el.classList.add('low-stock'); }
  el.innerHTML = `
    ${isLow ? '<div class="low-flag" title="Estoque baixo">⚠️</div>' : ''}
    <div class="card-header">
      <div>
        <div class="title">${p.nome}</div>
        <div class="meta">ID: <code>${shortId(p.id)}</code></div>
      </div>
      <div class="badges">
        <span class="badge">${moeda(p.preco)}</span>
        <span class="badge">Qtd: ${p.quantidade}</span>
        ${isLow ? '<span class="badge low">Estoque baixo</span>' : ''}
      </div>
    </div>
    <div class="meta">Última compra: ${p.ultimaEntrada ? dtBR(p.ultimaEntrada) : dtBR(p.dataEntrada)}</div>
    <div class="meta">Última venda: ${p.ultimaSaida ? dtBR(p.ultimaSaida) : '—'}</div>

    <div class="actions">
      <button class="btn acao-vender" data-acao="vender" data-id="${p.id}">Vender</button>
      <button class="btn acao-preco" data-acao="preco" data-id="${p.id}">Alterar preço</button>
      <button class="btn acao-renomear" data-acao="renomear" data-id="${p.id}">Renomear</button>
      <button class="btn acao-quantidade" data-acao="quantidade" data-id="${p.id}">Comprar</button>
      <button class="btn acao-remover" data-acao="remover" data-id="${p.id}">Remover</button>
    </div>
  `;
  return el;
};

const renderProdutos = (lista) => {
  const wrap = $('#listaProdutos');
  wrap.innerHTML = '';
  if (!lista || !lista.length) {
    $('#vazio').hidden = false;
    return;
  }
  $('#vazio').hidden = true;
  // 'lista' já chega filtrada por igualdade quando houver busca
  filtraProdutos(lista, {modo:'cards'}).forEach(p => wrap.appendChild(criarCardProduto(p)));
};

// Movimentações
const carregarMovs = async () => {
  const dados = await getJSON(`${API}/movimentacoes`);
  const tbody = $('#tMovs');
  tbody.innerHTML = '';
  const buscar = $('#buscar') ? $('#buscar').value.trim().toLowerCase() : '';const filtrados = buscar ? dados.filter(m => String((m.nomeProduto||'').trim()).toLowerCase() === buscar) : dados;const _lista = filtrados;sortHistoricoLista(_lista).forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>${dtBR(m.dataHora)}</td>
      <td>${(()=>{try{const t=(m.tipo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); if(t.startsWith('entr')) return 'compra'; if(t.startsWith('sa')) return 'venda'; return m.tipo;}catch{return m.tipo;}})()}</td>
      <td>${m.nomeProduto}</td>
      <td>${formatBR(m.quantidade,0)}</td>
      <td>${moeda(m.valorUnitario)}</td>
      <td>${moeda(m.quantidade * m.valorUnitario)}</td>
    `;
    tbody.appendChild(tr);
    // Efeito flash no TR do histórico
    tr.classList.remove('flash');
    void tr.offsetWidth;
    tr.classList.add('flash');
  });
};

// Modal helpers
const abrirModalProduto = (modo='novo', produto=null) => {
  const dlg = $('#modalProduto');
  $('#tituloModalProd').textContent = modo === 'novo' ? 'Novo Produto' : 'Editar Produto';
  if (modo === 'novo') {
    $('#nomeProduto').value = '';
    $('#precoProduto').value = '';
    $('#qtdProduto').value = '';
  } else if (produto) {
    $('#nomeProduto').value = produto.nome;
    $('#precoProduto').value = produto.preco;
    $('#qtdProduto').value = produto.quantidade;
  }
  dlg.showModal();
};

const fecharModalProduto = () => $('#modalProduto').close();
const fecharModalAcoes = () => $('#modalAcoes').close();

// Ações por produto
const abrirAcoes = async (id, acao) => {
  const prod = await getJSON(`${API}/produtos/${id}`);
  const c = $('#acoesConteudo');
  const title = {
    vender: `Vender – ${prod.nome}`,
    preco: `Alterar preço – ${prod.nome}`,
    renomear: `Renomear – ${prod.nome}`,
    quantidade: `Comprar – ${prod.nome}`
  }[acao] || 'Ações';

  $('#tituloModalAcoes').textContent = title;
  // Harmonizar e colorir por ação
  const modalAcoes = $('#modalAcoes');
  modalAcoes.classList.remove('acao-vender','acao-preco','acao-renomear','acao-quantidade','acao-remover');
  const acaoClass = {
    vender: 'acao-vender',
    preco: 'acao-preco',
    renomear: 'acao-renomear',
    quantidade: 'acao-quantidade',
    remover: 'acao-remover'
  }[acao];
  if (acaoClass) modalAcoes.classList.add(acaoClass);

  // título com chip
  const titulo = title;
  $('#tituloModalAcoes').textContent = titulo;
  const chipHost = document.querySelector('#tituloModalAcoesChip');
  if (chipHost) {
    chipHost.textContent = (acao === 'vender' && 'Vender') || (acao === 'preco' && 'Alterar preço') || (acao === 'renomear' && 'Renomear') || (acao === 'quantidade' && 'Comprar') || (acao === 'remover' && 'Remover') || '';
  }

  
  // Bloco visual padronizado por ação (com descrição e ícone)
  const descricoes = {
    vender: 'Registre a saída de itens deste produto.',
    preco: 'Atualize o valor de venda em reais (R$).',
    renomear: 'Defina um novo nome para identificar o produto.',
    quantidade: 'Ajuste a quantidade total armazenada (valor absoluto).',
    remover: 'Esta ação excluirá o produto do sistema. Não pode ser desfeita.'
  };
  const icones = {
    vender: '🛒',
    preco: '💲',
    renomear: '✏️',
    quantidade: '📦',
    remover: '🗑️'
  };
  const headerHTML = `
    <div class="field" style="display:flex;gap:.75rem;align-items:flex-start;">
      <div style="font-size:1.35rem;line-height:1">${icones[acao]||''}</div>
      <div>
        <div style="font-weight:600;margin-bottom:.15rem">${descricoes[acao]||''}</div>
        <div style="opacity:.85;font-size:.9rem">Produto: <strong>${prod.nome}</strong></div>
      </div>
    </div>`;

  if (acao === 'vender') {
    c.innerHTML = headerHTML + `
      <div class="field">
        <label for="qtdVenda">Quantidade a vender</label>
        <input id="qtdVenda" type="number" min="1" step="1" required />
      </div>`;
  } else if (acao === 'preco') {
    c.innerHTML = headerHTML + `
      <div class="field">
        <label for="novoPreco">Novo preço (R$)</label>
        <input id="novoPreco" type="number" min="0" step="0.01" required />
      </div>`;
  } else if (acao === 'renomear') {
    c.innerHTML = headerHTML + `
      <div class="field">
        <label for="novoNome">Novo nome</label>
        <input id="novoNome" type="text" required />
      </div>`;
  } else if (acao === 'quantidade') {
    c.innerHTML = headerHTML + `
      <div class="field">
        <label for="novaQuantidade">Nova quantidade a ser comprada (valor absoluto)</label>
        <input id="novaQuantidade" type="number" min="0" step="1" required />
      </div>`;
  } else if (acao === 'remover') {
    c.innerHTML = headerHTML + `
      <div class="field">
        <div style="font-size:.95rem"><strong>Atenção:</strong> esta ação é permanente.</div>
      </div>`;
  }

  // Ajustar rótulo e estado do botão confirmar
  const confirmar = document.querySelector('#modalAcoes .modal-actions .btn.primary');
  if (confirmar){
    confirmar.textContent = (acao === 'vender' && 'Confirmar venda') ||
                            (acao === 'preco' && 'Salvar preço') ||
                            (acao === 'renomear' && 'Salvar nome') ||
                            (acao === 'quantidade' && 'Salvar quantidade') ||
                            (acao === 'remover' && 'Remover produto') || 'Confirmar';
    confirmar.classList.toggle('danger', acao === 'remover');
  }


  $('#formAcoes').dataset.id = id;
  $('#formAcoes').dataset.acao = acao;
  $('#modalAcoes').showModal();
};

// Eventos
$('#aplicarFiltros').addEventListener('click', async ()=>{ await listarProdutos(); await carregarMovs(); });
$('#buscar').addEventListener('keydown', async (e)=>{ if(e.key==='Enter'){ await listarProdutos(); await carregarMovs(); }});
$('#ordenarPor').addEventListener('change', async ()=>{ await listarProdutos(); await carregarMovs(); });
$('#salvarLimite').addEventListener('click', async ()=>{
  try{ await salvarLimite(); } catch(e){ showToast('Erro ao salvar limite: ' + e.message, false); }
});

$('#abrirNovoProduto').addEventListener('click', ()=> abrirModalProduto('novo'));
$('#fecharModalProduto').addEventListener('click', fecharModalProduto);
$('#fecharModalAcoes').addEventListener('click', fecharModalAcoes);

// Criação de produto
$('#formProduto').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const nomeNovo = $('#nomeProduto').value.trim();
  if (produtos && produtos.some(p => (p.nome||'').toLowerCase() === nomeNovo.toLowerCase())) {
    alert('Não é possível cadastrar: já existe um produto com este nome!');
    return;
  }
  const payload = {
    nome: nomeNovo,
    preco: Number($('#precoProduto').value),
    quantidade: Number($('#qtdProduto').value)
  };
  try{
    const p = await getJSON(`${API}/produtos`, { method:'POST', body: JSON.stringify(payload) });
    showToast('Produto cadastrado com sucesso!');
    fecharModalProduto();
    await Promise.all([listarProdutos(), carregarMovs()]);
    try{ if(typeof id!=='undefined') flashCard(id); }catch{}
    try{ flashCard(p.id); }catch{}
  }catch(err){
    showToast('Erro ao cadastrar produto: ' + err.message, false);
  }
});

// Ações do produto (delegação)
$('#listaProdutos').addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-acao]');
  if(!btn) return;
  const { acao, id } = btn.dataset;
  if (acao === 'remover') {
    if (!confirm('Confirma remover este produto?')) return;
    try{
      await getJSON(`${API}/produtos/${id}`, { method:'DELETE' });
      showToast('Produto removido.');
      await Promise.all([listarProdutos(), carregarMovs()]);
    try{ if(typeof id!=='undefined') flashCard(id); }catch{}
    try{ flashCard(p.id); }catch{}
    }catch(err){
      showToast('Erro ao remover: ' + err.message, false);
    }
    return;
  }
  abrirAcoes(id, acao);
});

// Submeter ações
$('#formAcoes').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = e.currentTarget.dataset.id;
  const acao = e.currentTarget.dataset.acao;
  try{
    if (acao === 'vender') {
      const quantidade = Number($('#qtdVenda').value);
      await getJSON(`${API}/produtos/${id}/vendas`, { method:'POST', body: JSON.stringify({ quantidade }) });
    } else if (acao === 'preco') {
      const novoPreco = Number($('#novoPreco').value);
      await getJSON(`${API}/produtos/${id}/preco`, { method:'PATCH', body: JSON.stringify({ novoPreco }) });
    } else if (acao === 'renomear') {
      const novoNome = $('#novoNome').value.trim();
      if (produtos && produtos.some(p => (p.nome||'').toLowerCase() === novoNome.toLowerCase())) { alert('Não é possível renomear: já existe um produto com este nome!'); return; }
if (produtos && produtos.some(p => (p.nome||'').toLowerCase() === novoNome.toLowerCase())) {
        alert('Não é possível renomear: já existe um produto com este nome!');
        return;
      }

      const prodBefore = getProdutoById(id);
      const oldName = prodBefore ? prodBefore.nome : null;
      await getJSON(`${API}/produtos/${id}/renomear`, { method:'PATCH', body: JSON.stringify({ novoNome }) });
      try {
        const tbody = $('#tMovs');
        if (tbody && oldName) {
          [...tbody.querySelectorAll('tr')].forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds[2] && tds[2].textContent === oldName) { tds[2].textContent = novoNome; }
          });
          rmNomeRemovido(oldName);
        }
      } catch {}
    } else if (acao === 'quantidade') {
      const novaQuantidade = Number($('#novaQuantidade').value);
      await getJSON(`${API}/produtos/${id}/quantidade`, { method:'PATCH', body: JSON.stringify({ novaQuantidade }) });
    }
    showToast('Ação realizada com sucesso!');
    fecharModalAcoes();
    await Promise.all([listarProdutos(), carregarMovs()]);
    try{ if(typeof id!=='undefined') flashCard(id); }catch{}
    try{ flashCard(p.id); }catch{}
  }catch(err){
    showToast('Erro: ' + err.message, false);
  }
});

// Inicialização
carregarTudo().catch(err => showToast('Falha ao carregar dados: ' + err.message, false));

// ===== Persistência de limpar histórico =====
const MOVS_CLEARED_KEY = 'movs_cleared_at';
const setMovsClearedNow = () => { try{ localStorage.setItem(MOVS_CLEARED_KEY, String(Date.now())); }catch{} };
const getMovsClearedAt = () => { try{ const v = localStorage.getItem(MOVS_CLEARED_KEY); return v? Number(v) : 0; }catch{ return 0; } };

document.addEventListener('click', (e)=>{
  const el = e.target.closest('#limparHistorico');
  if (el) { setMovsClearedNow(); }
});
// =================================================

// ===== Ordenação clicável para Estado Atual =====
document.addEventListener('click', (e)=>{
  const th = e.target.closest('th.sortable');
  if (!th) return;
  const table = th.closest('table');
  const tbody = table.querySelector('tbody#tEstado');
  if (!tbody) return;
  const key = th.dataset.key;
  const currentDir = th.dataset.dir === 'asc' ? 'asc' : th.dataset.dir === 'desc' ? 'desc' : null;
  const newDir = currentDir === 'asc' ? 'desc' : 'asc';
  // reset others
  table.querySelectorAll('th.sortable').forEach(h=>{h.dataset.dir=''; h.querySelector('.caret').textContent='';});
  th.dataset.dir = newDir;
  th.querySelector('.caret').textContent = newDir === 'asc' ? '▲' : '▼';
  // build list
  let rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a,b)=>{
    let va = a.cells[Array.from(th.parentNode.children).indexOf(th)].textContent.trim();
    let vb = b.cells[Array.from(th.parentNode.children).indexOf(th)].textContent.trim();
    if(key==='quantidade' || key==='preco' || key==='valorTotal'){
      va = parseFloat(va.replace(/[^0-9,-]+/g,''))||0;
      vb = parseFloat(vb.replace(/[^0-9,-]+/g,''))||0;
    }
    return newDir==='asc' ? (va>vb?1:va<vb?-1:0) : (va<vb?1:va>vb?-1:0);
  });
  tbody.innerHTML='';
  rows.forEach(r=>tbody.appendChild(r));
});


// Clique de ordenação - Estado Atual
document.addEventListener('click', (e)=>{
  const th = e.target.closest('section.estado-atual thead th.sortable');
  if (!th) return;
  const key = th.dataset.key;
  if (!key) return;
  if (estadoSortKey === key) {
    estadoSortDir = (estadoSortDir === 'asc') ? 'desc' : 'asc';
  } else {
    estadoSortKey = key;
    estadoSortDir = 'asc';
  }
  // Re-render com a ordenação
  try { renderEstadoAtual((Array.isArray(produtos)?produtos:[])); } catch {}
});


const getMovFieldForSort = (m, key) => {
  switch (key) {
    case 'data': return m.dataHora ? new Date(m.dataHora).getTime() : 0;
    case 'tipo': return String(m.tipo||'').toLowerCase();
    case 'produto': return String(m.nomeProduto||'').toLowerCase();
    case 'qtd': return Number(m.quantidade)||0;
    case 'valorUnit': return Number(m.valorUnitario)||0;
    case 'valorTotal': return (Number(m.valorUnitario)||0) * (Number(m.quantidade)||0);
    case 'ultimaVenda': return m.dataHora ? new Date(m.dataHora).getTime() : 0; // simplificado
    default: return 0;
  }
};

let historicoSortKey = '';
let historicoSortDir = 'asc';

const sortHistoricoLista = (lista) => {
  if (!historicoSortKey) return lista;
  const dir = historicoSortDir === 'desc' ? -1 : 1;
  const arr = [...(lista||[])];
  arr.sort((a,b)=>{
    const va = getMovFieldForSort(a, historicoSortKey);
    const vb = getMovFieldForSort(b, historicoSortKey);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  try {
    document.querySelectorAll('section.historico thead th.sortable').forEach(th=>{
    th.classList.remove('asc','desc','active');
    const c = th.querySelector('.caret'); if (c) c.textContent='';
  });
  const th = document.querySelector(`section.historico thead th.sortable[data-key="${historicoSortKey}"]`);
  if (th) {
    th.classList.add('active'); th.classList.add(historicoSortDir);
    const c = th.querySelector('.caret'); if (c) c.textContent = (historicoSortDir==='desc'?'▼':'▲');
  }
} catch {}
  return arr;
};

// Clique de ordenação - Histórico
document.addEventListener('click', (e)=>{
  const th = e.target.closest('section.historico thead th.sortable');
  if (!th) return;
  const key = th.dataset.key;
  if (!key) return;
  if (historicoSortKey === key) {
    historicoSortDir = (historicoSortDir === 'asc') ? 'desc' : 'asc';
  } else {
    historicoSortKey = key;
    historicoSortDir = 'asc';
  }
  try { carregarMovs(); } catch {}
});


// /*INIT_SET_ORDENAR_POR_PRECO*/
document.addEventListener('DOMContentLoaded', () => {
  try {
    const sel = document.getElementById('ordenarPor');
    if (sel) {
      // Try to select the option whose text includes "preço" or value 'preco'
      let idx = -1;
      for (let i = 0; i < sel.options.length; i++) {
        const t = sel.options[i].textContent.toLowerCase();
        const v = (sel.options[i].value || '').toLowerCase();
        if (t.includes('preço') || t.includes('preco') || v === 'preço' || v === 'preco' || v === 'preco_asc' || v === 'preco_desc') {
          idx = i; break;
        }
      }
      if (idx >= 0) {
        sel.selectedIndex = idx;
        sel.dispatchEvent(new Event('change'));
      }
    }
  } catch(e) { console.warn('ordenarPor default preço falhou', e); }
});

/*AUTO_SIZE_ORDENARPOR*/
(function(){
  function autoSizeSelect(sel){
    try{
      const temp = document.createElement('span');
      const cs = window.getComputedStyle(sel);
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.whiteSpace = 'pre';
      temp.style.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
      temp.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value;
      document.body.appendChild(temp);
      const pad = 42; // espaço para ▲ ▼
      const w = Math.ceil(temp.getBoundingClientRect().width) + pad + 16; // margem extra
      document.body.removeChild(temp);
      sel.style.width = w + 'px';
    }catch(e){ console.warn('autoSizeSelect falhou', e); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('ordenarPor');
    if(sel){
      autoSizeSelect(sel);
      sel.addEventListener('change', () => autoSizeSelect(sel));
      // Direcionais ▲ ▼
      const up = document.querySelector('.dir-arrows .dir-up');
      const down = document.querySelector('.dir-arrows .dir-down');
      const setActive = (btn, on) => btn && btn.classList[on?'add':'remove']('active');
      if(up && down){
        up.addEventListener('click', () => {
          sel.setAttribute('data-dir','asc');
          setActive(up, true); setActive(down, false);
        });
        down.addEventListener('click', () => {
          sel.setAttribute('data-dir','desc');
          setActive(down, true); setActive(up, false);
        });
      }
    }
  });
})();
/*AUTO_SIZE_ORDENARPOR_V2*/
(function(){
  function px(n){ try { return parseFloat(n.replace('px',''))||0; } catch(e){ return 0; } }
  function autoSizeSelectV2(sel){
    try{
      const temp = document.createElement('span');
      const cs = window.getComputedStyle(sel);
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.whiteSpace = 'pre';
      temp.style.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
      temp.style.letterSpacing = cs.letterSpacing;
      temp.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value;
      document.body.appendChild(temp);
      const textW = Math.ceil(temp.getBoundingClientRect().width);
      document.body.removeChild(temp);
      const padL = px(cs.paddingLeft);
      const padR = px(cs.paddingRight);
      const caret = 18; // caret area visual
      const extra = 10; // folga mínima
      const w = textW + padL + padR + caret + extra;
      sel.style.width = w + 'px';
    }catch(e){ console.warn('autoSizeSelectV2 falhou', e); }
  }
  function initAutoSize(){
    const sel = document.getElementById('ordenarPor');
    if(!sel) return;
    const run = () => autoSizeSelectV2(sel);
    run();
    sel.addEventListener('change', run);
    window.addEventListener('resize', run);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAutoSize);
  } else {
    initAutoSize();
  }
})();
/*AUTO_SIZE_ORDENARPOR_V3*/
(function(){
  function px(v){ return parseFloat((v||'').toString().replace('px',''))||0; }
  function autoSizeSelect(sel){
    try{
      const temp = document.createElement('span');
      const cs = window.getComputedStyle(sel);
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.whiteSpace = 'pre';
      temp.style.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
      temp.style.letterSpacing = cs.letterSpacing;
      temp.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value;
      document.body.appendChild(temp);
      const textW = Math.ceil(temp.getBoundingClientRect().width);
      document.body.removeChild(temp);
      const padL = px(cs.paddingLeft), padR = px(cs.paddingRight);
      const arrows = 32; // largura da área das setas
      const extra = 10;  // folga mínima
      sel.style.width = (textW + padL + padR + extra) + 'px';
      // a área das setas fica fora do width do select (absoluta), então não somamos arrows aqui
    }catch(e){ console.warn('autoSizeSelect falhou', e); }
  }
  function init(){
    const sel = document.getElementById('ordenarPor');
    if(!sel) return;
    const run = () => autoSizeSelect(sel);
    run(); sel.addEventListener('change', run); window.addEventListener('resize', run);

    const field = sel.closest('.field');
    if(field){
      const up = field.querySelector('.dir-arrows .dir-up');
      const down = field.querySelector('.dir-arrows .dir-down');
      const setActive = (btn, on) => btn && btn.classList[on?'add':'remove']('active');
      if(up && down){
        up.addEventListener('click', () => { sel.setAttribute('data-dir','asc'); setActive(up,true); setActive(down,false); });
        down.addEventListener('click', () => { sel.setAttribute('data-dir','desc'); setActive(down,true); setActive(up,false); });
      }
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
/*AUTO_SIZE_ORDENARPOR_STRICT*/
(function(){
  function setImportant(el, prop, value){ try { el.style.setProperty(prop, value, 'important'); } catch(e){} }
  function px(n){ return parseFloat((n||'').toString().replace('px',''))||0; }
  function measureTextWidth(el, text){
    const span = document.createElement('span');
    const cs = window.getComputedStyle(el);
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
    span.style.letterSpacing = cs.letterSpacing;
    span.textContent = text;
    document.body.appendChild(span);
    const w = Math.ceil(span.getBoundingClientRect().width);
    document.body.removeChild(span);
    return w;
  }
  function autoSizeFiltrar(){
    const sel = document.getElementById('ordenarPor');
    if(!sel) return;
    const text = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value || '';
    const wText = measureTextWidth(sel, text);
    // Use content-box: width = text + left/right padding + pequena folga
    const cs = window.getComputedStyle(sel);
    const padL = px(cs.paddingLeft), padR = px(cs.paddingRight);
    const extra = 12; // folga mínima
    const target = wText + padL + padR + extra;
    setImportant(sel, 'width', target + 'px');
  }
  function init(){
    const sel = document.getElementById('ordenarPor');
    if(!sel) return;
    const run = () => { requestAnimationFrame(autoSizeFiltrar); };
    run();
    sel.addEventListener('change', run);
    window.addEventListener('resize', run);
    // Observa mudanças de opções (caso o app altere dinamicamente)
    const obs = new MutationObserver(run);
    obs.observe(sel, { childList:true, subtree:true, characterData:true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
/*LIMPAR_BUSCA_BTN*/
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    const btn = document.getElementById('limparBusca');
    if(btn){
      btn.addEventListener('click', async ()=>{
        try{
          const campo = document.getElementById('buscar');
          if(campo){ campo.value = ''; }
          await listarProdutos();
        }catch(e){ console.warn('Falha ao limpar busca', e); }
      });
    }
  }catch(e){}
});

/*AUTO_SIZE_ORDENARPOR_TIGHT*/
(function(){
  function px(n){ return parseFloat((n||'').toString().replace('px',''))||0; }
  function measureTextWidth(el, text){
    const span = document.createElement('span');
    const cs = window.getComputedStyle(el);
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
    span.style.letterSpacing = cs.letterSpacing;
    span.textContent = text;
    document.body.appendChild(span);
    const w = Math.ceil(span.getBoundingClientRect().width);
    document.body.removeChild(span);
    return w;
  }
  function autoSizeTight(){
    const sel = document.getElementById('ordenarPor');
    if(!sel) return;
    const text = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : sel.value || '';
    const wText = measureTextWidth(sel, text);
    const cs = window.getComputedStyle(sel);
    const padL = px(cs.paddingLeft), padR = px(cs.paddingRight);
    const extra = 6; // folga menor para reduzir ao máximo
    sel.style.setProperty('width', (wText + padL + padR + extra) + 'px', 'important');
  }
  function init(){
    const sel = document.getElementById('ordenarPor');
    if(!sel) return;
    const run = () => requestAnimationFrame(autoSizeTight);
    run();
    sel.addEventListener('change', run);
    window.addEventListener('resize', run);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
/*FORCE_CENTER_LIMITE*/
document.addEventListener('DOMContentLoaded', () => {
  const lim = document.getElementById('limiteBaixa');
  if (!lim) return;
  const apply = () => { try { lim.style.setProperty('text-align','center','important'); } catch(e){} };
  apply();
  lim.addEventListener('input', apply);
  lim.addEventListener('change', apply);
});

document.querySelectorAll('button').forEach(button => {
    if (button.textContent === 'Comprar') {
        button.addEventListener('click', () => {
            const currentDate = new Date();
            const formattedDate = currentDate.toLocaleString('pt-BR', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            // Encontrar o card do produto mais próximo
            const productCard = button.closest('.card');
            if (productCard) {
                // Somar a nova quantidade à quantidade existente
                const novaQuantidade = Number(productCard.querySelector('.nova-quantidade').value);
                const quantidadeField = productCard.querySelector('.quantidade');
                const quantidadeAtual = Number(quantidadeField.textContent.replace('Qtd: ', ''));
                const totalQuantidade = quantidadeAtual + novaQuantidade;

                // Atualizar o campo de quantidade no card
                if (quantidadeField) {
                    quantidadeField.textContent = `Qtd: ${totalQuantidade}`;
                }

                // Atualizar a "Última compra" com a data e hora atual
                const ultimaCompraField = productCard.querySelector('.meta');
                if (ultimaCompraField) {
                    ultimaCompraField.textContent = `Última compra: ${formattedDate}`;
                }
            }
        });
    }
});

document.querySelectorAll('button').forEach(button => {
    if (button.textContent === 'Vender') {
        button.addEventListener('click', () => {
            const currentDate = new Date();
            const formattedDate = currentDate.toLocaleString('pt-BR', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            // Encontrar o card do produto mais próximo
            const productCard = button.closest('.card');
            if (productCard) {
                // Somar a nova quantidade à quantidade existente
                const novaQuantidade = Number(productCard.querySelector('.nova-quantidade').value);
                const quantidadeField = productCard.querySelector('.quantidade');
                const quantidadeAtual = Number(quantidadeField.textContent.replace('Qtd: ', ''));
                const totalQuantidade = quantidadeAtual + novaQuantidade;

                // Atualizar o campo de quantidade no card
                if (quantidadeField) {
                    quantidadeField.textContent = `Qtd: ${totalQuantidade}`;
                }

                // Atualizar a "Última compra" com a data e hora atual
                const ultimaCompraField = productCard.querySelector('.meta');
                if (ultimaCompraField) {
                    ultimaCompraField.textContent = `Última compra: ${formattedDate}`;
                }
            }
        });
    }
});

