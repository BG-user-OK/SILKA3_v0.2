/* ===============================================================
   SIŁKA 3 — logika aplikacji (PWA)
   =============================================================== */

// ---------------------------------------------------------------
// 0. WERSJA APLIKACJI
// ---------------------------------------------------------------
const APP_VERSION = '0.6.9';

// Lista rzeczy do spakowania
const PACK_ITEMS = [
  { id: 'batki',     img: 'Photos/batki.png'     },
  { id: 'skarpy',    img: 'Photos/skarpetki.png' },
  { id: 'spodenki',  img: 'Photos/spodenki.png'  },
  { id: 'koszulka',  img: 'Photos/koszulka.png'  },
  { id: 'buty',      img: 'Photos/buty.png'       },
  { id: 'klapki',    img: 'Photos/klapki.png'     },
  { id: 'reczniki',  img: 'Photos/2ręczniki.png'  },
  { id: 'poduszka',  img: 'Photos/poduszka.png'   },
  { id: 'woda',      img: 'Photos/woda.png'       },
  { id: 'izotonic',  img: 'Photos/isotonic.png'   },
  { id: 'shake',     img: 'Photos/shake.png'      },
];

// ---------------------------------------------------------------
// 1. STAŁE I NARZĘDZIA
// ---------------------------------------------------------------

const STORAGE_KEY = 'silka3_state_v2';
const LS_APPSCRIPT = 'silka3_appscript_url';
const REST_SECONDS = 60;
const STORAGE_VERSION = 2;
const RESET_HOLD_MS = 2000;

const PL_MONTHS_SHORT = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];
const PL_MONTHS_FULL  = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const PL_DOW = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];

function pad2(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function fromISODate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function fmtDateShort(iso) {
  const d = fromISODate(iso);
  return `${d.getDate()}-${PL_MONTHS_SHORT[d.getMonth()]}`;
}
function fmtDow(iso) {
  const d = fromISODate(iso);
  return PL_DOW[d.getDay()];
}
function daysBetween(iso1, iso2) {
  const d1 = fromISODate(iso1);
  const d2 = fromISODate(iso2);
  return Math.round((d2 - d1) / 86400000);
}
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function todayISO() {
  return toISODate(new Date());
}

// Format minutnika treningu: m:mm albo h:mm (bez sekund, bez zera przed godziną)
function fmtTrainingDuration(totalSec) {
  const totalMin = Math.floor(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}:${pad2(m)}`;
  return `${m}:${pad2(0)}`.replace(/^(\d+):00$/, (s, mm) => `${mm}:00`);
  // Uproszczenie: m:mm gdzie mm to "00" — czyli pokazuje minuty.
  // Dla małych wartości (poniżej minuty) i tak będzie 0:00.
}

// Lepsza wersja — m:mm (mm = ostatnie 2 cyfry minut, ale chcemy tylko minuty)
function fmtClock(totalSec) {
  const totalMin = Math.floor(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}:${pad2(m)}`;
  // bez godzin: pokazuj tylko minuty z prefiksem 0: dla spójności wyglądu
  // Ale użytkownik chciał bez sekund — minutnik powinien wyglądać "minutami".
  // Dla minut mniejszych niż 100 wyświetlmy po prostu "M min" jako liczbę z dwucyfrowym pad
  return `${m}m`;
}

// ---------------------------------------------------------------
// 2. DANE STARTOWE (seed)
// ---------------------------------------------------------------

function defaultExercises() {
  const defs = [
    { id:1,  name:'Rozgrzewka',    sets:1, reps:'5-10 min', weight:null,  isTime:true  },
    { id:2,  name:'Ćwiczenie 2',   sets:1, reps:'12-15',    weight:null  },
    { id:3,  name:'Ćwiczenie 3',   sets:1, reps:'12-15',    weight:null  },
    { id:4,  name:'Ćwiczenie 4',   sets:1, reps:'12-15',    weight:null  },
    { id:5,  name:'Ćwiczenie 5',   sets:1, reps:'12-15',    weight:null  },
    { id:6,  name:'Ćwiczenie 6',   sets:2, reps:'12-15',    weight:null  },
    { id:7,  name:'Ćwiczenie 7',   sets:2, reps:'10-12',    weight:null  },
    { id:8,  name:'Ćwiczenie 8',   sets:4, reps:'12',       weight:10    },
    { id:9,  name:'Ćwiczenie 9',   sets:4, reps:'12',       weight:null  },
    { id:10, name:'Ćwiczenie 10',  sets:4, reps:'12',       weight:14    },
    { id:11, name:'Ćwiczenie 11',  sets:4, reps:'12',       weight:30    },
    { id:12, name:'Ćwiczenie 12',  sets:3, reps:'12',       weight:32    },
    { id:13, name:'Ćwiczenie 13',  sets:3, reps:'12',       weight:13.5  },
    { id:14, name:'Ćwiczenie 14',  sets:3, reps:'12',       weight:9     },
    { id:15, name:'Ćwiczenie 15',  sets:2, reps:'8-10',     weight:null  }
  ];
  return defs.map(e => ({
    id: e.id,
    name: e.name,
    img: `Photos/${e.id}.jpg`,
    helperImages: [],
    sets: e.sets,
    reps: e.reps,
    weight: e.weight,
    active: true,           // aktywność trwała (z edycji)
    restTimer: e.id !== 1,
    restSeconds: 60,
    isTime: !!e.isTime
  }));
}

// Historia z domyślnymi danymi.
// Każdy wpis ma flagę 'exported' (true = już w arkuszu, false = do dosłania).
// Domyślnie wszystkie startowe wpisy mają exported=false (pierwszy eksport doś​le całość).
function defaultHistory() {
  const raw = [
    { date: '2026-04-19', duration: '01:45' },
    { date: '2026-04-16', duration: '01:42' },
    { date: '2026-04-11', duration: '01:50' },
    { date: '2026-03-10', duration: '01:44' },
    { date: '2026-03-01', duration: '01:53' },
    { date: '2026-02-26', duration: '01:58' },
    { date: '2026-02-20', duration: '02:05' },
    { date: '2026-02-18', duration: '01:49' },
    { date: '2026-02-14', duration: '01:24' },
    { date: '2026-02-11', duration: '01:56' },
    { date: '2026-02-07', duration: '01:54' },
    { date: '2026-02-04', duration: '01:52' },
    { date: '2025-10-23', duration: '01:56' },
    { date: '2025-10-16', duration: '01:37' },
    { date: '2025-10-02', duration: '01:37' },
    { date: '2025-09-14', duration: '01:36' },
    { date: '2025-08-26', duration: '01:41' },
    { date: '2025-08-22', duration: '01:34' },
    { date: '2025-08-20', duration: '01:00' },
    { date: '2025-08-19', duration: '02:04' },
    { date: '2025-04-16', duration: '01:50' },
    { date: '2025-03-14', duration: '01:52' },
    { date: '2025-02-02', duration: '01:45' },
    { date: '2025-01-30', duration: '01:52' },
    { date: '2025-01-19', duration: '01:47' },
    { date: '2025-01-15', duration: '01:39' },
    { date: '2025-01-06', duration: '01:53' },
    { date: '2024-12-28', duration: '01:51' },
    { date: '2024-12-21', duration: '01:42' },
    { date: '2024-12-16', duration: '01:35' },
    { date: '2024-12-10', duration: '01:44' },
    { date: '2024-11-24', duration: '01:41' },
    { date: '2024-11-19', duration: '01:43' }
  ];
  return raw.map(h => ({ ...h, exported: false }));
}

// ---------------------------------------------------------------
// 3. STATE + PERSYSTENCJA
// ---------------------------------------------------------------

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === STORAGE_VERSION) {
        // upewnij się że wszystkie wpisy mają flagę exported
        if (Array.isArray(s.history)) {
          s.history = s.history.map(h => ({ ...h, exported: h.exported === true }));
        }
        // upewnij się że current ma poprawną strukturę
        if (s.current && !s.current.completedExercises) {
          s.current.completedExercises = [];
        }
        // Migracja brakujących pól (dodawanych w nowszych wersjach)
        if (s.packingDate === undefined) s.packingDate = null;
        if (s.goalDays === undefined || s.goalDays === null) s.goalDays = 3.5;
        // Migracja restSeconds dla każdego ćwiczenia + Waga jako string
        if (Array.isArray(s.exercises)) {
          s.exercises.forEach(ex => {
            if (ex.restSeconds === undefined || ex.restSeconds === null) ex.restSeconds = 60;
            // Waga — konwersja z liczby na string
            if (typeof ex.weight === 'number') ex.weight = `${ex.weight} kg`;
          });
        }
        return s;
      }
    }
    // Migracja ze starej wersji v1 (gdyby ktoś miał)
    const oldRaw = localStorage.getItem('silka3_state_v1');
    if (oldRaw) {
      try {
        const old = JSON.parse(oldRaw);
        if (old && old.history) {
          return {
            version: STORAGE_VERSION,
            exercises: old.exercises || defaultExercises(),
            history: (old.history || []).map(h => ({ ...h, exported: false })),
            current: old.current || null
          };
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
  return {
    version: STORAGE_VERSION,
    exercises: defaultExercises(),
    history: defaultHistory(),
    current: null,
    packingDate: null,  // ISO date — kiedy ostatnio potwierdzono pakowanie
    goalDays: 3.5,      // cel: co ile dni trening (próg dla kolorów)
  };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota? */ }
}

// ---------------------------------------------------------------
// Wake Lock — utrzymuje ekran włączony w trakcie treningu
// ---------------------------------------------------------------
let wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    console.warn('[WakeLock] nie udało się:', e.message);
  }
}
function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
// Re-acquire po powrocie do apki (gdy wybrano inną aplikację i wrócono)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.current?.startedAt) {
    acquireWakeLock();
  }
});

