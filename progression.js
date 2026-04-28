// ============================================
// SHAPEHOUSE — PROGRESSION SYSTEM (G1)
// Streak · Conquistas · Progressão automática
// ============================================

// ── Storage keys ────────────────────────────
const PROG_KEYS = {
  TREINOS:    'sh_treinos_log',   // { [dateISO]: { treinoLabel, duracao, exercicios } }
  CONQUISTAS: 'sh_conquistas',    // Set of earned achievement IDs
  NIVEL_PROG: 'sh_nivel_prog',    // { semanas_ok, multiplicador }
};

// ── Conquistas Definitions ───────────────────
const CONQUISTAS_DEF = [
  { id: 'primeira_chama',   emoji: '🔥', titulo: 'Primeira Chama',      desc: 'Complete seu primeiro treino',             meta: 1,   tipo: 'total' },
  { id: 'semana_1',         emoji: '⚡', titulo: 'Uma Semana',           desc: '7 dias consecutivos de atividade',         meta: 7,   tipo: 'streak' },
  { id: 'dedicado',         emoji: '💪', titulo: 'Dedicado',             desc: 'Complete 10 treinos no total',             meta: 10,  tipo: 'total' },
  { id: 'consistente',      emoji: '📅', titulo: 'Consistente',          desc: '3 semanas com treinos',                    meta: 21,  tipo: 'streak' },
  { id: 'cinqenta',         emoji: '🎯', titulo: 'Meia Centena',         desc: 'Complete 50 treinos no total',             meta: 50,  tipo: 'total' },
  { id: 'mes_forte',        emoji: '🏆', titulo: 'Mês Forte',            desc: '30 dias consecutivos de atividade',        meta: 30,  tipo: 'streak' },
  { id: 'cem_treinos',      emoji: '💯', titulo: 'Centenário',           desc: 'Complete 100 treinos no total',            meta: 100, tipo: 'total' },
  { id: 'lenda',            emoji: '🌟', titulo: 'Lenda',                desc: '60 dias consecutivos de atividade',        meta: 60,  tipo: 'streak' },
];

