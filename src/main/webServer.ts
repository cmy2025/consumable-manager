// src/main/webServer.ts
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import * as mssql from 'mssql'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import type { QueryParams, ConsumableQuery } from './types'
import {
  addConsumable,
  getRecords,
  addRecord,
  updateConsumableQuantity,
  updateConsumable,
  deleteConsumable,
  deleteInRecord,
  deleteOutRecord,
  getRecordsData,
  getConnection,
  getTotalConsumables,
  getTodayInRecords,
  getTodayOutRecords,
  getInventoryWarnings,
  testDatabaseConnection,
  testConnectionWithConfig,
  insertLog
} from './db-web'
import { predictStock } from './prediction/index';

// 引入SOAP相关依赖
const soap = require("soap");
const xml2js = require("xml2js");
const log4js = require("log4js");

const app = express()

// SOAP服务配置
const soapUrl = "http://10.1.24.128:7072/services/ServiceForALL?wsdl";

//const soapUrl ="http://localhost:3000/calculator?wsdl";
// log4js配置
log4js.configure({
  appenders: {
    console: { type: 'console' }, // 控制台输出
    soap: {
      type: "dateFile",
      filename: "./logs/soap",
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
    },
    api: { // API请求日志
      type: "dateFile",
      filename: "./logs/api",
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
    },
    error: { // 错误日志
      type: "dateFile",
      filename: "./logs/error",
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
    }
  },
  categories: { 
    default: { appenders: ["console", "soap"], level: "trace" },
    api: { appenders: ["console", "api"], level: "info" },
    error: { appenders: ["console", "error"], level: "error" }
  },
});

// 创建专用日志实例
const apiLogger = log4js.getLogger("api");
const errorLogger = log4js.getLogger("error");


const soapLogger = log4js.getLogger("soap");

// 设置编码和中间件
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 设置响应头解决中文乱码
app.use('/api/*', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  const start = Date.now();
  // 记录请求信息
  apiLogger.info(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  apiLogger.debug(`请求参数: ${JSON.stringify(req.query)}`);
  
  // 记录响应信息
  res.on('finish', () => {
    const duration = Date.now() - start;
    apiLogger.info(`[${new Date().toISOString()}] 响应状态: ${res.statusCode}, 耗时: ${duration}ms`);
  });
  next();
});
const port = 5173 //端口

// API 路由定义，确保在静态文件中间件之前

// 使用 cors 中间件
app.use(cors())
app.use(bodyParser.json())

