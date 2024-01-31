
import { Outlet } from 'react-router-dom';
import './App.css';
import NavBar from './subComponents/NavBar';

const appNavBar = [
  { title: "Todos", specifiedPath: "todos" },
  { title: "Schedules", specifiedPath: "schedules" },
]

function App() {

  return (
    <>
      <h2>Daily Planner</h2>

      <NavBar navBarDetails={appNavBar}/>

      <Outlet />
    </>
  )
}

export default App
