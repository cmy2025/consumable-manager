import mssql from 'mssql'
import { join } from 'path'
import { promises as fs } from 'fs'

//接口interface:TS的核心结构，用来约束数据结构，避免类型不匹配问题
// 默认数据库配置（配置文件读取失败时用硬编码兜底）
const defaultConfig = {
  user: 'sa',
  password: '123',
  server: 'localhost',
  database: 'SeRis',
  options: {
    encrypt: false,// 关闭加密（本地测试常用）
    trustServerCertificate: true,// 信任服务器证书（避免证书验证错误）
    charset: 'utf8'
  }
}
//2. 默认配置与接口定义
// 数据库配置接口
interface DatabaseConfig {
  server: string
  port: number
  database: string
  username: string
  password: string
}

// 应用配置接口
interface AppConfig {
  database: DatabaseConfig// 数据库配置部分
  ui: {// UI相关配置
    warningColor10: string
    warningColor100: string
    fontSize: number
    darkMode: boolean
  }
}
//3. 配置文件路径与读取
// Web环境的配置文件路径（项目根目录下的web-settings.json）
const getWebConfigPath = (): string => {
  return join(process.cwd(), 'web-settings.json')
}
//process.cwd()：获取当前 Node.js 进程的工作目录（即项目根目录）。



// 读取配置文件 (Web环境版本)，返回数据库配置（失败则返回默认配置）
async function loadConfig(): Promise<DatabaseConfig> {
  try {
    const configPath = getWebConfigPath()
    const data = await fs.readFile(configPath, 'utf8')// fs.readFile异步读取文件内容,utf8 编码确保中文等字符不会乱码。
    const config: AppConfig = JSON.parse(data)// 解析JSON为对象
    return config.database// 只返回数据库相关配置
  } catch (error) {
    console.log('使用默认数据库配置，配置文件读取失败:', error)
    // 返回默认配置，转换为新格式DatabaseConfig接口要求的格式（字段名对齐）
    return {
      server: defaultConfig.server,
      port: 1433,// SQL Server默认端口
      database: defaultConfig.database,
      username: defaultConfig.user,// 字段名映射：user → username
      password: defaultConfig.password
    }
  }
}
//4. 配置格式转换
//将自定义的DatabaseConfig转换为mssql库要求的配置格式
//核心作用：适配 mssql 库的配置字段要求（比如库要求用user，而自定义配置用username）
function convertToMssqlConfig(dbConfig: DatabaseConfig): mssql.config {
  return {
    user: dbConfig.username,// 字段名反向映射：username → user
    password: dbConfig.password,
    server: dbConfig.server,
    database: dbConfig.database,
    port: dbConfig.port,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
}
//5. 核心方法：获取数据库连接池
export async function getConnection(): Promise<mssql.ConnectionPool> {
  try {
    const dbConfig = await loadConfig()// 读取配置
    const config = convertToMssqlConfig(dbConfig)// 转换格式
    const pool = await mssql.connect(config)// 创建并连接连接池
    console.log('数据库连接成功 - 使用配置:', {
      server: dbConfig.server,
      port: dbConfig.port,
      database: dbConfig.database
    })
    return pool// 返回连接池实例（供外部执行SQL）
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}
//连接池（ConnectionPool）：mssql 推荐的连接方式，复用数据库连接，避免频繁创建 / 销毁连接的性能损耗。
//export：将方法暴露给外部模块使用（比如其他文件可以import { getConnection } from './db-web'）。


//6. 辅助方法：测试数据库连接
export async function testConnectionWithConfig(dbConfig: DatabaseConfig): Promise<{
  success: boolean
  message: string
}> {
  let pool: mssql.ConnectionPool | null = null//声明连接池变量，初始为null
  try {
    const config = convertToMssqlConfig(dbConfig)// 手动创建连接池
    console.log('测试数据库连接 - 使用配置:', {
      server: dbConfig.server,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username
    })
    pool = new mssql.ConnectionPool(config)
    await pool.connect()// 尝试连接
    const request = pool.request()// 创建请求实例
    await request.query('SELECT 1 AS test')// 执行简单SQL测试连接有效性
    await pool.close()// 测试完成后关闭连接池
    return {
      success: true,
      message: '数据库连接测试成功'
    }
  } catch (error: unknown) {//unknown 类型：TypeScript 的安全类型，避免直接访问 error.message 导致类型错误，需先判断是否为 Error 实例。
    // 异常时确保连接池关闭，避免资源泄漏
    if (pool) {
      try {
        await pool.close()
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError)
      }
    }
    // 统一异常信息格式
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('数据库连接测试失败:', errorMessage)
    return {
      success: false,
      message: `数据库连接失败: ${errorMessage}`
    }
  }
}
//核心逻辑：读取配置（自定义→默认兜底）→ 格式转换 → 创建连接池 → 提供连接 / 测试能力。
export async function getConsumables(queryParams: Record<string, string>): Promise<Array<Record<string, unknown>>> {
  const pool = await getConnection();
  let whereClause = 'WHERE 1 = 1';
  const queryParamsObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(queryParams)) {
    whereClause += ` AND ${key} = @${key}`;
    queryParamsObj[key] = value;
  }
  

  const querySql = `
    SELECT [id], [itemid], [name], [quantity], [unit], [company], [status], [registrant] 
    FROM Consumables 
    ${whereClause}
  `;

  const request = pool.request();
  for (const [key, value] of Object.entries(queryParamsObj)) {
    request.input(key, mssql.NVarChar, value);
  }

  const result = await request.query(querySql);
  return result.recordset.map((row) => ({ ...row }));
}