function vibratePhone(pattern) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }
}

// ---------------------------------------------------------------
// 4. FUNKCJE POMOCNICZE HISTORII
// ---------------------------------------------------------------



function sortedHistoryDesc() {
  return [...state.history].sort((a,b) => b.date.localeCompare(a.date));
}

function buildTrainingNumbers(list) {
  const byYear = {};
  const result = new Array(list.length);
  for (let i = list.length - 1; i >= 0; i--) {
    const y = list[i].date.slice(0,4);
    byYear[y] = (byYear[y] || 0) + 1;
    result[i] = byYear[y];
  }
  return result;
}

function avg3M(anchorISO, historyWithToday) {
  const anchor = fromISODate(anchorISO);
  const from = new Date(anchor); from.setDate(from.getDate() - 90);
  const dates = historyWithToday
    .filter(h => {
      const d = fromISODate(h.date);
      return d > from && d <= anchor;
    })
    .map(h => h.date)
    .sort();
  if (dates.length < 2) return null;
  const span = daysBetween(dates[0], dates[dates.length-1]);
  return span / (dates.length - 1);
}

// Zakres dat (od najstarszego do anchoraISO) używany do oceny "wystarczająco długiego" okresu
function spanDays3M(anchorISO, historyWithToday) {
  const anchor = fromISODate(anchorISO);
  const from = new Date(anchor); from.setDate(from.getDate() - 90);
  const dates = historyWithToday
    .filter(h => {
      const d = fromISODate(h.date);
      return d > from && d <= anchor;
    })
    .map(h => h.date)
    .sort();
  if (dates.length < 2) return 0;
  return daysBetween(dates[0], anchorISO);
}

function avgBR(anchorISO, historyWithToday) {
  const year = anchorISO.slice(0,4);
  const dates = historyWithToday
    .filter(h => h.date.slice(0,4) === year && h.date <= anchorISO)
    .map(h => h.date)
    .sort();
  if (dates.length < 2) return null;
  const span = daysBetween(dates[0], dates[dates.length-1]);
  return span / (dates.length - 1);
}

function spanDaysBR(anchorISO, historyWithToday) {
  const year = anchorISO.slice(0,4);
  const dates = historyWithToday
    .filter(h => h.date.slice(0,4) === year && h.date <= anchorISO)
    .map(h => h.date)
    .sort();
  if (dates.length < 2) return 0;
  return daysBetween(dates[0], anchorISO);
}

function fmtAvg(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return v.toFixed(1);
}

// ---------------------------------------------------------------
// 5. RENDEROWANIE
// ---------------------------------------------------------------

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ----- Ekran 0: tabela historii -----

function isPackedToday() {
  return state.packingDate === todayISO();
}

function updateBagIndicator() {
  const btn = document.getElementById('bagIndicator');
  if (isPackedToday()) {
    // Plecak spakowany — zielony znacznik + plecak
    btn.innerHTML = '<span class="bag-emoji bag-emoji--ok">🎒</span>';
    btn.title = 'Spakowane ✓ — kliknij aby zresetować';
  } else {
    // Pusta torba podróżna — czerwona aura
    btn.innerHTML = '<span class="bag-emoji bag-emoji--warn">🧳</span>';
    btn.title = 'Nie spakowane — START otworzy listę pakowania';
  }
}

// Klik w ikonę torby — reset pakowania
document.getElementById('bagIndicator').addEventListener('click', () => {
  if (isPackedToday()) {
    state.packingDate = null;
    saveState();
    updateBagIndicator();
    showToast('Pakowanie zresetowane', 'ok');
  }
});

// ----- Ekran pakowania -----

let packChecked = new Set();

function renderPackScreen() {
  packChecked = new Set();
  const grid = document.getElementById('packGrid');
  grid.innerHTML = '';
  PACK_ITEMS.forEach(item => {
    const div = document.createElement('div');
    div.className = 'pack-item';
    div.dataset.id = item.id;
    div.innerHTML = `<img class="pack-item__img" src="${item.img}" alt="${item.id}" />`;
    div.addEventListener('click', () => togglePackItem(item.id));
    grid.appendChild(div);
  });
  updatePackProgress();
}

function togglePackItem(id) {
  if (packChecked.has(id)) {
    packChecked.delete(id);
  } else {
    packChecked.add(id);
  }
  // Aktualizuj wygląd
  document.querySelectorAll('.pack-item').forEach(el => {
    if (packChecked.has(el.dataset.id)) {
      el.classList.add('packed');
    } else {
      el.classList.remove('packed');
    }
  });
  updatePackProgress();
  // Wszystkie spakowane → animacja i zamknięcie
  if (packChecked.size === PACK_ITEMS.length) {
    confirmPacking(true);
  }
}

function updatePackProgress() {
  // Brak licznika tekstowego — sprawdzamy tylko czy wszystkie spakowane
  if (packChecked.size === PACK_ITEMS.length) {
    confirmPacking(true);
  }
}

function confirmPacking(withAnimation) {
  state.packingDate = todayISO();
  saveState();
  updateBagIndicator();
  if (withAnimation) {
    // Supernowa na ekranie pakowania, potem home
    const cel = document.getElementById('celebrationPack');
    cel.hidden = false;
    cel.style.animation = 'none';
    cel.offsetHeight;
    cel.style.animation = '';
    setTimeout(() => {
      cel.hidden = true;
      renderHome();
      showScreen('screen-home');
    }, 1500);
  } else {
    renderHome();
    showScreen('screen-home');
  }
}

document.getElementById('btnPackAccept').addEventListener('click', () => {
  confirmPacking(true);
  showToast('Spakowane! Miłego treningu 💪', 'ok');
});

document.getElementById('btnPackCancel').addEventListener('click', () => {
  // Wróć bez pakowania
  showScreen('screen-home');
});

// ----- renderHome -----

