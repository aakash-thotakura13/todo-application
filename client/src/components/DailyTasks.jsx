import { useEffect, useState } from "react";
import { Divider } from "./htmlComponent/DividerComponent";
import { userInfo } from "../states/userState";
import { useRecoilState, useRecoilValue } from "recoil";
import { dailyTasksURL, userTasks } from "../states/urlState";
import { getTasks } from "../functions/apiOperations";
import { allDailyTasks } from "../states/taskStates";
import axios from "axios";


export const Heading = ({ title }) => <h3 style={{ ...styles.h3Element, }}>\ {title} /</h3>

const EachItem = ({ ele, id, deleteTask }) => {
  const [isDone, setDone] = useState(false);

  return (
    <li
      key={id}
      style={{
        ...styles.liElement,
        backgroundColor: isDone && "antiquewhite",
        color: isDone && "#110101",
        boxShadow: `inset 0em 0em 0.2em 0.2em ${isDone ? "#110101" : "antiquewhite"}`,
      }}
      onClick={() => setDone(!isDone)}
    >
      <p style={{ backgroundColor: isDone && "antiquewhite", color: isDone && "#110101", width: "210px", }}>{ele.task}</p>

      {
        isDone
          ? <button
            style={{ ...styles.deleteButton, }}
            onClick={() => deleteTask(ele._id)}
          >
            X
          </button>
          : null
      }

    </li>
  )
}

const DailyTasksForm = ({ handleSubmit }) => {
  const [task, setTask] = useState("");
  const [section, setSection] = useState("");


  async function handleFormSubmit(e) {
    e.preventDefault();
    handleSubmit({ task, section, });
    setTask("");
    setSection("");
  }

  return (
    <form
      method="post" onSubmit={handleFormSubmit}
      style={{ ...styles.formElement }}
    >
      <input
        type="text" name="text" id="text" value={task}
        placeholder="Enter Your Task..."
        onChange={e => setTask(e.target.value)}
        style={{ padding: "0.5em", ...styles.inputElement }}
      />
      <select
        name="opion" id="option" value={section}
        onChange={e => setSection(e.target.value)}
        style={{ padding: "0.4em", ...styles.inputElement }}
      >
        <option value="">Select </option>
        <option value="dailyWorks">Daily Works</option>
        <option value="expertise">Expertise</option>
      </select>
      <button style={{ ...styles.buttonElement }}>Add</button>
    </form>
  )
}

export const DailyTasks = () => {
  const [allTasks, setAllTasks] = useRecoilState(allDailyTasks);
  const [displayForm, setDisplayForm] = useState(false);

  const getUserUrl = useRecoilValue(userTasks);
  const _userInfo = useRecoilValue(userInfo);
  const dailyTasksUrl = useRecoilValue(dailyTasksURL);

  useEffect(() => {
    getTasks(`${getUserUrl}/dailyTasks/${_userInfo._id}`, setAllTasks);
  }, []);

  const handleSubmit = async (newPost) => {
    const data = { ...newPost, user: _userInfo._id, };

    try {
      await axios.post(dailyTasksUrl, data);
      getTasks(`${getUserUrl}/dailyTasks/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error posting todo", error);
    }
    setDisplayForm(!displayForm);

  }

  const handleDeleteTask = async (id) => {
    const reqData = {
      id,
      user_id: _userInfo._id,
    }
    try {
      await axios.delete(`${dailyTasksUrl}/${id}`, { data: reqData });
      getTasks(`${getUserUrl}/dailyTasks/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error deleting todo", error);
    }
  }

  console.log(allTasks);

  return (
    <section>

      <Divider />
      <h2 style={{ textAlign: "center", }}>Daily Tasks</h2>

      <Divider />
      {
        displayForm
          ? <DailyTasksForm handleSubmit={handleSubmit} />
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
          allTasks
            .filter(ele => ele.section === "dailyWorks")
            .map((ele, id) =>
              <EachItem key={id} ele={ele} id={id} deleteTask={handleDeleteTask} />
            )
        }
      </ul>

      <Divider />
      <Heading title={"Expertise"} />
      <ul style={{ margin: "1em 0.1em", }}>
        {
          allTasks
            .filter(ele => ele.section === "expertise")
            .map((ele, id) =>
              <EachItem key={id} ele={ele} id={id} deleteTask={handleDeleteTask} />
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
    justifyContent: "space-between",
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
  formElement: { display: "grid", gridTemplateColumns: "1fr", padding: "0.3em", },
  inputElement: { margin: "0.5em", border: "0.2em solid #545453", borderRadius: "1em", },
  buttonElement: { borderRadius: "1em", padding: "0.4em 0.8em", border: "0.2em solid #545454", cursor: "pointer", margin: "0.5em", },
  deleteButton: {
    padding: "0.2em 0.5em",
    margin: "0em 0.2em",
    border: "0.2em groove red",
    borderRadius: "50%",
  },
}