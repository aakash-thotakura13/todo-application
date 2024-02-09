import { atom } from "recoil";

export const allTodoTasks = atom({
  key: "allTodoTasks",
  default: [],
});

export const allScheduleTasks = atom({
  key: "allScheduleTasks",
  default: [],
});