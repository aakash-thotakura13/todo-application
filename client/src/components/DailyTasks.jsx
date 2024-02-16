import { useState } from "react";
import { Divider } from "./htmlComponent/DividerComponent";

const praticeTasks = [
  "Meditate Daily",
  "Pray in Tongues",
  "Conquer Laziness",
  "Read 20 pages Daily",
  "Exercise Daily for 30 mins",
  "Remind yourself about God's promise for this year - 2024",
]

const expertise = [
  "Data Structures & Algorithms ~ LeetCode (Python, JavaSscript)",
  "Pratice React",
  "Practice Angular",
  "Pratice Recoil",
  "Pratice Redux",
  "Pratice GitHub",
  "Practice Python",
  "Front End & Back End Framwork for Python",
]

export const Heading = ({ title }) => <h3 style={{ ...styles.h3Element, }}>\ {title} /</h3>

const EachItem = ({ ele, id }) => {
  const [isDone, setDone] = useState(false);
  return (
    <li
      key={id}
      style={{
        ...styles.liElement,
        backgroundColor: isDone && "antiquewhite",
        color: isDone && "#110101",
        boxShadow: isDone ? "inset 0em 0em 0.2em 0.2em #110101" : "inset 0em 0em 0.2em 0.2em antiquewhite",
      }}
      onClick={() => setDone(!isDone)}
    >
      {ele}
    </li>
  )
}

const DailyTasksForm = () => {
  const [task, setTask] = useState("");
  const [option, setOption] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const { name, value } = e.target;
    console.log(name, value);
  }

  return (
    <form method="post" onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr", padding: "0.3em", }}>
      <input type="text" name="text" id="text" value={task} placeholder="Enter Your Task..." onChange={e => setTask(e.target.value)} style={{ padding: "0.5em", border: "0.2em solid #545453", borderRadius: "1em", margin: "0.5em", }} />
      <select name="opion" id="option" style={{ padding: "0.4em", border: "0.2em solid #545453", borderRadius: "1em", margin: "0.5em", }}>
        <option value="">Select </option>
        <option value="">Daily Works</option>
        <option value="">Expertise</option>
      </select>
      <button style={{ borderRadius: "1em", padding: "0.4em 0.8em", border: "0.2em solid #545454", cursor: "pointer", margin: "0.5em", }}>Add</button>
    </form>
  )
}

export const DailyTasks = () => {
  const [displayForm, setDisplayForm] = useState(false);

  return (
    <section>

      <Divider />
      <h2 style={{ textAlign: "center", }}>Daily Tasks</h2>

      <Divider />
      {
        displayForm
          ? <DailyTasksForm />
          : <div style={{ display: "flex" }}>
            <button
              style={{ ...styles.displayFormButtonElement }}
              onClick={() => setDisplayForm(!displayForm)}
            >
              Add
            </button>
          </div>

      }


      <Divider />
      <Heading title={"Daily~Works"} />
      <ul style={{ margin: "1em 0.1em", }}>
        {
          praticeTasks.map((ele, id) =>
            <EachItem key={id} ele={ele} id={id} />
          )
        }
      </ul>

      <Divider />
      <Heading title={"Expertise"} />
      <ul style={{ margin: "1em 0.1em", }}>
        {
          expertise.map((ele, id) =>
            <EachItem key={id} ele={ele} id={id} />
          )
        }
      </ul>

      <Divider />

    </section>
  )
}

const styles = {
  h3Element: {
    color: "#110101",
    padding: "0.3em 1em",
    margin: "0.5em 0.1em",
    backgroundColor: "antiquewhite",
    borderRadius: "1em",
    textAlign: "center",
    textShadow: "-0.05em -0.05em 0.2em burlywood, 0em 0em 0.2em #110101",
  },
  liElement: {
    width: "75%",
    aspectRatio: "9/1",
    display: "flex",
    alignItems: "center",
    listStyle: "none",
    padding: "0.7em 1.4em",
    margin: "0.2em auto",
    backgroundColor: "transparent",
    borderRadius: "2em",
  },
  displayFormButtonElement: {
    width: "80%",
    padding: "0.4em 0.8em",
    margin: "auto",
    border: "0.2em solid #545454",
    borderRadius: "1em",
    cursor: "pointer",
  },
}