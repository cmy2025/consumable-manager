<template>
<div class="home-view">
  <div class="list-all-container bg-white min-h-screen p-6">
    <!-- 页面标题和返回按钮 -->
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">全部查询结果</h2>
        <p class="text-gray-500 mt-1">显示符合条件的所有记录</p>
      </div>
      <router-link :to="backUrl" class="btn btn-secondary bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
        返回
      </router-link>
    </div>
    
    <!-- 结果表格卡片 -->
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
            <tr v-for="item in results" :key="item.SerialNo" class="hover:bg-gray-50 transition duration-150 ease-in-out">
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
      
      <!-- 无数据状态 -->
      <div v-if="results.length === 0" class="text-center py-10 text-gray-500">
        暂无数据记录
      </div>
    </div>
  </div>
</div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ListAllView',
  data() {
    return {
      formData: {
        HospitalCode: '',
        PID: '',
        AffirmId: '',
        OperTime: '',
        ExecDept: '',
        IsSearchMore: '',
        OperCode: ''
      },
      results: [],
      backUrl: '',
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
    const query = this.$route.query;
    Object.keys(query).forEach(key => {
      if (this.formData.hasOwnProperty(key)) {
        this.formData[key] = query[key] || '';
      }
    });
    // 对从路由获取的时间进行格式验证和修正
    if (this.formData.OperTime) {
      const formattedTime = this.convertToStandardTime(this.formData.OperTime);
      this.formData.OperTime = formattedTime || '';
    }
    this.updateBackUrl();
    this.fetchAllData();
  },
  methods: {
    updateBackUrl() {
      const params = new URLSearchParams();
      Object.keys(this.formData).forEach(key => {
        if (this.formData[key]) {
          params.append(key, this.formData[key]);
        }
      });
      this.backUrl = `/list?${params.toString()}`;
    },
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
    async fetchAllData() {
      try {
    const queryData = JSON.parse(JSON.stringify(this.formData));
    // 使用与请求示例一致的TransNo
    queryData.TransNo = "HTIP.CM.YJSFZTCX.0002";
    
    // 确保必要参数存在（与请求示例匹配）
    queryData.HospitalCode = queryData.HospitalCode || 'pj'; // 设置默认医院代码
    queryData.IsSearchMore = queryData.IsSearchMore || '0'; // 默认为0
    
    // 时间格式处理
    if (queryData.OperTime) {
      if (!this.isValidTimeFormat(queryData.OperTime)) {
        const convertedTime = this.convertToStandardTime(queryData.OperTime);
        if (!convertedTime) {
          alert('操作时间格式无效，请使用yyyy-MM-dd HH:mm:ss格式');
          return;
        }
        queryData.OperTime = convertedTime;
      }
    }
    
    const jsonstr = JSON.stringify(queryData);
    const response = await axios.get(`/api/soap/query-All?jsonstr=${encodeURIComponent(jsonstr)}`);
    this.results = Array.isArray(response.data) ? response.data : [];
    
  } catch (error) {
    console.error('查询全部失败:', error);
    const errorMsg = error.response?.data?.error || error.message || '未知错误';
    alert(`查询全部失败: ${errorMsg}`);
  }
    },
    async handleConfirm(item) {
      try {
        const xmlStr = this.buildConfirmXml(item);
        const response = await axios.post('/api/soap/confirm', { xmlData: xmlStr });
        if (response.data.success) {
          alert('确认成功');
          this.fetchAllData(); // 刷新数据
        } else {
          alert('确认失败: ' + (response.data.error || '未知错误'));
        }
      } catch (error) {
        console.error('确认操作失败:', error);
        alert('确认失败，请重试');
      }
    },
    buildConfirmXml(item) {
      // 安全处理XML特殊字符
      const safe = (key) => (item[key] || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
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
      `.replace(/\s+/g, ' ').trim();
    }
  }
};
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

.list-all-container {
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

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

.btn {
  cursor: pointer;
}

@media (max-width: 768px) {
  .overflow-x-auto {
    overflow-x: auto;
  }
  
  .mb-6 {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .btn-secondary {
    margin-top: 1rem;
  }
  
  th, td {
    padding: 0.5rem;
  }
}
</style>