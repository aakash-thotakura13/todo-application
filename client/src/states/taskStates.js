import { atom, selector } from "recoil";

export const allTodoTasks = atom({
  key: "allTodoTasks",
  default: [],
});

export const allScheduleTasks = atom({
  key: "allScheduleTasks",
  default: [],
});

export const allDailyTasks = atom({
  key: "allDailyTasks",
  default: [],
});


