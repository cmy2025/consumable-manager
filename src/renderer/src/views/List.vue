<template>
<div class="home-view">
  <div class="list-container bg-white min-h-screen p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800">查询列表</h2>
      <p class="text-gray-500 mt-1">请输入查询条件，系统将返回匹配的记录结果</p>
    </div>
    
    <!-- 查询表单卡片 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
      <form @submit.prevent="handleSearch">
        <!-- 表单网格布局 -->
        <!--<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">患者ID:</label>
            <input type="text" v-model="formData.PID" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">患者姓名:</label>
            <input type="text" v-model="formData.PatientName" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">收费项目名称:</label>
            <input type="text" v-model="formData.ChargeItemName" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">单价:</label>
            <input type="text" v-model="formData.UnitPrice" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">数量:</label>
            <input type="text" v-model="formData.Quantity" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">执行科室:</label>
            <input type="text" v-model="formData.ExecDept" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">确认时间:</label>
            <input type="datetime-local" v-model="formData.ConfirmTime" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">确认人:</label>
            <input type="text" v-model="formData.AffirmName" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">收费标识:</label>
            <input type="text" v-model="formData.PayMark" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>-->
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">收费流水号:</label>
            <input type="text" v-model="formData.OrderSn" class="form-control large-input w-full px-5 py-5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <!--<div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">收费时间:</label>
            <input type="datetime-local" v-model="formData.ChargeDate" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-1">医嘱号:</label>
            <input type="text" v-model="formData.RecipeNo" class="form-control w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>-->
        
        <!-- 按钮区域 -->
        <div class="mt-6 flex justify-end">
          <button type="submit" class="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
            查询
          </button>
          <router-link :to="allUrl" class="btn btn-secondary ml-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
            查看全部
          </router-link>
        </div>
      </form>
    </div>
    
    <!-- 结果表格卡片 - 使用与ListAll一致的表格样式 -->
    <div class="result-table bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th v-for="col in columns" :key="col.field" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ col.title }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in results" :key="item.OrderSn" class="hover:bg-gray-50 transition duration-150 ease-in-out">
              <td v-for="col in columns" :key="col.field" class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <template v-if="col.field !== 'submit'">
                  {{ item[col.field] || '-' }}
                </template>
                <template v-else>
                  <button class="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm transition duration-150 ease-in-out" @click="handleConfirm(item)">
                    确认
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 无数据状态提示（与ListAll保持一致） -->
      <div v-if="results.length === 0" class="text-center py-10 text-gray-500">
        暂无数据记录
      </div>
    </div>
  </div>
</div>
</template>