// ── ProgressionDB ────────────────────────────
const ProgressionDB = {

  // ── Treino Log ──────────────────────────────
  getTreinosLog() {
    return Storage.get(PROG_KEYS.TREINOS) || {};
  },

  registrarTreino(treinoLabel, duracao = 0) {
    const log  = this.getTreinosLog();
    const hoje = this._todayISO();
    log[hoje]  = {
      treinoLabel,
      duracao,
      ts: Date.now(),
    };
    Storage.set(PROG_KEYS.TREINOS, log);

    // Atualizar histórico legacy
    UserDB.addHistorico({ tipo: `Treino Concluído: ${treinoLabel}`, nivel: UserDB.getUser()?.nivel });

    // Checar conquistas
    const novas = this.verificarConquistas();
    // Checar progressão
    this.verificarProgressao();

    return novas;
  },

  treinoConcluidoHoje() {
    const log = this.getTreinosLog();
    return !!log[this._todayISO()];
  },

  // ── Streak ──────────────────────────────────
  calcularStreak() {
    const log   = this.getTreinosLog();
    const datas = Object.keys(log).sort().reverse(); // mais recente primeiro
    if (!datas.length) return { atual: 0, maior: 0 };

    let atual = 0;
    let maior = 0;
    let cont  = 0;

    // Streak atual — conta para trás a partir de hoje/ontem
    const hoje     = this._todayISO();
    const ontem    = this._offsetISO(-1);
    const temHoje  = !!log[hoje];
    const temOntem = !!log[ontem];

    if (temHoje || temOntem) {
      let cursor = temHoje ? hoje : ontem;
      while (log[cursor]) {
        atual++;
        cursor = this._offsetISO(-atual);
        // ajuste: cursor precisa ser calculado a partir do início
      }
      // Recalcular corretamente
      atual = 0;
      let d = temHoje ? 0 : -1;
      while (true) {
        const iso = this._offsetISO(d);
        if (!log[iso]) break;
        atual++;
        d--;
        if (atual > 1000) break; // safety
      }
    }

    // Maior streak — percorre todos os dias ordenados
    const sorted = Object.keys(log).sort();
    cont = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i-1]);
      const curr = new Date(sorted[i]);
      const diff = (curr - prev) / 86400000;
      if (diff === 1) {
        cont++;
      } else {
        maior = Math.max(maior, cont);
        cont  = 1;
      }
    }
    maior = Math.max(maior, cont, atual);

    return { atual, maior };
  },

  // ── Estatísticas ─────────────────────────────
  getStats() {
    const log        = this.getTreinosLog();
    const totalDias  = Object.keys(log).length;
    const streak     = this.calcularStreak();
    const semana     = this._treinosNaSemana();
    const ultimoTreino = Object.keys(log).sort().pop() || null;

    return {
      totalTreinos: totalDias,
      streakAtual:  streak.atual,
      streakMaior:  streak.maior,
      semanaAtual:  semana,
      ultimoTreino,
      treinoHoje:   this.treinoConcluidoHoje(),
    };
  },

  _treinosNaSemana() {
    const log  = this.getTreinosLog();
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = Dom
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - ((diaSemana + 6) % 7)); // Segunda
    inicio.setHours(0,0,0,0);

    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      if (log[d.toISOString().split('T')[0]]) count++;
    }
    return count;
  },

  // ── Conquistas ───────────────────────────────
  getConquistas() {
    return Storage.get(PROG_KEYS.CONQUISTAS) || [];
  },

  verificarConquistas() {
    const stats    = this.getStats();
    const earned   = new Set(this.getConquistas());
    const novas    = [];

    CONQUISTAS_DEF.forEach(c => {
      if (earned.has(c.id)) return;
      const val = c.tipo === 'streak' ? stats.streakAtual : stats.totalTreinos;
      if (val >= c.meta) {
        earned.add(c.id);
        novas.push(c);
      }
    });

    if (novas.length) {
      Storage.set(PROG_KEYS.CONQUISTAS, [...earned]);
    }
    return novas;
  },

  // ── Progressão automática ────────────────────
  getNivelProg() {
    return Storage.get(PROG_KEYS.NIVEL_PROG) || { semanas_ok: 0, multiplicador: 1.0 };
  },

  verificarProgressao() {
    const prog   = this.getNivelProg();
    const semana = this._treinosNaSemana();

    // Semana com 3+ treinos = semana "ok"
    if (semana >= 3) {
      prog.semanas_ok++;
      // A cada 2 semanas boas, aumenta 10% (máx 2.0×)
      if (prog.semanas_ok % 2 === 0 && prog.multiplicador < 2.0) {
        prog.multiplicador = Math.min(2.0, +(prog.multiplicador + 0.10).toFixed(2));
      }
    }

    Storage.set(PROG_KEYS.NIVEL_PROG, prog);
    return prog;
  },

  // Aplica multiplicador de progressão às reps
  aplicarProgressao(reps) {
    const prog = this.getNivelProg();
    if (prog.multiplicador <= 1.0) return reps;
    if (typeof reps === 'number') {
      return Math.round(reps * prog.multiplicador);
    }
    // Para strings tipo "20 seg" ou "3 min", retorna como está
    return reps;
  },

  // ── Heatmap data (últimas 16 semanas) ────────
  getHeatmapData() {
    const log   = this.getTreinosLog();
    const hoje  = new Date();
    const data  = [];

    // Andar 16 semanas para trás
    for (let w = 15; w >= 0; w--) {
      const semana = [];
      for (let d = 0; d < 7; d++) {
        const dia = new Date(hoje);
        dia.setDate(hoje.getDate() - (w * 7) - (hoje.getDay() === 0 ? 6 : hoje.getDay() - 1) + d);
        const iso     = dia.toISOString().split('T')[0];
        const futuro  = dia > hoje;
        semana.push({
          iso,
          treinou: !futuro && !!log[iso],
          futuro,
          dia: d, // 0=Seg
        });
      }
      data.push(semana);
    }
    return data;
  },

  // ── Helpers ──────────────────────────────────
  _todayISO() {
    return new Date().toISOString().split('T')[0];
  },

  _offsetISO(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
};
