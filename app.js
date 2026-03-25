let currentStep = 0;
let transazioni = [];
let conti = {};
let contiRiferimento = {};
let esercizio = [];
const STORAGE_KEY = 'accountingLab.esercizio.v1';
let autosaveBound = false;

function phaseClass(fase) {
    return fase === 'Liquidazione' ? 'fase-liquidazione' : 'fase-capitalizzazione';
}

function nuovoStep() {
    return {
        id: Date.now() + Math.random(),
        titolo: 'Nuovo step',
        capitalizzazione: {
            descrizione: '',
            transazioni: []
        },
        liquidazione: {
            descrizione: '',
            transazioni: []
        }
    };
}

function loadCasoDeltaExample() {
    const conferma = confirm('Caricare l\'esempio completo del Caso Delta? I dati attuali saranno sostituiti.');
    if (!conferma) return;

    esercizio = [
        {
            id: 1,
            titolo: 'Caso Delta - Costituzione e conferimenti iniziali',
            capitalizzazione: {
                descrizione: 'La societa Delta S.r.l. viene costituita con capitale sociale di euro 80.000 versato in banca.',
                transazioni: [
                    { conto: 'Banca c/c', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 80000, categoria: 'SP', descrizione: 'Versamento capitale iniziale' },
                    { conto: 'Capitale sociale', sezione: 'capitalizzazione', tipoVar: 'VFP', importo: 80000, categoria: 'SP', descrizione: 'Rilevazione capitale sociale' }
                ]
            },
            liquidazione: {
                descrizione: 'Nessuna operazione di gestione economica nella fase iniziale.',
                transazioni: []
            }
        },
        {
            id: 2,
            titolo: 'Caso Delta - Acquisto impianti e materie prime',
            capitalizzazione: {
                descrizione: 'Acquisto impianti per euro 30.000 pagati con bonifico e acquisto materie prime per euro 12.000 a debito verso fornitori.',
                transazioni: [
                    { conto: 'Impianti e macchinari', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 30000, categoria: 'SP', descrizione: 'Acquisto impianti' },
                    { conto: 'Banca c/c', sezione: 'capitalizzazione', tipoVar: 'VFP', importo: 30000, categoria: 'SP', descrizione: 'Pagamento impianti' },
                    { conto: 'Rimanenze materie prime', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 12000, categoria: 'SP', descrizione: 'Carico iniziale materie prime' },
                    { conto: 'Fornitori', sezione: 'capitalizzazione', tipoVar: 'VFP', importo: 12000, categoria: 'SP', descrizione: 'Debito verso fornitori' }
                ]
            },
            liquidazione: {
                descrizione: 'Nessuna vendita nello step: solo preparazione produttiva.',
                transazioni: []
            }
        },
        {
            id: 3,
            titolo: 'Caso Delta - Produzione e vendita prodotti finiti',
            capitalizzazione: {
                descrizione: 'Incasso immediato di parte delle vendite e formazione di crediti commerciali.',
                transazioni: [
                    { conto: 'Banca c/c', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 45000, categoria: 'SP', descrizione: 'Incasso vendite immediate' },
                    { conto: 'Clienti', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 15000, categoria: 'SP', descrizione: 'Crediti da vendite a termine' }
                ]
            },
            liquidazione: {
                descrizione: 'Ricavi di vendita per euro 60.000 e costo del venduto per euro 9.000 da consumo materie.',
                transazioni: [
                    { conto: 'Ricavi di vendita', sezione: 'liquidazione', tipoVar: 'VEP', importo: 60000, categoria: 'CE', descrizione: 'Ricavi dell\'esercizio' },
                    { conto: 'Costo del venduto', sezione: 'liquidazione', tipoVar: 'VEN', importo: 9000, categoria: 'CE', descrizione: 'Consumo materie prime' },
                    { conto: 'Rimanenze materie prime', sezione: 'liquidazione', tipoVar: 'VFP', importo: 9000, categoria: 'SP', descrizione: 'Scarico materie consumate' }
                ]
            }
        },
        {
            id: 4,
            titolo: 'Caso Delta - Costi di periodo e ammortamenti',
            capitalizzazione: {
                descrizione: 'Pagamento di fornitori per euro 7.000 e incasso clienti per euro 10.000.',
                transazioni: [
                    { conto: 'Fornitori', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 7000, categoria: 'SP', descrizione: 'Pagamento parziale fornitori' },
                    { conto: 'Banca c/c', sezione: 'capitalizzazione', tipoVar: 'VFP', importo: 7000, categoria: 'SP', descrizione: 'Uscita banca per fornitori' },
                    { conto: 'Banca c/c', sezione: 'capitalizzazione', tipoVar: 'VFA', importo: 10000, categoria: 'SP', descrizione: 'Incasso parziale clienti' },
                    { conto: 'Clienti', sezione: 'capitalizzazione', tipoVar: 'VFP', importo: 10000, categoria: 'SP', descrizione: 'Riduzione crediti verso clienti' }
                ]
            },
            liquidazione: {
                descrizione: 'Rilevazione stipendi per euro 8.000, servizi per euro 3.000 e ammortamento impianti al 10%.',
                transazioni: [
                    { conto: 'Salari e stipendi', sezione: 'liquidazione', tipoVar: 'VEN', importo: 8000, categoria: 'CE', descrizione: 'Costo del personale' },
                    { conto: 'Costi per servizi', sezione: 'liquidazione', tipoVar: 'VEN', importo: 3000, categoria: 'CE', descrizione: 'Utenze e servizi esterni' },
                    { conto: 'Ammortamenti', sezione: 'liquidazione', tipoVar: 'VEN', importo: 3000, categoria: 'CE', descrizione: 'Quota ammortamento impianti' },
                    { conto: 'Fondo ammortamento impianti', sezione: 'liquidazione', tipoVar: 'VFP', importo: 3000, categoria: 'SP', descrizione: 'Accantonamento fondo ammortamento' }
                ]
            }
        },
        {
            id: 5,
            titolo: 'Caso Delta - Assestamento e chiusura sintetica',
            capitalizzazione: {
                descrizione: 'Determinazione saldo finale delle poste patrimoniali dopo incassi, pagamenti e assestamenti.',
                transazioni: []
            },
            liquidazione: {
                descrizione: 'Determinazione del risultato economico finale e lettura congiunta di CE e SP.',
                transazioni: []
            }
        }
    ];

    currentStep = 0;
    saveToLocalStorage();
    renderStep();
}