// 数据库连接状态检查
app.get('/api/database/status', async (_req, res) => {
  try {
    const isConnected = await testDatabaseConnection()
    res.json({
      connected: isConnected,
      message: isConnected ? '数据库连接正常' : '数据库连接失败',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('检查数据库连接状态失败:', error)
    res.status(500).json({
      connected: false,
      message: '无法检查数据库连接状态',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    })
  }
});

// 1. 首先定义必要的类型（可以放在文件顶部）
interface SoapClient {
  busProcess: (input: any, callback: (err: Error | null, result: any) => void) => void;
  // 根据实际使用的方法添加其他类型定义
}

async function getOne(client:SoapClient, input:any): Promise<any> {
  return new Promise((resolve, reject) => {
    // console.log(input);
    client.busProcess(input, function(err, result) {
      // console.log(result);
      resolve(result);

    });
  });
}
async function xml2json(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, function (err: Error | null, json: any) {
      if (err) {
        reject(err);
      } else {
        resolve(json);
      }
    });
  });
}
// 新增确认操作API
app.post('/api/soap/confirm', async function (req, res) {
  try {
    const { xmlData } = req.body;
    if (!xmlData) {
      return res.status(400).json({ error: "缺少XML数据" });
    }

    soap.createClient(soapUrl, {}, async function (err: Error | null, client:SoapClient) {
      if (err) {
        soapLogger.error("SOAP客户端创建失败:", err);
        return res.status(500).json({ error: "SOAP服务连接失败" });
      }

      const args = { "data": xmlData };
      soapLogger.info("确认提交XML:", xmlData);
      
      try {
        const result = await getOne(client, args);
        const source = result.data;
        soapLogger.info("确认返回结果:", source);
        
        // 解析确认响应（根据实际响应格式调整）
        const xmlResult = await xml2json(source);
        res.json({ 
          success: true, 
          result: xmlResult 
        });
      } catch (error) {
        soapLogger.error("SOAP确认错误:", error);
        res.status(500).json({ error: "SOAP确认失败" });
      }
    });
  } catch (error) {
    console.error("确认数据处理错误:", error);
    res.status(500).json({ error: "服务器处理失败" });
  }
});
// 迁移的SOAP相关API
app.get('/api/soap/query-data', async function (req, res) {
  
  try {
    const json = JSON.parse(req.query.jsonstr as string);
    const OrderSn = json["OrderSn"];
    
    
    soap.createClient(soapUrl, {}, async function (err: Error | null, client:SoapClient) {
      if (err) {
        soapLogger.error("SOAP客户端创建失败:", err);
        return res.status(500).json({ error: "SOAP服务连接失败" });
      }
      
      let jsonData: any[] = [];
      json["TransNo"] = "HTIP.CM.LISTTOBECONF.0002";
      const xmlstring = "<Request><Head><Source>CS</Source><TransNo>" + json["TransNo"] + "</TransNo></Head><Body><HospitalCode>" + json["HospitalCode"] + 
      "</HospitalCode><PID>" + json["PID"] + "</PID><AffirmId>" + json["AffirmId"] + "</AffirmId><OperTime>" + json["OperTime"] + "</OperTime><ExecDept>" + 
      json["ExecDept"] + "</ExecDept><IsSearchMore>" + json["IsSearchMore"] + "</IsSearchMore><OperCode>" + json["OperCode"] + "</OperCode></Body></Request>";

      const args = { "data": xmlstring };
      // console.log(xmlstring);
      soapLogger.info("查询提交:" + xmlstring);
      
      try {
        const result = await getOne(client, args);
        const source = result.data;
        soapLogger.info("查询返回:" + source);
        
        const xmlData = await xml2json(source);
        if (xmlData && xmlData["soapenv:Envelope"] && xmlData["soapenv:Envelope"]["soapenv:Body"][0]["Response"][0]["Body"][0]["Records"][0]["Record"]) {
          const data = xmlData["soapenv:Envelope"]["soapenv:Body"][0]["Response"][0]["Body"][0]["Records"][0]["Record"];
          
          if (data) {
            for (let i = 0; i < data.length; i++) {
              // console.log(data[i]);
              if (data[i]["OrderSn"][0] === OrderSn) {
                jsonData.push({
                  "PatientId": data[i]["PatientId"][0],
                  "PatientName": data[i]["PatientName"][0],
                  "SerialNo": data[i]["SerialNo"][0],
                  "RealNo": data[i]["RealNo"][0],
                  "ChargeItemCode": data[i]["ChargeItemCode"][0],
                  "UnitPrice": data[i]["UnitPrice"][0],
                  "Quantity": data[i]["Quantity"][0],
                  "ChargeDate": data[i]["ChargeDate"][0],
                  "PayMark": data[i]["PayMark"][0],
                  "AffirmId": data[i]["AffirmId"][0],
                  "ConfirmTime": data[i]["ConfirmTime"][0],
                  "ConfirmFlag": data[i]["ConfirmFlag"][0],
                  "ExecDept": data[i]["ExecDept"][0],
                  // "CashierId": data[i]["CashierId"][0],
                  // "FeeType": data[i]["FeeType"][0],
                  "RegisterSn": data[i]["RegisterSn"][0],
                  "IOEPID": data[i]["IOEPID"][0],
                  "RecipeNo": data[i]["RecipeNo"][0],
                  "OrderSn": data[i]["OrderSn"][0],
                  "OrderCode": data[i]["OrderCode"][0],
                  "DataSource": data[i]["DataSource"][0],
                  "WarnDept": data[i]["WarnDept"][0],
                  "ChargeItemName" : data[i]["ChargeItemName"][0],
                  "submit": {
                    "PID": data[i]["PID"][0],
                    "PatientId": data[i]["PatientId"][0],
                    "OrderSn": data[i]["OrderSn"][0],
                    "AffirmId": data[i]["AffirmId"][0],
                    "ConfirmTime": data[i]["ConfirmTime"][0],
                    "ConfirmFlag": data[i]["ConfirmFlag"][0],
                    "OrderCode": data[i]["OrderCode"][0],
                  }
                });
              }
            }
          }
        }
        res.json(jsonData);
      } catch (error) {
        soapLogger.error("SOAP查询错误:", error);
        res.status(500).json({ error: "SOAP查询失败" });
      }
    });
  } catch (error) {
    console.error("查询数据错误:", error);
    res.status(500).json({ error: "服务器处理失败" });
  }
});

