
import './App.css';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import NavBar from './components/NavBar';


function App() {

  const location = useLocation();
  const navigate = useNavigate();

  const appNavBar = [
    {
      title: "Todos",
      specifiedPath: "todos",
    },
    {
      title: "Schedules",
      specifiedPath: "schedules",
    },
    {
      title: location.pathname === '/signup' ? "Signup" : "Login",
      specifiedPath: location.pathname === '/signup' ? "signup" : "login",
    },
    {
      title: "Daily",
      specifiedPath: "daily-tasks",
    },
  ];


  function redirectFunc() {
    navigate("/");
  }

  return (
    <>

      <h1
        onClick={() => redirectFunc()}
        style={{ ...inlineStyles.heading, }}
      >
        Daily Planner
      </h1>

      <NavBar navBarDetails={appNavBar} />

      <Outlet />

    </>
  )
}

export default App

const inlineStyles = {
  heading: {
    textAlign: "center",
    textShadow: "-0.05em -0.05em 0.2em burlywood",
    cursor: "pointer",
  }
}