function saveToLocalStorage() {
    const payload = {
        version: 1,
        currentStep,
        esercizio
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromLocalStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.esercizio) || data.esercizio.length === 0) {
            return false;
        }

        esercizio = data.esercizio.map((step) => {
            const fallback = nuovoStep();
            const hasNewFormat = step && step.capitalizzazione && step.liquidazione;

            if (hasNewFormat) {
                return {
                    ...fallback,
                    ...step,
                    capitalizzazione: {
                        descrizione: step.capitalizzazione?.descrizione || '',
                        transazioni: Array.isArray(step.capitalizzazione?.transazioni) ? step.capitalizzazione.transazioni : []
                    },
                    liquidazione: {
                        descrizione: step.liquidazione?.descrizione || '',
                        transazioni: Array.isArray(step.liquidazione?.transazioni) ? step.liquidazione.transazioni : []
                    }
                };
            }

            const oldPhase = step && step.fase === 'Liquidazione' ? 'liquidazione' : 'capitalizzazione';
            const oldTx = Array.isArray(step?.transazioni) ? step.transazioni : [];
            return {
                ...fallback,
                ...step,
                capitalizzazione: {
                    descrizione: oldPhase === 'capitalizzazione' ? (step?.descrizione || '') : '',
                    transazioni: oldPhase === 'capitalizzazione' ? oldTx : []
                },
                liquidazione: {
                    descrizione: oldPhase === 'liquidazione' ? (step?.descrizione || '') : '',
                    transazioni: oldPhase === 'liquidazione' ? oldTx : []
                }
            };
        });

        const savedStep = Number.isInteger(data.currentStep) ? data.currentStep : 0;
        currentStep = Math.max(0, Math.min(savedStep, esercizio.length - 1));
        return true;
    } catch (error) {
        console.warn('LocalStorage non valido, inizializzo nuovo esercizio.', error);
        return false;
    }
}

function syncCurrentStepFromEditor() {
    if (!esercizio.length) return;
    const step = esercizio[currentStep];
    step.titolo = $('#editorTitle').val().trim() || 'Step senza titolo';
    step.capitalizzazione.descrizione = $('#editorDescriptionCap').val().trim();
    step.liquidazione.descrizione = $('#editorDescriptionLiq').val().trim();
}

