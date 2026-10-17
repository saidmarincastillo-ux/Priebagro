const admin = {
    currentPalette: 'verde',

    solicitarAcceso: function() {
        if (app.currentUser && app.currentUser.email === "admin@gmail.com") {
            app.navigate('admin');
            this.showTab('add');
        } else {
            app.showAlert("Acceso Denegado", "No tienes permisos de administrador.", true);
        }
    },

    showTab: function(tabName) {
        document.getElementById('admin-add-section').style.display = (tabName === 'add') ? 'block' : 'none';
        document.getElementById('admin-manage-section').style.display = (tabName === 'manage') ? 'block' : 'none';
        document.getElementById('admin-palette-section').style.display = (tabName === 'palette') ? 'block' : 'none';

        document.getElementById('tab-add').className = (tabName === 'add') ? 'btn-primary' : 'btn-ghost';
        document.getElementById('tab-manage').className = (tabName === 'manage') ? 'btn-primary' : 'btn-ghost';
        document.getElementById('tab-palette').className = (tabName === 'palette') ? 'btn-primary' : 'btn-ghost';

        if(tabName === 'manage') {
            this.renderManageList();
        } else if(tabName === 'palette') {
            this.initPaletteTab();
        }
    },

    toggleOfertaFields: function() {
        const isChecked = document.getElementById('admin-en-oferta').checked;
        document.getElementById('admin-oferta-fields').style.display = isChecked ? 'block' : 'none';
    },

    renderManageList: function() {
        const searchTerm = document.getElementById('admin-search-manage').value;
        const products = dbManager.getInsumos('ALL', searchTerm);
        const listContainer = document.getElementById('admin-products-list');
        listContainer.innerHTML = '';

        if(products.length === 0) {
            listContainer.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }

        products.forEach(p => {
            const isAgotado = p.agotado == 1;
            const isOferta = p.en_oferta == 1;

            let badgesHtml = '';
            if(isOferta) {
                badgesHtml += ` <span style="background:#e67e22; color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-tag"></i> Oferta (C$ ${p.precio_oferta || p.precio})</span>`;
            }
            if(isAgotado) {
                badgesHtml += ` <span style="background:var(--danger); color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-ban"></i> Agotado</span>`;
            } else {
                badgesHtml += ` <span style="background:var(--primary-color); color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i> En Stock</span>`;
            }

            const div = document.createElement('div');
            div.style.border = isAgotado ? '1px solid #ffcdd2' : '1px solid #ddd';
            div.style.padding = '12px';
            div.style.borderRadius = '10px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.flexWrap = 'wrap';
            div.style.gap = '10px';
            div.style.background = isAgotado ? '#fffafa' : '#fff';

            div.innerHTML = `
                <div>
                    <strong>${p.nombre}</strong> ${badgesHtml}<br>
                    <small style="color: #374151; font-weight: 500;">${p.distribuidor} | ${p.tipo} ${p.precio ? '| C$ ' + p.precio.toFixed(2) : ''}</small>
                </div>
                <div style="display: flex; gap: 6px; align-items:center;">
                    <button class="btn-ghost" style="padding: 6px 10px; font-size: 0.8rem; ${isAgotado ? 'color:var(--primary-color); border-color:var(--primary-color);' : 'color:#e74c3c; border-color:#e74c3c;'}" onclick="admin.toggleAgotadoQuick(${p.id})">
                        ${isAgotado ? '<i class="fa-solid fa-box-open"></i> Habilitar' : '<i class="fa-solid fa-ban"></i> Agotar'}
                    </button>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; margin:0;" onclick="admin.editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-ghost" style="padding: 6px 10px; font-size: 0.8rem; color: #dc3545; border-color: #dc3545;" onclick="admin.deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    },

    toggleAgotadoQuick: function(id) {
        if(dbManager.toggleAgotado(id)) {
            this.renderManageList();
            catalogo.render();
        } else {
            app.showAlert("Error", "No se pudo actualizar el estado de stock.", true);
        }
    },

    editProduct: function(id) {
        const p = dbManager.getInsumoById(id);
        if(!p) return;

        document.getElementById('admin-id').value = p.id;
        document.getElementById('admin-tipo').value = p.tipo;
        document.getElementById('admin-nombre').value = p.nombre;
        document.getElementById('admin-distribuidor').value = p.distribuidor;
        document.getElementById('admin-composicion').value = p.composicion;
        document.getElementById('admin-proposito').value = p.proposito;
        document.getElementById('admin-aplicacion').value = p.aplicacion;
        document.getElementById('admin-compatibilidad').value = p.compatibilidad;
        document.getElementById('admin-regla').value = p.regla_restriccion;
        document.getElementById('admin-presentacion').value = p.presentacion;
        document.getElementById('admin-precio').value = p.precio || '';

        // Ofertas y Stock
        document.getElementById('admin-en-oferta').checked = (p.en_oferta == 1);
        document.getElementById('admin-precio-oferta').value = p.precio_oferta || '';
        document.getElementById('admin-texto-promo').value = p.texto_promocion || '';
        document.getElementById('admin-agotado').checked = (p.agotado == 1);
        this.toggleOfertaFields();
        
        document.getElementById('admin-imagen').value = ''; 

        document.getElementById('btn-save-product').innerText = 'Actualizar Producto';
        document.getElementById('btn-cancel-edit').style.display = 'inline-block';
        document.getElementById('admin-form-title').innerText = 'Editando producto: ' + p.nombre;

        this.showTab('add');
    },

    cancelEdit: function() {
        document.getElementById('admin-id').value = '';
        document.querySelectorAll('#admin-add-section input').forEach(i => {
            if(i.type === 'checkbox') i.checked = false;
            else i.value = '';
        });
        this.toggleOfertaFields();
        document.getElementById('btn-save-product').innerText = 'Guardar Producto';
        document.getElementById('btn-cancel-edit').style.display = 'none';
        document.getElementById('admin-form-title').innerText = 'Añadir nuevo producto al catálogo global.';
    },

    deleteProduct: function(id) {
        if(confirm("¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.")) {
            if(dbManager.eliminarInsumo(id)) {
                app.showAlert("Eliminado", "Producto eliminado correctamente.");
                this.renderManageList();
            } else {
                app.showAlert("Error", "Error al eliminar el producto.", true);
            }
        }
    },

    guardarProducto: function() {
        const id = document.getElementById('admin-id').value;
        const tipo = document.getElementById('admin-tipo').value;
        const nombre = document.getElementById('admin-nombre').value;
        const distribuidor = document.getElementById('admin-distribuidor').value;
        const composicion = document.getElementById('admin-composicion').value;
        const proposito = document.getElementById('admin-proposito').value;
        const aplicacion = document.getElementById('admin-aplicacion').value;
        const compatibilidad = document.getElementById('admin-compatibilidad').value;
        const regla = document.getElementById('admin-regla').value;
        const presentacion = document.getElementById('admin-presentacion').value;
        const precio = parseFloat(document.getElementById('admin-precio').value) || null;
        const fileInput = document.getElementById('admin-imagen');

        const en_oferta = document.getElementById('admin-en-oferta').checked ? 1 : 0;
        const precio_oferta = parseFloat(document.getElementById('admin-precio-oferta').value) || null;
        const texto_promocion = document.getElementById('admin-texto-promo').value.trim() || null;
        const agotado = document.getElementById('admin-agotado').checked ? 1 : 0;

        if(!nombre || !distribuidor || !presentacion || !composicion || !proposito || !aplicacion || !compatibilidad) {
            app.showAlert("Faltan Datos", "Por favor, llene todos los campos obligatorios: Nombre, Distribuidor, Presentación/Envase, Composición, Propósito, Aplicación, y Compatibilidad.", true);
            return;
        }

        if(en_oferta && (!precio_oferta || precio_oferta <= 0)) {
            app.showAlert("Precio de Oferta", "Si activa una oferta, ingrese un precio de oferta válido mayor a cero.", true);
            return;
        }

        const proceedWithSave = (base64Image) => {
            const datos = {
                tipo, nombre, distribuidor, composicion, proposito, aplicacion, 
                compatibilidad, regla_restriccion: regla, presentacion, precio, imagen: base64Image,
                en_oferta, precio_oferta, texto_promocion, agotado
            };
            if(id) {
                const res = dbManager.actualizarInsumo(id, datos);
                if(res === true) {
                    app.showAlert("¡Actualizado!", "El producto se editó correctamente.");
                    this.cancelEdit();
                    this.showTab('manage');
                } else {
                    app.showAlert("Error DB", res, true);
                }
            } else {
                const res = dbManager.insertarInsumo(datos);
                if(res === true) {
                    app.showAlert("¡Agregado!", "El producto se agregó correctamente al catálogo.");
                    this.cancelEdit();
                    app.navigate('catalogo');
                } else {
                    app.showAlert("Error DB", res, true);
                }
            }
        };

        if(fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                proceedWithSave(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            if(id) {
                const p = dbManager.getInsumoById(id);
                proceedWithSave(p ? p.imagen : null);
            } else {
                const defaultImg = tipo === 'ABONO' ? 'img/saco_abono.png' : 'img/botella_liquido.png';
                proceedWithSave(defaultImg);
            }
        }
    },

    // Gestión de Paleta de Colores
    initPaletteTab: function() {
        const pal = dbManager.getConfig('paleta_web', 'verde');
        this.currentPalette = pal;
        document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('active'));
        const card = document.getElementById(`card-pal-${pal}`);
        if(card) card.classList.add('active');
    },

    seleccionarPaleta: function(paletaId) {
        this.currentPalette = paletaId;
        document.querySelectorAll('.palette-card').forEach(c => c.classList.remove('active'));
        const card = document.getElementById(`card-pal-${paletaId}`);
        if(card) card.classList.add('active');

        // Vista previa inmediata
        document.documentElement.setAttribute('data-palette', paletaId);
    },

    guardarPaleta: function() {
        const pal = this.currentPalette || 'verde';
        if(dbManager.setConfig('paleta_web', pal)) {
            document.documentElement.setAttribute('data-palette', pal);
            app.showAlert("¡Paleta Guardada!", "La nueva paleta de colores ha sido aplicada exitosamente. Todos los usuarios la verán activa en el sitio.");
        } else {
            app.showAlert("Error", "No se pudo guardar la configuración de la paleta.", true);
        }
    }
};
