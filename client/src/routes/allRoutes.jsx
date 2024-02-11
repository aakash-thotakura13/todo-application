import { Suspense } from "react";
import { useRecoilValue } from "recoil";
import { createBrowserRouter } from "react-router-dom";

import { userInfo } from "../states/userState";

import App from "../App";
import { AllTodos } from "../todos/AllTodos";
import { AllSchedules } from "../schedules/AllSchedules";
import { Login } from "../components/Login";
import { SignUp } from "../components/SignUp";
import { Analytics } from "../components/Analytics";
import { DailyTasks } from "../components/DailyTasks";

const PrivateRoutes = ({ component: Component }) => {
  const _userInfo = useRecoilValue(userInfo);
  if (_userInfo._id === undefined) {
    return <Login />
  } else {
    return <Component />
  }
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "todos",
        element: <Suspense
          fallback={<div>Loading...</div>}>
          <PrivateRoutes component={AllTodos}
          />
        </Suspense>,
      },
      {
        path: "schedules",
        element: <Suspense
          fallback={<div>Loading...</div>}>
          <PrivateRoutes component={AllSchedules}
          />
        </Suspense>,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "signup",
        element: <SignUp />,
      },
      {
        path: "analytics",
        element: <Suspense
          fallback={<div>Loading...</div>}>
          <PrivateRoutes component={Analytics}
          />
        </Suspense>,
      },
      {
        path: "daily-tasks",
        element: <Suspense
          fallback={<div>Loading...</div>}>
          <PrivateRoutes component={DailyTasks}
          />
        </Suspense>,
      },
    ],
  },
])