function autosaveEditorDraft() {
    syncCurrentStepFromEditor();
    saveToLocalStorage();
}

function setupAutosaveListeners() {
    if (autosaveBound) return;

    $('#editorTitle').on('input', autosaveEditorDraft);
    $('#editorDescriptionCap').on('input', autosaveEditorDraft);
    $('#editorDescriptionLiq').on('input', autosaveEditorDraft);
    $(window).on('beforeunload', saveToLocalStorage);

    autosaveBound = true;
}

function initStep() {
    currentStep = 0;
    transazioni = [];
    conti = {};
    contiRiferimento = {};
    if (!loadFromLocalStorage()) {
        esercizio = [nuovoStep()];
    }
    setupAutosaveListeners();
    renderStep();
}

function renderStep() {
    if (!esercizio.length) {
        esercizio.push(nuovoStep());
        currentStep = 0;
    }

    if (currentStep >= esercizio.length) {
        currentStep = esercizio.length - 1;
    }

    const step = esercizio[currentStep];

    $('#stepTitle').text(step.titolo);
    $('#stepPhase').text('📋 Operazione Completa').css('background', 'rgba(52, 152, 219, 0.3)');
    $('#stepDescription').text(step.capitalizzazione.descrizione || step.liquidazione.descrizione || 'Compila le due sezioni dello step.');

    const infoHtml = `
        <strong>🎯 Capitalizzazione:</strong><br>
        ${step.capitalizzazione.descrizione || 'Non ancora compilata.'}<br><br>
        <strong>🎯 Liquidazione:</strong><br>
        ${step.liquidazione.descrizione || 'Non ancora compilata.'}
    `;
    $('#stepInfo').html(infoHtml).attr('class', 'step-info');

    transazioni = [];
    conti = {};

    for (let i = 0; i <= currentStep; i++) {
        const stepTx = [
            ...esercizio[i].capitalizzazione.transazioni,
            ...esercizio[i].liquidazione.transazioni
        ];

        stepTx.forEach(t => {
            const transazione = {
                id: transazioni.length + 1,
                nome: t.conto.toUpperCase(),
                tipoVar: t.tipoVar,
                importo: t.importo,
                cat: t.categoria,
                descrizione: t.descrizione,
                sezione: t.sezione,
                data: new Date().toLocaleDateString()
            };
            transazioni.push(transazione);

            if (!conti[t.conto]) {
                conti[t.conto] = { dare: [], avere: [], cat: t.categoria };
            }

            const dare = (t.tipoVar === 'VFA' || t.tipoVar === 'VEN') ? t.importo : 0;
            const avere = (t.tipoVar === 'VFP' || t.tipoVar === 'VEP') ? t.importo : 0;

            if (dare > 0) conti[t.conto].dare.push(dare);
            if (avere > 0) conti[t.conto].avere.push(avere);
        });
    }

    populateEditor(step);
    renderEditorTransactions(step);
    renderStepContent();
    renderProgress();
    updateNavigation();
    saveToLocalStorage();
}

function populateEditor(step) {
    $('#editorTitle').val(step.titolo);
    $('#editorDescriptionCap').val(step.capitalizzazione.descrizione);
    $('#editorDescriptionLiq').val(step.liquidazione.descrizione);
}

function saveCurrentStep() {
    syncCurrentStepFromEditor();
    renderStep();
}

function addTransactionToCurrentStep() {
    const conto = $('#txConto').val().trim();
    const sezione = $('#txSezione').val();
    const tipoVar = $('#txTipoVar').val();
    const categoria = $('#txCategoria').val();
    const importoRaw = $('#txImporto').val();
    const descrizione = $('#txDescrizione').val().trim();
    const importo = parseFloat(importoRaw);

    if (!conto || !importo || importo <= 0) {
        alert('Inserisci almeno conto e importo maggiore di zero.');
        return;
    }

    esercizio[currentStep][sezione].transazioni.push({
        conto,
        sezione,
        tipoVar,
        importo,
        categoria,
        descrizione: descrizione || 'Movimento inserito manualmente'
    });

    $('#txConto').val('');
    $('#txImporto').val('');
    $('#txDescrizione').val('');

    renderStep();
}

function removeTransaction(sezione, index) {
    esercizio[currentStep][sezione].transazioni.splice(index, 1);
    renderStep();
}

