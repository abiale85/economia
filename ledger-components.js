(function () {
    function defaultEntry(type) {
        if (type === 'mastrino') {
            return {
                descrizione: '',
                dare: '',
                avere: ''
            };
        }
        if (type === 'mastro') {
            return {
                data: new Date().toLocaleDateString('it-IT'),
                descrizione: '',
                totaleDare: '',
                totaleAvere: '',
                saldo: ''
            };
        }
        if (type === 'giornale') {
            return {
                data: new Date().toLocaleDateString('it-IT'),
                conto: '',
                analisi: 'VFA',
                dare: '',
                avere: '',
                descrizione: ''
            };
        }
        return null;
    }

    function normalizeItem(type, item, uid) {
        const data = item.data || {};

        if (type === 'mastrino') {
            const legacy = { data: '', descrizione: '', dare: data.dare || '', avere: data.avere || '' };
            return {
                id: item.id || uid('item'),
                type,
                data: {
                    conto: data.conto || '',
                    stato: data.stato || 'APERTO',
                    entries: (data.entries && data.entries.length ? data.entries : [legacy]).map((e) => ({
                        descrizione: e.descrizione || '',
                        dare: e.dare || '',
                        avere: e.avere || ''
                    }))
                }
            };
        }

        if (type === 'mastro') {
            const legacy = {
                data: '',
                descrizione: '',
                totaleDare: data.totaleDare || '',
                totaleAvere: data.totaleAvere || '',
                saldo: data.saldo || ''
            };
            return {
                id: item.id || uid('item'),
                type,
                data: {
                    conto: data.conto || '',
                    entries: (data.entries && data.entries.length ? data.entries : [legacy]).map((e) => ({
                        data: e.data || '',
                        descrizione: e.descrizione || '',
                        totaleDare: e.totaleDare || '',
                        totaleAvere: e.totaleAvere || '',
                        saldo: e.saldo || ''
                    }))
                }
            };
        }

        if (type === 'giornale') {
            const legacy = {
                data: data.data || '',
                conto: data.conto || '',
                analisi: data.analisi || 'VFA',
                dare: data.dare || '',
                avere: data.avere || '',
                descrizione: data.descrizione || ''
            };
            return {
                id: item.id || uid('item'),
                type,
                data: {
                    titolo: data.titolo || 'Registrazioni giornale',
                    entries: (data.entries && data.entries.length ? data.entries : [legacy]).map((e) => ({
                        data: e.data || '',
                        conto: e.conto || '',
                        analisi: e.analisi || 'VFA',
                        dare: e.dare || '',
                        avere: e.avere || '',
                        descrizione: e.descrizione || ''
                    }))
                }
            };
        }

        return null;
    }

    function renderTypeForm(type, data, entryOnly, escapeHtml, accountsDatalist, computeMastrinoStatus) {
        if (type === 'mastrino' && !entryOnly) {
            const statoAuto = computeMastrinoStatus(data.entries || []);
            return `
                <div class="grid">
                    <div><label>Conto</label><input list="contoSuggestions" name="conto" value="${escapeHtml(data.conto)}" placeholder="Inizia a scrivere un conto"></div>
                    <div><label>Stato</label><input value="${statoAuto}" readonly></div>
                </div>
                ${accountsDatalist}
            `;
        }

        if (type === 'mastrino' && entryOnly) {
            return `
                <div class="grid">
                    <div><label>Descrizione</label><input name="descrizione" value="${escapeHtml(data.descrizione || '')}"></div>
                    <div><label>Dare</label><input name="dare" value="${escapeHtml(data.dare || '')}"></div>
                    <div><label>Avere</label><input name="avere" value="${escapeHtml(data.avere || '')}"></div>
                </div>
            `;
        }

        if (type === 'mastro' && !entryOnly) {
            return `
                <div class="grid">
                    <div><label>Conto</label><input list="contoSuggestions" name="conto" value="${escapeHtml(data.conto)}" placeholder="Inizia a scrivere un conto"></div>
                </div>
                ${accountsDatalist}
            `;
        }

        if (type === 'mastro' && entryOnly) {
            return `
                <div class="grid">
                    <div><label>Data</label><input name="data" value="${escapeHtml(data.data || new Date().toLocaleDateString('it-IT'))}"></div>
                    <div><label>Descrizione</label><input name="descrizione" value="${escapeHtml(data.descrizione || '')}"></div>
                    <div><label>Totale Dare</label><input name="totaleDare" value="${escapeHtml(data.totaleDare || '')}"></div>
                    <div><label>Totale Avere</label><input name="totaleAvere" value="${escapeHtml(data.totaleAvere || '')}"></div>
                </div>
            `;
        }

        if (type === 'giornale' && !entryOnly) {
            return `
                <div class="grid">
                    <div><label>Titolo blocco</label><input name="titolo" value="${escapeHtml(data.titolo || '')}"></div>
                </div>
            `;
        }

        if (type === 'giornale' && entryOnly) {
            return `
                <div class="grid">
                    <div><label>Data</label><input name="data" value="${escapeHtml(data.data || new Date().toLocaleDateString('it-IT'))}"></div>
                    <div><label>Conto</label><input list="contoSuggestions" name="conto" value="${escapeHtml(data.conto || '')}" placeholder="Inizia a scrivere un conto"></div>
                    <div><label>Analisi</label>
                        <select name="analisi">
                            <option value="VFA" ${(data.analisi || 'VFA') === 'VFA' ? 'selected' : ''}>VFA</option>
                            <option value="VFP" ${data.analisi === 'VFP' ? 'selected' : ''}>VFP</option>
                            <option value="VEN" ${data.analisi === 'VEN' ? 'selected' : ''}>VEN</option>
                            <option value="VEP" ${data.analisi === 'VEP' ? 'selected' : ''}>VEP</option>
                        </select>
                    </div>
                    <div><label>Dare</label><input name="dare" value="${escapeHtml(data.dare || '')}"></div>
                    <div><label>Avere</label><input name="avere" value="${escapeHtml(data.avere || '')}"></div>
                    <div style="grid-column: 1 / -1;"><label>Descrizione</label><textarea name="descrizione">${escapeHtml(data.descrizione || '')}</textarea></div>
                </div>
                ${accountsDatalist}
            `;
        }

        return null;
    }

    function renderItemBody(item, editMode, escapeHtml, renderEntryActions) {
        const d = item.data || {};

        if (item.type === 'mastrino') {
            const entries = d.entries || [];
            const totD = entries.reduce((s, e) => s + Number(e.dare || 0), 0);
            const totA = entries.reduce((s, e) => s + Number(e.avere || 0), 0);
            const saldo = (totD - totA).toFixed(2);
            const dareLines = entries.map((e) => `<span title="${escapeHtml(e.descrizione || '')}">${escapeHtml(e.dare || '-')}</span>`);
            const avereLines = entries.map((e) => `<span title="${escapeHtml(e.descrizione || '')}">${escapeHtml(e.avere || '-')}</span>`);

            const entryBlocks = entries.map((e, idx) => `
                <tr>
                    <td title="${escapeHtml(e.descrizione || '')}">${escapeHtml(e.dare || '-')}</td>
                    <td title="${escapeHtml(e.descrizione || '')}">${escapeHtml(e.avere || '-')}</td>
                    <td>${renderEntryActions(item.id, idx, true)}</td>
                </tr>
            `).join('');

            if (editMode) {
                return `
                    <div class="kv"><strong>Conto:</strong> ${escapeHtml(d.conto || '-')}</div>
                    <table class="ledger-table" style="margin-top:6px;">
                        <thead><tr><th>Dare</th><th>Avere</th><th>Azioni voce</th></tr></thead>
                        <tbody>${entryBlocks || '<tr><td colspan="3">Nessuna voce.</td></tr>'}</tbody>
                    </table>
                    <div class="t-foot" style="margin-top:6px;">Saldo: ${saldo} | Stato: ${escapeHtml(d.stato || 'APERTO')}</div>
                `;
            }

            return `
                <div class="t-accounts">
                    <div class="t-account">
                        <div class="t-account-head">${escapeHtml(d.conto || 'Conto')}</div>
                        <div class="t-account-body">
                            <div class="t-col"><strong>Dare</strong><br>${dareLines.join('<br>') || '-'}</div>
                            <div class="t-col t-col-right"><strong>Avere</strong><br>${avereLines.join('<br>') || '-'}</div>
                        </div>
                        <div class="t-foot">Saldo: ${saldo} | Stato: ${escapeHtml(d.stato || 'APERTO')}</div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'mastro') {
            const rows = (d.entries || []).map((e, idx) => {
                const dare = Number(e.totaleDare || 0);
                const avere = Number(e.totaleAvere || 0);
                const bothEmpty = !String(e.totaleDare || '').trim() && !String(e.totaleAvere || '').trim();
                const saldo = bothEmpty ? '-' : (dare - avere).toFixed(2);
                return `
                    <tr>
                        <td>${escapeHtml(e.data || '-')}</td>
                        <td>${escapeHtml(e.descrizione || '-')}</td>
                        <td>${escapeHtml(e.totaleDare || '-')}</td>
                        <td>${escapeHtml(e.totaleAvere || '-')}</td>
                        <td>${saldo}</td>
                        ${editMode ? `<td>${renderEntryActions(item.id, idx, true)}</td>` : ''}
                    </tr>
                `;
            }).join('');

            return `
                <div class="kv"><strong>Conto:</strong> ${escapeHtml(d.conto || '-')}</div>
                <table class="ledger-table" style="margin-top:6px;">
                    <thead><tr><th>Data</th><th>Descrizione</th><th>Totale Dare</th><th>Totale Avere</th><th>Saldo</th>${editMode ? '<th>Azioni voce</th>' : ''}</tr></thead>
                    <tbody>${rows || `<tr><td colspan="${editMode ? 6 : 5}">Nessuna voce.</td></tr>`}</tbody>
                </table>
            `;
        }

        if (item.type === 'giornale') {
            const rows = (d.entries || []).map((e, idx) => `
                <tr>
                    <td>${escapeHtml(e.data || '-')}</td>
                    <td>${escapeHtml(e.conto || '-')}</td>
                    <td>${escapeHtml(e.analisi || '-')}</td>
                    <td>${escapeHtml(e.dare || '-')}</td>
                    <td>${escapeHtml(e.avere || '-')}</td>
                    <td>${escapeHtml(e.descrizione || '-')}</td>
                    ${editMode ? `<td>${renderEntryActions(item.id, idx, true)}</td>` : ''}
                </tr>
            `).join('');
            return `
                <div class="kv"><strong>${escapeHtml(d.titolo || 'Libro Giornale')}</strong></div>
                <table class="ledger-table" style="margin-top:6px;">
                    <thead><tr><th>Data</th><th>Conto</th><th>Analisi</th><th>Dare</th><th>Avere</th><th>Descrizione</th>${editMode ? '<th>Azioni voce</th>' : ''}</tr></thead>
                    <tbody>${rows || `<tr><td colspan="${editMode ? 7 : 6}">Nessuna voce.</td></tr>`}</tbody>
                </table>
            `;
        }

        return null;
    }

    function buildEntryFromForm(type, raw) {
        if (type === 'mastrino') {
            return {
                descrizione: raw.descrizione || '',
                dare: raw.dare || '',
                avere: raw.avere || ''
            };
        }

        if (type === 'mastro') {
            const dare = Number(raw.totaleDare || 0);
            const avere = Number(raw.totaleAvere || 0);
            const bothEmpty = !String(raw.totaleDare || '').trim() && !String(raw.totaleAvere || '').trim();
            return {
                data: raw.data || '',
                descrizione: raw.descrizione || '',
                totaleDare: raw.totaleDare || '',
                totaleAvere: raw.totaleAvere || '',
                saldo: bothEmpty ? '' : (dare - avere).toFixed(2)
            };
        }

        if (type === 'giornale') {
            return {
                data: raw.data || '',
                conto: raw.conto || '',
                analisi: raw.analisi || 'VFA',
                dare: raw.dare || '',
                avere: raw.avere || '',
                descrizione: raw.descrizione || ''
            };
        }

        return null;
    }

    window.LedgerComponents = {
        defaultEntry,
        normalizeItem,
        renderTypeForm,
        renderItemBody,
        buildEntryFromForm
    };
})();
