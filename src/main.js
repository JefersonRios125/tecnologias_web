import './style.css';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const $ = (id) => document.getElementById(id);

const login = $('login');
const catalogo = $('catalogo');
const loginForm = $('login-form');
const tecnologiaForm = $('tecnologia-form');
const registros = $('registros');
const exclusao = $('exclusao');

const unidades = { dias: 'dia', semanas: 'semana', meses: 'mês', anos: 'ano' };

let token = sessionStorage.getItem('tecnologias-token');
let sessao = new AbortController();
let tecnologias = [];
let editando = null;
let excluindo = null;
let ocupado = false;
let carregado = false;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(path, { method = 'GET', body, autenticado = true } = {}) {
  const headers = {};
  if (autenticado) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: sessao.signal,
  });
  if (response.status === 204) return;
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data.mensagem);
  return data;
}

function informar(id, mensagem = '', erro = false) {
  const feedback = $(id);
  feedback.textContent = mensagem;
  feedback.classList.toggle('error', erro);
}

function mostrarCatalogo(ativo) {
  catalogo.hidden = !ativo;
  $('sair').hidden = !ativo;
  login.hidden = ativo;
}

function limparEdicao() {
  editando = null;
  tecnologiaForm.reset();
  $('form-titulo').textContent = 'Nova tecnologia';
  $('salvar').textContent = 'Cadastrar';
  $('cancelar-edicao').hidden = true;
}

function sair(mensagem = '') {
  sessao.abort();
  sessao = new AbortController();
  token = null;
  sessionStorage.removeItem('tecnologias-token');
  tecnologias = [];
  carregado = false;
  marcarOcupado(false);
  if (exclusao.open) exclusao.close();
  excluindo = null;
  limparEdicao();
  renderizarTabela();
  informar('catalogo-feedback');
  mostrarCatalogo(false);
  informar('login-feedback', mensagem, Boolean(mensagem));
  loginForm.elements.usuario.focus();
}

function iniciarEdicao(tecnologia) {
  editando = tecnologia.id;
  tecnologiaForm.elements.nome.value = tecnologia.nome;
  tecnologiaForm.elements.base.value = tecnologia.base;
  tecnologiaForm.elements.tempo.value = tecnologia.curvaAprendizado.tempo;
  tecnologiaForm.elements.unidade.value = tecnologia.curvaAprendizado.unidade;
  $('form-titulo').textContent = 'Editar tecnologia';
  $('salvar').textContent = 'Salvar alterações';
  $('cancelar-edicao').hidden = false;
  informar('catalogo-feedback');
  tecnologiaForm.elements.nome.focus();
}

function botaoAcao(texto, tecnologia, classe, acao) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.textContent = texto;
  botao.setAttribute('aria-label', `${texto} ${tecnologia.nome}`);
  botao.className = classe;
  botao.disabled = ocupado;
  botao.addEventListener('click', acao);
  return botao;
}

function renderizarTabela() {
  registros.replaceChildren();
  $('total').textContent = carregado ? `${tecnologias.length} ${tecnologias.length === 1 ? 'registro' : 'registros'}` : '';

  if (!tecnologias.length) {
    const celula = registros.insertRow().insertCell();
    celula.colSpan = 4;
    celula.className = 'empty';
    celula.textContent = carregado ? 'Nenhuma tecnologia cadastrada.' : 'Aguardando os dados da API.';
    return;
  }

  for (const tecnologia of tecnologias) {
    const linha = registros.insertRow();
    const { tempo, unidade } = tecnologia.curvaAprendizado;
    linha.insertCell().textContent = tecnologia.nome;
    linha.insertCell().textContent = tecnologia.base;
    linha.insertCell().textContent = `${tempo} ${tempo === 1 ? unidades[unidade] : unidade}`;

    const acoes = document.createElement('div');
    acoes.className = 'row-actions';
    acoes.append(
      botaoAcao('Editar', tecnologia, 'secondary', () => iniciarEdicao(tecnologia)),
      botaoAcao('Excluir', tecnologia, 'secondary remove', () => {
        excluindo = tecnologia.id;
        $('exclusao-texto').textContent = `Confirma a exclusão de ${tecnologia.nome}?`;
        exclusao.returnValue = '';
        exclusao.showModal();
      }),
    );
    linha.insertCell().append(acoes);
  }
}

