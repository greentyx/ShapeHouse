// ============================================
// SHAPEHOUSE — GLOBAL SCRIPT
// ============================================

// ── Storage helpers ─────────────────────────
const Storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ── User data ────────────────────────────────
const UserDB = {
  getUser() { return Storage.get('sh_user') || null; },
  setUser(data) { Storage.set('sh_user', data); },
  getHistorico() { return Storage.get('sh_historico') || []; },
  addHistorico(entry) {
    const h = this.getHistorico();
    h.unshift({ ...entry, data: new Date().toLocaleDateString('pt-BR') });
    if (h.length > 30) h.pop();
    Storage.set('sh_historico', h);
  },
  getCronograma() { return Storage.get('sh_cronograma') || null; },
  setCronograma(data) { Storage.set('sh_cronograma', data); }
};

// ── IMC Calculator ───────────────────────────
function calcularIMC(peso, altura_cm) {
  const h = altura_cm / 100;
  return +(peso / (h * h)).toFixed(1);
}

function classificarIMC(imc) {
  if (imc < 18.5) return { label: 'Abaixo do Peso', badge: 'badge-yellow', emoji: '⚖️', cor: '#eab308' };
  if (imc < 25)   return { label: 'Peso Normal',    badge: 'badge-green',  emoji: '✅', cor: '#22c55e' };
  if (imc < 30)   return { label: 'Sobrepeso',      badge: 'badge-orange', emoji: '⚠️', cor: '#f97316' };
  return             { label: 'Obesidade',          badge: 'badge-red',    emoji: '🔴', cor: '#ef4444' };
}

function sugestoesIMC(imc, nivel) {
  if (imc < 18.5) return ['Foque em ganho de massa muscular', 'Priorize exercícios de força', 'Aumente a ingestão proteica'];
  if (imc < 25)   return ['Mantenha o equilíbrio atual', 'Combine treino de força e cardio', 'Hidratação e descanso em dia'];
  if (imc < 30)   return ['Inclua mais cardio na rotina', 'Reduza refeições processadas', 'Exercícios aeróbicos 3×/semana'];
  return ['Priorize atividades de baixo impacto', 'Consulte um profissional de saúde', 'Comece com caminhada e alongamento'];
}

// ── Schedule Generator ───────────────────────
const EXERCICIOS_DB = {
  // { nome, musculos, icon }
  flexao:       { nome: 'Flexão (Push-up)',         musculos: 'Peito, Tríceps, Ombros',  icon: '💪' },
  agachamento:  { nome: 'Agachamento (Squat)',       musculos: 'Quadríceps, Glúteos',     icon: '🦵' },
  prancha:      { nome: 'Prancha (Plank)',            musculos: 'Core, Abdômen',           icon: '🧱' },
  abdominal:    { nome: 'Abdominal Crunch',           musculos: 'Abdômen Superior',        icon: '🔥' },
  burpee:       { nome: 'Burpee',                    musculos: 'Corpo Todo',              icon: '⚡' },
  polichinelo:  { nome: 'Polichinelo (Jumping Jack)', musculos: 'Cardio, Corpo Todo',     icon: '🏃' },
  elevacaoPerna:{ nome: 'Elevação de Pernas',        musculos: 'Abdômen Inferior',        icon: '🦶' },
  afundo:       { nome: 'Afundo (Lunge)',             musculos: 'Quadríceps, Glúteos',    icon: '🏋️' },
  supino_solo:  { nome: 'Supino no Solo',            musculos: 'Peito, Ombros',           icon: '🤲' },
  mountain:     { nome: 'Mountain Climber',           musculos: 'Core, Cardio',           icon: '⛰️' },
  triceps_banco:{ nome: 'Tríceps no Banco',          musculos: 'Tríceps, Ombros',         icon: '🪑' },
  gluteo:       { nome: 'Ponte Glúteo',              musculos: 'Glúteos, Lombar',         icon: '🍑' },
  alongamento:  { nome: 'Alongamento Geral',         musculos: 'Flexibilidade',           icon: '🧘' },
  caminhada:    { nome: 'Caminhada no Lugar',        musculos: 'Cardio',                  icon: '🚶' },
};

