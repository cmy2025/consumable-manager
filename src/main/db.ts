import mssql from 'mssql'
import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
// 新增：导入 bcryptjs
import * as bcrypt from 'bcryptjs'
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
}

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
  database: DatabaseConfig
  ui: {
    warningColor10: string
    warningColor100: string
    fontSize: number
    darkMode: boolean
  }
}

// 读取配置文件
async function loadConfig(): Promise<DatabaseConfig> {
  try {
    const userDataPath = app.getPath('userData')
    const configPath = join(userDataPath, 'settings.json')
    const data = await fs.readFile(configPath, 'utf8')
    const config: AppConfig = JSON.parse(data)
    return config.database
  } catch (error) {
    console.log('使用默认数据库配置，配置文件读取失败:', error)
    // 返回默认配置，转换为新格式
    return {
      server: defaultConfig.server,
      port: 1433,
      database: defaultConfig.database,
      username: defaultConfig.user,
      password: defaultConfig.password
    }
  }
}

// 将配置转换为 mssql 格式
function convertToMssqlConfig(dbConfig: DatabaseConfig): mssql.config {
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
  }
}
interface User {
  id: number
  username: string
  password: string // 建议存储加密后的密码（如MD5/SHA256）
  realName: string
  role: string // 如 'admin'/'user'
}
/**
 * 验证用户登录信息（使用 bcrypt 验证密码）
 * @param username 用户名
 * @param password 明文密码
 * @returns 匹配的用户信息（不含密码）或 null
 */
 export async function verifyUserLogin(username: string, password: string): Promise<User | null> {
  try {
    const pool = await getConnection()
    const request = pool.request()
      .input('username', mssql.NVarChar, username)

    // 1. 查询用户信息（包含加密后的密码）
    const result = await request.query(`
      SELECT id, username, password, realName, role 
      FROM Users 
      WHERE username = @username
    `)

    // 2. 没有找到用户
    if (result.recordset.length === 0) {
      return null
    }

    const user = result.recordset[0]
    
    // 3. 使用 bcrypt 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    // 4. 返回用户信息（移除密码字段）
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error('用户登录验证失败:', error)
    throw error
  }
}

/**
 * 注册新用户（使用 bcrypt 加密密码）
 * @param userData 用户注册信息
 * @returns 注册结果
 */
export async function registerUser(userData: {
  username: string
  password: string // 明文密码
  realName: string
  role: string
}): Promise<{
  success: boolean
  data?: {
    id: number
    username: string
    realName: string
    role: string
  }
  error?: string
}> {
  try {
    const pool = await getConnection()
    
    // 1. 检查用户名是否已存在
    const checkRequest = pool.request()
      .input('username', mssql.NVarChar, userData.username)
    const checkResult = await checkRequest.query(`
      SELECT id FROM Users WHERE username = @username
    `)
    
    if (checkResult.recordset.length > 0) {
      return {
        success: false,
        error: '用户名已存在，请更换用户名'
      }
    }

    // 2. 生成盐值并加密密码（盐轮数 10，平衡安全性和性能）
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(userData.password, salt)

    // 3. 插入新用户（存储加密后的密码）
    const insertRequest = pool.request()
      .input('username', mssql.NVarChar, userData.username)
      .input('password', mssql.NVarChar, hashedPassword) // 存储哈希值
      .input('realName', mssql.NVarChar, userData.realName)
      .input('role', mssql.NVarChar, userData.role || 'user')
    
    await insertRequest.query(`
      INSERT INTO Users (username, password, realName, role)
      VALUES (@username, @password, @realName, @role)
    `)

    // 4. 获取新注册用户的信息（不含密码）
    const newUserResult = await checkRequest.query(`
      SELECT id, username, realName, role 
      FROM Users WHERE username = @username
    `)

    const newUser = newUserResult.recordset[0]
    
    return {
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        realName: newUser.realName,
        role: newUser.role
      }
    }
  } catch (error) {
    console.error('用户注册失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '注册失败，请重试'
    }
  }
}

/**
 * 登出操作（可扩展：如记录登出日志、清理会话等）
 * @param username 用户名
 * @returns 操作结果
 */
