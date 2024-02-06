
import { atom, selector } from "recoil";

const localHostURL = "http://localhost:3000";
const productionURL = "https://todo-application-personal-use.onrender.com";

export const baseURL = atom({
  key: "baseURL",
  default: localHostURL || productionURL,
});

export const loginURL = selector({
  key: "loginURL",
  get: ({ get }) => {
    return get(baseURL) + "/users/login";
  },
});

export const todosURL = selector({
  key: "todosURL",
  get: ({ get }) => {
    return get(baseURL) + "/todos";
  },
})

export const schedulesURL = selector({
  key: "schedulesURL",
  get: ({ get }) => {
    return get(baseURL) + "/schedules";
  },
})

export const combinedURL = selector({
  key: "combinedURL",
  get: ({ get }) => {
    const base = get(baseURL);
    return {
      loginURL: base + "/users/login",
      todosURL: base + "/todos",
      schedulesURL: base + "/schedules",
    };
  },
});