function gerarCronograma(user) {
  const { nivel, peso, altura } = user;
  const imc = calcularIMC(peso, altura);
  const pesoAlto = imc >= 28;

  const configs = {
    iniciante: {
      series: 2, descanso: '90 seg',
      rep: { flexao: 8, agachamento: 12, prancha: '20 seg', abdominal: 10, burpee: 5,
             polichinelo: 20, elevacaoPerna: 8, afundo: 8, supino_solo: 8, mountain: 10,
             triceps_banco: 8, gluteo: 12, alongamento: '30 seg', caminhada: '3 min' }
    },
    intermediario: {
      series: 3, descanso: '60 seg',
      rep: { flexao: 15, agachamento: 20, prancha: '40 seg', abdominal: 20, burpee: 10,
             polichinelo: 35, elevacaoPerna: 15, afundo: 15, supino_solo: 15, mountain: 20,
             triceps_banco: 15, gluteo: 20, alongamento: '20 seg', caminhada: '2 min' }
    },
    avancado: {
      series: 4, descanso: '30 seg',
      rep: { flexao: 25, agachamento: 35, prancha: '60 seg', abdominal: 30, burpee: 20,
             polichinelo: 50, elevacaoPerna: 25, afundo: 25, supino_solo: 25, mountain: 35,
             triceps_banco: 25, gluteo: 30, alongamento: '15 seg', caminhada: '1 min' }
    }
  };

  const cfg = configs[nivel] || configs.iniciante;

  const buildExercicio = (key) => ({
    ...EXERCICIOS_DB[key],
    reps: cfg.rep[key],
    series: cfg.series,
    descanso: cfg.descanso
  });

  // Treino A — Peito / Tríceps / Core
  const treinoA = pesoAlto
    ? [buildExercicio('caminhada'), buildExercicio('polichinelo'), buildExercicio('prancha'), buildExercicio('gluteo'), buildExercicio('elevacaoPerna')]
    : [buildExercicio('flexao'), buildExercicio('supino_solo'), buildExercicio('triceps_banco'), buildExercicio('prancha'), buildExercicio('abdominal')];

  // Treino B — Pernas / Glúteos
  const treinoB = pesoAlto
    ? [buildExercicio('agachamento'), buildExercicio('gluteo'), buildExercicio('afundo'), buildExercicio('mountain'), buildExercicio('alongamento')]
    : [buildExercicio('agachamento'), buildExercicio('afundo'), buildExercicio('gluteo'), buildExercicio('elevacaoPerna'), buildExercicio('prancha')];

  // Treino C — Full Body
  const treinoC = [
    buildExercicio('burpee'),
    buildExercicio('agachamento'),
    buildExercicio('flexao'),
    buildExercicio('mountain'),
    buildExercicio('abdominal')
  ];

  // Treino Leve — Cardio / Mobilidade
  const treinoLeve = [
    buildExercicio('caminhada'),
    buildExercicio('polichinelo'),
    buildExercicio('alongamento'),
    buildExercicio('gluteo'),
    buildExercicio('prancha')
  ];

  const semana = [
    { dia: 'Segunda-feira',  tipo: 'treino', label: 'Treino A', descricao: pesoAlto ? 'Cardio + Core' : 'Peito & Tríceps', exercicios: treinoA, cor: '#004CF6' },
    { dia: 'Terça-feira',    tipo: 'descanso', label: 'Descanso Ativo', descricao: 'Caminhada leve ou alongamento', exercicios: [], cor: '#666' },
    { dia: 'Quarta-feira',   tipo: 'treino', label: 'Treino B', descricao: 'Pernas & Glúteos', exercicios: treinoB, cor: '#004CF6' },
    { dia: 'Quinta-feira',   tipo: 'descanso', label: 'Descanso', descricao: 'Recuperação muscular', exercicios: [], cor: '#666' },
    { dia: 'Sexta-feira',    tipo: 'treino', label: 'Treino C', descricao: 'Full Body', exercicios: treinoC, cor: '#004CF6' },
    { dia: 'Sábado',         tipo: 'leve', label: 'Treino Leve', descricao: 'Cardio & Mobilidade', exercicios: treinoLeve, cor: '#f97316' },
    { dia: 'Domingo',        tipo: 'descanso', label: 'Descanso Total', descricao: 'Recuperação completa', exercicios: [], cor: '#666' },
  ];

  return { semana, geradoEm: new Date().toLocaleDateString('pt-BR'), nivel, imc };
}

// ── Toast ─────────────────────────────────────
function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { info: 'ℹ️', success: '✅', error: '❌' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Dark mode ─────────────────────────────────
function initTheme() {
  const saved = Storage.get('sh_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  Storage.set('sh_theme', next);
}

// ── Navbar active state ───────────────────────
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
    a.classList.remove('active');
    if (a.href && a.href.includes(path.split('/').pop())) {
      a.classList.add('active');
    }
  });
  // Home
  if (path.endsWith('index.html') || path.endsWith('/')) {
    document.querySelectorAll('[data-nav="home"]').forEach(a => a.classList.add('active'));
  }
}

// ── Hamburger menu ────────────────────────────
function initHamburger() {
  const btn = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!btn || !mobileNav) return;
  btn.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const [s1, s2, s3] = btn.querySelectorAll('span');
    if (mobileNav.classList.contains('open')) {
      s1.style.transform = 'rotate(45deg) translate(5px,5px)';
      s2.style.opacity = '0';
      s3.style.transform = 'rotate(-45deg) translate(5px,-5px)';
    } else {
      [s1,s2,s3].forEach(s => { s.style.transform=''; s.style.opacity=''; });
    }
  });
}

// ── Timer ─────────────────────────────────────
class WorkoutTimer {
  constructor(displayEl, btnEl) {
    this.display = displayEl;
    this.btn = btnEl;
    this.seconds = 0;
    this.running = false;
    this.interval = null;
  }
  start() {
    this.running = true;
    this.interval = setInterval(() => {
      this.seconds++;
      this.render();
    }, 1000);
    if (this.btn) this.btn.textContent = '⏸ Pausar';
  }
  pause() {
    clearInterval(this.interval);
    this.running = false;
    if (this.btn) this.btn.textContent = '▶ Continuar';
  }
  toggle() {
    this.running ? this.pause() : this.start();
  }
  reset() {
    this.pause();
    this.seconds = 0;
    this.render();
    if (this.btn) this.btn.textContent = '▶ Iniciar';
  }
  render() {
    const m = String(Math.floor(this.seconds / 60)).padStart(2, '0');
    const s = String(this.seconds % 60).padStart(2, '0');
    if (this.display) this.display.textContent = `${m}:${s}`;
  }
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setActiveNav();
  initHamburger();
});
