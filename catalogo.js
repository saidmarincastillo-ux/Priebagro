const catalogo = {
    render: function() {
        const type = document.getElementById('filter-type').value;
        const search = document.getElementById('search-catalogo').value;
        
        const data = dbManager.getInsumos(type, search);
        const container = document.getElementById('catalogo-list');
        
        if(data.length === 0) {
            container.innerHTML = "<p>No se encontraron productos.</p>";
            return;
        }

        container.innerHTML = data.map(item => {
            const isAgotado = item.agotado == 1;
            const isOferta = item.en_oferta == 1;

            let badgesHtml = `<span class="badge ${item.tipo.toLowerCase()}">${item.tipo === 'ABONO' ? 'Abono Sólido' : 'Líquido Agrícola'}</span>`;
            
            if(isOferta) {
                badgesHtml += ` <span class="badge oferta"><i class="fa-solid fa-tag"></i> ${item.texto_promocion || '¡OFERTA!'}</span>`;
            }
            if(isAgotado) {
                badgesHtml += ` <span class="badge agotado"><i class="fa-solid fa-ban"></i> AGOTADO</span>`;
            }

            let precioHtml = '';
            if(isOferta && item.precio_oferta) {
                precioHtml = `
                    <p style="margin: 6px 0;">
                        <strong>Precio:</strong> 
                        ${item.precio ? `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.95rem;">C$ ${item.precio.toFixed(2)}</span>` : ''}
                        <span style="color: #e67e22; font-size: 1.25rem; font-weight: 800; margin-left: 6px;">C$ ${item.precio_oferta.toFixed(2)}</span>
                    </p>
                `;
            } else if(item.precio) {
                precioHtml = `<p style="margin: 6px 0;"><strong>Precio:</strong> <span style="color:var(--primary-dark); font-weight:700;">C$ ${item.precio.toFixed(2)}</span></p>`;
            }

            return `
                <div class="item-card ${isAgotado ? 'agotado-card' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px; margin-bottom:8px;">
                        <div>${badgesHtml}</div>
                        ${isAgotado ? '<small style="color:var(--danger); font-weight:700;">Sin existencias</small>' : '<small style="color:var(--primary-dark); font-weight:600;"><i class="fa-solid fa-check"></i> En Stock</small>'}
                    </div>
                    <img src="${item.imagen || (item.tipo === 'ABONO' ? 'img/saco_abono.png' : 'img/botella_liquido.png')}" class="item-image" alt="${item.nombre}">
                    <h3>${item.nombre}</h3>
                    <p><strong>Distribuidor:</strong> ${item.distribuidor}</p>
                    ${precioHtml}
                    <p><strong>Presentación:</strong> ${item.presentacion || 'No especificada'}</p>
                    <p><strong>Composición:</strong> ${item.composicion}</p>
                    <p><strong>Propósito:</strong> ${item.proposito}</p>
                    <hr style="margin:10px 0; border:0; border-top:1px solid #e5e7eb;">
                    <p><strong>Aplicación:</strong> <span style="color:var(--text-muted); font-size:0.9rem; font-weight:500;">${item.aplicacion}</span></p>
                    <p><strong>Compatibilidad:</strong> <span style="color:var(--text-muted); font-size:0.9rem; font-weight:500;">${item.compatibilidad}</span></p>
                </div>
            `;
        }).join('');
    }
};

// Event Listeners for catalog
document.getElementById('search-catalogo').addEventListener('input', () => catalogo.render());
document.getElementById('filter-type').addEventListener('change', () => catalogo.render());
