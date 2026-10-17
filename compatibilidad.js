const compatibilidad = {
    loadOptions: function() {
        const insumos = dbManager.getInsumos('ALL');
        const select1 = document.getElementById('mezcla-prod-1');
        const select2 = document.getElementById('mezcla-prod-2');
        
        const optionsHtml = `<option value="">Seleccione un producto...</option>` + 
            insumos.map(i => `<option value="${i.id}">${i.nombre} (${i.tipo === 'ABONO' ? 'Sólido' : 'Líquido'})</option>`).join('');
        
        select1.innerHTML = optionsHtml;
        select2.innerHTML = optionsHtml;
        
        document.getElementById('mezcla-resultado').style.display = 'none';
    },

    verificar: function() {
        const id1 = document.getElementById('mezcla-prod-1').value;
        const id2 = document.getElementById('mezcla-prod-2').value;
        const resultCard = document.getElementById('mezcla-resultado');
        
        if(!id1 || !id2) {
            alert("Seleccione dos productos.");
            return;
        }

        if(id1 === id2) {
            this.showResult("Error", "Debe seleccionar dos productos diferentes.", false);
            return;
        }

        const prod1 = dbManager.getInsumoById(id1);
        const prod2 = dbManager.getInsumoById(id2);

        // Reglas estrictas de negocio
        if(prod1.tipo !== prod2.tipo) {
            // Sólido con Líquido
            this.showResult(
                "Mezcla Incompatible",
                `Regla del IPSA: No se permite mezclar un abono sólido (${prod1.tipo === 'ABONO' ? prod1.nombre : prod2.nombre}) con un líquido fitosanitario (${prod1.tipo === 'LIQUIDO' ? prod1.nombre : prod2.nombre}) directamente. Riesgo de degradación de principios activos o precipitación salina.`,
                false
            );
            return;
        }

        if(prod1.regla_restriccion === 'NINGUNA' || prod2.regla_restriccion === 'NINGUNA') {
            this.showResult(
                "Altamente Incompatible",
                "Uno de los productos (Ej. Caldo Sulfocálcico) tiene reacción altamente alcalina y no puede mezclarse con ningún otro insumo.",
                false
            );
            return;
        }

        // Si son del mismo tipo y no tienen restricción absoluta
        const tipoNombre = prod1.tipo === 'ABONO' ? 'Abonos Sólidos' : 'Líquidos Fitosanitarios';
        this.showResult(
            "Mezcla Viable (Condicionada)",
            `Ambos productos pertenecen a la categoría de <strong>${tipoNombre}</strong>. Teóricamente son compatibles según la matriz física.<br><br>
            <strong>Nota de Compatibilidad del Producto 1:</strong> ${prod1.compatibilidad}<br>
            <strong>Nota de Compatibilidad del Producto 2:</strong> ${prod2.compatibilidad}<br><br>
            <em>Se recomienda realizar prueba de jarra antes de aplicarlo en el tanque principal.</em>`,
            true
        );
    },

    showResult: function(title, message, isViable) {
        const resultCard = document.getElementById('mezcla-resultado');
        resultCard.style.display = 'block';
        resultCard.className = 'result-card ' + (isViable ? '' : 'error');
        
        const icon = isViable ? '<i class="fa-solid fa-check-circle" style="color:var(--primary-color);"></i>' : '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i>';
        
        resultCard.innerHTML = `
            <h3>${icon} ${title}</h3>
            <p>${message}</p>
        `;
    }
};
