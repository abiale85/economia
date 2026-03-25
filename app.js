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
        },
        reportGuided: {
            giornale: [],
            mastrini: [],
            ce: [],
            sp: []
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
    if (!step.reportGuided) {
        step.reportGuided = { giornale: [], mastrini: [], ce: [], sp: [] };
    }
    step.reportGuided.giornale = Array.isArray(step.reportGuided.giornale) ? step.reportGuided.giornale : [];
    step.reportGuided.mastrini = Array.isArray(step.reportGuided.mastrini) ? step.reportGuided.mastrini : [];
    step.reportGuided.ce = Array.isArray(step.reportGuided.ce) ? step.reportGuided.ce : [];
    step.reportGuided.sp = Array.isArray(step.reportGuided.sp) ? step.reportGuided.sp : [];
    if (!step.capitalizzazione) {
        step.capitalizzazione = { descrizione: '', transazioni: [] };
    }
    if (!step.liquidazione) {
        step.liquidazione = { descrizione: '', transazioni: [] };
    }

    // Migrazione morbida: se esistono testi manuali ma non righe guidate, converte i blocchi principali.
    if (!step.reportGuided.giornale.length && step.reportManual.giornale) {
        step.reportGuided.giornale = step.reportManual.giornale
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const m = line.match(/\[(TX:[^\]]+)\]\s*(?:\d+\.\s*)?([^|]+)\|\s*([^|]+)\|\s*Dare:\s*([^|]+)\|\s*Avere:\s*([^|]+)\|\s*(.*)$/i);
                if (m) {
                    return {
                        ref: m[1].trim(),
                        data: '',
                        conto: m[2].trim(),
                        tipoVar: m[3].trim(),
                        dare: m[4].trim() === '-' ? '' : m[4].trim(),
                        avere: m[5].trim() === '-' ? '' : m[5].trim(),
                        descrizione: m[6].trim()
                    };
                }
                return {
                    ref: '',
                    data: '',
                    conto: line,
                    tipoVar: '',
                    dare: '',
                    avere: '',
                    descrizione: ''
                };
            });
    }

    if (!step.reportGuided.ce.length && step.reportManual.ce) {
        step.reportGuided.ce = step.reportManual.ce
            .split('\n')
            .map((line) => line.trim())
            .map((line) => {
                const m = line.match(/^(Costo|Ricavo)\s*-\s*([^:]+):\s*([\d.,-]+)/i);
                if (!m) return null;
                return { tipo: m[1], conto: m[2].trim(), importo: m[3].replace(',', '.') };
            })
            .filter(Boolean);
    }

    if (!step.reportGuided.sp.length && step.reportManual.sp) {
        step.reportGuided.sp = step.reportManual.sp
            .split('\n')
            .map((line) => line.trim())
            .map((line) => {
                const m = line.match(/^(Attivo|Passivo)\s*-\s*([^:]+):\s*([\d.,-]+)/i);
                if (!m) return null;
                return { tipo: m[1], conto: m[2].trim(), importo: m[3].replace(',', '.') };
            })
            .filter(Boolean);
    }
}

