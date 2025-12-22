<template>
  <div>
    <header id="main-header">
      <div id="main-logo">
        <img src="image/jg_logo.png" alt="" srcset="">
      </div>
      <div id="header-title">
        <p>JUST-PACS 图像浏览系统</p>
        <h5>image viewer system</h5>
      </div>
      <div id="header-btn">
        <a href="/">
          <img src="image/homepage" alt="" srcset="">
        </a>
      </div>
    </header>

    <div class="container-fluid" id="main-body">
      <div class="row">
        <div class="col-md-3">
          <div class="my-form">
            <!-- 姓名输入 -->
            <div class="form-group form-inline form-spacing">
              <label for="patient_name">姓名</label>
              <input type="text" id="patient_name" class="form-control custom-input">
            </div>
            <!-- 门诊号输入 -->
            <div class="form-group form-inline form-spacing">
              <label for="outpatient_id">门诊号</label>
              <input type="text" id="outpatient_id" class="form-control custom-input" autofocus>
            </div>
            <!-- 住院号输入 -->
            <div class="form-group form-inline form-spacing">
              <label for="inpatient_id">住院号</label>
              <input type="text" id="inpatient_id" class="form-control custom-input">
            </div>
            <!-- 开始日期 -->
            <div class="form-group form-inline form-spacing">
              <label for="start_date">开始日期</label>
              <input type="date" id="start_date" class="form-control custom-input">
            </div>
            <!-- 结束日期 -->
            <div class="form-group form-inline form-spacing">
              <label for="end_date">结束日期</label>
              <input type="date" id="end_date" class="form-control custom-input">
            </div>
            <!-- 检查类型选择 -->
            <div class="form-group form-inline form-spacing">
              <label for="check_type">检查类型</label>
              <select id="check_type" class="form-control custom-input">
                <option value="Empty"></option>
                <option value="CT">CT</option>
                <option value="MR">MR</option>
                <option value="US">US</option>
                <option value="ES">ES</option>
                <option value="ECG">ECG</option>
                <option value="CR">CR</option>
                <option value="DX">DX</option>
                <option value="RF">RF</option>
                <option value="XA">XA</option>
                <option value="TCD">TCD</option>
                <option value="EEG">EEG</option>
                <option value="GM">GM</option>
                <option value="MG">MG</option>
                <option value="PX">PX</option>
                <option value="OT">OT</option>
              </select>
            </div>
            <!-- 查询按钮 -->
            <div class="mid-button">
              <button id="query_report" class="btn btn-primary custom-btn-size">查询</button>
            </div>
          </div>
        </div>

        <div class="col-md-9">
          <table id="query-rows"></table>
        </div>
      </div>
    </div>

    <footer id="main-footer">
      <p>© 版权所有：江苏省省级机关医院（江苏省老年病医院、南京医科大学附属老年医院、江苏省老年医学研究所）</p>
    </footer>

    <!-- 引入外部JS -->
    <script src="js/jquery-3.4.1.js"></script>
    <script src="js/popper.min.js"></script>
    <script src="js/bootstrap.js"></script>
    <script src="js/bootstrap-table.min.js"></script>
    <script src="js/bootstrap-table-zh-CN.js"></script>
    <script src="js/query.js"></script>
  </div>
</template>

<script>
export default {
  name: 'TQuery',
  mounted() {
    this.$nextTick(() => {
      console.log('TQuery组件初始化完成，已加载query.js')
    });
  }
};
</script>

<style scoped>

</style>