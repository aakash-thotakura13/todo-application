
const praticeTasks = [
  "Meditate Daily",
  "Conquer Laziness",
  "Read 20 pages Daily",
  "Exercise Daily for 30 mins",
  "Remind yourself about God's promise for this year - 2024",
]

const expertise = [
  "Data Structures & Algorithms",
  "Pratice React",
  "Practice Angular",
  "Pratice Recoil",
  "Pratice Redux",
  "Pratice GitHub",
  "Learn Python",
  "Frame Works for Frontend",
  "Learn Backend via Python",
]

export const DailyTasks = () => {

  return (
    <div>
      <div style={{ ...styles.divContainer }}></div>

      <h2 style={{ textAlign: "center", }}>Daily Tasks</h2>

      <div style={{ ...styles.divContainer }}></div>

      <h3 style={{ ...styles.h3Element, }}>Pratice</h3>
      <ul style={{ margin: "1em 0.1em", }}>
        {
          praticeTasks.map((ele, id) =>
            <li key={id} style={{ ...styles.liElement, }}>{ele}</li>
          )
        }
      </ul>

      <div style={{ ...styles.divContainer }}></div>

      <h3 style={{ ...styles.h3Element, }}>Expertise</h3>
      <ul style={{ margin: "1em 0.1em", }}>
        {
          expertise.map((ele, id) =>
            <li key={id} style={{ ...styles.liElement, }}>{ele}</li>
          )
        }
      </ul>

      <div style={{ ...styles.divContainer }}></div>

    </div>
  )
}

const styles = {
  divContainer: {
    padding: "0.2em",
    margin: "1em 2em",
    border: "0.1em solid burlywood",
    borderRadius: "50%",
    backgroundColor: "burlywood",
  },
  h3Element: {
    color: "#110101",
    textShadow: "-0.05em -0.05em 0.2em burlywood, 0em 0em 0.2em #110101",
    padding: "0.3em 1em",
    margin: "0.5em 0.1em",
    backgroundColor: "antiquewhite",
    borderRadius: "1em",
  },
  liElement: {
    width: "85%",
    aspectRatio: "9/1",
    display: "flex",
    alignItems: "center",
    listStyle: "none",
    padding: "0.7em 1.4em",
    margin: "0.2em auto",
    backgroundColor: "transparent",
    boxShadow: "inset 0em 0em 0.2em 0.2em #afafaf",
    borderRadius: "2em",
  },
}