function syncReportManualFromGuided(step) {
    ensureStepStructures(step);

    step.reportManual.giornale = step.reportGuided.giornale.map((r, idx) => {
        const ref = r.ref ? `[${r.ref}] ` : '';
        const dare = r.dare ? Number(r.dare).toFixed(2) : '-';
        const avere = r.avere ? Number(r.avere).toFixed(2) : '-';
        const conto = r.conto || '-';
        const tipoVar = r.tipoVar || '-';
        const descr = r.descrizione || '';
        return `${ref}${idx + 1}. ${r.data || '-'} | ${conto} | ${tipoVar} | Dare: ${dare} | Avere: ${avere} | ${descr}`;
    }).join('\n');

    step.reportManual.mastrini = step.reportGuided.mastrini.map((r) => {
        const dare = r.dare ? Number(r.dare).toFixed(2) : '-';
        const avere = r.avere ? Number(r.avere).toFixed(2) : '-';
        const saldo = r.saldo ? Number(r.saldo).toFixed(2) : (Number(r.dare || 0) - Number(r.avere || 0)).toFixed(2);
        const stato = r.stato || (Math.abs(Number(saldo)) < 0.0001 ? 'CHIUSO' : 'APERTO');
        return [
            `${r.conto || '-'}`,
            `  Dare: ${dare}`,
            `  Avere: ${avere}`,
            `  Saldo: ${saldo}`,
            `  Stato conto: ${stato}`,
            `  Riferimenti: ${r.riferimenti || '-'}`
        ].join('\n');
    }).join('\n\n');

    const ceLines = ['CONTO ECONOMICO'];
    step.reportGuided.ce.forEach((r) => {
        if (!r.conto) return;
        ceLines.push(`${r.tipo || 'Costo'} - ${r.conto}: ${Number(r.importo || 0).toFixed(2)}`);
    });
    step.reportManual.ce = ceLines.join('\n');

    const spLines = ['STATO PATRIMONIALE'];
    step.reportGuided.sp.forEach((r) => {
        if (!r.conto) return;
        spLines.push(`${r.tipo || 'Attivo'} - ${r.conto}: ${Number(r.importo || 0).toFixed(2)}`);
    });
    step.reportManual.sp = spLines.join('\n');
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
                },
                reportGuided: {
                    giornale: Array.isArray(step.reportGuided?.giornale) ? step.reportGuided.giornale : [],
                    mastrini: Array.isArray(step.reportGuided?.mastrini) ? step.reportGuided.mastrini : [],
                    ce: Array.isArray(step.reportGuided?.ce) ? step.reportGuided.ce : [],
                    sp: Array.isArray(step.reportGuided?.sp) ? step.reportGuided.sp : []
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
            },
            reportGuided: {
                giornale: [],
                mastrini: [],
                ce: [],
                sp: []
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
    ensureStepStructures(step);
    const sig = txSignature(t);
    const containsGuided = (rows) => rows.some((r) => (r.ref || '').includes(sig) || String(r.conto || '').toLowerCase() === String(t.conto).toLowerCase());

    const missing = [];
    if (!(containsGuided(step.reportGuided.giornale) || isMappedInSection(step.reportManual.giornale, t))) missing.push('Giornale');
    if (!(containsGuided(step.reportGuided.mastrini) || isMappedInSection(step.reportManual.mastrini, t))) missing.push('Mastrini');
    if (t.categoria === 'CE' && !(containsGuided(step.reportGuided.ce) || isMappedInSection(step.reportManual.ce, t))) missing.push('CE');
    if (t.categoria === 'SP' && !(containsGuided(step.reportGuided.sp) || isMappedInSection(step.reportManual.sp, t))) missing.push('SP');
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

    const sig = txSignature(tx);

    const addGiornale = () => {
        const exists = step.reportGuided.giornale.some((r) => (r.ref || '').includes(sig));
        if (exists) return;
        step.reportGuided.giornale.push({
            ref: sig,
            data: new Date().toLocaleDateString('it-IT'),
            conto: tx.conto,
            tipoVar: tx.tipoVar,
            dare: (tx.tipoVar === 'VFA' || tx.tipoVar === 'VEN') ? tx.importo : '',
            avere: (tx.tipoVar === 'VFP' || tx.tipoVar === 'VEP') ? tx.importo : '',
            descrizione: tx.descrizione || ''
        });
    };

    const addMastrino = () => {
        const exists = step.reportGuided.mastrini.some((r) => String(r.conto).toLowerCase() === String(tx.conto).toLowerCase() && String(r.riferimenti || '').includes(sig));
        if (exists) return;
        const dare = (tx.tipoVar === 'VFA' || tx.tipoVar === 'VEN') ? Number(tx.importo) : 0;
        const avere = (tx.tipoVar === 'VFP' || tx.tipoVar === 'VEP') ? Number(tx.importo) : 0;
        const saldo = dare - avere;
        step.reportGuided.mastrini.push({
            conto: tx.conto,
            dare: dare || '',
            avere: avere || '',
            saldo,
            stato: Math.abs(saldo) < 0.0001 ? 'CHIUSO' : 'APERTO',
            riferimenti: `[${sig}]`
        });
    };

    const addCeSp = () => {
        const arr = tx.categoria === 'CE' ? step.reportGuided.ce : step.reportGuided.sp;
        const exists = arr.some((r) => String(r.conto).toLowerCase() === String(tx.conto).toLowerCase() && String(r.ref || '').includes(sig));
        if (exists) return;
        arr.push({
            tipo: tx.categoria === 'CE'
                ? ((tx.tipoVar === 'VEN') ? 'Costo' : 'Ricavo')
                : ((tx.tipoVar === 'VFP') ? 'Passivo' : 'Attivo'),
            conto: tx.conto,
            importo: Number(tx.importo) || 0,
            ref: sig
        });
    };

    if (target === 'all') {
        addGiornale();
        addMastrino();
        addCeSp();
    } else if (target === 'ce-sp') {
        addCeSp();
    } else if (target === 'giornale') {
        addGiornale();
    } else if (target === 'mastrini') {
        addMastrino();
    }

    syncReportManualFromGuided(step);
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

    const helper = 'Compila le righe in modo guidato (non testo libero): ogni modifica aggiorna i report manuali.';

    const html = `
        <div class="panel">
            <h2>Libro Giornale (manuale guidato)</h2>
            <div class="builder-actions">
                <button onclick="generateSection('giornale')">Genera automaticamente</button>
                <button onclick="addGuidedRow('giornale')">Aggiungi riga</button>
                <button class="btn-secondary" onclick="clearSection('giornale')">Svuota</button>
            </div>
            <p>${helper}</p>
            ${renderGuidedGiornaleTable(step)}
        </div>

        <div class="panel">
            <h2>Mastrini (manuale guidato)</h2>
            <div class="builder-actions">
                <button onclick="generateSection('mastrini')">Genera automaticamente</button>
                <button onclick="addGuidedRow('mastrini')">Aggiungi riga</button>
                <button class="btn-secondary" onclick="clearSection('mastrini')">Svuota</button>
            </div>
            ${renderGuidedMastriniTable(step)}
        </div>

        <div class="panel">
            <h2>Conto Economico e Stato Patrimoniale (manuali guidati)</h2>
            <div class="builder-actions">
                <button onclick="generateSection('ce')">Genera CE</button>
                <button onclick="generateSection('sp')">Genera SP</button>
                <button onclick="generateAllSections()">Genera tutte le sezioni</button>
                <button onclick="addGuidedRow('ce')">Aggiungi riga CE</button>
                <button onclick="addGuidedRow('sp')">Aggiungi riga SP</button>
                <button class="btn-secondary" onclick="clearSection('ce')">Svuota CE</button>
                <button class="btn-secondary" onclick="clearSection('sp')">Svuota SP</button>
            </div>
            <h3>Conto Economico</h3>
            ${renderGuidedCeSpTable(step, 'ce')}
            <h3>Stato Patrimoniale</h3>
            ${renderGuidedCeSpTable(step, 'sp')}
        </div>
        ${currentStep === esercizio.length - 1 ? `
        <div class="panel">
            <h2>Pagina Finale - Bozza Bilancio di Esercizio</h2>
            <div class="builder-actions">
                <button onclick="generateFinalDraft()">Genera bozza bilancio</button>
                <button onclick="editBilancioDraft()">Modifica bozza</button>
                <button class="btn-secondary" onclick="clearSection('bilancio')">Svuota bozza</button>
            </div>
            <p>Bozza di studio: puoi modificarla manualmente prima di copiarla nel compito definitivo.</p>
            ${renderBilancioPreview(step)}
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

function renderBilancioPreview(step) {
    const text = String(step.reportManual.bilancio || '').trim();
    if (!text) {
        return '<div class="step-info">Nessuna bozza presente. Usa "Genera bozza bilancio" oppure "Modifica bozza".</div>';
    }

    const lines = text
        .split('\n')
        .map((line) => `<div>${escapeHtml(line) || '&nbsp;'}</div>`)
        .join('');

    return `<div class="step-info" style="max-height: 340px; overflow: auto; background: #fff;">${lines}</div>`;
}

function editBilancioDraft() {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    const current = step.reportManual.bilancio || '';
    const updated = prompt('Modifica bozza bilancio (testo completo):', current);
    if (updated === null) return;
    step.reportManual.bilancio = updated;
    renderStep();
}

function renderGuidedGiornaleTable(step) {
    const rows = step.reportGuided.giornale;
    const body = rows.map((r, i) => `
        <tr>
            <td>${escapeHtml(r.data || '-')}</td>
            <td>${escapeHtml(r.conto || '-')}</td>
            <td>${escapeHtml(r.tipoVar || '-')}</td>
            <td>${r.dare ? Number(r.dare).toFixed(2) : '-'}</td>
            <td>${r.avere ? Number(r.avere).toFixed(2) : '-'}</td>
            <td>${escapeHtml(r.descrizione || '-')}</td>
            <td>
                <button class="btn-secondary" onclick="editGuidedRow('giornale', ${i})">Modifica</button>
                <button class="btn-danger" onclick="removeGuidedRow('giornale', ${i})">Rimuovi</button>
            </td>
        </tr>
    `).join('');

    return `
        <table class="journal-table">
            <thead>
                <tr><th>Data</th><th>Conto</th><th>Analisi</th><th>Dare</th><th>Avere</th><th>Descrizione</th><th></th></tr>
            </thead>
            <tbody>${body || '<tr><td colspan="7">Nessuna riga. Usa "Aggiungi riga".</td></tr>'}</tbody>
        </table>
    `;
}

function renderGuidedMastriniTable(step) {
    const rows = step.reportGuided.mastrini;
    const body = rows.map((r, i) => `
        <tr>
            <td>${escapeHtml(r.conto || '-')}</td>
            <td>${r.dare ? Number(r.dare).toFixed(2) : '-'}</td>
            <td>${r.avere ? Number(r.avere).toFixed(2) : '-'}</td>
            <td>${(r.saldo !== '' && r.saldo !== undefined) ? Number(r.saldo).toFixed(2) : '-'}</td>
            <td>${escapeHtml(r.stato || '-')}</td>
            <td>${escapeHtml(r.riferimenti || '-')}</td>
            <td>
                <button class="btn-secondary" onclick="editGuidedRow('mastrini', ${i})">Modifica</button>
                <button class="btn-danger" onclick="removeGuidedRow('mastrini', ${i})">Rimuovi</button>
            </td>
        </tr>
    `).join('');

    return `
        <table class="journal-table">
            <thead>
                <tr><th>Conto</th><th>Dare</th><th>Avere</th><th>Saldo</th><th>Stato</th><th>Riferimenti</th><th></th></tr>
            </thead>
            <tbody>${body || '<tr><td colspan="7">Nessuna riga. Usa "Aggiungi riga".</td></tr>'}</tbody>
        </table>
    `;
}

function renderGuidedCeSpTable(step, section) {
    const rows = step.reportGuided[section];
    const isCe = section === 'ce';
    const body = rows.map((r, i) => `
        <tr>
            <td>${escapeHtml(r.tipo || (isCe ? 'Costo' : 'Attivo'))}</td>
            <td>${escapeHtml(r.conto || '-')}</td>
            <td>${r.importo ? Number(r.importo).toFixed(2) : '-'}</td>
            <td>
                <button class="btn-secondary" onclick="editGuidedRow('${section}', ${i})">Modifica</button>
                <button class="btn-danger" onclick="removeGuidedRow('${section}', ${i})">Rimuovi</button>
            </td>
        </tr>
    `).join('');

    return `
        <table class="journal-table">
            <thead>
                <tr><th>${isCe ? 'Tipo CE' : 'Tipo SP'}</th><th>Conto</th><th>Importo</th><th></th></tr>
            </thead>
            <tbody>${body || '<tr><td colspan="4">Nessuna riga. Usa "Aggiungi riga".</td></tr>'}</tbody>
        </table>
    `;
}

function addGuidedRow(section) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);

    let row = null;
    if (section === 'giornale') {
        const conto = prompt('Conto (Libro Giornale):', '');
        if (conto === null) return;
        row = {
            ref: '',
            data: prompt('Data:', new Date().toLocaleDateString('it-IT')) || '',
            conto: conto.trim(),
            tipoVar: (prompt('Analisi (VFA/VFP/VEN/VEP):', 'VFA') || '').trim(),
            dare: prompt('Importo Dare (vuoto se non presente):', '') || '',
            avere: prompt('Importo Avere (vuoto se non presente):', '') || '',
            descrizione: prompt('Descrizione:', '') || ''
        };
    } else if (section === 'mastrini') {
        const conto = prompt('Conto (Mastrino):', '');
        if (conto === null) return;
        row = {
            conto: conto.trim(),
            dare: prompt('Totale Dare:', '') || '',
            avere: prompt('Totale Avere:', '') || '',
            saldo: prompt('Saldo:', '') || '',
            stato: (prompt('Stato (APERTO/CHIUSO):', 'APERTO') || 'APERTO').toUpperCase(),
            riferimenti: prompt('Riferimenti TX:', '') || ''
        };
    } else if (section === 'ce' || section === 'sp') {
        const conto = prompt(`Conto (${section.toUpperCase()}):`, '');
        if (conto === null) return;
        row = {
            tipo: prompt(`Tipo (${section === 'ce' ? 'Costo/Ricavo' : 'Attivo/Passivo'}):`, section === 'ce' ? 'Costo' : 'Attivo') || (section === 'ce' ? 'Costo' : 'Attivo'),
            conto: conto.trim(),
            importo: prompt('Importo:', '') || ''
        };
    }

    if (!row) return;
    step.reportGuided[section].push(row);
    syncReportManualFromGuided(step);
    renderStep();
}