<script>
import axios from 'axios';
import { ElMessage } from 'element-plus'
export default {
  name: 'ListView',
  data() {
    return {
      formData: {
        HospitalCode: 'pj',
        PID: '',
        AffirmId: '',
        OperTime: '',
        ExecDept: '',
        IsSearchMore: '0',
        OperCode: ''
      },
      results: [],
      allUrl: '',
      columns: [
        { field: 'PID', title: '患者ID' },
        { field: 'PatientName', title: '患者姓名' },
        { field: 'ChargeItemName', title: '收费项目名称' },
        { field: 'UnitPrice', title: '单价' },
        { field: 'Quantity', title: '数量' },
        { field: 'ExecDept', title: '执行科室' },
        { field: 'ConfirmTime', title: '确认时间' },
        { field: 'AffirmName', title: '确认人' },
        { field: 'PayMark', title: '收费标识' },
        { field: 'OrderSn', title: '收费流水号' },
        { field: 'ChargeDate', title: '收费时间' },
        { field: 'RecipeNo', title: '医嘱号' },
        { field: 'submit', title: '#', align: 'center' }
      ]
    };
  },
  created() {
    // 从URL参数初始化表单数据
    const query = this.$route.query;
    Object.keys(query).forEach(key => {
      if (this.formData.hasOwnProperty(key)) {
        // 对时间字段进行格式转换处理
        if ((key === 'ConfirmTime' || key === 'ChargeDate') && query[key]) {
          const formattedTime = this.convertToStandardTime(query[key]);
          this.formData[key] = formattedTime || query[key];
        } else {
          this.formData[key] = query[key];
        }
      }
    });
    this.updateAllUrl();
  },
  methods: {
    /**
     * 时间格式验证正则
     * 匹配 yyyy-MM-dd HH:mm:ss 格式
     */
    isValidTimeFormat(timeStr) {
      const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      return regex.test(timeStr);
    },

    /**
     * 将任意时间格式转换为标准格式 yyyy-MM-dd HH:mm:ss
     * @param {string|Date} time - 输入时间
     * @returns {string|null} 格式化后的时间，无效时间返回null
     */
    convertToStandardTime(time) {
      if (!time) return null;
      
      let date;
      if (time instanceof Date) {
        date = time;
      } else if (typeof time === 'string') {
        // 处理常见的时间格式转换
        time = time.replace('T', ' ').replace(/-/g, '/');
        date = new Date(time);
      } else {
        return null;
      }
      
      // 验证是否为有效日期
      if (isNaN(date.getTime())) {
        return null;
      }
      
      // 格式化日期部分
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // 格式化时间部分
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    updateAllUrl() {
      const params = new URLSearchParams();
      Object.keys(this.formData).forEach(key => {
        if (this.formData[key]) {
          // 对时间参数进行标准化处理后再拼接URL
          if (key === 'ConfirmTime' || key === 'ChargeDate') {
            const standardTime = this.convertToStandardTime(this.formData[key]);
            if (standardTime) {
              params.append(key, standardTime);
            }
          } else {
            params.append(key, this.formData[key]);
          }
        }
      });
      this.allUrl = `/listAll?${params.toString()}`;
    },

    async handleSearch() {
      try {
        this.updateAllUrl();
        
        // 复制表单数据用于查询
        const queryData = JSON.parse(JSON.stringify(this.formData));
        
        // 处理时间参数格式
        ['ConfirmTime', 'ChargeDate'].forEach(timeKey => {
          if (queryData[timeKey]) {
            if (!this.isValidTimeFormat(queryData[timeKey])) {
              const convertedTime = this.convertToStandardTime(queryData[timeKey]);
              if (!convertedTime) {
                alert(`请使用yyyy-MM-dd HH:mm:ss格式的${this.getTimeFieldName(timeKey)}`);
                return;
              }
              queryData[timeKey] = convertedTime;
            }
          }
        });

        const jsonstr = JSON.stringify(queryData);
        console.log('开始查询')
        const response = await axios.get(`/api/soap/query-data?jsonstr=${encodeURIComponent(jsonstr)}`);
        this.results = response.data;
      } catch (error) {
        console.error('查询失败:', error);
        alert('查询失败，请重试');
      }
    },

    /**
     * 获取时间字段的中文名称用于提示
     */
    getTimeFieldName(field) {
      const fieldNames = {
        'ConfirmTime': '确认时间',
        'ChargeDate': '收费时间'
      };
      return fieldNames[field] || field;
    },

    async handleConfirm(item) {
      try {
        // 构建SOAP请求XML（确保格式正确）
        const xmlStr = this.buildConfirmXml(item);
        
        // 调用SOAP服务
        const response = await axios.post('/api/soap/confirm', { xmlData: xmlStr });
        if (response.data.success) {
          alert('确认成功');
          this.handleSearch(); // 刷新当前列表
        } else {
          alert('确认失败: ' + response.data.error);
        }
      } catch (error) {
        console.error('确认操作失败:', error);
        alert('确认失败，请重试');
      }
    },

    // 构建确认操作的XML（确保参数存在性检查）
    buildConfirmXml(item) {
      // 为防止XML格式错误，对所有字段做空值处理和特殊字符转义
      const safe = (key) => {
        let value = item[key] || '';
        // 对时间字段进行格式处理
        if ((key === 'ConfirmTime' || key === 'ChargeDate') && value) {
          const standardTime = this.convertToStandardTime(value);
          value = standardTime || value;
        }
        return value.toString()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };
      
      return `
        <Request>
          <Head>
            <Source>SY</Source>
            <TransNo>HTIP.CM.MEDTECCONF.0001</TransNo>
          </Head>
          <Body>
            <PID>${safe('PID')}</PID>
            <PatientName>${safe('PatientName')}</PatientName>
            <ChargeItemName>${safe('ChargeItemName')}</ChargeItemName>
            <UnitPrice>${safe('UnitPrice')}</UnitPrice>
            <Quantity>${safe('Quantity')}</Quantity>
            <ExecDept>${safe('ExecDept')}</ExecDept>
            <ConfirmTime>${safe('ConfirmTime')}</ConfirmTime>
            <AffirmName>${safe('AffirmName')}</AffirmName>
            <PayMark>${safe('PayMark')}</PayMark>
            <OrderSn>${safe('OrderSn')}</OrderSn>
            <ChargeDate>${safe('ChargeDate')}</ChargeDate>
            <RecipeNo>${safe('RecipeNo')}</RecipeNo>
          </Body>
        </Request>
      `.replace(/\s+/g, ' ').trim(); // 去除多余空格，避免XML格式问题
    }
  },
  watch: {
    formData: {
      deep: true,
      handler() {
        this.updateAllUrl();
      }
    }
  }
}
</script>

<style scoped>
.home-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  box-sizing: border-box;
}

/* 基础样式补充 */
.list-container {
  max-width: 1800px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 动画效果 */
.btn {
  cursor: pointer;
}

/* 表格样式优化 */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
}

th {
  font-weight: 600;
  color: #4a5568;
  background-color: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

tr {
  border-bottom: 1px solid #e2e8f0;
}

tr:hover {
  background-color: #f7fafc;
}

/* 响应式处理 */
@media (max-width: 768px) {
  .grid-cols-2, .grid-cols-3 {
    grid-template-columns: 1fr;
  }
  
  .overflow-x-auto {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* 调整按钮区域布局 */
  .mt-6.flex {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .btn-secondary {
    margin-top: 1rem;
    margin-left: 0 !important;
  }
  .large-input {
  padding: 1rem 1rem; /* 增大内边距（上下 12px，左右 12px） */
  font-size: 1rem; /* 增大字体大小 */
  height: 44px; /* 固定高度，确保输入框足够大 */
}

}
</style>