function renderEditorTransactions(step) {
    const txList = document.getElementById('txList');
    const capTx = step.capitalizzazione.transazioni;
    const liqTx = step.liquidazione.transazioni;

    if (!capTx.length && !liqTx.length) {
        txList.innerHTML = '<div class="tx-empty">Nessun movimento nello step corrente.</div>';
        return;
    }

    const renderList = (items, label, key) => {
        if (!items.length) {
            return `<div class="tx-item"><div><strong>${label}</strong><br><small>Nessun movimento.</small></div></div>`;
        }

        return items.map((t, idx) => `
            <div class="tx-item">
                <div>
                    <strong>${label}</strong> | ${t.conto} | ${t.tipoVar} | ${t.categoria} | € ${Number(t.importo).toFixed(2)}<br>
                    <small>${t.descrizione || ''}</small>
                </div>
                <button class="btn-danger" onclick="removeTransaction('${key}', ${idx})">Rimuovi</button>
            </div>
        `).join('');
    };

    txList.innerHTML = renderList(capTx, 'Capitalizzazione', 'capitalizzazione') + renderList(liqTx, 'Liquidazione', 'liquidazione');
}

function createNewStep() {
    saveCurrentStep();
    esercizio.push(nuovoStep());
    currentStep = esercizio.length - 1;
    renderStep();
    window.scrollTo(0, 0);
}

function deleteCurrentStep() {
    if (esercizio.length === 1) {
        esercizio[0] = nuovoStep();
        currentStep = 0;
        renderStep();
        return;
    }

    esercizio.splice(currentStep, 1);
    if (currentStep >= esercizio.length) {
        currentStep = esercizio.length - 1;
    }
    renderStep();
}