function editGuidedRow(section, index) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    const row = step.reportGuided[section]?.[index];
    if (!row) return;

    if (section === 'giornale') {
        const conto = prompt('Conto (Libro Giornale):', row.conto || '');
        if (conto === null) return;
        row.data = prompt('Data:', row.data || '') || '';
        row.conto = conto.trim();
        row.tipoVar = (prompt('Analisi (VFA/VFP/VEN/VEP):', row.tipoVar || '') || '').trim();
        row.dare = prompt('Importo Dare (vuoto se non presente):', row.dare || '') || '';
        row.avere = prompt('Importo Avere (vuoto se non presente):', row.avere || '') || '';
        row.descrizione = prompt('Descrizione:', row.descrizione || '') || '';
    } else if (section === 'mastrini') {
        const conto = prompt('Conto (Mastrino):', row.conto || '');
        if (conto === null) return;
        row.conto = conto.trim();
        row.dare = prompt('Totale Dare:', row.dare || '') || '';
        row.avere = prompt('Totale Avere:', row.avere || '') || '';
        row.saldo = prompt('Saldo:', row.saldo || '') || '';
        row.stato = (prompt('Stato (APERTO/CHIUSO):', row.stato || 'APERTO') || 'APERTO').toUpperCase();
        row.riferimenti = prompt('Riferimenti TX:', row.riferimenti || '') || '';
    } else if (section === 'ce' || section === 'sp') {
        const conto = prompt(`Conto (${section.toUpperCase()}):`, row.conto || '');
        if (conto === null) return;
        row.tipo = prompt(`Tipo (${section === 'ce' ? 'Costo/Ricavo' : 'Attivo/Passivo'}):`, row.tipo || (section === 'ce' ? 'Costo' : 'Attivo')) || row.tipo;
        row.conto = conto.trim();
        row.importo = prompt('Importo:', row.importo || '') || '';
    }

    syncReportManualFromGuided(step);
    renderStep();
}

