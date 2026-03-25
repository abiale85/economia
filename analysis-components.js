(function () {
    function defaultEntry() {
        return {
            seEimporto: '', seEconto: '', seEdescrizione: '', seEcodice: '',
            seUimporto: '', seUconto: '', seUdescrizione: '', seUcodice: '',
            sfEimporto: '', sfEconto: '', sfEdescrizione: '', sfEcodice: '',
            sfUimporto: '', sfUconto: '', sfUdescrizione: '', sfUcodice: ''
        };
    }

    function normalizeEntry(entry) {
        const e = entry || {};
        const isNew = 'seEimporto' in e || 'seUimporto' in e || 'sfEimporto' in e || 'sfUimporto' in e;
        const isOld4 = 'seE' in e || 'seU' in e || 'sfE' in e || 'sfU' in e;
        const isOld8 = 'eImporto' in e || 'uImporto' in e;

        if (isNew) {
            return {
                seEimporto: e.seEimporto || '', seEconto: e.seEconto || '', seEdescrizione: e.seEdescrizione || '', seEcodice: e.seEcodice || '',
                seUimporto: e.seUimporto || '', seUconto: e.seUconto || '', seUdescrizione: e.seUdescrizione || '', seUcodice: e.seUcodice || '',
                sfEimporto: e.sfEimporto || '', sfEconto: e.sfEconto || '', sfEdescrizione: e.sfEdescrizione || '', sfEcodice: e.sfEcodice || '',
                sfUimporto: e.sfUimporto || '', sfUconto: e.sfUconto || '', sfUdescrizione: e.sfUdescrizione || '', sfUcodice: e.sfUcodice || ''
            };
        }

        if (isOld4) {
            return {
                seEimporto: e.seE || '', seEconto: '', seEdescrizione: '', seEcodice: 'VFA',
                seUimporto: e.seU || '', seUconto: '', seUdescrizione: '', seUcodice: 'VFP',
                sfEimporto: e.sfE || '', sfEconto: '', sfEdescrizione: '', sfEcodice: 'VEP',
                sfUimporto: e.sfU || '', sfUconto: '', sfUdescrizione: '', sfUcodice: 'VEN'
            };
        }

        if (isOld8) {
            return {
                seEimporto: e.eImporto || '', seEconto: e.eDescrizione || '', seEdescrizione: '', seEcodice: e.eVariazione || 'VFA',
                seUimporto: e.uImporto || '', seUconto: e.uDescrizione || '', seUdescrizione: '', seUcodice: e.uVariazione || 'VFP',
                sfEimporto: '', sfEconto: '', sfEdescrizione: '', sfEcodice: 'VEP',
                sfUimporto: '', sfUconto: '', sfUdescrizione: '', sfUcodice: 'VEN'
            };
        }

        return defaultEntry();
    }

    function buildEntryFromForm(raw) {
        return {
            seEimporto: raw.seEimporto || '',
            seEconto: raw.seEconto || '',
            seEdescrizione: raw.seEdescrizione || '',
            seEcodice: raw.seEcodice || '',
            seUimporto: raw.seUimporto || '',
            seUconto: raw.seUconto || '',
            seUdescrizione: raw.seUdescrizione || '',
            seUcodice: raw.seUcodice || '',
            sfEimporto: raw.sfEimporto || '',
            sfEconto: raw.sfEconto || '',
            sfEdescrizione: raw.sfEdescrizione || '',
            sfEcodice: raw.sfEcodice || '',
            sfUimporto: raw.sfUimporto || '',
            sfUconto: raw.sfUconto || '',
            sfUdescrizione: raw.sfUdescrizione || '',
            sfUcodice: raw.sfUcodice || ''
        };
    }

    function renderEntryForm(data, escapeHtml) {
        return `
            <table class="analysis-matrix">
                <thead>
                    <tr><th></th><th>E</th><th>U</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>SE</strong></td>
                        <td>
                            <div class="analysis-cell">
                                <input name="seEimporto" value="${escapeHtml(data.seEimporto || '')}" placeholder="Importo">
                                <input list="contoSuggestions" name="seEconto" value="${escapeHtml(data.seEconto || '')}" placeholder="Conto">
                                <input name="seEdescrizione" value="${escapeHtml(data.seEdescrizione || '')}" placeholder="Descrizione">
                                <input name="seEcodice" value="${escapeHtml(data.seEcodice || '')}" placeholder="Codice (VFA/VFP/VEN/VEP)">
                            </div>
                        </td>
                        <td>
                            <div class="analysis-cell">
                                <input name="seUimporto" value="${escapeHtml(data.seUimporto || '')}" placeholder="Importo">
                                <input list="contoSuggestions" name="seUconto" value="${escapeHtml(data.seUconto || '')}" placeholder="Conto">
                                <input name="seUdescrizione" value="${escapeHtml(data.seUdescrizione || '')}" placeholder="Descrizione">
                                <input name="seUcodice" value="${escapeHtml(data.seUcodice || '')}" placeholder="Codice (VFA/VFP/VEN/VEP)">
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td><strong>SF</strong></td>
                        <td>
                            <div class="analysis-cell">
                                <input name="sfEimporto" value="${escapeHtml(data.sfEimporto || '')}" placeholder="Importo">
                                <input list="contoSuggestions" name="sfEconto" value="${escapeHtml(data.sfEconto || '')}" placeholder="Conto">
                                <input name="sfEdescrizione" value="${escapeHtml(data.sfEdescrizione || '')}" placeholder="Descrizione">
                                <input name="sfEcodice" value="${escapeHtml(data.sfEcodice || '')}" placeholder="Codice (VFA/VFP/VEN/VEP)">
                            </div>
                        </td>
                        <td>
                            <div class="analysis-cell">
                                <input name="sfUimporto" value="${escapeHtml(data.sfUimporto || '')}" placeholder="Importo">
                                <input list="contoSuggestions" name="sfUconto" value="${escapeHtml(data.sfUconto || '')}" placeholder="Conto">
                                <input name="sfUdescrizione" value="${escapeHtml(data.sfUdescrizione || '')}" placeholder="Descrizione">
                                <input name="sfUcodice" value="${escapeHtml(data.sfUcodice || '')}" placeholder="Codice (VFA/VFP/VEN/VEP)">
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderEntryDisplay(entry, escapeHtml) {
        const r = normalizeEntry(entry);
        return `
            <table class="analysis-display">
                <thead>
                    <tr><th></th><th>E</th><th>U</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>SE</strong></td>
                        <td>
                            <div class="analysis-read-cell">
                                <div><strong>Imp.</strong> ${escapeHtml(r.seEimporto || '-')}</div>
                                <div><strong>Conto</strong> ${escapeHtml(r.seEconto || '-')}</div>
                                <div><strong>Desc.</strong> ${escapeHtml(r.seEdescrizione || '-')}</div>
                                <div><strong>Cod.</strong> ${escapeHtml(r.seEcodice || '-')}</div>
                            </div>
                        </td>
                        <td>
                            <div class="analysis-read-cell">
                                <div><strong>Imp.</strong> ${escapeHtml(r.seUimporto || '-')}</div>
                                <div><strong>Conto</strong> ${escapeHtml(r.seUconto || '-')}</div>
                                <div><strong>Desc.</strong> ${escapeHtml(r.seUdescrizione || '-')}</div>
                                <div><strong>Cod.</strong> ${escapeHtml(r.seUcodice || '-')}</div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td><strong>SF</strong></td>
                        <td>
                            <div class="analysis-read-cell">
                                <div><strong>Imp.</strong> ${escapeHtml(r.sfEimporto || '-')}</div>
                                <div><strong>Conto</strong> ${escapeHtml(r.sfEconto || '-')}</div>
                                <div><strong>Desc.</strong> ${escapeHtml(r.sfEdescrizione || '-')}</div>
                                <div><strong>Cod.</strong> ${escapeHtml(r.sfEcodice || '-')}</div>
                            </div>
                        </td>
                        <td>
                            <div class="analysis-read-cell">
                                <div><strong>Imp.</strong> ${escapeHtml(r.sfUimporto || '-')}</div>
                                <div><strong>Conto</strong> ${escapeHtml(r.sfUconto || '-')}</div>
                                <div><strong>Desc.</strong> ${escapeHtml(r.sfUdescrizione || '-')}</div>
                                <div><strong>Cod.</strong> ${escapeHtml(r.sfUcodice || '-')}</div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function extractMovements(entries, parseAmount, normalizeVarCode) {
        const out = [];
        (entries || []).map(normalizeEntry).forEach((r) => {
            const seEamt = parseAmount(r.seEimporto);
            if (seEamt !== 0 && r.seEconto) {
                out.push({
                    conto: r.seEconto,
                    code: normalizeVarCode(r.seEcodice, '+'),
                    amount: Math.abs(seEamt),
                    descrizione: r.seEdescrizione || 'SE-E da Analisi',
                    side: 'SE-E'
                });
            }

            const seUamt = parseAmount(r.seUimporto);
            if (seUamt !== 0 && r.seUconto) {
                out.push({
                    conto: r.seUconto,
                    code: normalizeVarCode(r.seUcodice, '-'),
                    amount: Math.abs(seUamt),
                    descrizione: r.seUdescrizione || 'SE-U da Analisi',
                    side: 'SE-U'
                });
            }

            const sfEamt = parseAmount(r.sfEimporto);
            if (sfEamt !== 0 && r.sfEconto) {
                out.push({
                    conto: r.sfEconto,
                    code: normalizeVarCode(r.sfEcodice, '+'),
                    amount: Math.abs(sfEamt),
                    descrizione: r.sfEdescrizione || 'SF-E da Analisi',
                    side: 'SF-E'
                });
            }

            const sfUamt = parseAmount(r.sfUimporto);
            if (sfUamt !== 0 && r.sfUconto) {
                out.push({
                    conto: r.sfUconto,
                    code: normalizeVarCode(r.sfUcodice, '-'),
                    amount: Math.abs(sfUamt),
                    descrizione: r.sfUdescrizione || 'SF-U da Analisi',
                    side: 'SF-U'
                });
            }
        });

        return out.filter((m) => m.conto);
    }

    window.AnalysisComponents = {
        defaultEntry,
        normalizeEntry,
        buildEntryFromForm,
        renderEntryForm,
        renderEntryDisplay,
        extractMovements
    };
})();