function renderHome() {
  // Wersja
  document.getElementById('versionTag').textContent = `v${APP_VERSION}`;
  updateBagIndicator();

  // Punkt 25 — obrazek fotokoniec.jpg gdy dziś już jest trening
  const todayStr = todayISO();
  const todayDoneEntry = state.history.some(h => h.date === todayStr);
  const btnStartEl = document.getElementById('btnStart');
  const finishImgEl = document.getElementById('homeFinishImg');
  if (todayDoneEntry) {
    btnStartEl.hidden = true;
    finishImgEl.hidden = false;
  } else {
    btnStartEl.hidden = false;
    finishImgEl.hidden = true;
  }

  const body = document.getElementById('historyBody');
  body.innerHTML = '';

  const today = todayISO();
  const hist = sortedHistoryDesc();
  const todayDone = hist.some(h => h.date === today);

  const displayList = todayDone
    ? hist
    : [{ date: today, duration: null, planned: true }, ...hist];

  const historyPlusToday = todayDone ? hist : [{ date: today, duration: null }, ...hist];

  const numsReal = buildTrainingNumbers(hist);
  const realYearCounts = {};
  hist.forEach(h => {
    const y = h.date.slice(0,4);
    realYearCounts[y] = (realYearCounts[y] || 0) + 1;
  });
  const todayYear = today.slice(0,4);
  const todayPlannedNumber = (realYearCounts[todayYear] || 0) + 1;

  displayList.forEach((h, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.date = h.date;
    tr.dataset.rowIndex = idx;

    if (h.planned) {
      tr.classList.add('row-planned');
    } else if (idx === 0 && todayDone && h.date === today) {
      tr.classList.add('row-today-done');
    } else {
      const base = (idx - (todayDone ? 0 : 1));
      tr.classList.add(base % 2 === 0 ? 'row-light' : 'row-dark');
    }

    let num;
    if (h.planned) {
      num = todayPlannedNumber;
    } else {
      const iReal = hist.indexOf(h);
      num = numsReal[iReal];
    }

    const dateText = fmtDateShort(h.date);
    const dowText  = fmtDow(h.date);
    const durText  = h.duration ? h.duration.replace(/^0/, '') : '—';

    let breakText = '—';
    let nextOlder;
    if (h.planned) {
      nextOlder = hist[0];
    } else {
      const iReal = hist.indexOf(h);
      nextOlder = hist[iReal + 1];
    }
    if (nextOlder) {
      breakText = String(daysBetween(nextOlder.date, h.date));
    }

    const a3raw = avg3M(h.date, historyPlusToday);
    const aBraw = avgBR(h.date, historyPlusToday);
    const a3 = fmtAvg(a3raw);
    const aB = fmtAvg(aBraw);

    // Próg z celu treningowego
    const goal = state.goalDays || 3.5;

    // Kolorowanie warunkowe
    // Przerwa: ≤cel*1.15 = zielono, >cel*1.15 = czerwono (lekka tolerancja)
    const breakVal = nextOlder ? daysBetween(nextOlder.date, h.date) : null;
    const breakColor = breakVal === null ? '' :
      breakVal <= Math.ceil(goal + 0.5) ? 'color:var(--green-glow)' : 'color:var(--red-glow)';

    // Helper — kolor dla średniej z uwzględnieniem poprzedniego (starszego) wiersza i okresu obserwacji
    // Zielony tylko gdy: (1) wartość ≤ cel ORAZ (2) zakres dat ≥ minSpanDays
    function avgColor(currentVal, getPrevVal, spanDays, minSpanDays) {
      if (currentVal === null) return '';
      const enoughData = spanDays >= minSpanDays;

      if (currentVal <= goal && enoughData) return 'color:var(--green-glow)';
      if (currentVal <= goal && !enoughData) return 'color:var(--orange)';  // wynik OK ale za mało danych

      // currentVal > goal — sprawdź trend
      const prevVal = getPrevVal();
      if (prevVal !== null && currentVal < prevVal) {
        return 'color:var(--orange)';  // pogarszanie wstrzymane, idzie ku lepszemu
      }
      return 'color:var(--red-glow)';
    }

    // Funkcje pobierania średnich z poprzedniego (starszego) wiersza
    const getPrevA3 = () => nextOlder ? avg3M(nextOlder.date, historyPlusToday) : null;
    const getPrevAB = () => nextOlder ? avgBR(nextOlder.date, historyPlusToday) : null;

    // Zakresy dat dla bieżącego wiersza
    const span3M = spanDays3M(h.date, historyPlusToday);
    const spanBR = spanDaysBR(h.date, historyPlusToday);

    const a3Color = avgColor(a3raw, getPrevA3, span3M, 90);
    const aBColor = avgColor(aBraw, getPrevAB, spanBR, 365);

    tr.innerHTML = `
      <td class="col-num">${num}</td>
      <td class="col-date">${dateText}</td>
      <td class="col-dow">${dowText}</td>
      <td class="col-duration">${durText}</td>
      <td class="col-break" style="${breakColor}">${breakText}</td>
      <td class="col-3m"    style="${a3Color}">${a3}</td>
      <td class="col-br"    style="${aBColor}">${aB}</td>
    `;
    body.appendChild(tr);
  });
}

// ----- Ekran 1: lista ćwiczeń (uproszczona, podzielona) -----

function getTotalSetsInfo() {
  let total = 0, done = 0;
  state.exercises.forEach(ex => {
    if (!ex.active) return;
    total += ex.sets;
    const d = state.current?.sets?.[ex.id] || 0;
    done += Math.min(d, ex.sets);
  });
  return { total, done, left: Math.max(0, total - done) };
}

function isExerciseDone(ex) {
  if (!ex.active) return false;
  const d = state.current?.sets?.[ex.id] || 0;
  return d >= ex.sets;
}

function renderSetDots(done, total) {
  if (total > 8) {
    return `<span class="sets-fallback"><span>${done}</span><small>/${total}</small></span>`;
  }
  // Kompaktowo na liście — ZAWSZE w jednym rzędzie (jest miejsce na 8)
  let html = '<span class="sets-dots">';
  for (let i = 0; i < total; i++) {
    const cls = i < done ? 'ball filled' : 'ball empty';
    html += `<span class="${cls}"></span>`;
  }
  html += '</span>';
  return html;
}

function renderSetDotsLarge(done, total) {
  // Wersja duża dla ekranu 2 — układ: 3 lub 4 w rzędzie zależnie od liczby
  if (total > 8) {
    return `<span class="sets-fallback"><span>${done}</span><small>/${total}</small></span>`;
  }
  // Dla 4: po 2 w rzędzie. Dla 3: 3 w rzędzie. Dla 5,6: 3 w rzędzie. Dla 2: 2 w rzędzie. Dla 1: 1.
  let perRow;
  if (total <= 2) perRow = total;
  else if (total === 4) perRow = 2;
  else if (total <= 6) perRow = 3;
  else perRow = 4;

  let html = `<span class="sets-dots-large" style="grid-template-columns: repeat(${perRow}, 1fr);">`;
  for (let i = 0; i < total; i++) {
    const cls = i < done ? 'ball-lg filled' : 'ball-lg empty';
    html += `<span class="${cls}"></span>`;
  }
  html += '</span>';
  return html;
}

function renderExerciseList() {
  const list = document.getElementById('exerciseList');
  list.innerHTML = '';

  // Podział: górna sekcja = aktywne + niewykonane (w oryginalnej kolejności)
  //          dolna sekcja = wykonane (w kolejności wykonania) + trwale nieaktywne
  const top = [];
  const bottomDone = [];
  const bottomInactive = [];

  // Lista wykonanych w kolejności wykonania (ostatnio wykonane na końcu)
  const completedOrder = state.current?.completedExercises || [];

  const doneSet = new Set(completedOrder);
  state.exercises.forEach(ex => {
    if (!ex.active) {
      bottomInactive.push(ex);
    } else if (doneSet.has(ex.id) || isExerciseDone(ex)) {
      // jeśli ćwiczenie ukończone ale nie ma go w completedOrder (np. po reload),
      // dodaj do completedOrder retroaktywnie
      if (!doneSet.has(ex.id) && state.current) {
        state.current.completedExercises.push(ex.id);
      }
    } else {
      top.push(ex);
    }
  });

  // Wykonane wg completedOrder (zachowując kolejność wykonania)
  completedOrder.forEach(id => {
    const ex = state.exercises.find(e => e.id === id);
    if (ex && ex.active) bottomDone.push(ex);
  });

  // Render
  const renderItem = (ex, mode) => {
    const done = state.current?.sets?.[ex.id] || 0;
    const li = document.createElement('li');
    li.className = 'exercise-item';
    if (mode === 'done')     li.classList.add('done');
    if (mode === 'inactive') li.classList.add('inactive-permanent');
    if (reorderingExId === ex.id) li.classList.add('reordering');
    li.dataset.id = ex.id;

    if (reorderingExId === ex.id) {
      // Tryb przestawiania — pokaż strzałki ↑↓ + ✓ (gotowe)
      li.innerHTML = `
        <button class="reorder-ok" data-dir="ok" aria-label="Gotowe">✓</button>
        <div class="exercise-item__name">${ex.name}</div>
        <div class="reorder-controls">
          <button class="reorder-btn" data-dir="up" aria-label="W górę">▲</button>
          <button class="reorder-btn" data-dir="down" aria-label="W dół">▼</button>
        </div>
      `;
      list.appendChild(li);
      li.querySelectorAll('button[data-dir]').forEach(btn => {
        const handler = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const dir = btn.dataset.dir;
          if (dir === 'up') moveExercise(ex.id, -1);
          else if (dir === 'down') moveExercise(ex.id, +1);
          else exitReorderMode();
        };
        // touchstart natychmiastowy, click jako fallback dla myszy
        btn.addEventListener('touchstart', handler, { passive: false });
        btn.addEventListener('click', (e) => {
          // tylko desktop / mysz
          if (e.detail > 0) handler(e);
        });
      });
      return;
    }

    li.innerHTML = `
      <div class="exercise-item__thumb">
        <img src="${ex.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${ex.id}'}))">
      </div>
      <div class="exercise-item__name">${ex.name}</div>
      <div class="exercise-item__sets">
        ${renderSetDots(done, ex.sets)}
      </div>
    `;
    list.appendChild(li);
    // Long-press na thumbie → toggle aktywności
    const thumb = li.querySelector('.exercise-item__thumb');
    if (thumb) setupLongPressForThumb(thumb, ex.id);
    // Long-press na prawej części (nazwa + kule) → tryb reorderowania
    const name = li.querySelector('.exercise-item__name');
    const sets = li.querySelector('.exercise-item__sets');
    if (name) setupLongPressForReorder(name, ex.id);
    if (sets) setupLongPressForReorder(sets, ex.id);
  };

  top.forEach(ex => renderItem(ex, 'top'));
  bottomDone.forEach(ex => renderItem(ex, 'done'));
  bottomInactive.forEach(ex => renderItem(ex, 'inactive'));

  // Przycisk "Dodaj ćwiczenie" na końcu
  const addLi = document.createElement('li');
  addLi.className = 'exercise-item exercise-item--add';
  addLi.innerHTML = `
    <div class="exercise-item__thumb exercise-item__thumb--add">+</div>
    <div class="exercise-item__name">Dodaj ćwiczenie</div>
    <div class="exercise-item__sets"></div>
  `;
  addLi.addEventListener('click', addNewExercise);
  list.appendChild(addLi);

  updateTopPanels();
}