// 修改SOAP查询相关API，以/api/soap/query-All为例
app.get('/api/soap/query-All', async function (req, res) {
  try {
    const json = JSON.parse(req.query.jsonstr as string);
    // 从请求参数中获取OrderSn（如果需要）
    const OrderSn = json["OrderSn"];
    
    soap.createClient(soapUrl, {}, async function (err: Error | null, client:SoapClient) {
      if (err) {
        soapLogger.error("SOAP客户端创建失败:", err);
        return res.status(500).json({ error: "SOAP服务连接失败" });
      }
      
      let jsonData: any[] = [];
      json["TransNo"] = "HTIP.CM.YJSFZTCX.0002";
      // 构造XML请求字符串
      const xmlstring = "<Request><Head><Source>CS</Source><TransNo>" + json["TransNo"] + "</TransNo></Head><Body><HospitalCode>" + json["HospitalCode"] + 
      "</HospitalCode><PID>" + json["PID"] + "</PID><AffirmId>" + json["AffirmId"] + "</AffirmId><OperTime>" + json["OperTime"] + "</OperTime><ExecDept>" + 
      json["ExecDept"] + "</ExecDept><IsSearchMore>" + json["IsSearchMore"] + "</IsSearchMore><OperCode>" + json["OperCode"] + "</OperCode></Body></Request>";

      const args = { "data": xmlstring };
      soapLogger.info("查询提交:" + xmlstring);
      console.log(xmlstring); // 增加控制台输出
      
      try {
        console.log("开始查询"); 
        const result = await getOne(client, args);
        const source = result.data;
        soapLogger.info("查询返回:" + source);
        
        const xmlData = await xml2json(source);
        // 检查XML解析结果是否存在
        if (xmlData !== undefined) {
          const data = xmlData["soapenv:Envelope"]["soapenv:Body"][0]["Response"][0]["Body"][0]["Records"][0]["Record"];
          
          if (data !== undefined) {
            console.log("记录数量:", data.length); // 输出记录数量
            // 遍历所有记录
            for (let i = 0; i < data.length; i++) {
              // 如果需要按OrderSn过滤，取消下面注释
              // if (OrderSn && data[i]["OrderSn"][0] !== OrderSn) {
              //   continue;
              // }
              
              jsonData.push({
                "PatientId": data[i]["PatientId"]?.[0] || '',
                "PatientName": data[i]["PatientName"]?.[0] || '',
                "SerialNo": data[i]["SerialNo"]?.[0] || '',
                "RealNo": data[i]["RealNo"]?.[0] || '',
                "ChargeItemCode": data[i]["ChargeItemCode"]?.[0] || '',
                "UnitPrice": data[i]["UnitPrice"]?.[0] || '',
                "Quantity": data[i]["Quantity"]?.[0] || '',
                "ChargeDate": data[i]["ChargeDate"]?.[0] || '',
                "PayMark": data[i]["PayMark"]?.[0] || '',
                "AffirmId": data[i]["AffirmId"]?.[0] || '',
                "ConfirmTime": data[i]["ConfirmTime"]?.[0] || '',
                "ConfirmFlag": data[i]["ConfirmFlag"]?.[0] || '',
                "ExecDept": data[i]["ExecDept"]?.[0] || '',
                "RegisterSn": data[i]["RegisterSn"]?.[0] || '',
                "IOEPID": data[i]["IOEPID"]?.[0] || '',
                "RecipeNo": data[i]["RecipeNo"]?.[0] || '',
                "OrderSn": data[i]["OrderSn"]?.[0] || '',
                "OrderCode": data[i]["OrderCode"]?.[0] || '',
                "DataSource": data[i]["DataSource"]?.[0] || '',
                "WarnDept": data[i]["WarnDept"]?.[0] || '',
                "ChargeItemName": data[i]["ChargeItemName"]?.[0] || '',
                "AffirmName": data[i]["AffirmName"]?.[0] || '',
                "PID": data[i]["PID"]?.[0] || '', // 补充PID字段
                "submit": {
                  "PID": data[i]["PID"]?.[0] || '',
                  "PatientId": data[i]["PatientId"]?.[0] || '',
                  "OrderSn": data[i]["OrderSn"]?.[0] || '',
                  "AffirmId": data[i]["AffirmId"]?.[0] || '',
                  "ConfirmTime": data[i]["ConfirmTime"]?.[0] || '',
                  "ConfirmFlag": data[i]["ConfirmFlag"]?.[0] || '',
                  "OrderCode": data[i]["OrderCode"]?.[0] || '',
                }
              });
            }
          }
        }
        // 使用end方法返回JSON字符串（与参考函数保持一致）
        //res.json(JSON.stringify(jsonData));
        res.json(jsonData);
      } catch (error) {
        soapLogger.error("SOAP查询错误:", error);
        res.status(500).json({ error: "SOAP查询失败" });
      }
    });
  } catch (error) {
    console.error("查询数据错误:", error);
    res.status(500).json({ error: "服务器处理失败" });
  }
});

