let currentStep = 0;
let transazioni = [];
let conti = {};
let contiRiferimento = {};
let esercizio = [];
let exerciseLibrary = [];
let currentExerciseId = null;
const STORAGE_KEY = 'accountingLab.esercizio.v1';
const STORAGE_LIBRARY_KEY = 'accountingLab.library.v2';
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
        },
        reportManual: {
            giornale: '',
            mastrini: '',
            ce: '',
            sp: '',
            bilancio: ''
        }
    };
}

function ensureStepStructures(step) {
    if (!step.reportManual) {
        step.reportManual = { giornale: '', mastrini: '', ce: '', sp: '', bilancio: '' };
    }
    if (typeof step.reportManual.bilancio !== 'string') {
        step.reportManual.bilancio = '';
    }
    if (!step.capitalizzazione) {
        step.capitalizzazione = { descrizione: '', transazioni: [] };
    }
    if (!step.liquidazione) {
        step.liquidazione = { descrizione: '', transazioni: [] };
    }
}

function normalizeTransaction(tx, defaultSection) {
    const importo = Number(tx?.importo);
    return {
        conto: String(tx?.conto || tx?.nome || '').trim(),
        sezione: tx?.sezione === 'liquidazione' ? 'liquidazione' : (defaultSection || 'capitalizzazione'),
        tipoVar: ['VFA', 'VFP', 'VEN', 'VEP'].includes(tx?.tipoVar) ? tx.tipoVar : 'VFA',
        importo: Number.isFinite(importo) ? importo : 0,
        categoria: tx?.categoria === 'CE' ? 'CE' : 'SP',
        descrizione: String(tx?.descrizione || '').trim()
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
    updateCurrentExerciseName('Caso Delta');
    saveToLocalStorage();
    renderStep();
}

function normalizeExerciseData(data) {
    if (!data || !Array.isArray(data.esercizio) || data.esercizio.length === 0) {
        return { currentStep: 0, esercizio: [nuovoStep()] };
    }

    const normalizedSteps = data.esercizio.map((step) => {
        const fallback = nuovoStep();
        const hasNewFormat = step && step.capitalizzazione && step.liquidazione;

        if (hasNewFormat) {
            return {
                ...fallback,
                ...step,
                capitalizzazione: {
                    descrizione: step.capitalizzazione?.descrizione || '',
                    transazioni: Array.isArray(step.capitalizzazione?.transazioni)
                        ? step.capitalizzazione.transazioni.map((tx) => normalizeTransaction(tx, 'capitalizzazione'))
                        : []
                },
                liquidazione: {
                    descrizione: step.liquidazione?.descrizione || '',
                    transazioni: Array.isArray(step.liquidazione?.transazioni)
                        ? step.liquidazione.transazioni.map((tx) => normalizeTransaction(tx, 'liquidazione'))
                        : []
                },
                reportManual: {
                    giornale: step.reportManual?.giornale || '',
                    mastrini: step.reportManual?.mastrini || '',
                    ce: step.reportManual?.ce || '',
                    sp: step.reportManual?.sp || '',
                    bilancio: step.reportManual?.bilancio || ''
                }
            };
        }

        const oldPhase = step && step.fase === 'Liquidazione' ? 'liquidazione' : 'capitalizzazione';
        const oldTx = Array.isArray(step?.transazioni)
            ? step.transazioni.map((tx) => normalizeTransaction(tx, oldPhase))
            : [];
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
            },
            reportManual: {
                giornale: '',
                mastrini: '',
                ce: '',
                sp: '',
                bilancio: ''
            }
        };
    });

    const savedStep = Number.isInteger(data.currentStep) ? data.currentStep : 0;
    return {
        currentStep: Math.max(0, Math.min(savedStep, normalizedSteps.length - 1)),
        esercizio: normalizedSteps
    };
}