function updateTopPanels() {
  const info = getTotalSetsInfo();
  document.getElementById('setsDone').textContent = info.done;
  document.getElementById('setsLeft').textContent = info.left;
  document.getElementById('setsDone2').textContent = info.done;
  document.getElementById('setsLeft2').textContent = info.left;
}

// ----- Ekran 2: wykonanie ćwiczenia -----

let currentExerciseId = null;

function renderExerciseScreen(exId) {
  currentExerciseId = exId;
  const ex = state.exercises.find(e => e.id === exId);
  if (!ex) return;

  const img = document.getElementById('exerciseImage');
  const fallback = document.getElementById('exerciseImageFallback');
  img.src = ex.img;
  img.classList.remove('hidden');
  fallback.textContent = '';
  img.onerror = () => {
    img.classList.add('hidden');
    fallback.textContent = '#' + ex.id;
  };
  img.onload = () => {
    fallback.textContent = '';
  };

  const done = state.current?.sets?.[ex.id] || 0;
  const params = document.getElementById('exerciseParams');
  // Waga może być stringiem (np. "12 kg" lub "12-18 kg") lub liczbą (legacy)
  let weightHTML = '';
  if (ex.weight !== null && ex.weight !== undefined && ex.weight !== '') {
    const wDisplay = typeof ex.weight === 'number' ? `${ex.weight} kg` : ex.weight;
    weightHTML = `<div class="param weight"><span class="param__label">Waga</span><span class="param__value">${wDisplay}</span></div>`;
  }
  params.innerHTML = `
    <div class="param sets">
      <span class="param__label">Serie</span>
      <span class="param__value">${renderSetDotsLarge(done, ex.sets)}</span>
    </div>
    <div class="param reps">
      <span class="param__label">${ex.isTime ? 'Czas' : 'Powt.'}</span>
      <span class="param__value">${ex.reps}</span>
    </div>
    ${weightHTML}
  `;

  const helpers = document.getElementById('helperImages');
  helpers.innerHTML = '';
  (ex.helperImages || []).forEach(src => {
    const im = document.createElement('img');
    im.src = src; im.alt = '';
    helpers.appendChild(im);
  });

  // Long-press na głównym obrazku → toggle aktywności
  setupLongPressForThumb(img.parentElement, ex.id);

  updateTopPanels();
}

// ---------------------------------------------------------------
// 6. LOGIKA TRENINGU
// ---------------------------------------------------------------

function ensureCurrentTraining() {
  if (!state.current) {
    state.current = {
      startISO: null,
      startHM: null,
      startedAt: null,
      sets: {},
      completedExercises: []
    };
  }
  if (!state.current.completedExercises) {
    state.current.completedExercises = [];
  }
}

function startTrainingIfNeeded() {
  ensureCurrentTraining();
  if (!state.current.startedAt) {
    const now = new Date();
    state.current.startISO = toISODate(now);
    state.current.startHM = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    state.current.startedAt = now.getTime();
    saveState();
    startTrainingTimer();
  }
}

