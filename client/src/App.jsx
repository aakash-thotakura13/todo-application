
import { Outlet } from 'react-router-dom';
import './App.css';
import NavBar from './components/NavBar';

const appNavBar = [
  { title: "Todos", specifiedPath: "todos" },
  { title: "Schedules", specifiedPath: "schedules" },
  { title: "Login", specifiedPath: "login" },
  // { title: "SignUp", specifiedPath: "signup" },
]

function App() {

  return (
    <>
      <h2 style={{ ...inlineStyles.heading, textShadow: "0em -0.05em 0.2em burlywood", }}>Daily Planner</h2>

      <NavBar navBarDetails={appNavBar} />

      <Outlet />
    </>
  )
}

export default App

const inlineStyles = {
  heading: {
    textAlign: "center",
  }
}