function saveToLocalStorage() {
    if (!currentExerciseId) {
        currentExerciseId = `ex-${Date.now()}`;
    }

    const exerciseName = ($('#exerciseName').val() || '').trim() || `Esercizio ${new Date().toLocaleDateString('it-IT')}`;
    const payload = {
        id: currentExerciseId,
        name: exerciseName,
        updatedAt: Date.now(),
        currentStep,
        esercizio
    };

    const idx = exerciseLibrary.findIndex((x) => x.id === currentExerciseId);
    if (idx >= 0) {
        exerciseLibrary[idx] = payload;
    } else {
        exerciseLibrary.push(payload);
    }

    localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify({
        version: 2,
        currentExerciseId,
        exercises: exerciseLibrary
    }));

    renderExerciseManagerUI();
}

function loadFromLocalStorage() {
    const rawLibrary = localStorage.getItem(STORAGE_LIBRARY_KEY);

    if (rawLibrary) {
        try {
            const libraryData = JSON.parse(rawLibrary);
            if (libraryData && Array.isArray(libraryData.exercises) && libraryData.exercises.length) {
                exerciseLibrary = libraryData.exercises;
                currentExerciseId = libraryData.currentExerciseId || exerciseLibrary[0].id;
                const currentRecord = exerciseLibrary.find((x) => x.id === currentExerciseId) || exerciseLibrary[0];
                currentExerciseId = currentRecord.id;
                const normalized = normalizeExerciseData(currentRecord);
                esercizio = normalized.esercizio;
                currentStep = normalized.currentStep;
                return true;
            }
        } catch (error) {
            console.warn('Libreria esercizi non valida, provo migrazione legacy.', error);
        }
    }

    const legacyRaw = localStorage.getItem(STORAGE_KEY);
    if (!legacyRaw) {
        exerciseLibrary = [];
        currentExerciseId = null;
        return false;
    }

    try {
        const legacy = JSON.parse(legacyRaw);
        const normalized = normalizeExerciseData(legacy);
        currentExerciseId = `ex-${Date.now()}`;
        exerciseLibrary = [{
            id: currentExerciseId,
            name: 'Esercizio migrato',
            updatedAt: Date.now(),
            currentStep: normalized.currentStep,
            esercizio: normalized.esercizio
        }];
        esercizio = normalized.esercizio;
        currentStep = normalized.currentStep;
        saveToLocalStorage();
        return true;
    } catch (error) {
        console.warn('LocalStorage non valido, inizializzo nuovo esercizio.', error);
        return false;
    }
}

function renderExerciseManagerUI() {
    const selector = document.getElementById('exerciseSelector');
    const nameInput = document.getElementById('exerciseName');
    if (!selector || !nameInput) return;

    selector.innerHTML = exerciseLibrary
        .map((x) => `<option value="${x.id}">${x.name || 'Esercizio senza nome'}</option>`)
        .join('');
    selector.value = currentExerciseId || '';

    const current = exerciseLibrary.find((x) => x.id === currentExerciseId);
    nameInput.value = current?.name || '';
}

function onExerciseSelectionChange(id) {
    if (!id || id === currentExerciseId) return;
    syncCurrentStepFromEditor();
    saveToLocalStorage();

    const selected = exerciseLibrary.find((x) => x.id === id);
    if (!selected) return;
    currentExerciseId = selected.id;
    const normalized = normalizeExerciseData(selected);
    esercizio = normalized.esercizio;
    currentStep = normalized.currentStep;
    renderStep();
}

function updateCurrentExerciseName(name) {
    const idx = exerciseLibrary.findIndex((x) => x.id === currentExerciseId);
    if (idx >= 0) {
        exerciseLibrary[idx].name = name.trim() || 'Esercizio senza nome';
        localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify({
            version: 2,
            currentExerciseId,
            exercises: exerciseLibrary
        }));
        renderExerciseManagerUI();
    }
}

function createNewExercise() {
    syncCurrentStepFromEditor();
    saveToLocalStorage();

    currentExerciseId = `ex-${Date.now()}`;
    currentStep = 0;
    esercizio = [nuovoStep()];
    exerciseLibrary.push({
        id: currentExerciseId,
        name: `Nuovo esercizio ${exerciseLibrary.length + 1}`,
        updatedAt: Date.now(),
        currentStep,
        esercizio
    });
    renderStep();
}

