import { NavLink } from "react-router-dom";

export default function NavBar({ navBarDetails }) {
  return (
    <nav style={{ ...inlineStyles.navBar, }}>
      {
        navBarDetails.map((ele, id) => {
          return (
            <li key={id}>
              <NavLink
                style={({ isActive, isPending, isTransitioning }) => ({
                  ...inlineStyles.navLink,
                  color: isActive ? "#ffffffde" : "#242424",
                  backgroundColor: isActive ? "#242424" : "#ffffffde",
                  borderRadius: isActive ? "1em" : "0.7em",
                })}
                to={`${ele.specifiedPath}`}
              >
                {ele.title}
              </NavLink>
            </li>
          )
        })
      }
    </nav>
  )
}

const inlineStyles = {
  navBar: {
    display: "flex",
    justifyContent: "space-around",
    listStyle: "none",
    margin: "0.9em 0em 1.4em",
  },
  navLink: {
    textDecoration: "none",
    fontWeight: "bold",
    padding: "0.2em 0.4em",
    margin: "0.1em 0",
  }
}