function renderStepContent() {
    const content = document.getElementById('stepContent');
    const stepNum = currentStep + 1;

    let html = `<div class="panel"><h2>Libro Giornale - Evoluzione fino a Step ${stepNum}</h2>`;
    html += '<table class="journal-table"><thead><tr>';
    html += '<th>Data/ID</th><th>Conto e Descrizione</th><th>Analisi</th>';
    html += '<th style="text-align:right">Dare (euro)</th><th style="text-align:right">Avere (euro)</th></tr></thead><tbody>';

    transazioni.forEach(t => {
        const dare = (t.tipoVar === 'VFA' || t.tipoVar === 'VEN') ? t.importo : 0;
        const avere = (t.tipoVar === 'VFP' || t.tipoVar === 'VEP') ? t.importo : 0;
        html += `<tr class="journal-row">
            <td data-label="Data/ID" style="color: #999; font-size: 0.8rem;">#${t.id}<br>${t.data}</td>
            <td data-label="Conto e Descrizione"><strong>${t.nome}</strong><br><small>${t.cat === 'SP' ? 'Stato Patrimoniale' : 'Conto Economico'} | ${t.sezione === 'liquidazione' ? 'Liquidazione' : 'Capitalizzazione'}</small><br><small style="opacity:0.7">${t.descrizione}</small></td>
            <td data-label="Analisi"><span class="badge ${t.tipoVar.toLowerCase()}">${t.tipoVar}</span></td>
            <td data-label="Dare (euro)" class="val" style="color: var(--success);">${dare > 0 ? dare.toLocaleString('it-IT', {minimumFractionDigits: 2}) : ''}</td>
            <td data-label="Avere (euro)" class="val" style="color: var(--danger);">${avere > 0 ? avere.toLocaleString('it-IT', {minimumFractionDigits: 2}) : ''}</td>
        </tr>`;
    });

    html += '</tbody></table></div>';

    html += '<div class="panel"><h2>Conti a T (Mastrini)</h2><div class="mastrini-wrapper">';

    for (const [nome, dati] of Object.entries(conti)) {
        const totDare = dati.dare.reduce((a, b) => a + b, 0);
        const totAvere = dati.avere.reduce((a, b) => a + b, 0);
        const saldo = totDare - totAvere;

        html += `<div class="mastrino-t">
            <div class="t-header">${nome}</div>
            <div class="t-content">
                <div class="t-side"><strong>Dare</strong><br>${dati.dare.map(v => `<div>${v.toFixed(2)}</div>`).join('')}</div>
                <div class="t-side" style="text-align: right"><strong>Avere</strong><br>${dati.avere.map(v => `<div>${v.toFixed(2)}</div>`).join('')}</div>
            </div>
            <div class="t-footer">Saldo: ${saldo.toFixed(2)} euro</div>
        </div>`;
    }

    html += '</div></div>';

    html += '<div class="bilancio-grid"><div class="statement"><h3>Conto Economico</h3><table width="100%">';
    html += '<thead><tr><th>Costi (VEN)</th><th>Ricavi (VEP)</th></tr></thead><tbody>';

    let costi = 0;
    let ricavi = 0;
    for (const [nome, dati] of Object.entries(conti)) {
        if (dati.cat === 'CE') {
            const saldo = dati.dare.reduce((a, b) => a + b, 0) - dati.avere.reduce((a, b) => a + b, 0);
            if (saldo > 0) {
                html += `<tr><td data-label="Costi (VEN)">${nome}: ${saldo.toFixed(2)}</td><td data-label="Ricavi (VEP)"></td></tr>`;
                costi += saldo;
            } else if (saldo < 0) {
                html += `<tr><td data-label="Costi (VEN)"></td><td data-label="Ricavi (VEP)">${nome}: ${Math.abs(saldo).toFixed(2)}</td></tr>`;
                ricavi += Math.abs(saldo);
            }
        }
    }
    html += '</tbody></table>';
    const risultato = ricavi - costi;
    html += `<div class="total-box" style="background: ${risultato >= 0 ? 'var(--success)' : 'var(--danger)'};"><strong>Risultato: euro ${risultato.toFixed(2)}</strong></div></div>`;

    html += '<div class="statement"><h3>Stato Patrimoniale</h3><table width="100%"><thead><tr><th>Attivo (VFA-VFP)</th><th>Passivo (VFP-VFA)</th></tr></thead><tbody>';
    let attivo = 0;
    let passivo = 0;
    for (const [nome, dati] of Object.entries(conti)) {
        if (dati.cat === 'SP') {
            const saldo = dati.dare.reduce((a, b) => a + b, 0) - dati.avere.reduce((a, b) => a + b, 0);
            if (saldo > 0) {
                html += `<tr><td data-label="Attivo">${nome}: ${saldo.toFixed(2)}</td><td data-label="Passivo"></td></tr>`;
                attivo += saldo;
            } else if (saldo < 0) {
                html += `<tr><td data-label="Attivo"></td><td data-label="Passivo">${Math.abs(saldo).toFixed(2)}</td></tr>`;
                passivo += Math.abs(saldo);
            }
        }
    }
    html += `</tbody></table><div class="total-box"><strong>Attivo: euro ${attivo.toFixed(2)}</strong></div>`;
    html += `<div class="total-box" style="background: var(--secondary);"><strong>Passivo: euro ${passivo.toFixed(2)}</strong></div></div></div>`;

    content.innerHTML = html;
}

function renderProgress() {
    const progress = document.getElementById('stepProgress');
    let html = '';

    esercizio.forEach((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;

        html += `<div class="step-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                    onclick="navigateToStep(${idx})" title="${step.titolo}">
                    ${idx + 1}
                </div>`;

        if (idx < esercizio.length - 1) {
            html += `<div class="step-line ${isActive || isCompleted ? 'active' : ''}"></div>`;
        }
    });

    progress.innerHTML = html;
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const counter = document.getElementById('stepCounter');

    prevBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === esercizio.length - 1;
    counter.textContent = `Step ${currentStep + 1} di ${esercizio.length}`;

    prevBtn.textContent = currentStep > 0
        ? `← ${esercizio[currentStep - 1].titolo.substring(0, 20)}...`
        : '← Indietro';
    nextBtn.textContent = currentStep < esercizio.length - 1
        ? `${esercizio[currentStep + 1].titolo.substring(0, 20)}... →`
        : 'Avanti →';
}

function nextStep() {
    syncCurrentStepFromEditor();
    if (currentStep < esercizio.length - 1) {
        currentStep++;
        renderStep();
        window.scrollTo(0, 0);
    }
}

function prevStep() {
    syncCurrentStepFromEditor();
    if (currentStep > 0) {
        currentStep--;
        renderStep();
        window.scrollTo(0, 0);
    }
}

function navigateToStep(step) {
    syncCurrentStepFromEditor();
    currentStep = step;
    renderStep();
    window.scrollTo(0, 0);
}

$(initStep);