// 获取耗材
app.get('/api/consumables', async (req, res) => {
  console.log('收到获取耗材信息的请求') // 添加日志
  try {
    const pool = await getConnection()
    let query = 'SELECT * FROM Consumables'
    const queryParams: QueryParams = {}
    const conditions: string[] = []

    const queryData = req.query as ConsumableQuery

    // 处理查询参数
    if (queryData.itemid) {
      conditions.push('itemid = @itemid')
      queryParams.itemid = queryData.itemid // 严格查询
    }
    if (queryData.name) {
      conditions.push('name LIKE @name')
      queryParams.name = `%${queryData.name}%` // 模糊查询
    }
    if (queryData.company) {
      conditions.push('company LIKE @company')
      queryParams.company = `%${queryData.company}%` // 模糊查询
    }
    if (queryData.status) {
      conditions.push('status = @status')
      queryParams.status = queryData.status // 严格查询
    }
    if (queryData.registrant) {
      conditions.push('registrant LIKE @registrant')
      queryParams.registrant = `%${queryData.registrant}%` // 模糊查询
    }
    if (queryData.quantity) {
      conditions.push('quantity= @quantity')
      queryParams.quantity = parseInt(queryData.quantity, 10) // 转换为数字
    }

    // 可以根据需要添加更多的查询参数处理逻辑

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    const request = pool.request()
    for (const key in queryParams) {
      request.input(key, mssql.NVarChar, queryParams[key])
    }

    const result = await request.query(query)
    //console.log('查询到的耗材信息:', result.recordset); // 添加日志
    res.json(result.recordset)
  } catch (error) {
    console.error('获取耗材信息失败:', error)
    res.status(500).json({ error: '获取耗材信息失败' })
  }
})
// 添加耗材
app.post('/api/consumables', async (req, res) => {
  console.log('Received data:', req.body) // 打印接收到的数据
  try {
    console.log('Starting database operation...')
    await addConsumable(req.body)
    console.log('Database operation completed successfully.')
    res.status(201).json({ message: '添加成功' })
  } catch (error) {
    console.error('Database operation failed:', error) // 打印详细的错误信息
    res.status(500).json({ error: '添加失败，请重试' })
  }
})

