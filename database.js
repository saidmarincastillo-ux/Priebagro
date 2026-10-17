const dbManager = {
    db: null,
    
    init: async function() {
        try {
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            
            // Try to load from localStorage
            const savedDb = localStorage.getItem('agro_db');
            if (savedDb) {
                const uInt8Array = new Uint8Array(savedDb.split(',').map(Number));
                this.db = new SQL.Database(uInt8Array);
                console.log("Base de datos cargada desde LocalStorage");

                // Patch for presentation column (if missing)
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN presentacion TEXT");
                    this.db.run("UPDATE agroinsumos SET presentacion = 'Saco de 100 lbs (Quintal)' WHERE tipo = 'ABONO' AND presentacion IS NULL");
                    this.db.run("UPDATE agroinsumos SET presentacion = 'Envase de 1 Litro / 5 Litros' WHERE tipo = 'LIQUIDO' AND presentacion IS NULL");
                    this.saveDb();
                    console.log("Base de datos parcheada con la columna presentacion");
                } catch(e) {}

                // Patch for imagen column (if missing)
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN imagen TEXT");
                    this.saveDb();
                    console.log("Base de datos parcheada con la columna imagen");
                } catch(e) {}

                // Patch for precio column (if missing)
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN precio REAL");
                    this.saveDb();
                    console.log("Base de datos parcheada con la columna precio");
                } catch(e) {}

                // Patch for agotado column (if missing)
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN agotado INTEGER DEFAULT 0");
                    this.saveDb();
                } catch(e) {}

                // Patch for en_oferta, precio_oferta, texto_promocion
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN en_oferta INTEGER DEFAULT 0");
                    this.saveDb();
                } catch(e) {}
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN precio_oferta REAL");
                    this.saveDb();
                } catch(e) {}
                try {
                    this.db.run("ALTER TABLE agroinsumos ADD COLUMN texto_promocion TEXT");
                    this.saveDb();
                } catch(e) {}

                // Patch for configuracion table
                try {
                    this.db.run("CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY, valor TEXT)");
                    this.saveDb();
                } catch(e) {}

                // Patch for admin user
                try {
                    const checkAdmin = this.execQuery("SELECT id FROM usuarios WHERE email = 'admin@gmail.com'");
                    if(checkAdmin.length === 0) {
                        this.db.run("INSERT INTO usuarios (nombre, email, password) VALUES ('Administrador', 'admin@gmail.com', '12345')");
                        this.saveDb();
                    } else {
                        // Asegurar que la contraseña sea 12345
                        this.db.run("UPDATE usuarios SET password = '12345' WHERE email = 'admin@gmail.com'");
                        this.saveDb();
                    }
                } catch(e) {
                    // Ignorar errores
                }

            } else {
                this.db = new SQL.Database();
                this.createTables();
                this.seedData();
                this.saveDb();
                console.log("Base de datos inicializada por primera vez");
            }
        } catch (error) {
            console.error("Error inicializando SQLite:", error);
        }
    },

    saveDb: function() {
        const data = this.db.export();
        const array = Array.from(data);
        localStorage.setItem('agro_db', array.join(','));
    },

    createTables: function() {
        this.db.run(`
            CREATE TABLE usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                email TEXT UNIQUE,
                password TEXT
            );
            
            CREATE TABLE agroinsumos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT, -- 'ABONO' o 'LIQUIDO'
                nombre TEXT,
                distribuidor TEXT,
                composicion TEXT,
                proposito TEXT,
                aplicacion TEXT,
                compatibilidad TEXT,
                regla_restriccion TEXT,
                presentacion TEXT,
                imagen TEXT,
                precio REAL,
                agotado INTEGER DEFAULT 0,
                en_oferta INTEGER DEFAULT 0,
                precio_oferta REAL,
                texto_promocion TEXT
            );

            CREATE TABLE configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT
            );

            CREATE TABLE historial_calculos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                tipo_calculo TEXT,
                datos_entrada TEXT,
                resultado TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    },

    seedData: function() {
        // Create Admin user
        this.db.run("INSERT INTO usuarios (nombre, email, password) VALUES ('Administrador', 'admin@gmail.com', '12345')");

        const insertStmt = this.db.prepare("INSERT INTO agroinsumos (tipo, nombre, distribuidor, composicion, proposito, aplicacion, compatibilidad, regla_restriccion, presentacion, imagen, precio) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
        
        // Abonos (Sólidos)
        insertStmt.run(['ABONO', 'Urea 46%', 'SAGSA DISAGRO / Agroalfa', '46-0-0 (Nitrógeno amídico)', 'Aporte concentrado de nitrógeno para el crecimiento vegetativo de maíz, café y pastos.', 'Aplicación directa al suelo, enterrado en bandas o corona para evitar pérdidas por volatilización.', 'Compatible con Sulfato de Amonio y cloruro de potasio (MOP). Evitar mezclar con Superfosfato Triple en ambientes de alta humedad por alta higroscopicidad.', 'SOLO_ABONOS', 'Saco de 100 lbs (Quintal)', 'img/saco_abono.png', null]);
        insertStmt.run(['ABONO', 'Fosfato Diamónico (DAP)', 'SAGSA DISAGRO / Agroalfa', '18-46-0 (Fósforo y nitrógeno)', 'Desarrollo inicial del sistema radicular en hortalizas, frijol y establecimiento de musáceas.', 'Incorporado al suelo en el fondo del surco de siembra o localizado a un lado de la semilla.', 'Altamente compatible con abonos granulados de potasio (MOP / SOP) y microelementos secos. No mezclar con nitrato de calcio soluble.', 'SOLO_ABONOS', 'Saco de 100 lbs (Quintal)', 'img/saco_abono.png', null]);
        insertStmt.run(['ABONO', 'Complejo 12-30-10', 'Agroalfa / Disagro', 'Mezcla NPK enriquecida con azufre y microelementos.', 'Fertilización de arranque en granos básicos y fertilización intermedia en plantaciones forestales.', 'Aplicación edáfica directa en corona en la base de la planta o al voleo incorporado en la labranza.', 'Compatible con otros abonos físicos secos. No combinar con mezclas húmedas o abonos orgánicos sin madurar.', 'SOLO_ABONOS', 'Saco de 100 lbs (Quintal)', 'img/saco_abono.png', null]);
        insertStmt.run(['ABONO', 'FertiCROP® / Mezclas Especiales', 'SAGSA DISAGRO', 'Formulaciones personalizadas (ej. 18-6-18+2MgO)', 'Nutrición equilibrada según requerimientos específicos de suelos en Rivas y Chinandega.', 'Aplicación en bandas o dosificación por planta en etapas fenológicas de llenado de grano y fruto.', 'Compatible exclusivamente con fuentes sólidas inertes o fertilizantes de liberación controlada de la misma marca.', 'SOLO_ABONOS', 'Saco de 100 lbs (Quintal)', 'img/saco_abono.png', null]);
        insertStmt.run(['ABONO', 'Microorganismos de Montaña Sólidos', 'Producción Local / Guías Agroecológicas GPAE', 'Inóculo biológico en base de hojarasca forestal, melaza y salvado.', 'Activación biológica del suelo, control preventivo de fitopatógenos edáficos en café y hortalizas.', 'Incorporación directa en los camellones, maceteros o surcos, aplicando un kilo por metro cuadrado.', 'Compatible con abonos orgánicos compostados, humus de lombriz y enmiendas calcáreas aplicadas previamente.', 'SOLO_ABONOS', 'Saco de 50 lbs', 'img/saco_abono.png', null]);

        // Líquidos
        insertStmt.run(['LIQUIDO', 'Sayonara 36 SC', 'CISA Agro', 'Fungicida sistémico / Triazol', 'Control preventivo y curativo de Roya del café (Hemileia vastatrix) y Mancha de Hierro.', 'Aspersión foliar dirigida mediante bomba de mochila, calibrando el mojado foliar en horas frescas.', 'Compatible con la mayoría de coadyuvantes no iónicos y fertilizantes foliares de base neutra.', 'SOLO_LIQUIDOS', 'Envase de 1 Litro / 250 ml', 'img/botella_liquido.png', null]);
        insertStmt.run(['LIQUIDO', 'Agente® / Root Out®', 'SAGSA DISAGRO', 'Herbicida sistémico no selectivo / Glifosato 360 g/L', 'Control total de malezas de hoja ancha y gramíneas en presiembra o áreas no cultivadas.', 'Aspersión foliar dirigida al suelo con boquillas de abanico plano, evitando deriva a cultivos vecinos.', 'Compatible con coadyuvantes pegantes y reguladores de pH del agua. No mezclar con herbicidas de contacto inmediatos.', 'SOLO_LIQUIDOS', 'Galón (3.78 L) / Envase 1 L', 'img/botella_liquido.png', null]);
        insertStmt.run(['LIQUIDO', 'Fosfi Mag ExcelAg', 'Nutriente líquido sistémico concentrado / Fosfito de Magnesio', 'Estimulación de autodefensas (fitoalexinas) y corrección de deficiencias de magnesio.', 'Aplicación foliar o mediante sistemas de fertirriego localizado en etapas críticas de desarrollo.', 'Compatible con la mayoría de los insecticidas y fungicidas orgánicos. Evitar mezclar con aceites minerales o azufres.', 'SOLO_LIQUIDOS', 'Envase de 1 Litro / 5 Litros', 'img/botella_liquido.png', null]);
        insertStmt.run(['LIQUIDO', 'Caldo Sulfocálcico', 'Alternativa Tecnológica / Trocaire', 'Plaguicida mineral / Reacción de Cal y Azufre en cocción', 'Control efectivo de Ácaro Blanco en chiltoma, trips en cebolla y fungicida preventivo.', 'Aspersión foliar fina diluyendo de 300 a 500 ml por bomba de mochila de 20 litros.', 'Altamente alcalino. No debe mezclarse con ningún otro plaguicida líquido, bioestimulante o abono foliar.', 'NINGUNA', 'Pichinga de 20 Litros / Galón', 'img/botella_liquido.png', null]);
        insertStmt.run(['LIQUIDO', 'Herofol Denso®', 'Herogra Nicaragua', 'Fertilizante foliar en gel de alta concentración', 'Aporte concentrado de micronutrientes y bioestimulación hormonal ante estrés abiótico.', 'Pulverización foliar uniforme en horas de baja radiación solar (mañana o tarde).', 'Compatible con insecticidas y fungicidas químicos comunes, requiriendo prueba previa de mezcla.', 'SOLO_LIQUIDOS', 'Envase de 1 Litro / 5 Litros', 'img/botella_liquido.png', null]);
        
        insertStmt.free();
    },

    execQuery: function(sql, params = []) {
        if(!this.db) return [];
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const result = [];
        while(stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    },

    getInsumos: function(tipo = 'ALL', search = '') {
        let query = "SELECT * FROM agroinsumos WHERE 1=1";
        const params = [];
        if(tipo === 'OFERTAS') {
            query += " AND en_oferta = 1";
        } else if(tipo === 'DISPONIBLES') {
            query += " AND (agotado IS NULL OR agotado = 0)";
        } else if(tipo === 'AGOTADOS') {
            query += " AND agotado = 1";
        } else if(tipo !== 'ALL') {
            query += " AND tipo = ?";
            params.push(tipo);
        }
        if(search) {
            query += " AND (nombre LIKE ? OR distribuidor LIKE ? OR proposito LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term);
        }
        return this.execQuery(query + " ORDER BY id DESC", params);
    },

    getInsumoById: function(id) {
        const res = this.execQuery("SELECT * FROM agroinsumos WHERE id = ?", [id]);
        return res.length ? res[0] : null;
    },

    insertarInsumo: function(datos) {
        try {
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN imagen TEXT"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN precio REAL"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN agotado INTEGER DEFAULT 0"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN en_oferta INTEGER DEFAULT 0"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN precio_oferta REAL"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN texto_promocion TEXT"); } catch(err) {}

            const stmt = this.db.prepare(`
                INSERT INTO agroinsumos (
                    tipo, nombre, distribuidor, composicion, proposito, aplicacion, 
                    compatibilidad, regla_restriccion, presentacion, imagen, precio,
                    agotado, en_oferta, precio_oferta, texto_promocion
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `);
            stmt.run([
                datos.tipo, datos.nombre, datos.distribuidor, datos.composicion, 
                datos.proposito, datos.aplicacion, datos.compatibilidad, 
                datos.regla_restriccion, datos.presentacion, datos.imagen, datos.precio || null,
                datos.agotado ? 1 : 0, datos.en_oferta ? 1 : 0,
                datos.precio_oferta || null, datos.texto_promocion || null
            ]);
            stmt.free();
            this.saveDb();
            return true;
        } catch(e) {
            console.error("Error al insertar insumo:", e);
            return e.message || "Error desconocido en SQLite";
        }
    },

    actualizarInsumo: function(id, datos) {
        try {
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN imagen TEXT"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN precio REAL"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN agotado INTEGER DEFAULT 0"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN en_oferta INTEGER DEFAULT 0"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN precio_oferta REAL"); } catch(err) {}
            try { this.db.run("ALTER TABLE agroinsumos ADD COLUMN texto_promocion TEXT"); } catch(err) {}

            const stmt = this.db.prepare(`
                UPDATE agroinsumos 
                SET tipo=?, nombre=?, distribuidor=?, composicion=?, 
                    proposito=?, aplicacion=?, compatibilidad=?, 
                    regla_restriccion=?, presentacion=?, imagen=?, precio=?,
                    agotado=?, en_oferta=?, precio_oferta=?, texto_promocion=?
                WHERE id=?
            `);
            stmt.run([
                datos.tipo, datos.nombre, datos.distribuidor, datos.composicion, 
                datos.proposito, datos.aplicacion, datos.compatibilidad, 
                datos.regla_restriccion, datos.presentacion, datos.imagen, datos.precio || null,
                datos.agotado ? 1 : 0, datos.en_oferta ? 1 : 0,
                datos.precio_oferta || null, datos.texto_promocion || null,
                id
            ]);
            stmt.free();
            this.saveDb();
            return true;
        } catch(e) {
            console.error("Error al actualizar insumo:", e);
            return e.message || "Error desconocido en SQLite";
        }
    },

    toggleAgotado: function(id) {
        try {
            this.db.run("UPDATE agroinsumos SET agotado = CASE WHEN agotado = 1 THEN 0 ELSE 1 END WHERE id = ?", [id]);
            this.saveDb();
            return true;
        } catch(e) {
            console.error("Error alternando estado agotado:", e);
            return false;
        }
    },

    getConfig: function(clave, defaultVal = null) {
        try {
            const res = this.execQuery("SELECT valor FROM configuracion WHERE clave = ?", [clave]);
            return res.length ? res[0].valor : defaultVal;
        } catch(e) {
            return defaultVal;
        }
    },

    setConfig: function(clave, valor) {
        try {
            this.db.run("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)", [clave, valor]);
            this.saveDb();
            return true;
        } catch(e) {
            console.error("Error guardando configuracion:", e);
            return false;
        }
    },

    eliminarInsumo: function(id) {
        const stmt = this.db.prepare("DELETE FROM agroinsumos WHERE id=?");
        stmt.run([id]);
        stmt.free();
        this.saveDb();
        return true;
    },

    registerUser: function(nombre, email, pass) {
        const check = this.execQuery("SELECT id FROM usuarios WHERE email = ?", [email]);
        if(check.length > 0) return false; // Email exists

        const stmt = this.db.prepare("INSERT INTO usuarios (nombre, email, password) VALUES (?,?,?)");
        stmt.run([nombre, email, pass]); // Note: In a real app, hash password.
        stmt.free();
        this.saveDb();
        return true;
    },

    loginUser: function(email, pass) {
        const res = this.execQuery("SELECT id, nombre, email FROM usuarios WHERE email = ? AND password = ?", [email, pass]);
        return res.length > 0 ? res[0] : null;
    },

    checkEmailExists: function(email) {
        const check = this.execQuery("SELECT id FROM usuarios WHERE email = ?", [email]);
        return check.length > 0;
    },

    updatePassword: function(email, newPassword) {
        const stmt = this.db.prepare("UPDATE usuarios SET password = ? WHERE email = ?");
        stmt.run([newPassword, email]);
        stmt.free();
        this.saveDb();
        return true;
    },

    guardarHistorial: function(userId, tipo, entrada, resultado) {
        if(!userId) return;
        const stmt = this.db.prepare("INSERT INTO historial_calculos (usuario_id, tipo_calculo, datos_entrada, resultado) VALUES (?,?,?,?)");
        stmt.run([userId, tipo, JSON.stringify(entrada), resultado]);
        stmt.free();
        this.saveDb();
        app.renderHistorial(); // Refresh UI
    },

    getHistorial: function(userId) {
        return this.execQuery("SELECT * FROM historial_calculos WHERE usuario_id = ? ORDER BY id DESC", [userId]);
    }
};
