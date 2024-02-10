import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import { AllTodos } from "../todos/AllTodos";
import { AllSchedules } from "../schedules/AllSchedules";
import { Login } from "../components/Login";
import { userInfo } from "../states/userState";
import { useRecoilValue } from "recoil";
import { Suspense } from "react";
import { SignUp } from "../components/SignUp";
import { Analytics } from "../components/Analytics";

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
    ],
  },
])