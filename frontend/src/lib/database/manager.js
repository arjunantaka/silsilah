import initSqlJs from 'sql.js';
import { DATABASE_SCHEMA, SAMPLE_DATA } from './schema.js';

/**
 * Database Manager untuk Silsilah Keluarga
 * Menggunakan SQL.js untuk SQLite di browser
 */
class DatabaseManager {
    constructor() {
        this.SQL = null;
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Starting SQL.js initialization...');
            // Initialize SQL.js with fallback
            this.SQL = await initSqlJs({
                locateFile: file => {
                    console.log(`Loading SQL.js file: ${file}`);
                    return `/sql/${file}`;
                }
            });
            console.log('SQL.js initialized successfully');

            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem('keluarga_database');
            if (savedDb) {
                const buffer = new Uint8Array(JSON.parse(savedDb));
                this.db = new this.SQL.Database(buffer);
            } else {
                // Create new database
                this.db = new this.SQL.Database();
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            console.error('Error details:', error.message);
            // Try alternative initialization
            try {
                console.log('Trying fallback CDN initialization...');
                this.SQL = await initSqlJs({
                    locateFile: file => `https://sql.js.org/dist/${file}`
                });
                
                // Create new database
                this.db = new this.SQL.Database();
                
                // Execute schema
                this.db.exec(DATABASE_SCHEMA);
                console.log('Database schema created');
                
                this.save();
                this.isInitialized = true;
                console.log('Database initialized with fallback CDN');
            } catch (fallbackError) {
                console.error('Fallback initialization also failed:', fallbackError);
                throw new Error(`Database initialization failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
            }
        }
    }

    async createTables() {
        try {
            this.db.exec(DATABASE_SCHEMA);
            console.log('Database tables created');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    async insertSampleData() {
        try {
            this.db.exec(SAMPLE_DATA);
            this.save();
            console.log('Sample data inserted');
        } catch (error) {
            console.error('Error inserting sample data:', error);
        }
    }

    save() {
        if (!this.db) return;
        
        const data = this.db.export();
        const buffer = new Uint8Array(data);
        const serialized = JSON.stringify(Array.from(buffer));
        localStorage.setItem('keluarga_database', serialized);
    }

    // Family Groups
    getAllKeluarga() {
        const stmt = this.db.prepare('SELECT * FROM keluarga ORDER BY nama');
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    createKeluarga(data) {
        const stmt = this.db.prepare(`
            INSERT INTO keluarga (
                nama_keluarga, kepala_keluarga, deskripsi
            ) VALUES (?, ?, ?)
        `);
        stmt.run([
            data.nama_keluarga,
            data.kepala_keluarga || '',
            data.deskripsi || ''
        ]);
        stmt.free();
        this.save();
        return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    }

    updateKeluarga(id, data) {
        const fields = [];
        const values = [];
        
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });
        
        if (fields.length === 0) return;
        
        values.push(id);
        const sql = `UPDATE keluarga SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        const stmt = this.db.prepare(sql);
        stmt.run(values);
        stmt.free();
        this.save();
    }

    deleteKeluarga(id) {
        const stmt = this.db.prepare('DELETE FROM keluarga WHERE id = ?');
        stmt.run([id]);
        stmt.free();
        this.save();
    }

    // People
    getAllOrang(keluargaId = null) {
        let sql = 'SELECT * FROM orang';
        let params = [];
        
        if (keluargaId) {
            sql += ' WHERE keluarga_id = ?';
            params.push(keluargaId);
        }
        
        sql += ' ORDER BY nama_lengkap';
        
        const stmt = this.db.prepare(sql);
        const results = [];
        
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    createOrang(data) {
        const stmt = this.db.prepare(`
            INSERT INTO orang (
                keluarga_id, nama_lengkap, nama_panggilan, jenis_kelamin,
                tempat_lahir, tanggal_lahir, status_hidup, tanggal_wafat,
                alamat, pekerjaan, pendidikan, telepon, email, catatan
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            data.keluarga_id,
            data.nama_lengkap,
            data.nama_panggilan || '',
            data.jenis_kelamin || '',
            data.tempat_lahir || '',
            data.tanggal_lahir || '',
            data.status_hidup || 'hidup',
            data.tanggal_wafat || '',
            data.alamat || '',
            data.pekerjaan || '',
            data.pendidikan || '',
            data.telepon || '',
            data.email || '',
            data.catatan || ''
        ]);
        
        stmt.free();
        this.save();
        return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    }

    updateOrang(id, data) {
        const fields = [];
        const values = [];
        
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });
        
        if (fields.length === 0) return;
        
        values.push(id);
        const sql = `UPDATE orang SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        const stmt = this.db.prepare(sql);
        stmt.run(values);
        stmt.free();
        this.save();
    }

    deleteOrang(id) {
        const stmt = this.db.prepare('DELETE FROM orang WHERE id = ?');
        stmt.run([id]);
        stmt.free();
        this.save();
    }

    getOrangByKeluarga(keluargaId) {
        return this.getAllOrang(keluargaId);
    }

    // Marriages
    createPernikahan(data) {
        const stmt = this.db.prepare(`
            INSERT INTO pernikahan (
                keluarga_id, suami_id, istri_id, tanggal_nikah, 
                tempat_nikah, status, catatan
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            data.keluarga_id,
            data.suami_id,
            data.istri_id,
            data.tanggal_nikah || '',
            data.tempat_nikah || '',
            data.status || 'menikah',
            data.catatan || ''
        ]);
        
        stmt.free();
        this.save();
        return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    }

    // Relations
    createHubunganKeluarga(orangTuaId, anakId, pernikahanId, urutanLahir, jenis = 'kandung') {
        const stmt = this.db.prepare(`
            INSERT INTO hubungan_keluarga (
                orang_tua_id, anak_id, pernikahan_id, urutan_lahir, jenis
            ) VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run([orangTuaId, anakId, pernikahanId, urutanLahir, jenis]);
        stmt.free();
        this.save();
        return this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    }

    getHubunganKeluarga(keluargaId = null) {
        let sql = `
            SELECT 
                hk.*,
                ot.nama_lengkap as nama_orang_tua,
                a.nama_lengkap as nama_anak
            FROM hubungan_keluarga hk
            JOIN orang ot ON hk.orang_tua_id = ot.id
            JOIN orang a ON hk.anak_id = a.id
        `;
        
        if (keluargaId) {
            sql += ' WHERE ot.keluarga_id = ?';
        }
        
        sql += ' ORDER BY hk.orang_tua_id, hk.urutan_lahir';
        
        const stmt = this.db.prepare(sql);
        const results = [];
        
        if (keluargaId) {
            stmt.bind([keluargaId]);
        }
        
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    // Lineage functions (simplified from backend)
    setRootPerson(keluargaId, personId) {
        const stmt = this.db.prepare('UPDATE keluarga SET root_id = ? WHERE id = ?');
        stmt.run([personId, keluargaId]);
        stmt.free();
        this.save();
    }

    rebuildLineage(keluargaId) {
        // Simplified lineage rebuild - reset all codes first
        const resetStmt = this.db.prepare('UPDATE orang SET lineage_code = "", lineage_path = "" WHERE keluarga_id = ?');
        resetStmt.run([keluargaId]);
        resetStmt.free();

        // Get root person
        const rootStmt = this.db.prepare('SELECT root_id FROM keluarga WHERE id = ?');
        rootStmt.bind([keluargaId]);
        rootStmt.step();
        const rootId = rootStmt.get()[0];
        rootStmt.free();

        if (rootId) {
            // Set root person
            const updateRootStmt = this.db.prepare('UPDATE orang SET lineage_code = "ROOT", lineage_path = "" WHERE id = ?');
            updateRootStmt.run([rootId]);
            updateRootStmt.free();

            // Build lineage for children recursively
            this.buildChildrenLineage(rootId, '', 'A', keluargaId);
        }

        this.save();
    }

    buildChildrenLineage(parentId, parentPath, generation, keluargaId, birthOrder = 0) {
        const childrenStmt = this.db.prepare(`
            SELECT a.id, hk.urutan_lahir 
            FROM hubungan_keluarga hk
            JOIN orang a ON hk.anak_id = a.id
            WHERE hk.orang_tua_id = ? AND a.keluarga_id = ?
            ORDER BY hk.urutan_lahir
        `);
        
        childrenStmt.bind([parentId, keluargaId]);
        
        while (childrenStmt.step()) {
            const child = childrenStmt.getAsObject();
            const childPath = parentPath + '.' + child.urutan_lahir + '.';
            const childCode = generation + child.urutan_lahir;
            
            // Update child lineage
            const updateStmt = this.db.prepare('UPDATE orang SET lineage_code = ?, lineage_path = ? WHERE id = ?');
            updateStmt.run([childCode, childPath, child.id]);
            updateStmt.free();
            
            // Recursively build for grandchildren
            this.buildChildrenLineage(child.id, childPath, childCode + 'P', keluargaId);
        }
        
        childrenStmt.free();
    }
}

export const db = new DatabaseManager();

// Export convenience functions for components
export async function initDatabase() {
    return await db.initialize();
}

// Family functions
export function getAllKeluarga() {
    return db.getAllKeluarga();
}

export function createKeluarga(data) {
    return db.createKeluarga(data);
}

export function updateKeluarga(id, data) {
    return db.updateKeluarga(id, data);
}

export function deleteKeluarga(id) {
    return db.deleteKeluarga(id);
}

// Person functions
export function getAllOrang(keluargaId = null) {
    return db.getAllOrang(keluargaId);
}

export function getOrangByKeluarga(keluargaId) {
    return db.getOrangByKeluarga(keluargaId);
}

export function createOrang(data) {
    return db.createOrang(data);
}

export function updateOrang(id, data) {
    return db.updateOrang(id, data);
}

export function deleteOrang(id) {
    return db.deleteOrang(id);
}

// Relations functions
export function getHubunganKeluarga(keluargaId = null) {
    return db.getHubunganKeluarga(keluargaId);
}

export function createHubunganKeluarga(orangTuaId, anakId, pernikahanId, urutanLahir, jenis = 'kandung') {
    return db.createHubunganKeluarga(orangTuaId, anakId, pernikahanId, urutanLahir, jenis);
}

// Lineage functions
export function setRootPerson(keluargaId, personId) {
    return db.setRootPerson(keluargaId, personId);
}

export function rebuildLineage(keluargaId) {
    return db.rebuildLineage(keluargaId);
}