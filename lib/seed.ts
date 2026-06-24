import { AppData } from "./types";
import { saveData } from "./storage";

export function loadSeedData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");

  const projects = [
    { id: "p1", name: "YouTube切り抜き編集", contractAmount: 30000, color: "#ef4444", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "p2", name: "ライター案件A", contractAmount: 50000, color: "#6366f1", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "p3", name: "SNS運用サポート", contractAmount: 20000, color: "#10b981", createdAt: `${y}-${m}-01T00:00:00.000Z` },
  ];

  const tasks = [
    { id: "t1", projectId: "p1", name: "カット編集", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t2", projectId: "p1", name: "テロップ入れ", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t3", projectId: "p1", name: "演出・BGM", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t4", projectId: "p2", name: "リサーチ", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t5", projectId: "p2", name: "執筆", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t6", projectId: "p2", name: "校正", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t7", projectId: "p3", name: "投稿作成", createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "t8", projectId: "p3", name: "分析レポート", createdAt: `${y}-${m}-01T00:00:00.000Z` },
  ];

  const templates = [
    { id: "tpl1", name: "動画編集", taskNames: ["カット編集", "テロップ入れ", "演出・BGM"], createdAt: `${y}-${m}-01T00:00:00.000Z` },
    { id: "tpl2", name: "ライティング", taskNames: ["リサーチ", "執筆", "校正"], createdAt: `${y}-${m}-01T00:00:00.000Z` },
  ];

  function makeEntry(id: string, projectId: string, taskId: string, day: string, startH: number, durationH: number, note = "") {
    const date = `${y}-${m}-${day}`;
    const start = new Date(`${date}T${String(startH).padStart(2, "0")}:00:00`);
    const end = new Date(start.getTime() + durationH * 3600 * 1000);
    return {
      id,
      projectId,
      taskId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds: durationH * 3600,
      note,
      date,
    };
  }

  const entries = [
    makeEntry("e1",  "p1", "t1", "02", 10, 2, ""),
    makeEntry("e2",  "p1", "t2", "02", 13, 1.5, ""),
    makeEntry("e3",  "p1", "t3", "03", 10, 1, ""),
    makeEntry("e4",  "p2", "t4", "04", 9, 2, "競合リサーチ"),
    makeEntry("e5",  "p2", "t5", "05", 10, 3, ""),
    makeEntry("e6",  "p2", "t5", "06", 14, 2, ""),
    makeEntry("e7",  "p2", "t6", "07", 11, 1, ""),
    makeEntry("e8",  "p3", "t7", "08", 20, 1, ""),
    makeEntry("e9",  "p3", "t7", "10", 20, 1, ""),
    makeEntry("e10", "p3", "t8", "12", 19, 1.5, "月次レポート"),
    makeEntry("e11", "p1", "t1", "14", 10, 2.5, ""),
    makeEntry("e12", "p1", "t2", "15", 13, 2, ""),
    makeEntry("e13", "p2", "t5", "16", 9, 3, ""),
    makeEntry("e14", "p3", "t7", "18", 20, 0.5, ""),
    makeEntry("e15", "p2", "t6", "20", 10, 1, ""),
  ];

  const data: AppData = { projects, tasks, entries, templates };
  saveData(data);
  return data;
}
