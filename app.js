const API = (window.API_BASE || 'http://localhost:8080') + '/api';

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
  const ordenarPor = $('#ordenarPor').value;
  if (buscar) q.set('buscar', buscar);
  if (ordenarPor) q.set('ordenarPor', ordenarPor);

  produtos = await getJSON(`${API}/produtos${q.toString() ? '?'+q.toString() : ''}`);
  renderProdutos(produtos);
};

const criarCardProduto = (p) => {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-header">
      <div>
        <div class="title">${p.nome}</div>
        <div class="meta">ID: <code>${p.id}</code></div>
      </div>
      <div class="badges">
        <span class="badge">${moeda(p.preco)}</span>
        <span class="badge">Qtd: ${p.quantidade}</span>
        ${p.estoqueBaixo ? '<span class="badge low">Estoque baixo</span>' : ''}
      </div>
    </div>
    <div class="meta">Entrada: ${p.dataEntrada} · Última saída: ${p.ultimaSaida ? p.ultimaSaida.replace('T',' ') : '—'}</div>
    <div class="actions">
      <button class="btn primary" data-acao="vender" data-id="${p.id}">Vender</button>
      <button class="btn" data-acao="preco" data-id="${p.id}">Alterar preço</button>
      <button class="btn" data-acao="renomear" data-id="${p.id}">Renomear</button>
      <button class="btn warning" data-acao="quantidade" data-id="${p.id}">Ajustar quantidade</button>
      <button class="btn danger" data-acao="remover" data-id="${p.id}">Remover</button>
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
  lista.forEach(p => wrap.appendChild(criarCardProduto(p)));
};

const carregarMovs = async () => {
  const dados = await getJSON(`${API}/movimentacoes`);
  const tbody = $('#tMovs');
  tbody.innerHTML = '';
  dados.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${m.dataHora.replace('T',' ')}</td>
      <td>${m.tipo}</td>
      <td>${m.nomeProduto}</td>
      <td>${m.quantidade}</td>
      <td>${moeda(m.valorUnitario)}</td>
    `;
    tbody.appendChild(tr);
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
    quantidade: `Ajustar quantidade – ${prod.nome}`
  }[acao] || 'Ações';

  $('#tituloModalAcoes').textContent = title;
  if (acao === 'vender') {
    c.innerHTML = `
      <div class="field">
        <label for="qtdVenda">Quantidade a vender</label>
        <input id="qtdVenda" type="number" min="1" step="1" required />
      </div>`;
  } else if (acao === 'preco') {
    c.innerHTML = `
      <div class="field">
        <label for="novoPreco">Novo preço (R$)</label>
        <input id="novoPreco" type="number" min="0" step="0.01" required />
      </div>`;
  } else if (acao === 'renomear') {
    c.innerHTML = `
      <div class="field">
        <label for="novoNome">Novo nome</label>
        <input id="novoNome" type="text" required />
      </div>`;
  } else if (acao === 'quantidade') {
    c.innerHTML = `
      <div class="field">
        <label for="novaQuantidade">Nova quantidade (valor absoluto)</label>
        <input id="novaQuantidade" type="number" min="0" step="1" required />
      </div>`;
  }

  $('#formAcoes').dataset.id = id;
  $('#formAcoes').dataset.acao = acao;
  $('#modalAcoes').showModal();
};

// Eventos
$('#aplicarFiltros').addEventListener('click', listarProdutos);
$('#buscar').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ listarProdutos(); }});
$('#ordenarPor').addEventListener('change', listarProdutos);
$('#salvarLimite').addEventListener('click', async ()=>{
  try{ await salvarLimite(); } catch(e){ showToast('Erro ao salvar limite: ' + e.message, false); }
});

$('#abrirNovoProduto').addEventListener('click', ()=> abrirModalProduto('novo'));
$('#fecharModalProduto').addEventListener('click', fecharModalProduto);
$('#fecharModalAcoes').addEventListener('click', fecharModalAcoes);

// Criação de produto
$('#formProduto').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    nome: $('#nomeProduto').value.trim(),
    preco: Number($('#precoProduto').value),
    quantidade: Number($('#qtdProduto').value)
  };
  try{
    const p = await getJSON(`${API}/produtos`, { method:'POST', body: JSON.stringify(payload) });
    showToast('Produto cadastrado com sucesso!');
    fecharModalProduto();
    await Promise.all([listarProdutos(), carregarMovs()]);
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
      await getJSON(`${API}/produtos/${id}/renomear`, { method:'PATCH', body: JSON.stringify({ novoNome }) });
    } else if (acao === 'quantidade') {
      const novaQuantidade = Number($('#novaQuantidade').value);
      await getJSON(`${API}/produtos/${id}/quantidade`, { method:'PATCH', body: JSON.stringify({ novaQuantidade }) });
    }
    showToast('Ação realizada com sucesso!');
    fecharModalAcoes();
    await Promise.all([listarProdutos(), carregarMovs()]);
  }catch(err){
    showToast('Erro: ' + err.message, false);
  }
});

// Inicialização
carregarTudo().catch(err => showToast('Falha ao carregar dados: ' + err.message, false));


// Exibe o popup de confirmação ao clicar no botão
$('#limparHistorico').addEventListener('click', () => {
  document.getElementById('popupConfirm').style.display = 'flex';
});

// Botão "Não" fecha o popup
document.getElementById('btnConfirmNo').addEventListener('click', () => {
  document.getElementById('popupConfirm').style.display = 'none';
});

// Botão "Sim" faz requisição DELETE e limpa a tabela
document.getElementById('btnConfirmYes').addEventListener('click', async () => {
  await fetch(API + '/movimentacoes', { method: 'DELETE' });
  await carregarMovs();
  document.getElementById('tMovs').innerHTML = '';
  document.getElementById('popupConfirm').style.display = 'none';
});
