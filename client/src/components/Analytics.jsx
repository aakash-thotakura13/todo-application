import { useRecoilValue } from "recoil";

import { allScheduleTasks, allTodoTasks } from "../states/taskStates";
import SimpleGraph from "./graphicalComponent/SimpleGraph";


export const Analytics = () => {
  const allTodos = useRecoilValue(allTodoTasks);
  const allSchedules = useRecoilValue(allScheduleTasks);

  const displayArray = [
    {
      title: "todos",
      totalCount: allTodos.length,
      pending: allTodos.filter(e => e.isChecked === false).length,
    },
    {
      title: "schedule",
      totalCount: allSchedules.length,
      pending: allSchedules.filter(e => e.isChecked === false).length,
    }
  ]

  return (
    <section>

      <div style={{ ...styles.container }}>

        {
          displayArray.map((ele, index) => {
            return (
              <section style={{ ...styles.innerContainer }} key={index}>
                <h3 style={{ background: "transparent" }}>{ele.title[0].toUpperCase() + ele.title.slice(1)}</h3>
                <h3 style={{ background: "transparent" }}>#{ele.totalCount}</h3>
                <div style={{ ...styles.divContainer }}>
                  <p style={{ textAlign: "left", }}>Pending: </p>
                  <p>#{ele.pending}</p>
                </div>
                <div style={{ ...styles.divContainer }}>
                  <p style={{ textAlign: "left", }}>Completed: </p>
                  <p>#{ele.totalCount - ele.pending}</p>
                </div>
              </section>
            )
          })
        }

      </div>

      <SimpleGraph allTasks={allTodos} />

      <SimpleGraph allTasks={allSchedules} />

    </section>
  )
}

const styles = {
  container: {
    padding: "0.4em",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.2em",
  },
  innerContainer: {
    textAlign: "center",
    boxShadow: "inset 0em 0em 0.5em 0.1em #fafafa",
    padding: "0.4em",
    borderRadius: "1em",
  },
  divContainer: {
    padding: "0.2em 0.4em",
    display: "grid",
    gridTemplateColumns: "0.8fr 0.2fr",
    backgroundColor: "transparent",
  }
}