export async function addConsumable(data: {
  itemid: string
  name: string
  quantity: number
  unit: string
  company?: string
  status?: string
  registrant: string
}): Promise<void> {
  const pool = await getConnection()
  console.log('Adding consumable with data:', data)
  await pool
    .request()
    .input('itemid', mssql.NVarChar, data.itemid)
    .input('name', mssql.NVarChar, data.name)
    .input('quantity', mssql.Int, data.quantity)
    .input('unit', mssql.NVarChar, data.unit)
    .input('company', mssql.NVarChar, data.company)
    .input('status', mssql.NVarChar, data.status)
    .input('registrant', mssql.NVarChar, data.registrant)
    .query(
      'INSERT INTO Consumables (itemid, name, quantity, unit, company, status,registrant) VALUES (@itemid, @name, @quantity, @unit, @company, @status,@registrant)'
    )
}

export async function getRecords(): Promise<Array<Record<string, unknown>>> {
  const pool = await getConnection()
  const result = await pool
    .request()
    .query(
      'SELECT TOP (1000) r.[id], r.[itemid], c.[name], r.[type], r.[quantity], r.[remain], r.[time],r.[status],r.[operator] FROM Records r JOIN Consumables c ON r.itemid = c.itemid'
    )
  return result.recordset.map((row) => ({ ...row }))
}

export async function addRecord(data: {
  itemid: string
  name: string
  type: string
  quantity: number
  remain: number
  time: Date
  status: string
  operator: string
}): Promise<void> {
  const pool = await getConnection()
  await pool
    .request()
    .input('itemid', mssql.NVarChar, data.itemid)
    .input('name', mssql.NVarChar, data.name)
    .input('type', mssql.NVarChar, data.type)
    .input('quantity', mssql.Int, data.quantity)
    .input('remain', mssql.Int, data.remain)
    .input('time', mssql.DateTime, data.time)
    .input('status', mssql.NVarChar, data.status)
    .input('operator', mssql.NVarChar, data.operator)
    .query(
      'INSERT INTO Records (itemid,name, type, quantity, remain, time,status, operator) VALUES (@itemid,@name, @type, @quantity, @remain, @time,@status, @operator)'
    )
}

export async function updateConsumableQuantity(data: {
  itemid: string
  quantity: number
  status?: string
}): Promise<void> {
  const pool = await getConnection()
  await pool
    .request()
    .input('itemid', mssql.NVarChar(50), data.itemid)
    .input('quantity', mssql.Int, data.quantity)
    .input('status', mssql.NVarChar(10), data.status).query(`
    UPDATE Consumables
    SET
      quantity = @quantity,
      status = @status
      WHERE itemid = @itemid
  `)
  console.log('updateConsumableQuantity with data:', data)
}

export async function updateConsumable(data: {
  id: number
  itemid: string
  name: string
  quantity: number
  unit: string
  company: string
  status: string
  registrant: string
}): Promise<void> {
  const pool = await getConnection()
  await pool
    .request()
    .input('id', mssql.Int, data.id)
    .input('itemid', mssql.NVarChar(50), data.itemid)
    .input('name', mssql.NVarChar(50), data.name)
    .input('quantity', mssql.Int, data.quantity)
    .input('unit', mssql.NVarChar(10), data.unit)
    .input('company', mssql.NVarChar(50), data.company)
    .input('status', mssql.NVarChar(10), data.status)
    .input('registrant', mssql.NVarChar(50), data.registrant).query(`
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
    `)
}

