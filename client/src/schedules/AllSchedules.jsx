import { useState, useEffect } from "react";
import axios from "axios";

import { useRecoilValue } from "recoil";
import { schedulesURL, schedulesURL } from "../states/urlState";
import { userInfo } from "../states/userState"


const TodoForm = ({ handleSubmit }) => {
  const [todo, setTodo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ task: todo, completeBy: new Date(`${date}T${time}`) });
    setTodo("");
    setDate("");
    setTime("");
  };

  return (
    <form onSubmit={handleFormSubmit} method="post">

      <div style={{ margin: "0.5em 0.2em", display: "grid", gridTemplateColumns: "0.4fr 1.6fr", alignItems: "center", }}>
        <label htmlFor="todo">Todo: </label>
        <input type="text" name="todo" id="todo" value={todo} style={{ padding: "0.4em", border: "0.1em solid #555555", }} onChange={e => setTodo(e.target.value)} />
      </div>

      <div style={{ margin: "0.5em 0.2em", display: "grid", gridTemplateColumns: "0.4fr 1.6fr", alignItems: "center", }}>
        <label htmlFor="date">Date: </label>
        <input type="date" name="date" id="date" value={date} style={{ padding: "0.4em", border: "0.1em solid #555555", }} onChange={e => setDate(e.target.value)} />
      </div>

      <div style={{ margin: "0.5em 0.2em", display: "grid", gridTemplateColumns: "0.4fr 1.6fr", alignItems: "center", }}>
        <label htmlFor="time">Time: </label>
        <input type="time" name="time" id="time" value={time} style={{ padding: "0.4em", border: "0.1em solid #555555", }} onChange={e => setTime(e.target.value)} />
      </div>

      <button style={{ borderRadius: "1em", padding: "0.4em 0.8em", border: "0.2em solid #555555", }}>Add</button>
    </form>
  );
};

const TodoList = ({ tasks, deleteTodo, updateTodo }) => {
  return (
    <ul>
      {tasks.map((todo, id) => (
        <TodoItem key={id} todo={todo} deleteTodo={deleteTodo} updateTodo={updateTodo} />
      ))}
    </ul>
  );
};

const TodoItem = ({ id, todo, deleteTodo, updateTodo }) => {
  return (
    <li key={id} style={{ listStyle: "none", }}>
      <div style={{ padding: "0.8em 0.2em", display: "grid", gridTemplateColumns: "0.1fr 1.9fr", alignItems: "center" }}>

        <input type="checkbox" checked={todo.isChecked ? true : false} onChange={() => updateTodo(todo._id)} style={{ width: "1em", height: "1em", marginRight: "1em" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", }}>

          <details open>
            <summary style={{ listStyle: "none", marginLeft: "0.45em", textDecoration: todo.isChecked ? "#010101 line-through" : "none", fontStyle: todo.isChecked ? "italic" : "normal", }}>{todo.task}</summary>
            {/* <p>{todo._id}</p> */}
            <p style={{ fontSize: "0.8em", }}>Date: {new Date(todo.completeBy).toLocaleDateString()}</p>
            <p style={{ fontSize: "0.8em", }}>Time: {new Date(todo.completeBy).toLocaleTimeString()}</p>
          </details>

          <button style={{ border: "0.1em groove red", padding: "0.2em 0.5em", borderRadius: "50%", }} onClick={() => deleteTodo(todo._id)} >X</button>

        </div>
      </div>
      <hr />
    </li>
  );
};

const SortButton = ({ title, basedOn, handleOnClick }) => {
  return <button
    style={{
      ...inlineStyles.navLinkStyle,
      backgroundColor: basedOn ? "#ffffffde" : null,
      color: basedOn ? "#242424" : null,
    }}
    onClick={handleOnClick}
  >{title}</button>
}

export const AllSchedules = () => {

  const [allTasks, setAllTasks] = useState([]);

  const [basedOnDate, setBasedOnDate] = useState(false);
  const [basedOnDone, setBasedOnDone] = useState(false);

  const getUserUrl = useRecoilValue(userTodos);
  const schedulesUrl = useRecoilValue(schedulesURL);
  const _userInfo = useRecoilValue(userInfo)

  const getTasks = async () => {
    try {
      const result = await axios.get(`${getUserUrl}/todos/${_userInfo._id}`);
      typeof (result.data) === "string" ? setAllTasks([]) : setAllTasks(result.data.todos);
    } catch (err) {
      console.log("Request Canceled", err.message);
      setAllTasks([]);
    }
  };

  useEffect(() => {
    getTasks();
  }, []);

  const handleSubmit = async (newPost) => {
    const data = { ...newPost, user: _userInfo._id, };
    try {
      await axios.post(schedulesUrl, data);
      getTasks();
    } catch (error) {
      console.error("Error posting todo", error);
    }
  };

  const handleDeleteTodo = async (id) => {
    const reqData = {
      id,
      user_id: _userInfo._id,
    }
    try {
      await axios.delete(`${schedulesUrl}/${id}`, { data: reqData });
      getTasks();
    } catch (error) {
      console.error("Error deleting todo", error);
    }
  };

  const handleUpdateTodo = async (id) => {
    try {
      const specificTodo = await axios.get(`${schedulesUrl}/${id}`);
      const updatedData = {
        ...specificTodo.data,
        isChecked: !specificTodo.data.isChecked,
      };
      await axios.put(`${schedulesUrl}/${id}`, updatedData);
      getTasks();
    } catch (error) {
      console.error("Error updating todo", error);
    }
  };

  const sortBasedOnDone = async () => {
    try {
      setBasedOnDone(!basedOnDone);
      const updated = basedOnDone ? schedulesUrl : `${getUserUrl}/schedules/done/${_userInfo._id}`;
      await axios.get(updated)
        .then(result => setAllTasks(result.data.todos))
        .catch(error => console.log(error))
    } catch (error) {
      console.error("Error sorting based \n 'on done':", error);
    }
  };

  const sortBasedOnDate = async () => {
    try {
      setBasedOnDate(!basedOnDate);
      const updated = basedOnDate ? schedulesUrl : `${getUserUrl}/schedules/date/${_userInfo._id}`;
      await axios.get(updated)
        .then(result => setAllTasks(result.data.todos))
        .catch(error => console.log(error))
    } catch (error) {
      console.error("Error sorting based \n 'on date':", error);
    }
  };


  return (
    <>
      <TodoForm handleSubmit={handleSubmit} />

      <hr style={{ margin: "0.75em" }} />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={{ borderRadius: "1em", padding: "0.25em 0.5em", border: "0.1em solid #555555", }}>Sort: </button>
        <div style={{}}>

          <SortButton title="Done" basedOn={basedOnDone} handleOnClick={sortBasedOnDone} />

          <SortButton title="Date" basedOn={basedOnDate} handleOnClick={sortBasedOnDate} />

        </div>
      </div>

      <hr style={{ margin: "0.75em" }} />

      {
        allTasks.length > 0
          ? <TodoList
            tasks={allTasks}
            deleteTodo={handleDeleteTodo}
            updateTodo={handleUpdateTodo}
          />
          : <></>
      }
      
    </>
  );
};

const inlineStyles = {
  navLinkStyle: {
    border: "0.1em solid #555555",
    borderRadius: "1em",
    fontSize: "0.9em",
    margin: "0 0.45em",
    padding: "0.25em 0.5em",
    textDecoration: "none",
  }
}