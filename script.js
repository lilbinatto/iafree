const ASSETS = [
  { symbol: 'BTC/USDT' },
  { symbol: 'ETH/USDT' },
  { symbol: 'BNB/USDT' },
  { symbol: 'SOL/USDT' },
  { symbol: 'XRP/USDT' },
  { symbol: 'DOGE/USDT' },
  { symbol: 'ADA/USDT' },
  { symbol: 'LTC/USDT' },
  { symbol: 'AVAX/USDT' },
];

const state = {
  cooldown: 0,
  timerId: null,
  preDelayId: null,
  preDelayTickerId: null,
  lastSignal: null,
};

const el = {
  asset: document.getElementById('asset'),
  expiry: document.getElementById('expiry'),
  startTime: document.getElementById('startTime'),
  action: document.getElementById('action'),
  signalBtn: document.getElementById('signalBtn'),
  historyBtn: document.getElementById('historyBtn'),
  historyPanel: document.getElementById('historyPanel'),
  closeHistory: document.getElementById('closeHistory'),
  historyList: document.getElementById('historyList'),
  entryModal: document.getElementById('entryModal'),
  entryModalClose: document.getElementById('entryModalClose'),
  entryModalDialog: document.querySelector('#entryModal .modal'),
};

function init() {
  // Populate assets
  ASSETS.forEach((a, i) => {
    const opt = document.createElement('option');
    opt.value = a.symbol;
    opt.textContent = a.symbol;
    if (i === 0) opt.selected = true;
    el.asset.appendChild(opt);
  });
  

  // Keep Início OP vazio ao carregar
  el.startTime.value = '';

  // Events
  
  el.expiry.addEventListener('change', alignStartTimeToExpiry);
  el.signalBtn.addEventListener('click', handleGenerateSignal);
  el.historyBtn.addEventListener('click', openHistory);
  el.closeHistory.addEventListener('click', closeHistory);

  // Entry modal events
  if (el.entryModal && el.entryModalClose){
    // Show on load
    openEntryModal();
    // Close on X
    el.entryModalClose.addEventListener('click', closeEntryModal);
    // Prevent clicks inside modal from bubbling to overlay
    if (el.entryModalDialog){
      el.entryModalDialog.addEventListener('click', (e) => e.stopPropagation());
    }
    // Close when clicking on overlay background only
    el.entryModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeEntryModal();
    });
    // Close when clicking the primary link button inside
    const continueBtn = el.entryModal.querySelector('.modal-actions .primary-btn');
    if (continueBtn){
      continueBtn.addEventListener('click', () => closeEntryModal());
    }
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!el.entryModal.classList.contains('hidden')) closeEntryModal();
      }
    });
  }

  // Enforce M1 and hide action initially
  el.expiry.value = 'M1';
  el.action.classList.add('hidden');
}

// (asset logos removed)

// Align Início OP to the next timeframe boundary from current time
function alignStartTimeToExpiry(){
  const frameMin = getFrameMinutes(el.expiry.value);
  const next = nextAlignedTime(new Date(), frameMin);
  el.startTime.value = toHHMM(next);
}

function getFrameMinutes(val){
  if (val === 'M15') return 15;
  if (val === 'M5') return 5;
  return 1; // M1 default
}

function nextAlignedTime(now, frameMin){
  const d = new Date(now);
  d.setSeconds(0,0);
  const m = d.getMinutes();
  const mod = m % frameMin;
  const add = mod === 0 && d.getSeconds() === 0 ? frameMin : (frameMin - mod);
  d.setMinutes(m + add);
  return d;
}