export async function deleteConsumable(itemid: string): Promise<void> {
  const pool = await getConnection()
  await pool
    .request()
    .input('itemid', mssql.NVarChar, itemid)
    .query('DELETE FROM Consumables WHERE itemid = @itemid')
}

export async function getTotalConsumables(): Promise<number> {
  const pool = await getConnection()
  const result = await pool.request().query('SELECT COUNT(*) as total FROM Consumables')
  return result.recordset[0].total
}

export async function getTodayInRecords(): Promise<number> {
  const pool = await getConnection()
  const today = new Date().toISOString().split('T')[0]
  const result = await pool
    .request()
    .input('today', mssql.Date, today)
    .query(
      "SELECT SUM(quantity) as total FROM Records WHERE type = '入库' AND CAST(time AS DATE) = @today"
    )
  return result.recordset[0].total || 0
}

export async function getTodayOutRecords(): Promise<number> {
  const pool = await getConnection()
  const today = new Date().toISOString().split('T')[0]
  const result = await pool
    .request()
    .input('today', mssql.Date, today)
    .query(
      "SELECT SUM(quantity) as total FROM Records WHERE type = '出库' AND CAST(time AS DATE) = @today"
    )
  return result.recordset[0].total || 0
}

export async function getInventoryWarnings(): Promise<number> {
  const pool = await getConnection()
  const result = await pool
    .request()
    .query('SELECT COUNT(*) as total FROM Consumables WHERE quantity < 10')
  return result.recordset[0].total
}

export async function getConsumableByItemid(
  itemid: string
): Promise<Record<string, unknown> | null> {
  const pool = await getConnection()
  const result = await pool
    .request()
    .input('itemid', mssql.NVarChar, itemid)
    .query(
      'SELECT [id], [itemid], [name], [quantity], [unit], [company], [status], [registrant] FROM Consumables WHERE itemid = @itemid'
    )
  return result.recordset[0] || null
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const pool = await getConnection()
    const result = await pool.request().query('SELECT 1')
    console.log('数据库连接测试成功:', result.recordset)
    return true
  } catch (error) {
    console.error('数据库连接测试失败:', error)
    return false
  }
}

