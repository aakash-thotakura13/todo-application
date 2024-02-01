import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import { AllTodos } from "../todos/AllTodos";
import { AllSchedules } from "../schedules/AllSchedules";
import { Suspense } from "react";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "todos",
        element: <Suspense
          fallback={<div>Loading...</div>}>
          <AllTodos />
        </Suspense>,
      },
      {
        path: "schedules",
        element: <Suspense
          fallback={<div>Loading...</div>}>
          <AllSchedules />
        </Suspense>
      },
    ],
  },
])