function saveExerciseNow() {
    syncCurrentStepFromEditor();
    saveToLocalStorage();
}

function deleteCurrentExercise() {
    if (!exerciseLibrary.length) return;
    const ok = confirm('Confermi cancellazione dell\'esercizio corrente?');
    if (!ok) return;

    exerciseLibrary = exerciseLibrary.filter((x) => x.id !== currentExerciseId);
    if (!exerciseLibrary.length) {
        currentExerciseId = `ex-${Date.now()}`;
        currentStep = 0;
        esercizio = [nuovoStep()];
        exerciseLibrary.push({
            id: currentExerciseId,
            name: 'Nuovo esercizio',
            updatedAt: Date.now(),
            currentStep,
            esercizio
        });
    } else {
        currentExerciseId = exerciseLibrary[0].id;
        const normalized = normalizeExerciseData(exerciseLibrary[0]);
        esercizio = normalized.esercizio;
        currentStep = normalized.currentStep;
    }
    saveToLocalStorage();
    renderStep();
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
    $('#txConto').on('focus input', updateContiApertiSuggestions);
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
    ensureStepStructures(step);

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
    updateContiApertiSuggestions();
    renderStepContent();
    renderProgress();
    updateNavigation();
    saveToLocalStorage();
}

function updateContiApertiSuggestions() {
    const datalist = document.getElementById('contiApertiList');
    if (!datalist) return;

    const contiApertiSet = new Set(Object.keys(conti).filter(Boolean));

    esercizio.forEach((step) => {
        [
            ...(step?.capitalizzazione?.transazioni || []),
            ...(step?.liquidazione?.transazioni || [])
        ].forEach((tx) => {
            const nomeConto = String(tx?.conto || tx?.nome || '').trim();
            if (nomeConto) contiApertiSet.add(nomeConto);
        });
    });

    const contiAperti = [...contiApertiSet];
    datalist.innerHTML = contiAperti
        .sort((a, b) => a.localeCompare(b, 'it'))
        .map((nome) => `<option value="${nome}"></option>`)
        .join('');
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

function txSignature(t) {
    return `TX:${t.sezione}:${t.conto}:${t.tipoVar}:${Number(t.importo).toFixed(2)}`;
}

function buildManualTxLine(t) {
    const dare = (t.tipoVar === 'VFA' || t.tipoVar === 'VEN') ? Number(t.importo).toFixed(2) : '-';
    const avere = (t.tipoVar === 'VFP' || t.tipoVar === 'VEP') ? Number(t.importo).toFixed(2) : '-';
    return `[${txSignature(t)}] ${t.conto} | ${t.tipoVar} | ${t.categoria} | Dare: ${dare} | Avere: ${avere} | ${t.descrizione || ''}`;
}

function isMappedInSection(text, t) {
    const sectionText = (text || '').toLowerCase();
    return sectionText.includes(txSignature(t).toLowerCase()) || sectionText.includes(String(t.conto).toLowerCase());
}

function getMissingSectionsForTx(step, t) {
    const missing = [];
    if (!isMappedInSection(step.reportManual.giornale, t)) missing.push('Giornale');
    if (!isMappedInSection(step.reportManual.mastrini, t)) missing.push('Mastrini');
    if (t.categoria === 'CE' && !isMappedInSection(step.reportManual.ce, t)) missing.push('CE');
    if (t.categoria === 'SP' && !isMappedInSection(step.reportManual.sp, t)) missing.push('SP');
    return missing;
}

function appendToManualSection(section, line) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    const current = step.reportManual[section] || '';
    if (!current.includes(line)) {
        step.reportManual[section] = current ? `${current}\n${line}` : line;
    }
}