// 获取记录
app.get('/api/records', async (req, res) => {
  try {
    const query = req.query
    const allRecords = await getRecords()
    if (query) {
      const filteredRecords = allRecords.filter((record) => {
        for (const key in query) {
          if (key === 'time') {
            if (typeof record[key] === 'string' && typeof query[key] === 'string') {
              const recordTime = new Date(record[key] as string)
              const queryTime = new Date(query[key] as string)
              if (recordTime !== queryTime) {
                return false
              }
            } else {
              return false
            }
          } else if (record[key] !== query[key]) {
            return false
          }
        }
        return true
      })
      res.json(filteredRecords)
    } else {
      res.json(allRecords)
    }
  } catch (error: unknown) {
    console.error('获取记录失败:', error)
    res.status(500).json({ error: '获取记录失败' })
  }
})
app.get('/api/records/data', async (req, res) => {
  try {
    const query = req.query as {
      startTime?: string
      endTime?: string
      id?: string
      itemid?: string
      name?: string
      type?: string
      status?: string
      operator?: string
    }
    const { startTime, endTime, id, itemid, name, type, status, operator } = query
    const parsedQuery = {
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      id: id ? parseInt(id, 10) : undefined,
      itemid,
      name,
      type,
      status,
      operator
    }
    const result = await getRecordsData(parsedQuery)
    res.json(result)
  } catch (error) {
    console.error('获取记录数据失败:', error)
    res.status(500).json({ error: '获取记录数据失败' })
  }
})
// 更新耗材信息
app.put('/api/consumables/:itemid', async (req, res) => {
  try {
    await updateConsumable(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('更新耗材信息失败:', error)
    res.status(500).json({ success: false, error: '更新失败，请重试' })
  }
})
// 添加记录并更新库存
app.post('/api/records', async (req, res) => {
  console.log('收到添加记录请求:', req.body) // 添加日志
  try {
    const result = await addRecord(req.body)
    console.log('添加记录成功:', result) // 添加日志
    res.status(200).json(req.body)
  } catch (error) {
    console.error('服务器内部错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

app.put('/api/consumables/:itemid/quantity', async (req, res) => {
  try {
    // 1. 从URL参数提取itemid并做基础处理
    const itemid = req.params.itemid?.trim();
    if (!itemid) {
      throw new Error('URL参数中itemid不能为空');
    }

    // 2. 从请求体中精确提取需要的字段，过滤无关参数
    const { quantity, status } = req.body;

    // 3. 验证核心参数合法性
    if (quantity === undefined || quantity === null) {
      throw new Error('请求体中必须包含quantity字段');
    }
    // 将quantity转换为整数（如果是字符串数字也能正确处理）
    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity)) {
      throw new Error('quantity必须是有效的数字');
    }

    // 4. 处理可选参数status（去除多余空格，设置默认值）
    const processedStatus = status?.toString().trim() || '';

    // 5. 构建完整且干净的更新数据对象
    const updateData = {
      itemid: itemid,
      quantity: parsedQuantity,
      status: processedStatus
    };

    // 6. 打印完整的更新数据（包含所有必要参数）
    console.log('收到更新耗材数量请求:', updateData);

    // 7. 调用更新函数
    await updateConsumableQuantity(updateData);

    console.log('更新耗材数量成功');
    res.json({ success: true, message: '更新耗材数量成功' });
  } catch (error) {
    console.error('更新耗材数量失败:', error);
    
    // 新增：验证error类型
    let errorMessage = '未知错误';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // 使用处理后的错误信息
    const statusCode = errorMessage.includes('参数') ? 400 : 500;
    res.status(statusCode).json({ success: false, error: errorMessage });
  }
});
// 更新耗材信息
app.put('/api/consumables', async (req, res) => {
  try {
    await updateConsumable(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('更新耗材信息失败:', error)
    res.status(500).json({ success: false, error: '更新失败，请重试' })
  }
})

// 删除耗材
app.delete('/api/consumables/:itemid', async (req, res) => {
  try {
    const itemid = req.params.itemid
    await deleteConsumable(itemid)
    res.json({ success: true })
  } catch (error) {
    console.error('删除耗材信息失败:', error)
    res.status(500).json({ success: false, error: '删除失败，请重试' })
  }
})

// 删除入库记录
app.delete('/api/records/in/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await deleteInRecord(id)
    res.json({ success: true })
  } catch (error) {
    console.error('删除入库记录失败:', error)
    res.status(500).json({ success: false, error: '删除失败，请重试' })
  }
})

// 删除出库记录
app.delete('/api/records/out/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await deleteOutRecord(id)
    res.json({ success: true })
  } catch (error) {
    console.error('删除出库记录失败:', error)
    res.status(500).json({ success: false, error: '删除失败，请重试' })
  }
})

// 获取总耗材数
// API 路由
app.get('/api/stats/total-consumables', async (_req, res) => {
  try {
    const result = await getTotalConsumables()
    res.json(result)
  } catch (error: unknown) {
    console.error('获取总耗材数失败:', error) // 查看这里的错误日志
    res.status(500).json({ error: '获取总耗材数失败' })
  }
})

// 获取今日入库记录数
app.get('/api/stats/today-in-records', async (_req, res) => {
  try {
    const result = await getTodayInRecords()
    res.json(result)
  } catch (error: unknown) {
    console.error('获取今日入库记录失败:', error)
    res.status(500).json({ error: '获取今日入库记录失败' })
  }
})

// 获取今日出库记录数
app.get('/api/stats/today-out-records', async (_req, res) => {
  try {
    const result = await getTodayOutRecords()
    res.json(result)
  } catch (error: unknown) {
    console.error('获取今日出库记录失败:', error)
    res.status(500).json({ error: '获取今日出库记录失败' })
  }
})