export async function handleUserLogout(username: string): Promise<boolean> {
  try {
    // 示例：登出时插入操作日志（复用已有的 insertLog 函数）
    await insertLog(
      'OPERATE',
      'USER',
      `用户 ${username} 登出系统`,
      username
    )
    return true
  } catch (error) {
    console.error('处理用户登出失败:', error)
    return false
  }
}
export async function getConsumableLineChartData(query: {
  startTime: Date | null
  endTime: Date | null
  itemid: string
  name: string
  operator: string
  type: string
  status: string
  timeGranularity: string
}): Promise<{ dates: string[]; inQuantities: number[]; outQuantities: number[] }> {
  console.log('查询参数:', query)
  const pool = await getConnection()

  const endTimeForQuery = query.endTime ? new Date(query.endTime) : null
  if (endTimeForQuery) {
    endTimeForQuery.setDate(endTimeForQuery.getDate() + 1)
  }

  let groupByClause = ''
  let dateFormat = ''

  switch (query.timeGranularity) {
    case 'day':
      groupByClause = 'CONVERT(VARCHAR(10), time, 23)'
      dateFormat = 'CONVERT(VARCHAR(10), time, 23)'
      break
    case 'week':
      groupByClause = 'DATEPART(WEEK, time)'
      dateFormat = "CONCAT('Week ', DATEPART(WEEK, time))"
      break
    case 'month':
      groupByClause = 'CONVERT(VARCHAR(7), time, 23)'
      dateFormat = 'CONVERT(VARCHAR(7), time, 23)'
      break
    case 'year':
      groupByClause = 'CONVERT(VARCHAR(4), time, 23)'
      dateFormat = 'CONVERT(VARCHAR(4), time, 23)'
      break
    default:
      groupByClause = 'CONVERT(VARCHAR(10), time, 23)'
      dateFormat = 'CONVERT(VARCHAR(10), time, 23)'
  }

  const inQuerySql = `
    SELECT ${dateFormat} as date, SUM(quantity) as totalQuantity
    FROM Records
    WHERE 1 = 1
    ${query.startTime ? ' AND time >= @startTime' : ''}
    ${query.endTime ? ' AND time <= @endTime' : ''}
    ${query.itemid ? ' AND itemid = @itemid' : ''}
    ${query.name ? ' AND c.name LIKE @name' : ''}
    ${query.operator ? ' AND operator = @operator' : ''}
    ${query.status ? ' AND status = @status' : ''}
    AND type = '入库'
    GROUP BY ${groupByClause}
    ORDER BY ${groupByClause}
  `

  const outQuerySql = `
    SELECT ${dateFormat} as date, SUM(quantity) as totalQuantity
    FROM Records
    WHERE 1 = 1
    ${query.startTime ? ' AND time >= @startTime' : ''}
    ${query.endTime ? ' AND time <= @endTime' : ''}
    ${query.itemid ? ' AND itemid = @itemid' : ''}
    ${query.name ? ' AND c.name LIKE @name' : ''}
    ${query.operator ? ' AND operator = @operator' : ''}
    ${query.status ? ' AND status = @status' : ''}
    AND type = '出库'
    GROUP BY ${groupByClause}
    ORDER BY ${groupByClause}
  `

  const request = pool
    .request()
    .input('startTime', mssql.DateTime, query.startTime)
    .input('endTime', mssql.DateTime, endTimeForQuery)
    .input('itemid', mssql.NVarChar, query.itemid)

  if (query.name) {
    request.input('name', mssql.NVarChar, `%${query.name}%`)
  }
  if (query.operator) {
    request.input('operator', mssql.NVarChar, query.operator)
  }
  if (query.status) {
    request.input('status', mssql.NVarChar, query.status)
  }

  const inResult = await request.query(inQuerySql)
  const outResult = await request.query(outQuerySql)

  const inData = inResult.recordset.reduce(
    (acc, item) => {
      acc[item.date] = item.totalQuantity
      return acc
    },
    {} as Record<string, number>
  )

  const outData = outResult.recordset.reduce(
    (acc, item) => {
      acc[item.date] = item.totalQuantity
      return acc
    },
    {} as Record<string, number>
  )

  const allDates = [...new Set([...Object.keys(inData), ...Object.keys(outData)])].sort()
  console.log('入库查询结果:', inResult.recordset)
  console.log('出库查询结果:', outResult.recordset)
  const dates = allDates
  const inQuantities = allDates.map((date) => inData[date] || 0)
  const outQuantities = allDates.map((date) => outData[date] || 0)
  console.log('最终返回数据:', { dates, inQuantities, outQuantities })
  return { dates, inQuantities, outQuantities }
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
  console.log('记录查询参数:', query) // 打印查询参数

  const pool = await getConnection()

  let whereClause = 'WHERE 1 = 1'
  const queryParams: Record<string, unknown> = {}

  if (query.startTime) {
    whereClause += ' AND r.time >= @startTime'
    queryParams.startTime = query.startTime
  }

  if (query.endTime) {
    whereClause += ' AND r.time <= @endTime' // 使用小于操作符
    queryParams.endTime = query.endTime
  }

  // 处理记录ID (已经是数字类型，无需转换)
  if (query.id !== undefined && query.id !== null) {
    whereClause += ' AND r.id = @id'
    queryParams.id = query.id
    console.log('添加记录ID条件:', queryParams.id)
  }

  // 处理耗材ID
  if (query.itemid) {
    whereClause += ' AND r.itemid = @itemid'
    queryParams.itemid = query.itemid
    console.log('添加耗材ID条件:', queryParams.itemid)
  }

  // 处理名称 (使用LIKE进行模糊查询)
  if (query.name) {
    whereClause += ' AND c.name LIKE @name'
    queryParams.name = `%${query.name}%`
    console.log('添加名称条件:', queryParams.name)
  }

  // 添加对operator参数的处理
  if (query.operator) {
    whereClause += ' AND r.operator = @operator'
    queryParams.operator = query.operator
    console.log('添加操作者条件:', query.operator) // 添加日志
  }

  // 添加对type参数的处理
  if (query.type) {
    whereClause += ' AND r.type = @type'
    queryParams.type = query.type
    console.log('添加类型条件:', query.type) // 添加日志
  }

  //添加对状态的查询
  if (query.status) {
    whereClause += ' AND r.status = @status'
    queryParams.status = query.status
    console.log('添加状态条件:', query.status)
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
  `

  const request = pool.request()
  // 分别设置不同类型的参数
  for (const key in queryParams) {
    if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
      if (key === 'startTime' || key === 'endTime') {
        // 日期时间参数
        request.input(key, mssql.DateTime, queryParams[key])
      } else if (key === 'id') {
        // 记录ID参数，明确设置为Int类型
        request.input(key, mssql.Int, queryParams[key])
      } else {
        // 其他参数使用mssql.NVarChar类型
        request.input(key, mssql.NVarChar, queryParams[key])
      }
    }
  }
  const result = await request.query(querySql)
  //console.log('记录查询结果:', result.recordset);
  return result.recordset.map((row) => ({ ...row }))
}

// src/main/db.ts
export async function getConnection(): Promise<mssql.ConnectionPool> {
  try {
    const dbConfig = await loadConfig()
    const config = convertToMssqlConfig(dbConfig)
    const pool = await mssql.connect(config)
    console.log('数据库连接成功 - 使用配置:', {
      server: dbConfig.server,
      port: dbConfig.port,
      database: dbConfig.database
    })
    return pool
  } catch (error) {
    console.error('数据库连接失败:', error)
    throw error
  }
}

// 测试指定配置的数据库连接
export async function testConnectionWithConfig(dbConfig: DatabaseConfig): Promise<{
  success: boolean
  message: string
}> {
  let pool: mssql.ConnectionPool | null = null
  try {
    const config = convertToMssqlConfig(dbConfig)
    console.log('测试数据库连接 - 使用配置:', {
      server: dbConfig.server,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username
    })
    // 尝试连接
    pool = new mssql.ConnectionPool(config)
    await pool.connect()
    // 尝试执行一个简单查询来验证连接
    const request = pool.request()
    await request.query('SELECT 1 AS test')
    await pool.close()
    return {
      success: true,
      message: '数据库连接测试成功'
    }
  } catch (error: unknown) {
    // 确保连接被关闭
    if (pool) {
      try {
        await pool.close()
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError)
      }
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('数据库连接测试失败:', errorMessage)
    return {
      success: false,
      message: `数据库连接失败: ${errorMessage}`
    }
  }
}
//增加了status字段
export async function getConsumables(): Promise<Array<Record<string, unknown>>> {
  const pool = await getConnection()
  const result = await pool
    .request()
    .query(
      'SELECT [id], [itemid], [name], [quantity], [unit], [company], [status], [registrant] FROM Consumables'
    )
  return result.recordset.map((row) => ({ ...row }))
}

//增加了status、registrant字段
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
  console.log('Adding consumable with data:', data) // 打印要添加的数据
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
  // 修改查询语句，加入耗材名称
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

// 更新耗材库存（通过 itemid）
// db.ts 中 updateConsumableQuantity 函数补充
export async  function updateConsumableQuantity(data: {
  itemid: string
  quantity: number
  status?: string
}): Promise<void> {
  const pool = await getConnection()
  const result = await pool
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
  
  // 检查更新是否影响行数，确保更新成功
  if (result.rowsAffected[0] === 0) {
    throw new Error(`未找到 itemid 为 ${data.itemid} 的耗材记录，更新失败`)
  }
  
  console.log('updateConsumableQuantity with data:', data)
}

//更新耗材信息函数
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
//删除耗材信息函数
export async function deleteConsumable(itemid: string): Promise<void> {
  const pool = await getConnection()
  await pool
    .request()
    .input('itemid', mssql.NVarChar, itemid)
    .query('DELETE FROM Consumables WHERE itemid = @itemid')
}

export async function deleteInRecord(recordId: number): Promise<void> {
  const pool = await getConnection()
  const transaction = new mssql.Transaction(pool)

  try {
    await transaction.begin()

    // 查询要删除的入库记录（使用Int类型参数）
    const recordResult = await transaction
      .request()
      .input('id', mssql.Int, recordId) // 指定Int类型
      .input('type', mssql.NVarChar, '入库') // 修改为 '入库'
      .query(`
        SELECT id, itemid, quantity
        FROM Records
        WHERE id = @id
          AND type = @type
      `)

    console.log('查询到的记录:', recordResult.recordset) // 添加日志输出

    const record = recordResult.recordset[0]
    if (record) {
      // 更新库存
      await transaction
        .request()
        .input('itemid', mssql.NVarChar, record.itemid)
        .input('quantity', mssql.Int, record.quantity).query(`
          UPDATE Consumables
          SET quantity = quantity - @quantity
          WHERE itemid = @itemid
        `)

      // 删除记录
      await transaction
        .request()
        .input('id', mssql.Int, record.id)
        .query(`DELETE FROM Records WHERE id = @id`)
    }

    await transaction.commit()
    console.log('删除操作成功') // 添加日志输出
  } catch (error) {
    await transaction.rollback()
    console.error('删除操作失败:', error) // 添加日志输出
    throw error
  }
}

export async function deleteOutRecord(recordId: number): Promise<void> {
  const pool = await getConnection()
  const transaction = new mssql.Transaction(pool)

  try {
    await transaction.begin()

    // 查询要删除的出库记录（使用Int类型参数）
    const recordResult = await transaction
      .request()
      .input('id', mssql.Int, recordId) // 指定Int类型
      .input('type', mssql.NVarChar, '出库').query(`
        SELECT id, itemid, quantity
        FROM Records
        WHERE id = @id
          AND type = @type
      `)

    const record = recordResult.recordset[0]
    if (record) {
      // 更新库存
      await transaction
        .request()
        .input('itemid', mssql.NVarChar, record.itemid)
        .input('quantity', mssql.Int, record.quantity).query(`
          UPDATE Consumables
          SET quantity = quantity + @quantity
          WHERE itemid = @itemid
        `)

      // 删除记录
      await transaction
        .request()
        .input('id', mssql.Int, record.id) // 指定Int类型
        .query(`DELETE FROM Records WHERE id = @id`)
    }

    await transaction.commit()
    console.log('删除操作成功') // 添加日志输出
  } catch (error) {
    await transaction.rollback()
    console.error('删除操作失败:', error) // 添加日志输出
    throw error
  }
}

// 获取总耗材数
export async function getTotalConsumables(): Promise<number> {
  const pool = await getConnection()
  const result = await pool.request().query('SELECT COUNT(*) as total FROM Consumables')
  return result.recordset[0].total
}

// 获取今日入库数
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

// 获取今日出库数
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

// 按时间段、耗材ID、类型、状态统计耗材信息
// 按时间段、耗材ID、类型、状态统计耗材信息
export async function getConsumableStatistics(query: {
  startTime: Date | null
  endTime: Date | null
  itemid: string
  type: string
}): Promise<{ totalQuantity: number }> {
  const pool = await getConnection()
  let querySql = 'SELECT SUM(quantity) as totalQuantity FROM Records WHERE 1 = 1'
  const request = pool.request()

  if (query.startTime) {
    querySql += ' AND time >= @startTime'
    request.input('startTime', mssql.DateTime, query.startTime)
  }

  if (query.endTime) {
    querySql += ' AND time <= @endTime'
    request.input('endTime', mssql.DateTime, query.endTime)
  }

  if (query.itemid) {
    querySql += ' AND itemid = @itemid'
    request.input('itemid', mssql.NVarChar, query.itemid)
  }

  // 处理 type 条件
  if (query.type && query.type !== '出入库') {
    querySql += ' AND type = @type'
    request.input('type', mssql.NVarChar, query.type)
  }

  if (query.type === '出入库') {
    const inQuerySql = `
      SELECT SUM(quantity) as totalQuantity
      FROM Records
      WHERE 1 = 1
      ${query.startTime ? ' AND time >= @startTime' : ''}
      ${query.endTime ? ' AND time <= @endTime' : ''}
      ${query.itemid ? ' AND itemid = @itemid' : ''}
      AND type = '入库'
    `
    const outQuerySql = `
      SELECT SUM(quantity) as totalQuantity
      FROM Records
      WHERE 1 = 1
      ${query.startTime ? ' AND time >= @startTime' : ''}
      ${query.endTime ? ' AND time <= @endTime' : ''}
      ${query.itemid ? ' AND itemid = @itemid' : ''}
      AND type = '出库'
    `

    const inResult = await pool
      .request()
      .input('startTime', mssql.DateTime, query.startTime)
      .input('endTime', mssql.DateTime, query.endTime)
      .input('itemid', mssql.NVarChar, query.itemid)
      .query(inQuerySql)

    const outResult = await pool
      .request()
      .input('startTime', mssql.DateTime, query.startTime)
      .input('endTime', mssql.DateTime, query.endTime)
      .input('itemid', mssql.NVarChar, query.itemid)
      .query(outQuerySql)

    const inTotal = inResult.recordset[0].totalQuantity || 0
    const outTotal = outResult.recordset[0].totalQuantity || 0

    return { totalQuantity: inTotal + outTotal }
  }

  const result = await request.query(querySql)
  return { totalQuantity: result.recordset[0].totalQuantity || 0 }
}

// 获取库存预警数（假设库存小于10为预警）
export async function getInventoryWarnings(): Promise<number> {
  const pool = await getConnection()
  const result = await pool
    .request()
    .query('SELECT COUNT(*) as total FROM Consumables WHERE quantity < 10')
  return result.recordset[0].total
}

// 根据耗材ID获取耗材信息
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

// 测试数据库连接和插入
if (require.main === module) {
  ;(async () => {
    let pool // 声明连接池变量
    try {
      console.log('测试数据库连接...')
      pool = await getConnection() // 获取连接池实例
      console.log('数据库连接成功！')

      // 测试插入一条耗材信息（如表存在）
      const testData = {
        itemid: 'test001',
        name: '测试耗材',
        quantity: 123,
        unit: '个',
        company: '测试公司'
      }
      await pool
        .request()
        .input('itemid', mssql.NVarChar, testData.itemid)
        .input('name', mssql.NVarChar, testData.name)
        .input('quantity', mssql.Int, testData.quantity)
        .input('unit', mssql.NVarChar, testData.unit)
        .input('company', mssql.NVarChar, testData.company)
        .query(
          'INSERT INTO Consumables (itemid, name, quantity, unit, company) VALUES (@itemid, @name, @quantity, @unit, @company)'
        )
      console.log('插入测试耗材信息成功！')

      // 测试插入一条出入库记录（如表存在）
      const testRecord = {
        itemid: 'test001',
        type: '入库',
        quantity: 10,
        remain: 133,
        time: new Date()
      }
      await pool
        .request()
        .input('itemid', mssql.NVarChar, testRecord.itemid)
        .input('type', mssql.NVarChar, testRecord.type)
        .input('quantity', mssql.Int, testRecord.quantity)
        .input('remain', mssql.Int, testRecord.remain)
        .input('time', mssql.DateTime, testRecord.time)
        .query(
          'INSERT INTO Records (itemid, type, quantity, remain, time) VALUES (@itemid, @type, @quantity, @remain, @time)'
        )
      console.log('插入测试出入库记录成功！')
    } catch (err) {
      console.error('数据库测试失败:', err)
    } finally {
      if (pool) {
        await pool.close() // 正确关闭连接池
      }
      console.log('数据库连接已关闭')
    }
  })()
}

// 插入日志记录的函数
export async function insertLog(logType: string, logModule: string, logMessage: string, logUser: string, logExt0?: string, logExt1?: string, logExt2?: string, logExt3?: string, logExt4?: string) {
  const pool = await getConnection();
  const now = new Date();
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
