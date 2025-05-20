const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sleep-checker.firebaseapp.com",
  projectId: "sleep-checker"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentChart = null;

function groupByRange(values, rangeSize) {
  const grouped = {};
  values.forEach(v => {
    const group = Math.floor(v / rangeSize) * rangeSize;
    const label = `${group}~${group + rangeSize}`;
    if (!grouped[label]) grouped[label] = 0;
    grouped[label]++;
  });
  return grouped;
}

function drawChart(grouped, chartType, label) {
  const labels = Object.keys(grouped);
  const values = Object.values(grouped);
  const total = values.reduce((a, b) => a + b, 0);
  const percentages = values.map(v => ((v / total) * 100).toFixed(1));

  if (currentChart) currentChart.destroy();

  currentChart = new Chart(document.getElementById("statChart"), {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: `${label} 분포 (%)`,
        data: percentages,
        backgroundColor: [
          "#42a5f5", "#66bb6a", "#ffa726", "#ab47bc", "#ec407a", "#26a69a", "#ff7043", "#9ccc65"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          color: '#333',
          font: { weight: 'bold' },
          formatter: value => `${value}%`,
          anchor: chartType === 'bar' ? 'end' : 'center',
          align: chartType === 'bar' ? 'top' : 'center',
          offset: 4
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.raw}%`
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

function calcSummaryStats(values) {
  const n = values.length;
  const mean = (values.reduce((a, b) => a + b, 0) / n).toFixed(2);
  const max = Math.max(...values).toFixed(2);
  const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n).toFixed(2);

  document.getElementById("summaryStats").innerText =
    `평균: ${mean} / 최댓값: ${max} / 표준편차: ${std}`;
}

async function loadAndRender() {
  const dataType = document.getElementById("dataType").value;
  const chartType = document.getElementById("chartType").value;

  const snapshot = await db.collection("sleepRecords").get();
  const values = snapshot.docs.map(doc => doc.data()[dataType]).filter(v => typeof v === "number");

  const rangeSize = dataType === "caffeine" ? 50 : 0.5;
  const label = dataType === "weekdaySleep" ? "평일 수면 시간"
              : dataType === "weekendSleep" ? "주말 수면 시간" : "카페인 섭취량";

  const grouped = groupByRange(values, rangeSize);
  drawChart(grouped, chartType, label);
  calcSummaryStats(values);
}

function downloadExcel() {
  const labels = currentChart.data.labels;
  const data = currentChart.data.datasets[0].data;
  const rows = labels.map((label, i) => ({ 구간: label, 비율: `${data[i]}%` }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "통계");
  XLSX.writeFile(workbook, "통계_분포.xlsx");
}

function downloadPdf() {
  const container = document.querySelector(".container");
  html2pdf().from(container).set({
    margin: 10,
    filename: "통계_분포.pdf",
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dataType").addEventListener("change", loadAndRender);
  document.getElementById("chartType").addEventListener("change", loadAndRender);
  document.getElementById("downloadExcel").addEventListener("click", downloadExcel);
  document.getElementById("downloadPdf").addEventListener("click", downloadPdf);
  loadAndRender();
});