let trainingTimerInterval = null;
function startTrainingTimer() {
  document.getElementById('trainingClockList').hidden = false;
  document.getElementById('trainingClockEx').hidden = false;
  acquireWakeLock();  // utrzymaj ekran włączony
  if (trainingTimerInterval) clearInterval(trainingTimerInterval);
  const tick = () => {
    if (!state.current?.startedAt) return;
    const ms = Date.now() - state.current.startedAt;
    const totalSec = Math.floor(ms / 1000);
    const totalMin = Math.floor(totalSec / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    // Bez sekund: samo "M" gdy <60min, "H:MM" gdy >=1h, bez zera przed godziną
    const text = h > 0 ? `${h}:${pad2(m)}` : `${totalMin}`;
    document.getElementById('trainingTimerList').textContent = text;
    document.getElementById('trainingTimerEx').textContent = text;
  };
  tick();
  trainingTimerInterval = setInterval(tick, 1000);
}
function stopTrainingTimer() {
  if (trainingTimerInterval) clearInterval(trainingTimerInterval);
  trainingTimerInterval = null;
  document.getElementById('trainingClockList').hidden = true;
  document.getElementById('trainingClockEx').hidden = true;
  releaseWakeLock();
}
function resetCurrentTraining() {
  state.current = null;
  state.packingDate = null;  // reset też pakowanie (testowanie / czyszczenie)
  stopTrainingTimer();
  endRestCountdown();
  setButtonMode('green');
  saveState();
  updateBagIndicator();
}

// --- Licznik przerwy ---

let restInterval = null;
let restRemaining = 0;

function setButtonMode(mode) {
  // Tylko ekran 2 ma przyciski potwierdzenia
  const btn = document.getElementById('btnConfirmSet2');
  const rest = document.getElementById('restTimer2');
  if (mode === 'green') {
    btn.hidden = false;
    rest.hidden = true;
  } else {
    btn.hidden = true;
    rest.hidden = false;
  }
}

let restTotalSeconds = 60;

function startRestCountdown() {
  // Pobierz długość przerwy z bieżącego ćwiczenia (z fallbackiem na 60s)
  const ex = state.exercises.find(e => e.id === currentExerciseId);
  const seconds = (ex && ex.restSeconds) ? ex.restSeconds : REST_SECONDS;
  restTotalSeconds = seconds;
  restRemaining = seconds;
  setButtonMode('rest');
  // Krótka wibracja jako "registration" user gesture dla późniejszej wibracji
  vibratePhone(50);

  // Wybuduj baterię — kreski w środku
  buildBatteryFill(seconds);
  // Pokaż info o seriach (kropki)
  buildBatterySetsInfo(ex);

  const overlay = document.getElementById('restOverlay');
  overlay.hidden = false;
  overlay.onclick = null;  // overlay sam nie reaguje, tylko strefa stop
  document.getElementById('batteryStopZone').onclick = (e) => {
    e.stopPropagation();
    skipRest();
  };

  updateRestUI();
  if (restInterval) clearInterval(restInterval);
  restInterval = setInterval(() => {
    restRemaining -= 1;
    updateRestUI();
    if (restRemaining <= 0) {
      finishRestCountdown();
    }
  }, 1000);
}

function buildBatteryFill(seconds) {
  const fill = document.getElementById('batteryFill');
  fill.innerHTML = '';
  // Każda sekunda = 1 kreska. Wszystkie kreski mają równą wysokość = 100/seconds %
  const barHeightPct = 100 / seconds;
  for (let i = 0; i < seconds; i++) {
    const bar = document.createElement('div');
    bar.className = 'battery-fill__bar';
    bar.dataset.idx = i;
    bar.style.height = '0';  // wszystkie startują puste, rosną kolejno
    fill.appendChild(bar);
  }
}

function buildBatterySetsInfo(ex) {
  const info = document.getElementById('batterySetsInfo');
  info.innerHTML = '';
  if (!ex) return;
  const done = state.current?.sets?.[ex.id] || 0;
  for (let i = 0; i < ex.sets; i++) {
    const ball = document.createElement('span');
    ball.className = 'ball-lg ' + (i < done ? 'filled' : 'empty');
    info.appendChild(ball);
  }
}

function updateRestUI() {
  // Ile sekund minęło
  const elapsed = restTotalSeconds - restRemaining;
  const pct = Math.min(100, Math.round(elapsed * 100 / restTotalSeconds));
  document.getElementById('batteryPercent').textContent = pct + '%';

  // Wypełniaj kreski w baterii — od dołu (column-reverse robi to automatycznie)
  // Każda kreska ma wysokość 100/total %, "wypełnione" = ustawiona height
  const barHeightPct = 100 / restTotalSeconds;
  const bars = document.querySelectorAll('#batteryFill .battery-fill__bar');
  bars.forEach((b, i) => {
    if (i < elapsed) {
      b.style.height = barHeightPct + '%';
    } else {
      b.style.height = '0';
    }
  });
}

let restDoneTimer = null;
function finishRestCountdown() {
  if (restInterval) clearInterval(restInterval);
  restInterval = null;
  // Ukryj overlay odliczania
  document.getElementById('restOverlay').hidden = true;
  setButtonMode('green');
  // Wibracja — wzór mocny: 5 silnych pulsów. Pixel 8 Pro: powtórz po 200ms dla pewności.
  vibratePhone([500, 200, 500, 200, 500, 200, 700]);
  // Backup — drugi wzór po krótkiej chwili (czasem pierwsza ginie przez agresywne power-saving)
  setTimeout(() => vibratePhone([300, 150, 300]), 100);
  // Migający zielony — 6 rozbłysków = ~3.6s zsynchronizowanych, lub klik
  const flash = document.getElementById('restDoneOverlay');
  flash.hidden = false;
  // Reset animacji CSS
  flash.style.animation = 'none';
  flash.offsetHeight;
  flash.style.animation = '';
  flash.onclick = () => endRestDoneAndStandby();
  if (restDoneTimer) clearTimeout(restDoneTimer);
  restDoneTimer = setTimeout(endRestDoneAndStandby, 3700);
}
function endRestDoneAndStandby() {
  // Po rozbłysku → przejście w tryb czarnego ekranu czuwania
  if (restDoneTimer) { clearTimeout(restDoneTimer); restDoneTimer = null; }
  document.getElementById('restDoneOverlay').hidden = true;
  showStandbyOverlay();
}
function endRestCountdown() {
  // używane do twardego anulowania (np. powrót na home)
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  if (restDoneTimer) { clearTimeout(restDoneTimer); restDoneTimer = null; }
  document.getElementById('restOverlay').hidden = true;
  document.getElementById('restDoneOverlay').hidden = true;
  hideStandbyOverlay();
  setButtonMode('green');
}
function skipRest() {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  document.getElementById('restOverlay').hidden = true;
  setButtonMode('green');
}

// Czarny ekran czuwania — kliknięcie gdziekolwiek wraca do normalnego widoku
function showStandbyOverlay() {
  const ov = document.getElementById('standbyOverlay');
  if (ov) ov.hidden = false;
}
function hideStandbyOverlay() {
  const ov = document.getElementById('standbyOverlay');
  if (ov) ov.hidden = true;
}

function confirmSet() {
  if (!currentExerciseId) return;
  // Warm-up wibracji — krótki impuls jako user gesture
  vibratePhone(20);
  startTrainingIfNeeded();
  ensureCurrentTraining();
  const ex = state.exercises.find(e => e.id === currentExerciseId);
  if (!ex) return;
  const done = state.current.sets[ex.id] || 0;
  if (done >= ex.sets) return;

  state.current.sets[ex.id] = done + 1;
  saveState();
  updateTopPanels();

  if (isTrainingComplete()) {
    finishTraining();
    return;
  }

  // Ostatnia seria tego ćwiczenia → animacja + przejście do kolejnego ćwiczenia
  if (state.current.sets[ex.id] >= ex.sets) {
    if (!state.current.completedExercises.includes(ex.id)) {
      state.current.completedExercises.push(ex.id);
    }
    saveState();
    if (document.getElementById('screen-exercise').classList.contains('active')) {
      renderExerciseScreen(ex.id);
      showCelebration(() => {
        goToNextExerciseOrList(ex.id);
      });
      return;
    }
  }

  if (document.getElementById('screen-exercise').classList.contains('active')) {
    renderExerciseScreen(ex.id);
  }
  renderExerciseList();

  if (ex.restTimer) startRestCountdown();
  else setButtonMode('green');
}

function goToNextExerciseOrList(currentExId) {
  // Znajdź następne aktywne ćwiczenie po bieżącym, które nie jest wykonane
  const activeOrder = state.exercises.filter(e => e.active);
  const currentIdx = activeOrder.findIndex(e => e.id === currentExId);
  let nextEx = null;
  // Najpierw szukaj po bieżącym
  for (let i = currentIdx + 1; i < activeOrder.length; i++) {
    if (!isExerciseDone(activeOrder[i])) { nextEx = activeOrder[i]; break; }
  }
  // Potem od początku
  if (!nextEx) {
    for (let i = 0; i < currentIdx; i++) {
      if (!isExerciseDone(activeOrder[i])) { nextEx = activeOrder[i]; break; }
    }
  }
  if (nextEx) {
    currentExerciseId = nextEx.id;
    renderExerciseScreen(nextEx.id);
    setButtonMode('green');
    // Pozostajemy na ekranie 2 z nowym ćwiczeniem
  } else {
    // Brak więcej ćwiczeń — wróć do listy (nie powinno się zdarzyć poza końcem treningu)
    currentExerciseId = null;
    renderExerciseList();
    showScreen('screen-list');
    setButtonMode('green');
  }
}

function addNewExercise() {
  // Znajdź najwyższy id
  const maxId = state.exercises.reduce((m, e) => Math.max(m, e.id), 0);
  const newId = maxId + 1;
  const newEx = {
    id: newId,
    name: `Ćwiczenie ${newId}`,
    img: `Photos/${newId}.jpg`,
    helperImages: [],
    sets: 3,
    reps: '12',
    weight: null,
    active: true,
    restTimer: true,
    restSeconds: 60,
    isTime: false
  };
  state.exercises.push(newEx);
  saveState();
  // Otwórz modal edycji nowego ćwiczenia
  editingExerciseId = newId;
  openEditExercise(newId);
}

function isTrainingComplete() {
  if (!state.current) return false;
  for (const ex of state.exercises) {
    if (!ex.active) continue;
    const d = state.current.sets[ex.id] || 0;
    if (d < ex.sets) return false;
  }
  return true;
}

async function finishTraining() {
  if (!state.current?.startedAt) return;
  const now = new Date();
  const [sh, sm] = state.current.startHM.split(':').map(Number);
  const [sy, smo, sd] = state.current.startISO.split('-').map(Number);
  const startNoSec = new Date(sy, smo - 1, sd, sh, sm, 0, 0);
  const endNoSec = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
  const diffMs = endNoSec - startNoSec;
  const totalMin = Math.max(0, Math.round(diffMs / 60000));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const duration = `${pad2(hh)}:${pad2(mm)}`;
  const entryDate = toISODate(endNoSec);

  state.history = state.history.filter(h => h.date !== entryDate);
  state.history.push({ date: entryDate, duration, exported: false });
  state.current = null;
  saveState();

  stopTrainingTimer();
  endRestCountdown();
  setButtonMode('green');

  showCelebration(() => {
    currentExerciseId = null;
    // NAJPIERW pokaż ekran home — eksport robimy w tle żeby user nie czekał
    renderHome();
    showScreen('screen-home');

    // Eksport w tle (fire-and-forget)
    const url = (localStorage.getItem(LS_APPSCRIPT) || '').trim();
    if (url) {
      showToast('Wysyłanie w tle...', 'ok');
      exportPendingToSheets(url).then(ok => {
        if (ok) {
          showToast('Wyeksportowano do arkusza ✓', 'ok');
        } else {
          showToast('Eksport nieudany — przy następnym treningu', 'err');
        }
      }).catch(() => {
        showToast('Eksport nieudany — przy następnym treningu', 'err');
      });
    } else {
      showToast('Eksport: kliknij 3× w wersję, by skonfigurować URL', 'err');
    }
  });
}

function showCelebration(cb) {
  const cel = document.getElementById('celebration');
  // Przeklejamy do body żeby celebration nie zniknęło przy renderowaniu ekranu
  if (cel.parentElement !== document.body) {
    document.body.appendChild(cel);
  }
  // Wymuś style — fixed na całym viewport
  cel.style.position = 'fixed';
  cel.style.inset = '0';
  cel.style.zIndex = '9999';

  // FAZA 1 — zielona fala
  cel.classList.remove('celebration--blackwave', 'celebration--phase2');
  cel.hidden = false;
  cel.style.animation = 'none';
  cel.offsetHeight;
  cel.style.animation = '';

  setTimeout(() => {
    // FAZA 2 — czarna fala (rozszerza się od środka, kryje cały ekran)
    cel.classList.add('celebration--blackwave');
    cel.style.animation = 'none';
    cel.offsetHeight;
    cel.style.animation = '';

    setTimeout(() => {
      // W trakcie pełnej czerni (apex czarnej fali) — wykonaj callback (zmiana ekranu)
      if (cb) cb();

      // FAZA 3 — drugi zielony rozbłysk po przerysowaniu ekranu
      cel.classList.remove('celebration--blackwave');
      cel.classList.add('celebration--phase2');
      cel.style.animation = 'none';
      cel.offsetHeight;
      cel.style.animation = '';

      setTimeout(() => {
        cel.hidden = true;
        cel.classList.remove('celebration--phase2');
      }, 1000);
    }, 700);  // czarna fala: pokrycie ekranu
  }, 1300);  // zielona fala: trochę krócej żeby cała sekwencja nie była za długa
}

// ---------------------------------------------------------------
// 7. EDYCJA ĆWICZENIA
// ---------------------------------------------------------------

let editingExerciseId = null;
function openEditExercise(exId) {
  const ex = state.exercises.find(e => e.id === exId);
  if (!ex) return;
  editingExerciseId = exId;
  document.getElementById('fName').value = ex.name;
  document.getElementById('fSets').value = ex.sets;
  document.getElementById('fReps').value = ex.reps;
  // Waga — string (jeśli stara wersja ma liczbę, dolej "kg")
  let weightDisplay = '';
  if (ex.weight !== null && ex.weight !== undefined && ex.weight !== '') {
    weightDisplay = (typeof ex.weight === 'number') ? `${ex.weight} kg` : String(ex.weight);
  }
  document.getElementById('fWeight').value = weightDisplay;
  document.getElementById('fActive').checked = !!ex.active;
  document.getElementById('fRestTimer').checked = !!ex.restTimer;
  document.getElementById('fRestSeconds').value = ex.restSeconds || 60;
  document.getElementById('modalEditExercise').hidden = false;
}
function closeModal(id) {
  document.getElementById(id).hidden = true;
}

document.getElementById('formEditExercise').addEventListener('submit', e => {
  e.preventDefault();
  const ex = state.exercises.find(e2 => e2.id === editingExerciseId);
  if (!ex) return;
  const newSets = Math.max(0, parseInt(document.getElementById('fSets').value, 10) || 0);
  const newReps = document.getElementById('fReps').value.trim() || ex.reps;
  const newWeight = document.getElementById('fWeight').value.trim() || null;  // string lub null
  const newActive = document.getElementById('fActive').checked;
  const newRest = document.getElementById('fRestTimer').checked;
  const newRestSec = Math.max(5, Math.min(600, parseInt(document.getElementById('fRestSeconds').value, 10) || 60));
  const newName = document.getElementById('fName').value.trim() || ex.name;

  ex.name = newName;
  ex.sets = newSets;
  ex.reps = newReps;
  ex.weight = newWeight;  // teraz string
  ex.active = newActive;
  ex.restTimer = newRest;
  ex.restSeconds = newRestSec;

  if (state.current?.sets?.[ex.id] != null && state.current.sets[ex.id] > newSets) {
    state.current.sets[ex.id] = newSets;
  }

  saveState();
  closeModal('modalEditExercise');
  if (document.getElementById('screen-exercise').classList.contains('active')) {
    renderExerciseScreen(ex.id);
  }
  renderExerciseList();
  showToast('Zapisano', 'ok');
});

// ---------------------------------------------------------------
// 8. EDYCJA HISTORII
// ---------------------------------------------------------------

let historyEditMode = false;
let historyDraft = null;
let calendarState = null;

function enterHistoryEdit() {
  historyEditMode = true;
  historyDraft = state.history.map(h => ({ ...h }));
  document.getElementById('btnEditHistory').classList.add('active');
  document.getElementById('editActions').hidden = false;
  document.getElementById('btnStart').classList.add('disabled');
  document.getElementById('btnEditGoal').hidden = false;  // pokaż ołówek przy 3M
  renderHomeFromDraft();
}
function exitHistoryEdit(save) {
  if (save && historyDraft) {
    // Wykryj zmiany — wpisy które zmieniły datę → exported = false
    const orig = state.history;
    historyDraft.forEach(d => {
      const wasInOrig = orig.find(o => o.date === d.date && o.duration === d.duration);
      if (!wasInOrig) {
        d.exported = false;  // zmieniony → do ponownego eksportu
      }
    });
    state.history = historyDraft;
    saveState();
    showToast('Zapisano historię', 'ok');
  }
  historyEditMode = false;
  historyDraft = null;
  document.getElementById('btnEditHistory').classList.remove('active');
  document.getElementById('editActions').hidden = true;
  document.getElementById('btnStart').classList.remove('disabled');
  document.getElementById('btnEditGoal').hidden = true;  // ukryj ołówek przy 3M
  renderHome();
}

// Edycja celu treningowego
document.getElementById('btnEditGoal').addEventListener('click', () => {
  const current = state.goalDays || 3.5;
  const val = prompt('Cel: co ile dni trening? (np. 3.5)', String(current));
  if (val === null) return;
  const num = parseFloat(val.replace(',', '.'));
  if (isNaN(num) || num < 0.5 || num > 30) {
    showToast('Niepoprawna wartość (0.5–30)', 'err');
    return;
  }
  state.goalDays = num;
  saveState();
  renderHomeFromDraft();
  showToast(`Cel: co ${num} dni`, 'ok');
});

function renderHomeFromDraft() {
  const orig = state.history;
  state.history = historyDraft;
  renderHome();

  document.querySelectorAll('#historyBody tr').forEach(tr => {
    const date = tr.dataset.date;

    // Data — klikalna we WSZYSTKICH wierszach (w tym planowanym)
    const tdDate = tr.querySelector('td.col-date');
    if (tdDate) {
      tdDate.style.cursor = 'pointer';
      tdDate.style.color = 'var(--yellow)';
      tdDate.style.textDecoration = 'underline';
      tdDate.addEventListener('click', () => openDatePicker(date, 'date'));
    }

    // Czas trwania — klikalny we wszystkich wierszach
    const tdDur = tr.querySelector('td.col-duration');
    if (tdDur) {
      tdDur.style.cursor = 'pointer';
      tdDur.style.color = 'var(--yellow)';
      tdDur.style.textDecoration = 'underline';
      tdDur.addEventListener('click', () => openDurationEditor(date));
    }
  });

  state.history = orig;
}

function openDurationEditor(iso) {
  // Znajdź aktualny czas trwania w drafcie
  const entry = historyDraft.find(h => h.date === iso);
  const current = entry ? (entry.duration || '') : '';
  const val = prompt(`Czas trwania dla ${fmtDateShort(iso)} (format hh:mm, np. 1:45):`, current);
  if (val === null) return; // anulowano

  const trimmed = val.trim();
  // Walidacja prostego formatu h:mm lub hh:mm
  if (trimmed && !/^\d{1,2}:\d{2}$/.test(trimmed)) {
    showToast('Zły format — wpisz np. 1:45', 'err');
    return;
  }

  if (entry) {
    // Wpis istnieje w drafcie — aktualizuj
    entry.duration = trimmed || null;
    entry.exported = false;
  } else {
    // Wiersz planowany — dodaj nowy wpis do draftu
    historyDraft.push({ date: iso, duration: trimmed || null, exported: false });
  }
  renderHomeFromDraft();
  showToast('Czas zaktualizowany', 'ok');
}

function openDatePicker(iso, field) {
  const d = fromISODate(iso);
  calendarState = { forDate: iso, field: field || 'date', viewYear: d.getFullYear(), viewMonth: d.getMonth() };
  renderCalendar();
  document.getElementById('modalDatePicker').hidden = false;
}
function renderCalendar() {
  const title = document.getElementById('calTitle');
  const grid  = document.getElementById('calGrid');
  const { viewYear, viewMonth, forDate } = calendarState;
  title.textContent = `${PL_MONTHS_FULL[viewMonth]} ${viewYear}`;
  grid.innerHTML = '';

  const first = new Date(viewYear, viewMonth, 1);
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();

  for (let i = 0; i < firstDow; i++) {
    const dayNum = prevDays - firstDow + 1 + i;
    const el = document.createElement('div');
    el.className = 'calendar__day muted';
    el.textContent = dayNum;
    grid.appendChild(el);
  }
  const todayIso = todayISO();
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${viewYear}-${pad2(viewMonth+1)}-${pad2(d)}`;
    const el = document.createElement('button');
    el.className = 'calendar__day';
    if (iso === todayIso) el.classList.add('today');
    if (iso === forDate)  el.classList.add('selected');
    el.textContent = d;
    el.addEventListener('click', () => chooseDate(iso));
    grid.appendChild(el);
  }
  while (grid.children.length % 7 !== 0) {
    const el = document.createElement('div');
    el.className = 'calendar__day muted';
    grid.appendChild(el);
  }
}
function chooseDate(newIso) {
  if (!historyDraft || !calendarState) return;
  const oldIso = calendarState.forDate;

  // Sprawdź kolizję z istniejącym wpisem
  const existing = historyDraft.find(h => h.date === newIso);

  let entry = historyDraft.find(h => h.date === oldIso);

  if (!entry) {
    // Wiersz planowany (dzisiejszy) — tworzymy nowy wpis w drafcie
    if (existing) {
      showToast('Ta data już istnieje', 'err');
      return;
    }
    historyDraft.push({ date: newIso, duration: null, exported: false });
  } else {
    // Istniejący wpis — zmień datę
    if (existing && existing !== entry) {
      showToast('Ta data już istnieje', 'err');
      return;
    }
    entry.date = newIso;
    entry.exported = false;
  }

  document.getElementById('modalDatePicker').hidden = true;
  calendarState = null;
  renderHomeFromDraft();
}

// ---------------------------------------------------------------
// 9. EKSPORT / IMPORT GOOGLE SHEETS
// ---------------------------------------------------------------

function buildHistoryRows() {
  // Buduje pełne wiersze do eksportu z numerem, dniem tygodnia, średnimi itp.
  const hist = sortedHistoryDesc();
  const nums = buildTrainingNumbers(hist);
  return hist.map((h, i) => {
    const nextOlder = hist[i + 1];
    const breakDays = nextOlder ? daysBetween(nextOlder.date, h.date) : '';
    const a3 = avg3M(h.date, hist);
    const aB = avgBR(h.date, hist);
    return {
      num: nums[i],
      date: h.date,
      dow: fmtDow(h.date),
      duration: h.duration || '',
      break_days: breakDays,
      avg_3m: a3 == null ? '' : Number(a3.toFixed(2)),
      avg_br: aB == null ? '' : Number(aB.toFixed(2))
    };
  });
}

async function exportPendingToSheets(url) {
  // Eksportuje tylko wpisy z exported=false.
  // Po sukcesie ustawia exported=true.
  const pending = state.history.filter(h => h.exported === false);
  if (pending.length === 0) {
    showToast('Brak nowych wpisów do wysłania', 'ok');
    return true;
  }

  // Buduj pełne wiersze z numerem itp. dla TYCH wpisów (numerujemy całość)
  const fullRows = buildHistoryRows();
  const pendingDates = new Set(pending.map(h => h.date));
  const rowsToSend = fullRows.filter(r => pendingDates.has(r.date));

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'append',
        rows: rowsToSend
      })
    });
    // Optymistycznie — oznacz jako wyeksportowane
    state.history.forEach(h => {
      if (pendingDates.has(h.date)) h.exported = true;
    });
    saveState();
    return true;
  } catch (e) {
    console.warn('export error', e);
    return false;
  }
}

async function importFromSheets() {
  const url = (localStorage.getItem(LS_APPSCRIPT) || '').trim();
  if (!url) {
    showToast('Najpierw skonfiguruj URL (3× klik w wersję)', 'err');
    return;
  }

  showToast('Pobieranie z arkusza…', 'ok');

  // Apps Script doGet zwraca dane jako JSON. Tu zakładamy że skrypt
  // został rozszerzony o doGet zwracający pełną historię.
  try {
    const resp = await fetch(url + '?action=read', { method: 'GET' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Niepoprawny JSON z arkusza'); }

    if (!data || !Array.isArray(data.rows)) {
      throw new Error('Brak pola rows w odpowiedzi');
    }

    // Mapowanie: { date, duration, ... } → state.history
    const newHistory = data.rows
      .filter(r => r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
      .map(r => ({
        date: r.date,
        duration: r.duration || '00:00',
        exported: true   // import → wszystkie znaczniki na true
      }));

    if (newHistory.length === 0) {
      showToast('Arkusz pusty — anulowano', 'err');
      return;
    }

    state.history = newHistory;
    saveState();
    renderHome();
    showToast(`Zaimportowano ${newHistory.length} wpisów ✓`, 'ok');
  } catch (e) {
    console.warn('import error', e);
    showToast('Import nieudany: ' + e.message, 'err');
  }
}

// ---------------------------------------------------------------
// 10. DIALOG POTWIERDZENIA + TOAST
// ---------------------------------------------------------------

let confirmCallback = null;
function showConfirm(title, text, onYes) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  confirmCallback = onYes;
  document.getElementById('modalConfirm').hidden = false;
}
document.getElementById('btnConfirmYes').addEventListener('click', () => {
  document.getElementById('modalConfirm').hidden = true;
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

let toastTimer = null;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

// ---------------------------------------------------------------
// 11. PODPINANIE ZDARZEŃ
// ---------------------------------------------------------------

// --- START: krótki dotyk = wejście, przytrzymanie 2s = reset ---
const btnStart = document.getElementById('btnStart');
let startHoldTimer = null;
let startHoldTriggered = false;

function onStartPress() {
  if (btnStart.classList.contains('disabled')) return;
  startHoldTriggered = false;
  btnStart.classList.add('holding');
  startHoldTimer = setTimeout(() => {
    startHoldTriggered = true;
    btnStart.classList.remove('holding');
    if (state.current?.startedAt) {
      showConfirm(
        'Zresetować trening?',
        'Bieżący niedokończony trening zostanie wykasowany. Historia treningów pozostanie nienaruszona.',
        () => { resetCurrentTraining(); showToast('Trening zresetowany', 'ok'); }
      );
    } else {
      showToast('Brak aktywnego treningu', 'ok');
    }
  }, RESET_HOLD_MS);
}

function onStartRelease() {
  btnStart.classList.remove('holding');
  if (startHoldTimer) { clearTimeout(startHoldTimer); startHoldTimer = null; }
  if (startHoldTriggered) return;
  btnStart.classList.add('clicked');
  setTimeout(() => btnStart.classList.remove('clicked'), 300);

  if (!isPackedToday()) {
    // Nie spakowane → ekran pakowania
    renderPackScreen();
    showScreen('screen-pack');
  } else {
    // Spakowane → od razu do ćwiczeń
    renderExerciseList();
    setButtonMode('green');
    endRestCountdown();
    showScreen('screen-list');
  }
}

function onStartCancel() {
  btnStart.classList.remove('holding');
  if (startHoldTimer) { clearTimeout(startHoldTimer); startHoldTimer = null; }
}

// Touch (telefon) — e.preventDefault() blokuje ghost-click i eliminuje problemy z pointerleave
btnStart.addEventListener('touchstart',  (e) => { e.preventDefault(); onStartPress();   }, { passive: false });
btnStart.addEventListener('touchend',    (e) => { e.preventDefault(); onStartRelease(); }, { passive: false });
btnStart.addEventListener('touchcancel', (e) => { e.preventDefault(); onStartCancel();  }, { passive: false });

// Mouse (desktop / fallback)
btnStart.addEventListener('mousedown',  onStartPress);
btnStart.addEventListener('mouseup',    onStartRelease);
btnStart.addEventListener('mouseleave', onStartCancel);

// --- Tabela historii — edycja dat ---
document.getElementById('btnEditHistory').addEventListener('click', enterHistoryEdit);
document.getElementById('btnCancelEdit').addEventListener('click', () => exitHistoryEdit(false));
document.getElementById('btnAcceptEdit').addEventListener('click', () => exitHistoryEdit(true));

// --- Tabela historii — import ---
document.getElementById('btnImportSheets').addEventListener('click', () => {
  showConfirm(
    'Import z arkusza',
    'Lokalna historia zostanie nadpisana danymi z Google Sheets. Kontynuować?',
    importFromSheets
  );
});

// --- Wersja — 3× klik = konfiguracja URL ---
let versionTaps = 0;
let versionTapTimer = null;
document.getElementById('versionTag').addEventListener('click', () => {
  versionTaps++;
  clearTimeout(versionTapTimer);
  versionTapTimer = setTimeout(() => versionTaps = 0, 800);
  if (versionTaps >= 3) {
    versionTaps = 0;
    const current = localStorage.getItem(LS_APPSCRIPT) || '';
    const v = prompt('URL Google Apps Script (Web App, kończy się na /exec):', current);
    if (v !== null) {
      localStorage.setItem(LS_APPSCRIPT, v.trim());
      showToast(v.trim() ? 'URL zapisany ✓' : 'URL wyczyszczony', 'ok');
    }
  }
});

// --- Lista ćwiczeń: klik w ćwiczenie + long-press na zdjęciu ---
const exerciseListEl = document.getElementById('exerciseList');

let listLongPressTimer = null;
let listLongPressTriggered = false;

exerciseListEl.addEventListener('click', e => {
  if (listLongPressTriggered) {
    listLongPressTriggered = false;
    return;
  }
  // W trybie reorderowania ignoruj normalny klik
  if (reorderingExId !== null) return;
  const item = e.target.closest('.exercise-item');
  if (!item) return;
  // Pomiń przycisk "Dodaj"
  if (item.classList.contains('exercise-item--add')) return;
  const exId = parseInt(item.dataset.id, 10);
  const ex = state.exercises.find(x => x.id === exId);
  if (!ex) return;
  currentExerciseId = exId;
  startTrainingIfNeeded();
  renderExerciseScreen(exId);
  showScreen('screen-exercise');
});

// Long-press na thumbie → toggle aktywności
function setupLongPressForThumb(thumbEl, exId) {
  const startPress = (ev) => {
    listLongPressTriggered = false;
    if (listLongPressTimer) clearTimeout(listLongPressTimer);
    listLongPressTimer = setTimeout(() => {
      listLongPressTriggered = true;
      toggleExerciseActive(exId);
    }, 2000);
  };
  const cancelPress = () => {
    if (listLongPressTimer) { clearTimeout(listLongPressTimer); listLongPressTimer = null; }
  };
  thumbEl.addEventListener('touchstart',  startPress, { passive: true });
  thumbEl.addEventListener('touchend',    cancelPress);
  thumbEl.addEventListener('touchcancel', cancelPress);
  thumbEl.addEventListener('touchmove',   cancelPress);  // scroll = anuluj
  thumbEl.addEventListener('mousedown',   startPress);
  thumbEl.addEventListener('mouseup',     cancelPress);
  thumbEl.addEventListener('mouseleave',  cancelPress);
}

function setupLongPressForReorder(rightAreaEl, exId) {
  let pressTimer = null;
  const startPress = () => {
    listLongPressTriggered = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      listLongPressTriggered = true;
      enterReorderMode(exId);
    }, 3000);
  };
  const cancelPress = () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  };
  rightAreaEl.addEventListener('touchstart',  startPress, { passive: true });
  rightAreaEl.addEventListener('touchend',    cancelPress);
  rightAreaEl.addEventListener('touchcancel', cancelPress);
  rightAreaEl.addEventListener('touchmove',   cancelPress);  // scroll = anuluj
  rightAreaEl.addEventListener('mousedown',   startPress);
  rightAreaEl.addEventListener('mouseup',     cancelPress);
  rightAreaEl.addEventListener('mouseleave',  cancelPress);
}

// Tryb reorderowania — wyświetla strzałki ↑↓ przy aktywnym ćwiczeniu
let reorderingExId = null;
function enterReorderMode(exId) {
  reorderingExId = exId;
  renderExerciseList();
  showToast('Przesuń ćwiczenie strzałkami ↑↓', 'ok');
}
function exitReorderMode() {
  reorderingExId = null;
  renderExerciseList();
}
function moveExercise(exId, direction) {
  // direction: -1 (w górę) / +1 (w dół)
  const idx = state.exercises.findIndex(e => e.id === exId);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= state.exercises.length) return;
  // swap w state
  const tmp = state.exercises[idx];
  state.exercises[idx] = state.exercises[newIdx];
  state.exercises[newIdx] = tmp;
  saveState();

  // Przesuń DOM-element BEZ pełnego re-rendera (zachowuje listenery i stan touch-eventów)
  const list = document.getElementById('exerciseList');
  const movingEl = list.querySelector(`.exercise-item[data-id="${exId}"]`);
  if (!movingEl) {
    // fallback — pełny render
    renderExerciseList();
    return;
  }
  if (direction < 0) {
    // w górę — przed previous element item
    const prev = movingEl.previousElementSibling;
    if (prev && prev.classList.contains('exercise-item') && !prev.classList.contains('exercise-item--add')) {
      list.insertBefore(movingEl, prev);
    }
  } else {
    // w dół — po następnym
    const next = movingEl.nextElementSibling;
    if (next && next.classList.contains('exercise-item') && !next.classList.contains('exercise-item--add')) {
      list.insertBefore(movingEl, next.nextElementSibling);
    }
  }
}

function toggleExerciseActive(exId) {
  const ex = state.exercises.find(e => e.id === exId);
  if (!ex) return;
  ex.active = !ex.active;
  saveState();
  // Jeśli właśnie dezaktywowane na ekranie 2 — wróć do listy
  if (!ex.active && document.getElementById('screen-exercise').classList.contains('active')) {
    currentExerciseId = null;
    renderExerciseList();
    showScreen('screen-list');
  } else {
    renderExerciseList();
    if (currentExerciseId === exId) renderExerciseScreen(exId);
  }
  showToast(ex.active ? `${ex.name}: aktywne ✓` : `${ex.name}: nieaktywne`, 'ok');
}

// --- Ekran 2: zielony przycisk + żółty licznik (z long-pressem dla skip-all) ---
const btnConfirm = document.getElementById('btnConfirmSet2');
let confirmHoldTimer = null;
let confirmHoldTriggered = false;

function onConfirmPress() {
  confirmHoldTriggered = false;
  confirmHoldTimer = setTimeout(() => {
    confirmHoldTriggered = true;
    // Oznacz wszystkie pozostałe serie jako wykonane
    confirmAllRemainingSets();
  }, 2000);
}
function onConfirmRelease() {
  if (confirmHoldTimer) { clearTimeout(confirmHoldTimer); confirmHoldTimer = null; }
  if (confirmHoldTriggered) {
    confirmHoldTriggered = false;
    return;
  }
  confirmSet();
}
function onConfirmCancel() {
  if (confirmHoldTimer) { clearTimeout(confirmHoldTimer); confirmHoldTimer = null; }
}

btnConfirm.addEventListener('touchstart',  (e) => { e.preventDefault(); onConfirmPress();   }, { passive: false });
btnConfirm.addEventListener('touchend',    (e) => { e.preventDefault(); onConfirmRelease(); }, { passive: false });
btnConfirm.addEventListener('touchcancel', (e) => { e.preventDefault(); onConfirmCancel();  }, { passive: false });
btnConfirm.addEventListener('mousedown',   onConfirmPress);
btnConfirm.addEventListener('mouseup',     onConfirmRelease);
btnConfirm.addEventListener('mouseleave',  onConfirmCancel);

// Cichy "przycisk" w dolnej 1/3 ekranu ćwiczenia → włącza standby
document.getElementById('standbyTrigger').addEventListener('click', () => {
  showStandbyOverlay();
});
// Klik gdziekolwiek na czarnym ekranie standby → powrót
document.getElementById('standbyOverlay').addEventListener('click', () => {
  hideStandbyOverlay();
});

document.getElementById('restTimer2').addEventListener('click', skipRest);

function confirmAllRemainingSets() {
  if (!currentExerciseId) return;
  const ex = state.exercises.find(e => e.id === currentExerciseId);
  if (!ex) return;
  const done = state.current?.sets?.[ex.id] || 0;
  const remaining = ex.sets - done;
  if (remaining <= 0) return;
  // Wykonaj wszystkie pozostałe serie naraz przez wielokrotne wywołanie confirmSet
  // (lub jeden raz ustawiając done=ex.sets)
  startTrainingIfNeeded();
  ensureCurrentTraining();
  state.current.sets[ex.id] = ex.sets;
  saveState();
  updateTopPanels();
  showToast(`${remaining} ser. zaliczone ✓`, 'ok');

  // Logika końcowa — taka jak przy ostatniej serii
  if (isTrainingComplete()) {
    finishTraining();
    return;
  }
  if (!state.current.completedExercises.includes(ex.id)) {
    state.current.completedExercises.push(ex.id);
  }
  saveState();
  // Supernowa + auto-przejście do kolejnego ćwiczenia
  showCelebration(() => {
    goToNextExerciseOrList(ex.id);
  });
}

// --- Powroty ---
document.getElementById('btnBackToHome').addEventListener('click', () => {
  renderHome();
  showScreen('screen-home');
});
document.getElementById('btnBackToList').addEventListener('click', () => {
  currentExerciseId = null;
  renderExerciseList();
  showScreen('screen-list');
});

// --- Edycja ćwiczenia ---
document.getElementById('btnEditExercise').addEventListener('click', () => {
  if (currentExerciseId) openEditExercise(currentExerciseId);
});

// --- Zamykanie modali ---
document.querySelectorAll('[data-close-modal]').forEach(el => {
  el.addEventListener('click', e => {
    const m = e.target.closest('.modal');
    if (m) m.hidden = true;
  });
});

// --- Kalendarz ---
document.getElementById('calPrev').addEventListener('click', () => {
  if (!calendarState) return;
  const d = new Date(calendarState.viewYear, calendarState.viewMonth, 1);
  const prev = addMonths(d, -1);
  calendarState.viewYear = prev.getFullYear();
  calendarState.viewMonth = prev.getMonth();
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  if (!calendarState) return;
  const d = new Date(calendarState.viewYear, calendarState.viewMonth, 1);
  const nxt = addMonths(d, 1);
  calendarState.viewYear = nxt.getFullYear();
  calendarState.viewMonth = nxt.getMonth();
  renderCalendar();
});

// ---------------------------------------------------------------
// 12. SERVICE WORKER + INSTALL PROMPT
// ---------------------------------------------------------------

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const hint = document.getElementById('installHint');
  hint.hidden = false;
  hint.style.pointerEvents = 'auto';
  hint.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hint.hidden = true;
    if (choice.outcome === 'accepted') showToast('Aplikacja zainstalowana', 'ok');
  }, { once: true });
});
window.addEventListener('appinstalled', () => {
  document.getElementById('installHint').hidden = true;
  showToast('Dzięki! Aplikacja zainstalowana.', 'ok');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('[SW] rejestracja nieudana:', err);
    });
  });
}

// ---------------------------------------------------------------
// 13. START
// ---------------------------------------------------------------

if (state.current?.startedAt) {
  startTrainingTimer();
}

renderHome();
showScreen('screen-home');
setButtonMode('green');
