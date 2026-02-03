let state = {
  capital: [],
  gastos: [],
  dividas: []
};

let chart;

const periodoInput = document.getElementById('periodo');

periodoInput.value = new Date().toISOString().slice(0,7);
load();

function save() {
  localStorage.setItem(periodoInput.value, JSON.stringify(state));
}

function load() {
  const data = localStorage.getItem(periodoInput.value);
  state = data ? JSON.parse(data) : { capital: [], gastos: [], dividas: [] };
  render();
}

periodoInput.addEventListener('change', load);

function addCapital() {
  state.capital.push({
    desc: capitalDesc.value,
    val: +capitalVal.value
  });
  capitalDesc.value = capitalVal.value = '';
  save(); render();
}

function addDivida() {
  state.dividas.push({
    nome: dividaNome.value,
    mensal: (+dividaTotal.value / +dividaParcelas.value)
  });
  dividaNome.value = dividaTotal.value = dividaParcelas.value = '';
  save(); render();
}

function addGasto() {
  state.gastos.push({
    desc: gastoDesc.value,
    val: +gastoVal.value,
    cat: gastoCat.value
  });
  gastoDesc.value = gastoVal.value = '';
  save(); render();
}

function render() {
  // Listas
  capitalList.innerHTML = state.capital
      .map(c => `<li>${c.desc} - R$ ${c.val.toFixed(2)}</li>`)
      .join('');

  dividaList.innerHTML = state.dividas
      .map(d => `<li>${d.nome} - R$ ${d.mensal.toFixed(2)}</li>`)
      .join('');

  gastoList.innerHTML = state.gastos
      .map(g => `<li>${g.desc} (${g.cat}) - R$ ${g.val.toFixed(2)}</li>`)
      .join('');

  // Totais
  const totalCapital = state.capital.reduce((a, b) => a + b.val, 0);
  const totalDividas = state.dividas.reduce((a, b) => a + b.mensal, 0);
  const totalGastos = state.gastos.reduce((a, b) => a + b.val, 0);
  const saldo = totalCapital - totalDividas - totalGastos;

  // Atualiza UI
  document.getElementById('totalCapital').textContent = totalCapital.toFixed(2);
  document.getElementById('totalDividas').textContent = totalDividas.toFixed(2);
  document.getElementById('totalGastos').textContent = totalGastos.toFixed(2);

  const saldoEl = document.getElementById('saldo');
  saldoEl.textContent = saldo.toFixed(2);
  saldoEl.style.color = saldo >= 0 ? 'green' : 'red';

  // Regra 50/30/20
  const limite50 = totalCapital * 0.5;
  const limite30 = totalCapital * 0.3;
  const limite20 = totalCapital * 0.2;

  const gastoNec = state.gastos
      .filter(g => g.cat === 'necessidades')
      .reduce((a, b) => a + b.val, 0);

  const gastoDes = state.gastos
      .filter(g => g.cat === 'desejos')
      .reduce((a, b) => a + b.val, 0);

  // Alerta automático
  const alerta = document.getElementById('alerta');
  alerta.textContent = '';

  if (gastoNec > limite50) {
    alerta.textContent = '⚠️ Gastos de NECESSIDADES acima de 50%';
  } else if (gastoDes > limite30) {
    alerta.textContent = '⚠️ Gastos de DESEJOS acima de 30%';
  }

  // Gráfico
  renderChart(limite50, limite30, limite20, gastoNec, gastoDes);
}


function renderChart(n50, n30, n20, gNec, gDes) {
  if(chart) chart.destroy();
  chart = new Chart(document.getElementById('chart'), {
    type: 'bar',
    data: {
      labels: ['Necessidades', 'Desejos', 'Investimentos'],
      datasets: [
        {
          label: 'Limite',
          data: [n50, n30, n20],
          backgroundColor: '#a5b4fc'
        },
        {
          label: 'Gasto',
          data: [gNec, gDes, 0],
          backgroundColor: '#f87171'
        }
      ]
    }
  });
}