function toHHMM(date){
  const h = String(date.getHours()).padStart(2,'0');
  const m = String(date.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

function setAction(type){
  el.action.classList.remove('buy','sell','neutral');
  let label = 'Neutro';
  let cls = 'neutral';
  if (type === 'buy') { label = 'Compra'; cls = 'buy'; }
  if (type === 'sell') { label = 'Venda'; cls = 'sell'; }
  el.action.textContent = label;
  el.action.classList.add(cls);
}

function randomAction(){
  const r = Math.random();
  if (r < 1/3) return 'buy';
  if (r < 2/3) return 'sell';
  return 'neutral';
}

function handleGenerateSignal(){
  if (state.cooldown > 0) return;
  // prevent re-clicks and show generating state
  el.signalBtn.disabled = true;
  el.signalBtn.textContent = 'Gerando...';
  // ensure action stays hidden until reveal
  el.action.classList.add('hidden');

  const action = randomAction();
  clearTimeout(state.preDelayId);
  clearInterval(state.preDelayTickerId);
  const preSeconds = 6 + Math.floor(Math.random() * 20); // 6..25 seconds
  // Keep button text static while generating
  el.signalBtn.textContent = 'Gerando...';
  const revealDelayMs = preSeconds * 1000;
  state.preDelayId = setTimeout(() => {
    clearInterval(state.preDelayTickerId);
    setAction(action);
    // Update next start time only for non-neutral signals
    if (action !== 'neutral') {
      alignStartTimeToExpiry();
    } else {
      el.startTime.value = '';
    }

    const signal = {
      ts: new Date(),
      asset: el.asset.value,
      expiry: 'M1',
      action,
    };
    state.lastSignal = signal;
    pushHistory(signal);

    // Show the action and start a 15–30s countdown
    el.action.classList.remove('hidden');
    const displaySeconds = 15 + Math.floor(Math.random() * 16); // 15..30 visible
    // Start a separate 2-minute cooldown for the button
    startCooldown(120);
    // Hide the action after the display window while cooldown continues
    setTimeout(() => {
      el.action.classList.add('hidden');
    }, displaySeconds * 1000);
  }, revealDelayMs);
}

function startCooldown(seconds){
  state.cooldown = seconds;
  updateButton();
  el.signalBtn.disabled = true;
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.cooldown -= 1;
    updateButton();
    if (state.cooldown <= 0){
      clearInterval(state.timerId);
      el.signalBtn.disabled = false;
      el.signalBtn.textContent = 'Gerar Sinal';
    }
  }, 1000);
}

function updateButton(){
  if (state.cooldown > 0){
    el.signalBtn.textContent = `Gerar Sinal (${state.cooldown}s)`;
  }
}

function openHistory(){
  el.historyPanel.classList.remove('hidden');
  el.historyPanel.setAttribute('aria-hidden','false');
}
function closeHistory(){
  el.historyPanel.classList.add('hidden');
  el.historyPanel.setAttribute('aria-hidden','true');
}

function openEntryModal(){
  el.entryModal.classList.remove('hidden');
  el.entryModal.setAttribute('aria-hidden','false');
}

function closeEntryModal(){
  el.entryModal.classList.add('hidden');
  el.entryModal.setAttribute('aria-hidden','true');
}

function pushHistory(item){
  const li = document.createElement('li');
  const left = document.createElement('div');
  left.className = 'item-asset';
  const name = document.createElement('strong');
  name.textContent = `${item.asset} • ${item.expiry}`;
  left.appendChild(name);

  const right = document.createElement('div');
  const badge = document.createElement('span');
  badge.className = `badge ${item.action === 'buy' ? 'buy' : item.action === 'sell' ? 'sell' : 'neutral'}`;
  badge.textContent = item.action === 'buy' ? 'Compra' : item.action === 'sell' ? 'Venda' : 'Neutro';
  right.appendChild(badge);

  const meta = document.createElement('div');
  meta.className = 'item-meta';
  const t = item.ts.toTimeString().slice(0,5);
  meta.textContent = `${t}`;
  right.appendChild(meta);

  li.appendChild(left);
  li.appendChild(right);
  el.historyList.prepend(li);
}

// Initialize
window.addEventListener('DOMContentLoaded', init);