// 获取库存预警数
app.get('/api/stats/inventory-warnings', async (_req, res) => {
  try {
    const inventoryWarnings = await getInventoryWarnings()
    res.json(inventoryWarnings)
  } catch (error: unknown) {
    console.error('获取库存预警数失败:', error)
    res.status(500).json({ error: '获取库存预警数失败' })
  }
})

// 获取耗材统计数据
app.get('/api/statistics', async (_req, res) => {
  try {
    const query = _req.query as {
      startTime?: string
      endTime?: string
      name?: string
      operator?: string
      itemid?: string
      type?: string
      status?: string
    }
    const { startTime, endTime, name, operator, itemid, type, status } = query
    const sql = `
      SELECT SUM(r.quantity) as totalQuantity
      FROM Records r
      JOIN Consumables c ON r.itemid = c.itemid
      WHERE 1 = 1
      ${startTime ? ` AND r.time >= @startTime` : ''}
      ${endTime ? ` AND r.time < @endTime` : ''}
      ${name ? ` AND c.name LIKE @name` : ''}
      ${operator ? ` AND r.operator = @operator` : ''}
      ${itemid ? ` AND r.itemid = @itemid` : ''}
      ${type ? ` AND r.type = @type` : ''}
      ${status ? ` AND r.status = @status` : ''}
    `
    const pool = await getConnection()
    const request = pool.request()
    if (startTime) request.input('startTime', mssql.DateTime, startTime)
    if (endTime) request.input('endTime', mssql.DateTime, endTime)
    if (name) request.input('name', mssql.NVarChar, `%${name}%`)
    if (operator) request.input('operator', mssql.NVarChar, operator)
    if (itemid) request.input('itemid', mssql.NVarChar, itemid)
    if (type) request.input('type', mssql.NVarChar, type)
    if (status) request.input('status', mssql.NVarChar, status)
    const result = await request.query(sql)
    res.json({
      totalQuantity: result.recordset[0].totalQuantity
    })
  } catch (error) {
    console.error('获取耗材统计数据失败:', error)
    res.status(500).json({ error: '获取耗材统计数据失败' })
  }
})

// 获取折线图数据
app.get('/api/statistics/linechart', async (req, res) => {
  try {
    const query = req.query as {
      startTime?: string
      endTime?: string
      itemid?: string
      name?: string
      operator?: string
      type?: string
      status?: string
    }
    const pool = await getConnection()
    let whereClause = 'WHERE 1 = 1'
    const params: QueryParams = {}

    if (query.startTime) {
      whereClause += ' AND r.time >= @startTime'
      params.startTime = query.startTime
    }
    if (query.endTime) {
      whereClause += ' AND r.time < @endTime'
      params.endTime = query.endTime
    }
    if (query.itemid) {
      whereClause += ' AND r.itemid = @itemid'
      params.itemid = query.itemid
    }
    if (query.name) {
      whereClause += ' AND c.name LIKE @name'
      params.name = `%${query.name}%`
    }
    if (query.operator) {
      whereClause += ' AND r.operator = @operator'
      params.operator = query.operator
    }
    if (query.type) {
      whereClause += ' AND r.type = @type'
      params.type = query.type
    }
    if (query.status) {
      whereClause += ' AND r.status = @status'
      params.status = query.status
    }

    const sql = `
      SELECT
        CONVERT(VARCHAR(10), r.time, 23) AS date,
        SUM(CASE WHEN r.type = '入库' THEN r.quantity ELSE 0 END) AS inQuantity,
        SUM(CASE WHEN r.type = '出库' THEN r.quantity ELSE 0 END) AS outQuantity
      FROM Records r
      JOIN Consumables c ON r.itemid = c.itemid
      ${whereClause}
      GROUP BY CONVERT(VARCHAR(10), r.time, 23)
      ORDER BY date
    `

    const request = pool.request()
    Object.keys(params).forEach((key) => {
      request.input(key, params[key])
    })

    const result = await request.query(sql)
    res.json({
      dates: result.recordset.map((row) => row.date),
      inQuantities: result.recordset.map((row) => row.inQuantity),
      outQuantities: result.recordset.map((row) => row.outQuantity)
    })
  } catch (error) {
    console.error('获取折线图数据失败:', error)
    res.status(500).json({ error: '获取折线图数据失败' })
  }
})

