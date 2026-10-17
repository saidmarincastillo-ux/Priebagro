const calculadores = {
    costoItems: [],

    loadAbonos: function() {
        const abonos = dbManager.getInsumos('ABONO');
        const select = document.getElementById('calc-abono-prod');
        select.innerHTML = `<option value="">Seleccione un abono...</option>` + 
            abonos.map(a => {
                // Extract concentration C from "46-0-0" format to use as data attribute
                const match = a.composicion.match(/^(\d+)/);
                const c = match ? match[1] : 0;
                return `<option value="${a.id}" data-c="${c}">${a.nombre} (C=${c}%)</option>`;
            }).join('');
        document.getElementById('calc-abono-resultado').style.display = 'none';
    },

    loadLiquidos: function() {
        const liquidos = dbManager.getInsumos('LIQUIDO');
        const select = document.getElementById('calc-liq-prod');
        select.innerHTML = `<option value="">Seleccione un líquido...</option>` + 
            liquidos.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
        this.toggleLiqFields();
        document.getElementById('calc-liq-resultado').style.display = 'none';
    },

    toggleLiqFields: function() {
        const tipo = document.getElementById('calc-liq-tipo').value;
        const container = document.getElementById('calc-liq-fields');
        
        if (tipo === 'porcentaje') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Volumen de Agua Total (Litros)</label>
                    <input type="number" id="calc-liq-vagua" step="1" placeholder="Ej. 20 (Una mochila)">
                </div>
                <div class="form-group">
                    <label>Porcentaje en Etiqueta (%)</label>
                    <input type="number" id="calc-liq-porcentaje" step="0.01" placeholder="Ej. 0.25">
                </div>
            `;
        } else if (tipo === 'proporcion') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Volumen de Agua Total (Litros)</label>
                    <input type="number" id="calc-liq-vagua" step="1" placeholder="Ej. 20">
                </div>
                <div class="form-group">
                    <label>Dosis por Litro de Agua (ml/L)</label>
                    <input type="number" id="calc-liq-dosis" step="0.1" placeholder="Ej. 10">
                </div>
            `;
        } else if (tipo === 'calibracion') {
            container.innerHTML = `
                <div class="form-group">
                    <label>Dosis Comercial por Manzana (L/mz)</label>
                    <input type="number" id="calc-liq-dosismz" step="0.1" placeholder="Ej. 3.0">
                </div>
                <div class="form-group">
                    <label>Gasto de Agua Calibrado por Manzana (L/mz)</label>
                    <input type="number" id="calc-liq-gastomz" step="1" placeholder="Ej. 150">
                </div>
            `;
        }
    },

    calcularAbono: function() {
        const matas = parseFloat(document.getElementById('calc-abono-matas').value);
        const filas = parseFloat(document.getElementById('calc-abono-filas').value);
        const dosisPlanta = parseFloat(document.getElementById('calc-abono-dosis').value);
        const prodSelect = document.getElementById('calc-abono-prod');
        const prodId = prodSelect.value;
        
        if(isNaN(matas) || isNaN(filas) || !prodId) {
            app.showAlert("Faltan Datos", "Complete los campos de distancias y seleccione un abono.", true);
            return;
        }

        // Fórmulas matemáticas en Manzanas (Nicaragua: 1 mz = 7,026 m²)
        const plantasMz = 7026 / (matas * filas); 
        
        let detalleDosis = "";
        let resText = `${Math.round(plantasMz)} plantas/mz`;

        if (!isNaN(dosisPlanta) && dosisPlanta > 0) {
            // Calcular requerimiento total en Kg y Quintales (1 qq = 45.36 kg aprox, o usamos 100 lb = 45.36kg)
            const kgTotales = (plantasMz * dosisPlanta) / 1000;
            const lbTotales = kgTotales * 2.20462;
            const qqTotales = lbTotales / 100;
            
            detalleDosis = `
                <p><strong>Abono Total Requerido (por Manzana):</strong> <span style="color:var(--primary-color); font-size:1.5rem; font-weight:bold;">${qqTotales.toFixed(2)} qq</span></p>
                <p style="font-size:0.95rem; color:var(--text-muted); margin-top:10px; font-weight:500;">Equivale a ${kgTotales.toFixed(1)} kg (${lbTotales.toFixed(1)} libras) de producto comercial por manzana.</p>
            `;
            resText += ` | ${qqTotales.toFixed(2)} qq/mz`;
        } else {
            detalleDosis = `<p style="font-size:0.95rem; color:var(--text-muted); margin-top:10px; font-weight:500;">Ingrese una dosis por planta para calcular el volumen de abono requerido por manzana.</p>`;
        }

        const resultCard = document.getElementById('calc-abono-resultado');
        resultCard.style.display = 'block';
        resultCard.innerHTML = `
            <h3>Densidad de Siembra</h3>
            <p><strong>Plantas por Manzana (mz):</strong> ${Math.round(plantasMz).toLocaleString()} plantas/mz</p>
            ${detalleDosis}
        `;

        if(app.currentUser) {
            dbManager.guardarHistorial(app.currentUser.id, "Abono Sólido (Plantas/mz)", {matas, filas, dosisPlanta}, resText);
        }
    },

    calcularLiquido: function() {
        const tipo = document.getElementById('calc-liq-tipo').value;
        const prodId = document.getElementById('calc-liq-prod').value;
        
        if(!prodId) {
            app.showAlert("Producto Faltante", "Seleccione un producto líquido.", true);
            return;
        }

        let volumenProducto = 0;
        let msjResultado = "";
        let resText = "";

        if (tipo === 'porcentaje') {
            const vagua = parseFloat(document.getElementById('calc-liq-vagua').value);
            const porc = parseFloat(document.getElementById('calc-liq-porcentaje').value);
            if(isNaN(vagua) || isNaN(porc)) { app.showAlert("Error", "Complete los campos con valores numéricos.", true); return; }
            
            // V_producto(ml) = (V_agua(L) * %_etiqueta * 1000) / 100
            volumenProducto = (vagua * porc * 1000) / 100;
            resText = `${volumenProducto.toFixed(1)} ml`;
            msjResultado = `Añadir <strong style="color:var(--primary-color); font-size:1.2rem;">${resText}</strong> del producto al tanque de ${vagua} Litros de agua.`;
            
        } else if (tipo === 'proporcion') {
            const vagua = parseFloat(document.getElementById('calc-liq-vagua').value);
            const dosis = parseFloat(document.getElementById('calc-liq-dosis').value);
            if(isNaN(vagua) || isNaN(dosis)) { app.showAlert("Error", "Complete los campos con valores numéricos.", true); return; }
            
            // V_producto(ml) = V_agua(L) * Dosis(ml/L)
            volumenProducto = vagua * dosis;
            resText = `${volumenProducto.toFixed(1)} ml`;
            msjResultado = `Añadir <strong style="color:var(--primary-color); font-size:1.2rem;">${resText}</strong> del producto al tanque de ${vagua} Litros de agua.`;
            
        } else if (tipo === 'calibracion') {
            const dosismz = parseFloat(document.getElementById('calc-liq-dosismz').value); // L/mz
            const gastomz = parseFloat(document.getElementById('calc-liq-gastomz').value); // L/mz
            if(isNaN(dosismz) || isNaN(gastomz)) { app.showAlert("Error", "Complete los campos con valores numéricos.", true); return; }
            
            // N_bombas/mz = V_aplicacion(L/mz) / 20L
            const nBombas = gastomz / 20;
            // C_bomba(ml/bomba) = (Dosis_Comercial(L/mz) * 1000) / N_bombas/mz
            const mlPorBomba = (dosismz * 1000) / nBombas;
            
            resText = `${mlPorBomba.toFixed(1)} ml por bomba (20L)`;
            msjResultado = `
                Con un gasto de agua calibrado de ${gastomz} L/mz, usted necesita <strong>${nBombas.toFixed(1)} bombas de 20 Litros</strong> para cubrir una manzana.<br><br>
                Debe añadir <strong style="color:var(--primary-color); font-size:1.2rem;">${resText}</strong> de agroquímico a cada bomba.
            `;
        }

        const resultCard = document.getElementById('calc-liq-resultado');
        resultCard.style.display = 'block';
        resultCard.innerHTML = `
            <h3>Resultado de Preparación</h3>
            <p>${msjResultado}</p>
        `;

        if(app.currentUser) {
            dbManager.guardarHistorial(app.currentUser.id, "Líquido Fitosanitario", {tipo}, resText);
        }
    },

    loadCostos: function() {
        const select = document.getElementById('calc-costo-prod');
        const productos = dbManager.getInsumos('ALL');
        select.innerHTML = '<option value="">Seleccione un producto...</option>';
        productos.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nombre} (${p.tipo}) - ${p.distribuidor}</option>`;
        });
    },
    
    autoFillCostoPrice: function() {
        const prodId = document.getElementById('calc-costo-prod').value;
        const inputPrecio = document.getElementById('calc-costo-precio');
        if(!prodId) { inputPrecio.value = ''; return; }
        const producto = dbManager.getInsumoById(prodId);
        if(!producto) { inputPrecio.value = ''; return; }
        const precioEfectivo = (producto.en_oferta == 1 && producto.precio_oferta) ? producto.precio_oferta : producto.precio;
        inputPrecio.value = precioEfectivo || '';
    },
    
    agregarItemCosto: function() {
        const prodId = document.getElementById('calc-costo-prod').value;
        const precio = parseFloat(document.getElementById('calc-costo-precio').value);
        // Use parseInt as requested for integers
        const cantidad = parseInt(document.getElementById('calc-costo-cantidad').value);

        if(isNaN(precio) || isNaN(cantidad) || precio <= 0 || cantidad <= 0) {
            app.showAlert("Error", "Ingrese un precio y una cantidad enteros válidos mayores a cero.", true);
            return;
        }

        let nombreProducto = "Producto Manual";
        if(prodId) {
            const p = dbManager.getInsumoById(prodId);
            if(p) nombreProducto = p.nombre;
        }

        this.costoItems.push({
            nombre: nombreProducto,
            precio: precio,
            cantidad: cantidad,
            subtotal: precio * cantidad
        });

        // Reset inputs
        document.getElementById('calc-costo-prod').value = "";
        document.getElementById('calc-costo-precio').value = "";
        document.getElementById('calc-costo-cantidad').value = "";

        this.renderCostosList();
    },

    renderCostosList: function() {
        const tbody = document.getElementById('calc-costo-items-table');
        const totalSpan = document.getElementById('calc-costo-total-global');
        
        tbody.innerHTML = '';
        let granTotal = 0;

        if (this.costoItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:18px; color:var(--text-muted); font-weight:600;">No hay productos agregados a la lista.</td></tr>';
            totalSpan.innerText = '0.00';
            return;
        }

        this.costoItems.forEach((item, index) => {
            granTotal += item.subtotal;
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px;">${item.nombre}</td>
                    <td style="padding: 10px;">C$ ${item.precio.toFixed(2)}</td>
                    <td style="padding: 10px;">${item.cantidad}</td>
                    <td style="padding: 10px;">C$ ${item.subtotal.toFixed(2)}</td>
                    <td style="padding: 10px; text-align:center;">
                        <button class="btn-ghost" onclick="calculadores.eliminarItemCosto(${index})" style="padding:5px 10px; min-width:auto; color:var(--danger); border-color:var(--danger);">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        totalSpan.innerText = granTotal.toFixed(2);
    },

    eliminarItemCosto: function(index) {
        this.costoItems.splice(index, 1);
        this.renderCostosList();
    },

    limpiarCostos: function() {
        this.costoItems = [];
        this.renderCostosList();
    },

    calcularRiego: function() {
        const distanciaSurco = parseFloat(document.getElementById('calc-riego-distancia').value);
        const tamanoMz = parseFloat(document.getElementById('calc-riego-tamano').value);
        const anchoManual = parseFloat(document.getElementById('calc-riego-ancho').value);
        const largoManual = parseFloat(document.getElementById('calc-riego-largo').value);

        const pTubo = parseFloat(document.getElementById('calc-riego-p-tubo').value) || 200;
        const pCinta = parseFloat(document.getElementById('calc-riego-p-cinta').value) || 6550;
        const pCInicial = parseFloat(document.getElementById('calc-riego-p-cinicial').value) || 12;
        const pCValvula = parseFloat(document.getElementById('calc-riego-p-cvalvula').value) || 40;

        if (isNaN(distanciaSurco) || distanciaSurco <= 0) {
            app.showAlert("Datos Faltantes", "Por favor ingrese una distancia entre surcos válida (mayor a 0 metros).", true);
            return;
        }

        const areaPorMz = 7026;
        const ladoEstandar = 83.82; // 100 varas ≈ 83.82 m en Nicaragua
        const mzFinal = (isNaN(tamanoMz) || tamanoMz <= 0) ? 1.0 : tamanoMz;

        let anchoTerreno = 0;
        let largoSurco = 0;
        let areaTotalM2 = 0;

        if (!isNaN(anchoManual) && anchoManual > 0 && !isNaN(largoManual) && largoManual > 0) {
            anchoTerreno = anchoManual;
            largoSurco = largoManual;
            areaTotalM2 = anchoTerreno * largoSurco;
        } else if (!isNaN(anchoManual) && anchoManual > 0) {
            anchoTerreno = anchoManual;
            areaTotalM2 = mzFinal * areaPorMz;
            largoSurco = areaTotalM2 / anchoTerreno;
        } else if (!isNaN(largoManual) && largoManual > 0) {
            largoSurco = largoManual;
            areaTotalM2 = mzFinal * areaPorMz;
            anchoTerreno = areaTotalM2 / largoSurco;
        } else {
            // Dimensiones proporcionales estándar en Manzanas
            areaTotalM2 = mzFinal * areaPorMz;
            largoSurco = ladoEstandar;
            anchoTerreno = areaTotalM2 / largoSurco;
        }

        const numManzanas = areaTotalM2 / 7026;

        // 1. Número de surcos = Ancho / Distancia entre surcos
        const numSurcos = Math.floor(anchoTerreno / distanciaSurco);

        if (numSurcos <= 0) {
            app.showAlert("Error de Dimensiones", "El ancho del terreno es menor que la distancia entre surcos.", true);
            return;
        }

        // 2. Metros de cinta de goteo
        const cintaMetrosTotal = numSurcos * largoSurco;
        const cintaRollos = Math.ceil(cintaMetrosTotal / 2600);
        const cintaCosto = cintaRollos * pCinta;
        const cintaSobrante = (cintaRollos * 2600) - cintaMetrosTotal;

        // 3. Conectores iniciales (1 por surco)
        const conectorInicialCant = numSurcos;
        const conectorInicialCosto = conectorInicialCant * pCInicial;

        // 4. Conectores válvula (1 por surco)
        const conectorValvulaCant = numSurcos;
        const conectorValvulaCosto = conectorValvulaCant * pCValvula;

        // 5. Tubos PVC 2" (6 metros c/u) a lo largo del ancho del terreno
        const tubosPVCCant = Math.ceil(anchoTerreno / 6);
        const tubosPVCCosto = tubosPVCCant * pTubo;
        const tubosSobrante = (tubosPVCCant * 6) - anchoTerreno;

        // Costo Total
        const costoTotal = cintaCosto + conectorInicialCosto + conectorValvulaCosto + tubosPVCCosto;

        const resultCard = document.getElementById('calc-riego-resultado');
        resultCard.style.display = 'block';

        resultCard.innerHTML = `
            <h3><i class="fa-solid fa-clipboard-check" style="color:var(--primary-color);"></i> Presupuesto Estimado de Riego</h3>
            
            <div style="background:#f8f9fa; border-radius:10px; padding:15px; margin-bottom:15px; border-left:4px solid var(--primary-light);">
                <strong>Resumen del Terreno (Nicaragua):</strong>
                <ul style="margin:8px 0 0 20px; font-size:0.95rem; line-height:1.6;">
                    <li><strong>Dimensiones del Terreno:</strong> <span style="color:var(--primary-dark); font-weight:700;">${numManzanas.toFixed(2)} Manzana(s) (mz)</span> [${areaTotalM2.toLocaleString('es-NI', {maximumFractionDigits:1})} m²]</li>
                    <li><strong>Medidas de Siembra:</strong> ${anchoTerreno.toFixed(1)} m de ancho (cabecera PVC) × ${largoSurco.toFixed(1)} m de largo (surcos)</li>
                    <li><strong>Distancia entre surcos:</strong> ${distanciaSurco.toFixed(2)} metros</li>
                    <li><strong>Total de Surcos:</strong> <span style="color:var(--primary-dark); font-weight:700;">${numSurcos} surcos</span></li>
                    <li><strong>Cinta requerida:</strong> ${cintaMetrosTotal.toLocaleString('es-NI')} metros lineales</li>
                </ul>
            </div>

            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse: collapse; text-align: left; min-width: 450px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #ddd; background: #f1f3f5;">
                            <th style="padding: 10px;">Material</th>
                            <th style="padding: 10px;">Cantidad</th>
                            <th style="padding: 10px;">Detalle</th>
                            <th style="padding: 10px;">Precio Unit.</th>
                            <th style="padding: 10px;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><strong>Cinta de Goteo</strong></td>
                            <td style="padding: 10px;">${cintaRollos} rollos</td>
                            <td style="padding: 10px;"><small>${cintaMetrosTotal.toLocaleString()} m requeridos (2,600 m/rollo, sobra: ${cintaSobrante} m)</small></td>
                            <td style="padding: 10px;">C$ ${pCinta.toFixed(2)}</td>
                            <td style="padding: 10px; font-weight:600;">C$ ${cintaCosto.toLocaleString('es-NI', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><strong>Conector Inicial PVC × Polietileno</strong></td>
                            <td style="padding: 10px;">${conectorInicialCant} unidades</td>
                            <td style="padding: 10px;"><small>1 por cada surco</small></td>
                            <td style="padding: 10px;">C$ ${pCInicial.toFixed(2)}</td>
                            <td style="padding: 10px; font-weight:600;">C$ ${conectorInicialCosto.toLocaleString('es-NI', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><strong>Conector Válvula Polietileno × Cinta</strong></td>
                            <td style="padding: 10px;">${conectorValvulaCant} unidades</td>
                            <td style="padding: 10px;"><small>1 por cada surco</small></td>
                            <td style="padding: 10px;">C$ ${pCValvula.toFixed(2)}</td>
                            <td style="padding: 10px; font-weight:600;">C$ ${conectorValvulaCosto.toLocaleString('es-NI', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><strong>Tubo PVC de 2" (6 metros)</strong></td>
                            <td style="padding: 10px;">${tubosPVCCant} tubos</td>
                            <td style="padding: 10px;"><small>Línea principal: ${anchoTerreno.toFixed(1)} m (6 m/tubo, sobra: ${tubosSobrante.toFixed(1)} m)</small></td>
                            <td style="padding: 10px;">C$ ${pTubo.toFixed(2)}</td>
                            <td style="padding: 10px; font-weight:600;">C$ ${tubosPVCCosto.toLocaleString('es-NI', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <hr style="margin:20px 0; border:none; border-top:2px solid #ddd;">
            <div style="text-align:right;">
                <p style="color:var(--text-muted); margin-bottom:5px;">Presupuesto de Materiales:</p>
                <h2 style="color:var(--primary-dark); font-size:2rem; margin:0;">
                    TOTAL: C$ ${costoTotal.toLocaleString('es-NI', {minimumFractionDigits:2, maximumFractionDigits:2})}
                </h2>
                <small style="color:var(--text-muted); display:block; margin-top:5px;">
                    * Costo estimado de cinta, tubería PVC de distribución y accesorios por surco para ${numManzanas.toFixed(2)} Manzana(s).
                </small>
            </div>
        `;

        if (app.currentUser) {
            dbManager.guardarHistorial(
                app.currentUser.id, 
                "Sistema de Riego", 
                { distancia: distanciaSurco, manzanas: numManzanas.toFixed(2), surcos: numSurcos, ancho: anchoTerreno, largo: largoSurco }, 
                `C$ ${costoTotal.toLocaleString('es-NI', {minimumFractionDigits:2, maximumFractionDigits:2})} (${numSurcos} surcos en ${numManzanas.toFixed(2)} mz)`
            );
        }

        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};
