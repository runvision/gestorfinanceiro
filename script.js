/* =====================
   CONFIGURAÇÕES GERAIS
===================== */
const locale = 'pt-BR';
const currency = 'BRL';

/* =====================
   ELEMENTOS DOM
===================== */
const periodo = document.getElementById('periodo');

const capitalDesc = document.getElementById('capitalDesc');
const capitalVal = document.getElementById('capitalVal');
const capitalList = document.getElementById('capitalList');

const dividaNome = document.getElementById('dividaNome');
const dividaTotal = document.getElementById('dividaTotal');
const dividaParcelas = document.getElementById('dividaParcelas');
const dividaList = document.getElementById('dividaList');

const gastoDesc = document.getElementById('gastoDesc');
const gastoVal = document.getElementById('gastoVal');
const gastoCat = document.getElementById('gastoCat');
const gastoList = document.getElementById('gastoList');

const totalCapitalEl = document.getElementById('totalCapital');
const totalDividasEl = document.getElementById('totalDividas');
const totalGastosEl = document.getElementById('totalGastos');
const saldoEl = document.getElementById('saldo');
const alerta = document.getElementById('alerta');

const chartEl = document.getElementById('chart');

/* =====================
   ESTADO
===================== */
let state = {
  capital: [],
  gastos: [],
  dividas: []
};

let chart;

/* =====================
   UTILIDADES
===================== */
function formatMoney(value) {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency
  });
}

function parseMoney(value) {
  return Number(value.replace(/\D/g, '')) / 100;
}

/* =====================
   PERSISTÊNCIA
===================== */
periodo.value = new Date().toISOString().slice(0, 7);
periodo.addEventListener('change', load);

function save() {
  localStorage.setItem(periodo.value, JSON.stringify(state));
}

function load() {
  state = JSON.parse(localStorage.getItem(periodo.value)) || {
    capital: [],
    gastos: [],
    dividas: []
  };
  render();
}

load();

/* =====================
   ADIÇÃO
===================== */
function addCapital() {
  if (!capitalDesc.value || !capitalVal.value) return;

  state.capital.push({
    desc: capitalDesc.value,
    val: parseMoney(capitalVal.value)
  });

  capitalDesc.value = capitalVal.value = '';
  save();
  render();
}

function addDivida() {
  if (!dividaNome.value || !dividaTotal.value || !dividaParcelas.value) return;

  const total = parseMoney(dividaTotal.value);
  const parcelas = Number(dividaParcelas.value);

  state.dividas.push({
    nome: dividaNome.value,
    mensal: total / parcelas
  });

  dividaNome.value = dividaTotal.value = dividaParcelas.value = '';
  save();
  render();
}

function addGasto() {
  if (!gastoDesc.value || !gastoVal.value) return;

  state.gastos.push({
    desc: gastoDesc.value,
    val: parseMoney(gastoVal.value),
    cat: gastoCat.value
  });

  gastoDesc.value = gastoVal.value = '';
  save();
  render();
}

/* =====================
   REMOVER (COM CONFIRMAÇÃO)
===================== */
function confirmRemove(fn) {
  if (confirm('Deseja realmente remover este item?')) {
    fn();
  }
}

function removeCapital(i) {
  confirmRemove(() => {
    state.capital.splice(i, 1);
    save();
    render();
  });
}

function removeDivida(i) {
  confirmRemove(() => {
    state.dividas.splice(i, 1);
    save();
    render();
  });
}

function removeGasto(i) {
  confirmRemove(() => {
    state.gastos.splice(i, 1);
    save();
    render();
  });
}

/* =====================
   EDITAR INLINE
===================== */
function editItem(list, index, field) {
  const novo = prompt('Digite o novo valor (ex: 1000)');
  if (!novo) return;

  state[list][index][field] = parseMoney(novo);
  save();
  render();
}

/* =====================
   RENDERIZAÇÃO + CÁLCULOS
===================== */
function render() {
  /* Listas */
  capitalList.innerHTML = state.capital.map((c, i) => `
    <li>
      ${c.desc} - ${formatMoney(c.val)}
      <div class="actions">
        <button class="edit" onclick="editItem('capital', ${i}, 'val')">✏️</button>
        <button class="remove" onclick="removeCapital(${i})">🗑️</button>
      </div>
    </li>
  `).join('');

  dividaList.innerHTML = state.dividas.map((d, i) => `
    <li>
      ${d.nome} - ${formatMoney(d.mensal)}
      <div class="actions">
        <button class="edit" onclick="editItem('dividas', ${i}, 'mensal')">✏️</button>
        <button class="remove" onclick="removeDivida(${i})">🗑️</button>
      </div>
    </li>
  `).join('');

  gastoList.innerHTML = state.gastos.map((g, i) => `
    <li>
      ${g.desc} (${g.cat}) - ${formatMoney(g.val)}
      <div class="actions">
        <button class="edit" onclick="editItem('gastos', ${i}, 'val')">✏️</button>
        <button class="remove" onclick="removeGasto(${i})">🗑️</button>
      </div>
    </li>
  `).join('');

  /* Cálculos */
  const totalCapital = state.capital.reduce((a, b) => a + b.val, 0);
  const totalDividas = state.dividas.reduce((a, b) => a + b.mensal, 0);
  const totalGastos = state.gastos.reduce((a, b) => a + b.val, 0);
  const saldo = totalCapital - totalDividas - totalGastos;

  totalCapitalEl.textContent = formatMoney(totalCapital);
  totalDividasEl.textContent = formatMoney(totalDividas);
  totalGastosEl.textContent = formatMoney(totalGastos);
  saldoEl.textContent = formatMoney(saldo);
  saldoEl.style.color = saldo >= 0 ? 'green' : 'red';

  /* Regra 50/30/20 */
  const limite50 = totalCapital * 0.5;
  const limite30 = totalCapital * 0.3;
  const limite20 = totalCapital * 0.2;

  const gastoNec = state.gastos
    .filter(g => g.cat === 'necessidades')
    .reduce((a, b) => a + b.val, 0);

  const gastoDes = state.gastos
    .filter(g => g.cat === 'desejos')
    .reduce((a, b) => a + b.val, 0);

  alerta.textContent = '';
  if (gastoNec > limite50) alerta.textContent = '⚠️ Necessidades acima de 50%';
  else if (gastoDes > limite30) alerta.textContent = '⚠️ Desejos acima de 30%';

  renderChart(limite50, limite30, limite20, gastoNec, gastoDes);
}