app.post('/api/log',async(req,res)=>{
  console.log('收到添加日志的请求:', req.body) // 添加日志
  try {
    const { logType, logModule, logMessage, logUser, logExt0, logExt1, logExt2, logExt3, logExt4 } = req.body;
     // 检查必要参数是否存在
     if (!logType || !logModule || !logMessage || !logUser) {
      return res.status(400).json({ error: '缺少必要的日志参数' });
    }
    const result = await insertLog(logType, logModule, logMessage, logUser, logExt0, logExt1, logExt2, logExt3, logExt4);
    console.log('添加日志成功:', result) // 添加日志
    res.status(200).json(req.body)
  } catch (error) {
    console.error('服务器内部错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})
// 测试数据库连接接口
app.post('/api/test-connection', async (req, res) => {
  try {
    const dbConfig = req.body
    console.log('收到测试连接请求:', dbConfig)
    const result = await testConnectionWithConfig(dbConfig)
    res.json(result)
  } catch (error) {
    console.error('测试数据库连接失败:', error)
    res.status(500).json({
      success: false,
      message: '测试连接时发生错误'
    })
  }
})

// 预测接口
app.post('/api/predict/stock', async (req, res) => {
  try {
    const { modelType, consumableId, historyData, predictDays } = req.body;
    const predictions = await predictStock({
      modelType: modelType as 'linear' | 'lstm',
      consumableId,
      historyData,
      predictDays: Number(predictDays)
    });
    // 确保返回纯数字数组
    res.json({
      success: true,
      data: predictions.map(num => Number(num))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '预测失败'
    });
  }
})

// 配置管理接口
// 获取配置
app.get('/api/config', (_req, res) => {
  try {
    const configPath = path.join(__dirname, 'web-settings.json')

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configData)
      res.json(config)
    } else {
      // 返回默认配置
      const defaultConfig = {
        database: {
          server: 'localhost',
          database: 'consumable_db',
          username: 'sa',
          password: '',
          port: 1433
        },
        ui: {
          warningColor10: 'rgba(255, 0, 0, 0.1)',
          warningColor100: 'rgba(255, 255, 0, 0.05)'
        }
      }
      res.json(defaultConfig)
    }
  } catch (error) {
    console.error('读取配置文件失败:', error)
    res.status(500).json({ error: '读取配置文件失败' })
  }
})

// 保存配置
app.post('/api/config', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'web-settings.json')

    const config = req.body
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')

    console.log('配置已保存到:', configPath)
    res.json({ success: true, message: '配置保存成功' })
  } catch (error) {
    console.error('保存配置文件失败:', error)
    res.status(500).json({ success: false, error: '保存配置文件失败' })
  }
})

// 健康检查接口
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  })
})

// 静态文件中间件，放在 API 路由之后
// 根据环境提供不同的静态文件路径
const staticPath =
  process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'public') // 生产环境：使用部署目录下的public
    : join(__dirname, '../public') // 开发环境：使用public目录

app.use(express.static(staticPath))
console.log('静态文件路径:', staticPath)

// 为SPA应用添加fallback路由，确保前端路由正常工作
app.get('*', (req, res) => {
  // 如果是API请求，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  // 否则返回index.html，让前端路由处理
  return res.sendFile(join(staticPath, 'index.html'))
})

export const startWebServer = async (): Promise<void> => {
  console.log('正在启动 Web 服务器...')

  // 测试数据库连接（但不强制要求连接成功）
  const isDatabaseConnected = await testDatabaseConnection()
  if (!isDatabaseConnected) {
    console.warn('⚠️  数据库连接失败，但 Web 服务器仍会启动')
    console.warn('   请检查数据库配置并稍后重试连接')
    console.warn('   在数据库连接恢复前，API 功能将不可用')
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Web服务器启动成功！`)
    console.log(`监听端口: ${port}`)
    console.log(`本地访问: http://localhost:${port}`)
    console.log(`局域网访问: http://YOUR_SERVER_IP:${port}`)
    if (isDatabaseConnected) {
      console.log('✅ 数据库连接正常，服务器已就绪')
    } else {
      console.log('⚠️  数据库连接失败，请检查配置文件和数据库状态')
    }
  })
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startWebServer().catch((error) => {
    console.error('启动 Web 服务器失败:', error)
    process.exit(1)
  })
}