export async function getRecordsData(query: {
  startTime: Date | null
  endTime: Date | null
  id?: number
  itemid?: string
  name?: string
  type?: string
  status?: string
  operator?: string
}): Promise<Array<Record<string, unknown>>> {
  console.log('记录查询参数:', query)

  const pool = await getConnection()

  let whereClause = 'WHERE 1 = 1'
  const queryParams: Record<string, unknown> = {}

  if (query.startTime) {
    whereClause += ' AND r.time >= @startTime'
    queryParams.startTime = query.startTime
  }

  if (query.endTime) {
    whereClause += ' AND r.time <= @endTime'
    queryParams.endTime = query.endTime
  }

  if (query.id !== undefined && query.id !== null) {
    whereClause += ' AND r.id = @id'
    queryParams.id = query.id
  }

  if (query.itemid) {
    whereClause += ' AND r.itemid = @itemid'
    queryParams.itemid = query.itemid
  }

  if (query.name) {
    whereClause += ' AND c.name LIKE @name'
    queryParams.name = `%${query.name}%`
  }
  //c.name LIKE @name 模糊查询语句
  //%${query.name}%数据库的模糊查询语句的通配符

  if (query.operator) {
    whereClause += ' AND r.operator = @operator'
    queryParams.operator = query.operator
  }

  if (query.type) {
    whereClause += ' AND r.type = @type'
    queryParams.type = query.type
  }

  if (query.status) {
    whereClause += ' AND r.status = @status'
    queryParams.status = query.status
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
  `//ORDER BY按操作时间降序排序（最新的记录在前）。
  //JOIN用于关联查询

  const request = pool.request()
  for (const key in queryParams) {
    if (Object.prototype.hasOwnProperty.call(queryParams, key)) {//Object.prototype.避免遍历到原型链上的属性，保证只处理自身属性。
      if (key === 'startTime' || key === 'endTime') {
        request.input(key, mssql.DateTime, queryParams[key])//request.input(key, 类型, 值)：参数化绑定，这里主要是把queryParams里的key拿出来判断类型是DataTime还是Int还是NVarChar
      } else if (key === 'id') {
        request.input(key, mssql.Int, queryParams[key])
      } else {
        request.input(key, mssql.NVarChar, queryParams[key])
      }
    }
  }
  const result = await request.query(querySql)
  return result.recordset.map((row) => ({ ...row }))
}
// result：MSSQL 查询结果对象，其中 recordset 是查询结果集（数组）。
// map((row) => ({ ...row }))：遍历结果集，对每一行创建新对象（浅拷贝），避免直接返回数据库原生对象可能的副作用。

export async function deleteInRecord(recordId: number): Promise<void> {
  const pool = await getConnection()
  const transaction = new mssql.Transaction(pool)//基于连接池创建事务实例（MSSQL 事务用于保证多步数据库操作的原子性：要么全部成功，要么全部回滚）。

  try {
    await transaction.begin()//事务开始

    const recordResult = await transaction
      .request()
      .input('id', mssql.Int, recordId)
      .input('type', mssql.NVarChar, '入库').query(`
        SELECT id, itemid, quantity
        FROM Records
        WHERE id = @id
          AND type = @type
      `)

    const record = recordResult.recordset[0]//取出第一条记录
    if (record) {
      await transaction
        .request()
        .input('itemid', mssql.NVarChar, record.itemid)
        .input('quantity', mssql.Int, record.quantity).query(`
          UPDATE Consumables
          SET quantity = quantity - @quantity
          WHERE itemid = @itemid
        `)//库存字段 quantity = 原有库存 - 入库数量；

      await transaction
        .request()
        .input('id', mssql.Int, record.id)
        .query(`DELETE FROM Records WHERE id = @id`)
    }

    await transaction.commit()//事务提交
  } catch (error) {
    await transaction.rollback()//回滚事务 —— 撤销事务中所有已执行的操作（库存不会被扣减，记录也不会被删除），保证数据一致性。
    throw error
  }
}
// 插入日志记录的函数
export async function insertLog(logType: string, logModule: string, logMessage: string, logUser: string, logExt0?: string, logExt1?: string, logExt2?: string, logExt3?: string, logExt4?: string) {
  const pool = await getConnection();
  const now = new Date();//const now = new Date()：生成当前时间戳（JavaScript Date 对象），用于日志的「创建时间」相关字段。
  await pool
    .request()
    .input('Log_Type', mssql.NVarChar(20), logType)
    .input('Log_Module', mssql.NVarChar(50), logModule)
    .input('Log_DateTime', mssql.DateTime, now)
    .input('Log_Message', mssql.Text, logMessage)
    .input('Log_User', mssql.NVarChar(160), logUser)
    .input('Log_Ext0', mssql.NVarChar(50), logExt0)
    .input('Log_Ext1', mssql.NVarChar(50), logExt1)
    .input('Log_Ext2', mssql.NVarChar(50), logExt2)
    .input('Log_Ext3', mssql.NVarChar(50), logExt3)
    .input('Log_Ext4', mssql.NVarChar(50), logExt4)
    .input('Log_Date', mssql.DateTime, now)
    .input('Log_Time', mssql.DateTime, now)
    .query(`
      INSERT INTO TLog (Log_Type, Log_Module, Log_DateTime, Log_Message, Log_User, Log_Ext0, Log_Ext1, Log_Ext2, Log_Ext3, Log_Ext4, Log_Date, Log_Time)
      VALUES (@Log_Type, @Log_Module, @Log_DateTime, @Log_Message, @Log_User, @Log_Ext0, @Log_Ext1, @Log_Ext2, @Log_Ext3, @Log_Ext4, @Log_Date, @Log_Time)
    `);
}

export async function deleteOutRecord(recordId: number): Promise<void> {
  const pool = await getConnection()
  const transaction = new mssql.Transaction(pool)

  try {
    await transaction.begin()

    const recordResult = await transaction
      .request()
      .input('id', mssql.Int, recordId)
      .input('type', mssql.NVarChar, '出库').query(`
        SELECT id, itemid, quantity
        FROM Records
        WHERE id = @id
          AND type = @type
      `)

    const record = recordResult.recordset[0]
    if (record) {
      await transaction
        .request()
        .input('itemid', mssql.NVarChar, record.itemid)
        .input('quantity', mssql.Int, record.quantity).query(`
          UPDATE Consumables
          SET quantity = quantity + @quantity
          WHERE itemid = @itemid
        `)

      await transaction
        .request()
        .input('id', mssql.Int, record.id)
        .query(`DELETE FROM Records WHERE id = @id`)
    }

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}