function insertTxIntoSection(areaKey, txIndex, target) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    const tx = step[areaKey]?.transazioni?.[txIndex];
    if (!tx) return;

    const line = buildManualTxLine(tx);
    if (target === 'all') {
        appendToManualSection('giornale', line);
        appendToManualSection('mastrini', line);
        if (tx.categoria === 'CE') appendToManualSection('ce', line);
        if (tx.categoria === 'SP') appendToManualSection('sp', line);
    } else if (target === 'ce-sp') {
        appendToManualSection(tx.categoria === 'CE' ? 'ce' : 'sp', line);
    } else {
        appendToManualSection(target, line);
    }
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
            <div class="tx-item ${getMissingSectionsForTx(step, t).length ? 'missing-map' : ''}">
                <div>
                    <strong>${label}</strong> | ${t.conto} | ${t.tipoVar} | ${t.categoria} | € ${Number(t.importo).toFixed(2)}<br>
                    <small>${t.descrizione || ''}</small><br>
                    <small><strong>Mancante in:</strong> ${getMissingSectionsForTx(step, t).join(', ') || 'Nessuna sezione'}</small>
                    <div class="tx-actions">
                        <button onclick="insertTxIntoSection('${key}', ${idx}, 'giornale')">+ Giornale</button>
                        <button onclick="insertTxIntoSection('${key}', ${idx}, 'mastrini')">+ Mastrini</button>
                        <button onclick="insertTxIntoSection('${key}', ${idx}, 'ce-sp')">+ CE/SP</button>
                        <button onclick="insertTxIntoSection('${key}', ${idx}, 'all')">+ Tutte</button>
                    </div>
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
    const step = esercizio[currentStep];
    ensureStepStructures(step);

    const helper = 'Le sezioni sono manuali. Compila tu i contenuti oppure usa il bottone di generazione automatica della singola sezione.';

    const html = `
        <div class="panel">
            <h2>Libro Giornale (manuale)</h2>
            <div class="builder-actions">
                <button onclick="generateSection('giornale')">Genera automaticamente</button>
                <button class="btn-secondary" onclick="clearSection('giornale')">Svuota</button>
            </div>
            <p>${helper}</p>
            <textarea rows="10" oninput="updateManualSection('giornale', this.value)">${escapeHtml(step.reportManual.giornale)}</textarea>
        </div>

        <div class="panel">
            <h2>Mastrini (manuale)</h2>
            <div class="builder-actions">
                <button onclick="generateSection('mastrini')">Genera automaticamente</button>
                <button class="btn-secondary" onclick="clearSection('mastrini')">Svuota</button>
            </div>
            <textarea rows="10" oninput="updateManualSection('mastrini', this.value)">${escapeHtml(step.reportManual.mastrini)}</textarea>
        </div>

        <div class="panel">
            <h2>Conto Economico e Stato Patrimoniale (manuali)</h2>
            <div class="builder-actions">
                <button onclick="generateSection('ce')">Genera CE</button>
                <button onclick="generateSection('sp')">Genera SP</button>
                <button onclick="generateAllSections()">Genera tutte le sezioni</button>
                <button class="btn-secondary" onclick="clearSection('ce')">Svuota CE</button>
                <button class="btn-secondary" onclick="clearSection('sp')">Svuota SP</button>
            </div>
            <label>Conto Economico</label>
            <textarea rows="8" oninput="updateManualSection('ce', this.value)">${escapeHtml(step.reportManual.ce)}</textarea>
            <label>Stato Patrimoniale</label>
            <textarea rows="8" oninput="updateManualSection('sp', this.value)">${escapeHtml(step.reportManual.sp)}</textarea>
        </div>
        ${currentStep === esercizio.length - 1 ? `
        <div class="panel">
            <h2>Pagina Finale - Bozza Bilancio di Esercizio</h2>
            <div class="builder-actions">
                <button onclick="generateFinalDraft()">Genera bozza bilancio</button>
                <button class="btn-secondary" onclick="clearSection('bilancio')">Svuota bozza</button>
            </div>
            <p>Bozza di studio: puoi modificarla manualmente prima di copiarla nel compito definitivo.</p>
            <textarea rows="14" oninput="updateManualSection('bilancio', this.value)">${escapeHtml(step.reportManual.bilancio)}</textarea>
        </div>
        ` : ''}
    `;

    content.innerHTML = html;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function updateManualSection(section, value) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportManual[section] = value;
    saveToLocalStorage();
}