/* =====================
   GRÁFICO
===================== */
function renderChart(l50, l30, l20, nec, des) {
  const dataLimite = [l50, l30, l20];
  const dataGasto = [nec, des, 0];

  if (!chart) {
    chart = new Chart(chartEl, {
      type: 'bar',
      data: {
        labels: ['Necessidades', 'Desejos', 'Investimentos'],
        datasets: [
          {
            label: 'Limite',
            data: dataLimite,
          },
          {
            label: 'Gasto',
            data: dataGasto,
          }
        ]
      },
      options: {
        responsive: true,
        animation: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  } else {
    chart.data.datasets[0].data = dataLimite;
    chart.data.datasets[1].data = dataGasto;
    chart.update();
  }
}
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;
  const line = (text) => {
    doc.text(text, 20, y);
    y += 8;
  };

  // ===== DADOS =====
  const totalCapital = state.capital.reduce((a,b)=>a+b.val,0);
  const totalDividas = state.dividas.reduce((a,b)=>a+b.mensal,0);
  const totalGastos = state.gastos.reduce((a,b)=>a+b.val,0);
  const saldo = totalCapital - totalDividas - totalGastos;

  const limite50 = totalCapital * 0.5;
  const limite30 = totalCapital * 0.3;
  const limite20 = totalCapital * 0.2;

  const gastoNec = state.gastos.filter(g=>g.cat==='necessidades').reduce((a,b)=>a+b.val,0);
  const gastoDes = state.gastos.filter(g=>g.cat==='desejos').reduce((a,b)=>a+b.val,0);

  // ===== CABEÇALHO =====
  doc.setFontSize(16);
  line('Finance SaaS — Relatório Financeiro Mensal');
  doc.setFontSize(10);
  line(`Período: ${periodo.value}`);
  line(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);
  y += 6;

  // ===== RESUMO =====
  doc.setFontSize(14);
  line('Resumo Financeiro');
  doc.setFontSize(11);
  line(`Entradas: ${formatMoney(totalCapital)}`);
  line(`Gastos: ${formatMoney(totalGastos)}`);
  line(`Dívidas Mensais: ${formatMoney(totalDividas)}`);
  line(`Saldo Final: ${formatMoney(saldo)}`);
  y += 6;

  // ===== REGRA 50/30/20 =====
  doc.setFontSize(14);
  line('Regra 50/30/20');
  doc.setFontSize(11);
  line(`Necessidades — Limite: ${formatMoney(limite50)} | Gasto: ${formatMoney(gastoNec)}`);
  line(`Desejos — Limite: ${formatMoney(limite30)} | Gasto: ${formatMoney(gastoDes)}`);
  line(`Investimentos — Ideal: ${formatMoney(limite20)}`);
  y += 6;

  // ===== ERROS =====
  doc.setFontSize(14);
  line('Principais Erros Identificados');
  doc.setFontSize(11);

  let erros = [];

  if (gastoNec > limite50) {
    erros.push('Gastos essenciais acima de 50% do capital.');
    line('• Necessidades acima do limite recomendado.');
  }

  if (gastoDes > limite30) {
    erros.push('Gastos com desejos acima de 30%.');
    line('• Desejos acima do limite recomendado.');
  }

  if (totalDividas > totalCapital * 0.3) {
    erros.push('Dívidas consomem grande parte da renda.');
    line('• Dívidas estão muito altas em relação à renda.');
  }

  if (saldo < 0) {
    erros.push('Saldo negativo no fechamento do mês.');
    line('• Saldo negativo.');
  }

  if (erros.length === 0) {
    line('• Nenhum erro crítico identificado. Boa gestão!');
  }

  y += 6;

  // ===== RECOMENDAÇÕES =====
  doc.setFontSize(14);
  line('Recomendações para o Próximo Mês');
  doc.setFontSize(11);

  if (gastoDes > limite30) {
    line('• Reduzir gastos com desejos (lazer, delivery, apps).');
  }

  if (gastoNec > limite50) {
    line('• Revisar gastos fixos como aluguel, mercado e transporte.');
  }

  if (totalDividas > totalCapital * 0.3) {
    line('• Priorizar quitação ou renegociação de dívidas.');
  }

  if (saldo > 0 && saldo < limite20) {
    line('• Aumentar reserva ou investimentos mensais.');
  }

  if (saldo >= limite20) {
    line('• Excelente! Continue fortalecendo sua reserva financeira.');
  }

  // ===== SALVAR =====
  doc.save(`Relatorio_Financeiro_${periodo.value}.pdf`);
}

