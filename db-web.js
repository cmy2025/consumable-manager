"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.testConnectionWithConfig = testConnectionWithConfig;
exports.getConsumables = getConsumables;
exports.addConsumable = addConsumable;
exports.getRecords = getRecords;
exports.addRecord = addRecord;
exports.updateConsumableQuantity = updateConsumableQuantity;
exports.updateConsumable = updateConsumable;
exports.deleteConsumable = deleteConsumable;
exports.getTotalConsumables = getTotalConsumables;
exports.getTodayInRecords = getTodayInRecords;
exports.getTodayOutRecords = getTodayOutRecords;
exports.getInventoryWarnings = getInventoryWarnings;
exports.getConsumableByItemid = getConsumableByItemid;
exports.testDatabaseConnection = testDatabaseConnection;
exports.getRecordsData = getRecordsData;
exports.deleteInRecord = deleteInRecord;
exports.deleteOutRecord = deleteOutRecord;
const mssql_1 = __importDefault(require("mssql"));
const path_1 = require("path");
const fs_1 = require("fs");
// 默认数据库配置
const defaultConfig = {
    user: 'sa',
    password: '123',
    server: 'localhost',
    database: 'SeRis',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        charset: 'utf8'
    }
};
// Web环境的配置文件路径
const getWebConfigPath = () => {
    return (0, path_1.join)(process.cwd(), 'web-settings.json');
};
// 读取配置文件 (Web环境版本)
async function loadConfig() {
    try {
        const configPath = getWebConfigPath();
        const data = await fs_1.promises.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        return config.database;
    }
    catch (error) {
        console.log('使用默认数据库配置，配置文件读取失败:', error);
        // 返回默认配置，转换为新格式
        return {
            server: defaultConfig.server,
            port: 1433,
            database: defaultConfig.database,
            username: defaultConfig.user,
            password: defaultConfig.password
        };
    }
}
// 将配置转换为 mssql 格式
function convertToMssqlConfig(dbConfig) {
    return {
        user: dbConfig.username,
        password: dbConfig.password,
        server: dbConfig.server,
        database: dbConfig.database,
        port: dbConfig.port,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };
}
async function getConnection() {
    try {
        const dbConfig = await loadConfig();
        const config = convertToMssqlConfig(dbConfig);
        const pool = await mssql_1.default.connect(config);
        console.log('数据库连接成功 - 使用配置:', {
            server: dbConfig.server,
            port: dbConfig.port,
            database: dbConfig.database
        });
        return pool;
    }
    catch (error) {
        console.error('数据库连接失败:', error);
        throw error;
    }
}
async function testConnectionWithConfig(dbConfig) {
    let pool = null;
    try {
        const config = convertToMssqlConfig(dbConfig);
        console.log('测试数据库连接 - 使用配置:', {
            server: dbConfig.server,
            port: dbConfig.port,
            database: dbConfig.database,
            username: dbConfig.username
        });
        pool = new mssql_1.default.ConnectionPool(config);
        await pool.connect();
        const request = pool.request();
        await request.query('SELECT 1 AS test');
        await pool.close();
        return {
            success: true,
            message: '数据库连接测试成功'
        };
    }
    catch (error) {
        if (pool) {
            try {
                await pool.close();
            }
            catch (closeError) {
                console.error('关闭连接时出错:', closeError);
            }
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('数据库连接测试失败:', errorMessage);
        return {
            success: false,
            message: `数据库连接失败: ${errorMessage}`
        };
    }
}
async function getConsumables() {
    const pool = await getConnection();
    const result = await pool
        .request()
        .query('SELECT [id], [itemid], [name], [quantity], [unit], [company], [status], [registrant] FROM Consumables');
    return result.recordset.map((row) => (Object.assign({}, row)));
}
async function addConsumable(data) {
    const pool = await getConnection();
    console.log('Adding consumable with data:', data);
    await pool
        .request()
        .input('itemid', mssql_1.default.NVarChar, data.itemid)
        .input('name', mssql_1.default.NVarChar, data.name)
        .input('quantity', mssql_1.default.Int, data.quantity)
        .input('unit', mssql_1.default.NVarChar, data.unit)
        .input('company', mssql_1.default.NVarChar, data.company)
        .input('status', mssql_1.default.NVarChar, data.status)
        .input('registrant', mssql_1.default.NVarChar, data.registrant)
        .query('INSERT INTO Consumables (itemid, name, quantity, unit, company, status,registrant) VALUES (@itemid, @name, @quantity, @unit, @company, @status,@registrant)');
}
async function getRecords() {
    const pool = await getConnection();
    const result = await pool
        .request()
        .query('SELECT TOP (1000) r.[id], r.[itemid], c.[name], r.[type], r.[quantity], r.[remain], r.[time],r.[status],r.[operator] FROM Records r JOIN Consumables c ON r.itemid = c.itemid');
    return result.recordset.map((row) => (Object.assign({}, row)));
}
async function addRecord(data) {
    const pool = await getConnection();
    await pool
        .request()
        .input('itemid', mssql_1.default.NVarChar, data.itemid)
        .input('name', mssql_1.default.NVarChar, data.name)
        .input('type', mssql_1.default.NVarChar, data.type)
        .input('quantity', mssql_1.default.Int, data.quantity)
        .input('remain', mssql_1.default.Int, data.remain)
        .input('time', mssql_1.default.DateTime, data.time)
        .input('status', mssql_1.default.NVarChar, data.status)
        .input('operator', mssql_1.default.NVarChar, data.operator)
        .query('INSERT INTO Records (itemid,name, type, quantity, remain, time,status, operator) VALUES (@itemid,@name, @type, @quantity, @remain, @time,@status, @operator)');
}
async function updateConsumableQuantity(data) {
    const pool = await getConnection();
    await pool
        .request()
        .input('itemid', mssql_1.default.NVarChar(50), data.itemid)
        .input('quantity', mssql_1.default.Int, data.quantity)
        .input('status', mssql_1.default.NVarChar(10), data.status).query(`
    UPDATE Consumables
    SET
      quantity = @quantity,
      status = @status
      WHERE itemid = @itemid
  `);
    console.log('updateConsumableQuantity with data:', data);
}
async function updateConsumable(data) {
    const pool = await getConnection();
    await pool
        .request()
        .input('id', mssql_1.default.Int, data.id)
        .input('itemid', mssql_1.default.NVarChar(50), data.itemid)
        .input('name', mssql_1.default.NVarChar(50), data.name)
        .input('quantity', mssql_1.default.Int, data.quantity)
        .input('unit', mssql_1.default.NVarChar(10), data.unit)
        .input('company', mssql_1.default.NVarChar(50), data.company)
        .input('status', mssql_1.default.NVarChar(10), data.status)
        .input('registrant', mssql_1.default.NVarChar(50), data.registrant).query(`
      UPDATE Consumables
      SET
        itemid = @itemid,
        name = @name,
        quantity = @quantity,
        unit = @unit,
        company = @company,
        status = @status,
        registrant = @registrant
      WHERE id = @id
    `);
}
async function deleteConsumable(itemid) {
    const pool = await getConnection();
    await pool
        .request()
        .input('itemid', mssql_1.default.NVarChar, itemid)
        .query('DELETE FROM Consumables WHERE itemid = @itemid');
}
async function getTotalConsumables() {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT COUNT(*) as total FROM Consumables');
    return result.recordset[0].total;
}
async function getTodayInRecords() {
    const pool = await getConnection();
    const today = new Date().toISOString().split('T')[0];
    const result = await pool
        .request()
        .input('today', mssql_1.default.Date, today)
        .query("SELECT SUM(quantity) as total FROM Records WHERE type = '入库' AND CAST(time AS DATE) = @today");
    return result.recordset[0].total || 0;
}
async function getTodayOutRecords() {
    const pool = await getConnection();
    const today = new Date().toISOString().split('T')[0];
    const result = await pool
        .request()
        .input('today', mssql_1.default.Date, today)
        .query("SELECT SUM(quantity) as total FROM Records WHERE type = '出库' AND CAST(time AS DATE) = @today");
    return result.recordset[0].total || 0;
}
async function getInventoryWarnings() {
    const pool = await getConnection();
    const result = await pool
        .request()
        .query('SELECT COUNT(*) as total FROM Consumables WHERE quantity < 10');
    return result.recordset[0].total;
}
async function getConsumableByItemid(itemid) {
    const pool = await getConnection();
    const result = await pool
        .request()
        .input('itemid', mssql_1.default.NVarChar, itemid)
        .query('SELECT [id], [itemid], [name], [quantity], [unit], [company], [status], [registrant] FROM Consumables WHERE itemid = @itemid');
    return result.recordset[0] || null;
}
async function testDatabaseConnection() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT 1');
        console.log('数据库连接测试成功:', result.recordset);
        return true;
    }
    catch (error) {
        console.error('数据库连接测试失败:', error);
        return false;
    }
}
async function getRecordsData(query) {
    console.log('记录查询参数:', query);
    const pool = await getConnection();
    let whereClause = 'WHERE 1 = 1';
    const queryParams = {};
    if (query.startTime) {
        whereClause += ' AND r.time >= @startTime';
        queryParams.startTime = query.startTime;
    }
    if (query.endTime) {
        whereClause += ' AND r.time <= @endTime';
        queryParams.endTime = query.endTime;
    }
    if (query.id !== undefined && query.id !== null) {
        whereClause += ' AND r.id = @id';
        queryParams.id = query.id;
    }
    if (query.itemid) {
        whereClause += ' AND r.itemid = @itemid';
        queryParams.itemid = query.itemid;
    }
    if (query.name) {
        whereClause += ' AND c.name LIKE @name';
        queryParams.name = `%${query.name}%`;
    }
    if (query.operator) {
        whereClause += ' AND r.operator = @operator';
        queryParams.operator = query.operator;
    }
    if (query.type) {
        whereClause += ' AND r.type = @type';
        queryParams.type = query.type;
    }
    if (query.status) {
        whereClause += ' AND r.status = @status';
        queryParams.status = query.status;
    }
    const querySql = `
    SELECT
      r.[id],
      r.[itemid],
      c.[name],
      r.[type],
      r.[quantity],
      r.[remain],
      r.[time],
      r.[status],
      r.[operator]
    FROM Records r
    JOIN Consumables c ON r.itemid = c.itemid
    ${whereClause}
    ORDER BY r.time DESC
  `;
    const request = pool.request();
    for (const key in queryParams) {
        if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
            if (key === 'startTime' || key === 'endTime') {
                request.input(key, mssql_1.default.DateTime, queryParams[key]);
            }
            else if (key === 'id') {
                request.input(key, mssql_1.default.Int, queryParams[key]);
            }
            else {
                request.input(key, mssql_1.default.NVarChar, queryParams[key]);
            }
        }
    }
    const result = await request.query(querySql);
    return result.recordset.map((row) => (Object.assign({}, row)));
}
async function deleteInRecord(recordId) {
    const pool = await getConnection();
    const transaction = new mssql_1.default.Transaction(pool);
    try {
        await transaction.begin();
        const recordResult = await transaction
            .request()
            .input('id', mssql_1.default.Int, recordId)
            .input('type', mssql_1.default.NVarChar, '入库').query(`
        SELECT id, itemid, quantity
        FROM Records
        WHERE id = @id
          AND type = @type
      `);
        const record = recordResult.recordset[0];
        if (record) {
            await transaction
                .request()
                .input('itemid', mssql_1.default.NVarChar, record.itemid)
                .input('quantity', mssql_1.default.Int, record.quantity).query(`
          UPDATE Consumables
          SET quantity = quantity - @quantity
          WHERE itemid = @itemid
        `);
            await transaction
                .request()
                .input('id', mssql_1.default.Int, record.id)
                .query(`DELETE FROM Records WHERE id = @id`);
        }
        await transaction.commit();
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
async function deleteOutRecord(recordId) {
    const pool = await getConnection();
    const transaction = new mssql_1.default.Transaction(pool);
    try {
        await transaction.begin();
        const recordResult = await transaction
            .request()
            .input('id', mssql_1.default.Int, recordId)
            .input('type', mssql_1.default.NVarChar, '出库').query(`
        SELECT id, itemid, quantity
        FROM Records
        WHERE id = @id
          AND type = @type
      `);
        const record = recordResult.recordset[0];
        if (record) {
            await transaction
                .request()
                .input('itemid', mssql_1.default.NVarChar, record.itemid)
                .input('quantity', mssql_1.default.Int, record.quantity).query(`
          UPDATE Consumables
          SET quantity = quantity + @quantity
          WHERE itemid = @itemid
        `);
            await transaction
                .request()
                .input('id', mssql_1.default.Int, record.id)
                .query(`DELETE FROM Records WHERE id = @id`);
        }
        await transaction.commit();
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