function clearSection(section) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportManual[section] = '';
    renderStep();
}

function generateSection(section) {
    const generated = buildGeneratedReports();
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportManual[section] = generated[section] || '';
    renderStep();
}

function generateAllSections() {
    const generated = buildGeneratedReports();
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportManual.giornale = generated.giornale;
    step.reportManual.mastrini = generated.mastrini;
    step.reportManual.ce = generated.ce;
    step.reportManual.sp = generated.sp;
    if (currentStep === esercizio.length - 1) {
        step.reportManual.bilancio = buildFinalDraft(generated);
    }
    renderStep();
}

function generateFinalDraft() {
    const generated = buildGeneratedReports();
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportManual.bilancio = buildFinalDraft(generated);
    renderStep();
}

function buildFinalDraft(generated) {
    let costi = 0;
    let ricavi = 0;
    let attivo = 0;
    let passivo = 0;
    const { contiChiusi, contiAperti } = getAccountClosureSummary();

    for (const dati of Object.values(conti)) {
        const saldo = dati.dare.reduce((a, b) => a + b, 0) - dati.avere.reduce((a, b) => a + b, 0);
        if (dati.cat === 'CE') {
            if (saldo > 0) costi += saldo;
            if (saldo < 0) ricavi += Math.abs(saldo);
        }
        if (dati.cat === 'SP') {
            if (saldo > 0) attivo += saldo;
            if (saldo < 0) passivo += Math.abs(saldo);
        }
    }

    const risultato = ricavi - costi;
    const statoRisultato = risultato >= 0 ? 'Utile d\'esercizio' : 'Perdita d\'esercizio';

    return [
        'BOZZA DI BILANCIO DI ESERCIZIO',
        '',
        '1) Premessa',
        `La bozza e stata generata automaticamente sulla base dei movimenti registrati fino allo step ${currentStep + 1}.`,
        '',
        '2) Conto Economico (sintesi)',
        `Totale ricavi: ${ricavi.toFixed(2)}`,
        `Totale costi: ${costi.toFixed(2)}`,
        `${statoRisultato}: ${Math.abs(risultato).toFixed(2)}`,
        '',
        '3) Stato Patrimoniale (sintesi)',
        `Totale attivo: ${attivo.toFixed(2)}`,
        `Totale passivo: ${passivo.toFixed(2)}`,
        '',
        '4) Evidenza conti chiusi',
        contiChiusi.length ? `Conti chiusi (${contiChiusi.length}): ${contiChiusi.join(', ')}` : 'Nessun conto chiuso rilevato.',
        contiAperti.length ? `Conti ancora aperti (${contiAperti.length}): ${contiAperti.join(', ')}` : 'Nessun conto aperto residuo.',
        '',
        '5) Note operative di studio',
        '- Verificare la quadratura Dare/Avere dei movimenti principali.',
        '- Controllare coerenza tra CE e SP (effetto risultato economico).',
        '- Rivedere classificazione dei conti tra SP e CE.',
        '',
        '6) Estratto CE/SP generato (riferimento)',
        generated.ce,
        '',
        generated.sp
    ].join('\n');
}

