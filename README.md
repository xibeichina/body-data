# 身体数据记录

静态页面，无依赖。数据全部来自 `data/measurements.js`。

## 如何维护数据
- 打开 `data/measurements.js`，在数组里追加一条对象，按日期排序随意（页面会自动按时间排序）。
- 推荐格式：
  ```js
  {
    date: "2024-12-18",
    height_cm: 178, //身高
    weight_jin: 300, //体重
    waist_cm: 82, // 腰围
    chest_cm: 101, // 胸围
    hip_cm: 97 // 臀围
  }
  ```
- 单位固定：身高/围度是 cm，体重是 斤。页面会根据身高和体重自动计算 BMI。
- 仅保留字段：`date`、`height_cm`、`weight_jin`、`waist_cm`、`chest_cm`、`hip_cm`。
- 保存后直接刷新 `index.html` 查看最新记录和折线图。

## 页面说明
- `index.html`：仪表盘，展示最新关键指标、折线趋势和时间线。
- `data/measurements.js`：数据源。无需打包或构建，双击 `index.html` 即可打开查看。
