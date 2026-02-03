let chart;
const locale = 'pt-BR';
const currency = 'BRL';

let state = { capital: [], gastos: [], dividas: [] };

const periodo = document.getElementById('periodo');
periodo.value = new Date().toISOString().slice(0,7);

periodo.addEventListener('change', load);

function formatMoney(v) {
  return v.toLocaleString(locale, { style: 'currency', currency });
}

function parseMoney(v) {
  return Number(v.replace(/\D/g,'')) / 100;
}

function save() {
  localStorage.setItem(periodo.value, JSON.stringify(state));
}

function load() {
  state = JSON.parse(localStorage.getItem(periodo.value)) || { capital: [], gastos: [], dividas: [] };
  render();
}

load();

/* ===== ADD ===== */

function addCapital() {
  state.capital.push({
    desc: capitalDesc.value,
    val: parseMoney(capitalVal.value)
  });
  capitalDesc.value = capitalVal.value = '';
  save(); render();
}

function addDivida() {
  state.dividas.push({
    nome: dividaNome.value,
    mensal: parseMoney(dividaTotal.value) / dividaParcelas.value
  });
  dividaNome.value = dividaTotal.value = dividaParcelas.value = '';
  save(); render();
}

function addGasto() {
  state.gastos.push({
    desc: gastoDesc.value,
    val: parseMoney(gastoVal.value),
    cat: gastoCat.value
  });
  gastoDesc.value = gastoVal.value = '';
  save(); render();
}

/* ===== REMOVE ===== */

function confirmRemove(callback) {
  if (confirm('Deseja realmente remover este item?')) callback();
}

function removeCapital(i) {
  confirmRemove(() => {
    state.capital.splice(i,1);
    save(); render();
  });
}

function removeDivida(i) {
  confirmRemove(() => {
    state.dividas.splice(i,1);
    save(); render();
  });
}

function removeGasto(i) {
  confirmRemove(() => {
    state.gastos.splice(i,1);
    save(); render();
  });
}

/* ===== EDIT INLINE ===== */

function editItem(list, i, field) {
  const novo = prompt('Digite o novo valor (ex: 1000):');
  if (!novo) return;
  state[list][i][field] = parseMoney(novo);
  save(); render();
}

/* ===== RENDER ===== */

function render() {
  capitalList.innerHTML = state.capital.map((c,i)=>`
    <li>
      ${c.desc} - ${formatMoney(c.val)}
      <div class="actions">
        <button class="edit" onclick="editItem('capital',${i},'val')">✏️</button>
        <button class="remove" onclick="removeCapital(${i})">🗑️</button>
      </div>
    </li>`).join('');

  dividaList.innerHTML = state.dividas.map((d,i)=>`
    <li>
      ${d.nome} - ${formatMoney(d.mensal)}
      <div class="actions">
        <button class="edit" onclick="editItem('dividas',${i},'mensal')">✏️</button>
        <button class="remove" onclick="removeDivida(${i})">🗑️</button>
      </div>
    </li>`).join('');

  gastoList.innerHTML = state.gastos.map((g,i)=>`
    <li>
      ${g.desc} (${g.cat}) - ${formatMoney(g.val)}
      <div class="actions">
        <button class="edit" onclick="editItem('gastos',${i},'val')">✏️</button>
        <button class="remove" onclick="removeGasto(${i})">🗑️</button>
      </div>
    </li>`).join('');

  const totalCapital = state.capital.reduce((a,b)=>a+b.val,0);
  const totalDividas = state.dividas.reduce((a,b)=>a+b.mensal,0);
  const totalGastos = state.gastos.reduce((a,b)=>a+b.val,0);
  const saldo = totalCapital - totalDividas - totalGastos;

  totalCapitalEl.textContent = formatMoney(totalCapital);
  totalDividasEl.textContent = formatMoney(totalDividas);
  totalGastosEl.textContent = formatMoney(totalGastos);
  saldoEl.textContent = formatMoney(saldo);
  saldoEl.style.color = saldo >= 0 ? 'green' : 'red';

  const nec = state.gastos.filter(g=>g.cat==='necessidades').reduce((a,b)=>a+b.val,0);
  const des = state.gastos.filter(g=>g.cat==='desejos').reduce((a,b)=>a+b.val,0);

  alerta.textContent =
    nec > totalCapital*0.5 ? '⚠️ Necessidades acima de 50%' :
    des > totalCapital*0.3 ? '⚠️ Desejos acima de 30%' : '';

  renderChart(totalCapital*0.5, totalCapital*0.3, totalCapital*0.2, nec, des);
}

function renderChart(l50,l30,l20,nec,des) {
  if(chart) chart.destroy();
  chart = new Chart(chartEl, {
    type: 'bar',
    data: {
      labels: ['Necessidades','Desejos','Investimentos'],
      datasets: [
        { label:'Limite', data:[l50,l30,l20] },
        { label:'Gasto', data:[nec,des,0] }
      ]
    }
  });
}