function updateGuidedRow(section, index, field, value) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    if (!step.reportGuided[section] || !step.reportGuided[section][index]) return;
    step.reportGuided[section][index][field] = value;
    syncReportManualFromGuided(step);
    saveToLocalStorage();
}

function removeGuidedRow(section, index) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    if (!step.reportGuided[section]) return;
    step.reportGuided[section].splice(index, 1);
    syncReportManualFromGuided(step);
    renderStep();
}

function clearSection(section) {
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportManual[section] = '';

    if (section === 'giornale' || section === 'mastrini' || section === 'ce' || section === 'sp') {
        step.reportGuided[section] = [];
    }

    renderStep();
}

function generateSection(section) {
    const generated = buildGeneratedReports();
    const step = esercizio[currentStep];
    ensureStepStructures(step);

    if (section === 'giornale' || section === 'mastrini' || section === 'ce' || section === 'sp') {
        step.reportGuided[section] = generated.guided[section] || [];
        syncReportManualFromGuided(step);
    }

    step.reportManual[section] = generated[section] || '';
    renderStep();
}

function generateAllSections() {
    const generated = buildGeneratedReports();
    const step = esercizio[currentStep];
    ensureStepStructures(step);
    step.reportGuided.giornale = generated.guided.giornale || [];
    step.reportGuided.mastrini = generated.guided.mastrini || [];
    step.reportGuided.ce = generated.guided.ce || [];
    step.reportGuided.sp = generated.guided.sp || [];
    syncReportManualFromGuided(step);
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
        sp: '',
        guided: {
            giornale: [],
            mastrini: [],
            ce: [],
            sp: []
        }
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

    generated.guided.giornale = transazioni.map((t) => ({
        ref: txSignature(t),
        data: t.data,
        conto: t.nome,
        tipoVar: t.tipoVar,
        dare: (t.tipoVar === 'VFA' || t.tipoVar === 'VEN') ? t.importo.toFixed(2) : '',
        avere: (t.tipoVar === 'VFP' || t.tipoVar === 'VEP') ? t.importo.toFixed(2) : '',
        descrizione: t.descrizione || ''
    }));

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

        generated.guided.mastrini.push({
            conto: nome,
            dare: totDare.toFixed(2),
            avere: totAvere.toFixed(2),
            saldo: saldo.toFixed(2),
            stato,
            riferimenti: refs || '-'
        });
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
            generated.guided.ce.push({ tipo: 'Costo', conto: nome, importo: saldo.toFixed(2) });
        } else if (saldo < 0) {
            ceLines.push(`Ricavo - ${nome}: ${Math.abs(saldo).toFixed(2)}`);
            ricavi += Math.abs(saldo);
            generated.guided.ce.push({ tipo: 'Ricavo', conto: nome, importo: Math.abs(saldo).toFixed(2) });
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
            generated.guided.sp.push({ tipo: 'Attivo', conto: nome, importo: saldo.toFixed(2) });
        } else if (saldo < 0) {
            spLines.push(`Passivo - ${nome}: ${Math.abs(saldo).toFixed(2)}`);
            passivo += Math.abs(saldo);
            generated.guided.sp.push({ tipo: 'Passivo', conto: nome, importo: Math.abs(saldo).toFixed(2) });
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