function marcarOcupado(valor) {
  ocupado = valor;
  for (const campo of tecnologiaForm.elements) campo.disabled = valor;
  $('atualizar').disabled = valor;
  for (const botao of registros.querySelectorAll('button')) botao.disabled = valor;
}

async function executar(acao) {
  if (ocupado) return;
  const sessaoAtual = sessao;
  marcarOcupado(true);
  informar('catalogo-feedback');
  try {
    await acao();
  } catch (erro) {
    if (sessaoAtual !== sessao) return;
    if (erro.status === 401) {
      sair('Sua sessão terminou. Entre novamente.');
    } else {
      informar('catalogo-feedback', erro instanceof ApiError ? erro.message : 'Não foi possível conectar à API.', true);
    }
  } finally {
    if (sessaoAtual === sessao) marcarOcupado(false);
  }
}

async function atualizarTabela() {
  tecnologias = await api('/tecnologias');
  carregado = true;
  renderizarTabela();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const botao = loginForm.querySelector('button');
  if (botao.disabled) return;
  const campos = new FormData(loginForm);
  botao.disabled = true;
  informar('login-feedback');

  try {
    const sessaoLogin = await api('/login', {
      method: 'POST',
      body: { usuario: campos.get('usuario'), senha: campos.get('senha') },
      autenticado: false,
    });
    token = sessaoLogin.token;
    sessionStorage.setItem('tecnologias-token', token);
    loginForm.reset();
    mostrarCatalogo(true);
    await executar(atualizarTabela);
    if (token) tecnologiaForm.elements.nome.focus();
  } catch (erro) {
    informar('login-feedback', erro instanceof ApiError ? erro.message : 'Não foi possível conectar à API.', true);
  } finally {
    botao.disabled = false;
  }
});

tecnologiaForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (ocupado) return;
  const campos = new FormData(tecnologiaForm);
  const body = {
    nome: campos.get('nome'),
    base: campos.get('base'),
    curvaAprendizado: { tempo: Number(campos.get('tempo')), unidade: campos.get('unidade') },
  };

  if (!body.nome.trim() || !body.base.trim()) {
    informar('catalogo-feedback', 'Preencha o nome e a base da tecnologia.', true);
    return;
  }

  const id = editando;
  executar(async () => {
    const tecnologia = await api(id ? `/tecnologias/${id}` : '/tecnologias', {
      method: id ? 'PUT' : 'POST',
      body,
    });
    limparEdicao();
    if (carregado) {
      tecnologias = id ? tecnologias.map((item) => item.id === id ? tecnologia : item) : [tecnologia, ...tecnologias];
      renderizarTabela();
    } else {
      await atualizarTabela();
    }
    informar('catalogo-feedback', id ? 'Alterações salvas.' : 'Tecnologia cadastrada.');
  });
});

exclusao.addEventListener('close', () => {
  const id = excluindo;
  excluindo = null;
  if (!id || exclusao.returnValue !== 'excluir') return;

  executar(async () => {
    await api(`/tecnologias/${id}`, { method: 'DELETE' });
    if (editando === id) limparEdicao();
    tecnologias = tecnologias.filter((tecnologia) => tecnologia.id !== id);
    renderizarTabela();
    informar('catalogo-feedback', 'Tecnologia excluída.');
  });
});

$('cancelar-edicao').addEventListener('click', () => {
  limparEdicao();
  informar('catalogo-feedback');
  tecnologiaForm.elements.nome.focus();
});
$('atualizar').addEventListener('click', () => executar(atualizarTabela));
$('sair').addEventListener('click', () => sair());

renderizarTabela();
mostrarCatalogo(Boolean(token));
if (token) executar(atualizarTabela);