function buildGeneratedReports() {
    const generated = {
        giornale: '',
        mastrini: '',
        ce: '',
        sp: ''
    };

    if (!transazioni.length) {
        generated.giornale = 'Nessun movimento da generare.';
        generated.mastrini = 'Nessun conto aperto.';
        generated.ce = 'Nessun dato CE disponibile.';
        generated.sp = 'Nessun dato SP disponibile.';
        return generated;
    }

    generated.giornale = transazioni.map((t) => {
        const dare = (t.tipoVar === 'VFA' || t.tipoVar === 'VEN') ? t.importo.toFixed(2) : '-';
        const avere = (t.tipoVar === 'VFP' || t.tipoVar === 'VEP') ? t.importo.toFixed(2) : '-';
           return `[${txSignature(t)}] ${t.id}. ${t.data} | ${t.nome} | ${t.tipoVar} | Dare: ${dare} | Avere: ${avere} | ${t.descrizione}`;
    }).join('\n');

    const mastriniLines = [];
    for (const [nome, dati] of Object.entries(conti)) {
        const totDare = dati.dare.reduce((a, b) => a + b, 0);
        const totAvere = dati.avere.reduce((a, b) => a + b, 0);
        const saldo = totDare - totAvere;
        const stato = Math.abs(saldo) < 0.0001 ? 'CHIUSO' : 'APERTO';
        const refs = transazioni
            .filter((tx) => tx.nome === nome.toUpperCase())
            .map((tx) => `[${txSignature(tx)}]`)
            .join(', ');
        mastriniLines.push(`${nome}`);
        mastriniLines.push(`  Dare: ${dati.dare.map((v) => v.toFixed(2)).join(', ') || '-'}`);
        mastriniLines.push(`  Avere: ${dati.avere.map((v) => v.toFixed(2)).join(', ') || '-'}`);
        mastriniLines.push(`  Saldo: ${saldo.toFixed(2)}`);
        mastriniLines.push(`  Stato conto: ${stato}`);
        mastriniLines.push(`  Riferimenti: ${refs || '-'}`);
        mastriniLines.push('');
    }
    generated.mastrini = mastriniLines.join('\n').trim();

    let costi = 0;
    let ricavi = 0;
    const ceLines = ['CONTO ECONOMICO'];
    for (const [nome, dati] of Object.entries(conti)) {
        if (dati.cat !== 'CE') continue;
        const saldo = dati.dare.reduce((a, b) => a + b, 0) - dati.avere.reduce((a, b) => a + b, 0);
        if (saldo > 0) {
            ceLines.push(`Costo - ${nome}: ${saldo.toFixed(2)}`);
            costi += saldo;
        } else if (saldo < 0) {
            ceLines.push(`Ricavo - ${nome}: ${Math.abs(saldo).toFixed(2)}`);
            ricavi += Math.abs(saldo);
        }
    }
    ceLines.push(`Totale costi: ${costi.toFixed(2)}`);
    ceLines.push(`Totale ricavi: ${ricavi.toFixed(2)}`);
    ceLines.push(`Risultato: ${(ricavi - costi).toFixed(2)}`);
    generated.ce = ceLines.join('\n');

    let attivo = 0;
    let passivo = 0;
    const spLines = ['STATO PATRIMONIALE'];
    for (const [nome, dati] of Object.entries(conti)) {
        if (dati.cat !== 'SP') continue;
        const saldo = dati.dare.reduce((a, b) => a + b, 0) - dati.avere.reduce((a, b) => a + b, 0);
        if (saldo > 0) {
            spLines.push(`Attivo - ${nome}: ${saldo.toFixed(2)}`);
            attivo += saldo;
        } else if (saldo < 0) {
            spLines.push(`Passivo - ${nome}: ${Math.abs(saldo).toFixed(2)}`);
            passivo += Math.abs(saldo);
        }
    }
    spLines.push(`Totale attivo: ${attivo.toFixed(2)}`);
    spLines.push(`Totale passivo: ${passivo.toFixed(2)}`);
    generated.sp = spLines.join('\n');

    return generated;
}

function getAccountClosureSummary() {
    const contiChiusi = [];
    const contiAperti = [];

    for (const [nome, dati] of Object.entries(conti)) {
        const saldo = dati.dare.reduce((a, b) => a + b, 0) - dati.avere.reduce((a, b) => a + b, 0);
        if (Math.abs(saldo) < 0.0001) {
            contiChiusi.push(nome);
        } else {
            contiAperti.push(nome);
        }
    }

    contiChiusi.sort((a, b) => a.localeCompare(b, 'it'));
    contiAperti.sort((a, b) => a.localeCompare(b, 'it'));

    return { contiChiusi, contiAperti };
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
