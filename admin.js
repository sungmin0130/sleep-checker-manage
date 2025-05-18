// Firebase 초기화
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sleep-checker.firebaseapp.com",
  projectId: "sleep-checker"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentGenderChart = null;
let currentGradeChart = null;

async function loadAndRenderCharts(chartType = "bar") {
  const snapshot = await db.collection("sleepRecords").get();
  const data = snapshot.docs.map(doc => doc.data());

  const genderGroups = { 남자: [], 여자: [] };
  const gradeGroups = { 1: [], 2: [], 3: [] };

  data.forEach(entry => {
    if (entry.gender && genderGroups[entry.gender]) {
      genderGroups[entry.gender].push(entry.weekdaySleep);
    }
    if (entry.grade && gradeGroups[entry.grade]) {
      gradeGroups[entry.grade].push(entry.weekdaySleep);
    }
  });

  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;

  // 이전 차트 제거
  if (currentGenderChart) currentGenderChart.destroy();
  if (currentGradeChart) currentGradeChart.destroy();

  // 성별 차트 생성
  currentGenderChart = new Chart(document.getElementById("genderChart"), {
    type: chartType,
    data: {
      labels: ["남자", "여자"],
      datasets: [{
        label: "평일 평균 수면 시간",
        data: [avg(genderGroups["남자"]), avg(genderGroups["여자"])],
        backgroundColor: ["#42a5f5", "#ef5350"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: chartType !== "bar" } },
      scales: chartType === "bar" || chartType === "line" ? {
        y: {
          beginAtZero: true,
          title: { display: true, text: "시간" }
        }
      } : {}
    }
  });

  // 학년 차트 생성
  currentGradeChart = new Chart(document.getElementById("gradeChart"), {
    type: chartType,
    data: {
      labels: ["1학년", "2학년", "3학년"],
      datasets: [{
        label: "평일 평균 수면 시간",
        data: [avg(gradeGroups[1]), avg(gradeGroups[2]), avg(gradeGroups[3])],
        backgroundColor: ["#81c784", "#4db6ac", "#ba68c8"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: chartType !== "bar" } },
      scales: chartType === "bar" || chartType === "line" ? {
        y: {
          beginAtZero: true,
          title: { display: true, text: "시간" }
        }
      } : {}
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  loadAndRenderCharts("bar");

  document.getElementById("chartTypeSelect").addEventListener("change", (e) => {
    const selectedType = e.target.value;
    loadAndRenderCharts(selectedType);
  });
});

document.getElementById("downloadPdfBtn").addEventListener("click", () => {
  const element = document.querySelector(".container");
  html2pdf().from(element).set({
    margin: 10,
    filename: "수면_통계_차트.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  }).save();
});
document.getElementById("downloadExcelBtn").addEventListener("click", async () => {
  const snapshot = await db.collection("sleepRecords").get();
  const data = snapshot.docs.map(doc => doc.data());

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sleep Data");

  XLSX.writeFile(workbook, "수면_데이터.xlsx");
});
