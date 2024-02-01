import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";

const url = `https://todo-application-personal-use.onrender.com/todos`;
// const url = "http://localhost:3000/todos";

const TodoForm = ({ handleSubmit }) => {
  const [todo, setTodo] = useState("");
  const [date, setDate] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ task: todo, date });
    setTodo("");
    setDate("");
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

export const AllTodos = () => {

  const [allTasks, setAllTasks] = useState([]);

  const [basedOnDate, setBasedOnDate] = useState(false);
  const [basedOnDone, setBasedOnDone] = useState(false);

  const getTasks = async () => {
    try {
      const result = await axios.get(url);
      setAllTasks(result.data);
    } catch (err) {
      console.log("Request Canceled", err.message);
    }
  };

  useEffect(() => {
    getTasks();
  }, []);

  const handleSubmit = async (newPost) => {
    try {
      await axios.post(url, newPost);
      getTasks();
    } catch (error) {
      console.error("Error posting todo", error);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await axios.delete(`${url}/${id}`);
      getTasks();
    } catch (error) {
      console.error("Error deleting todo", error);
    }
  };

  const handleUpdateTodo = async (id) => {
    try {
      const specificTodo = await axios.get(`${url}/${id}`);
      const updatedData = {
        ...specificTodo.data,
        isChecked: !specificTodo.data.isChecked,
      };
      await axios.put(`${url}/${id}`, updatedData);
      getTasks();
    } catch (error) {
      console.error("Error updating todo", error);
    }
  };

  const sortBasedOnDate = async () => {
    try {
      setBasedOnDate(!basedOnDate);
      const updatedUrl = basedOnDate ? url : `${url}/date`;
      const result = await axios.get(updatedUrl);
      setAllTasks(result.data);
    } catch (err) {
      console.error("Error sorting based 'on date'", err);
    }
  };
  const sortBasedOnDone = async () => {
    try {
      setBasedOnDone(!basedOnDone);
      const updatedUrl = basedOnDone ? url : `${url}/done`;
      const result = await axios.get(updatedUrl);
      setAllTasks(result.data);
    } catch (err) {
      console.error("Error sorting based 'on done'", err);
    }
  };


  return (
    <>
      <TodoForm handleSubmit={handleSubmit} />

      <p>Mention two sort() options based on:</p>
      <ul>
        <li>date - completeBy</li>
        <li>boolean - isChecked</li>
      </ul>

      <hr style={{ margin: "0.75em" }} />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button style={{ borderRadius: "1em", padding: "0.25em 0.5em", border: "0.1em solid #555555", }}>Sort: </button>
        <div style={{}}>

          <button
            style={{
              ...inlineStyles.navLinkStyle,
              backgroundColor: basedOnDate ? "#ffffffde" : null,
              color: basedOnDate ? "#242424" : null,
            }}
            onClick={sortBasedOnDate}
          >Date</button>

          <button
            style={{
              ...inlineStyles.navLinkStyle,
              backgroundColor: basedOnDone ? "#ffffffde" : null,
              color: basedOnDone ? "#242424" : null,
            }}
            onClick={sortBasedOnDone}
          >Done</button>

        </div>
      </div>

      <hr style={{ margin: "0.75em" }} />

      <TodoList tasks={allTasks} deleteTodo={handleDeleteTodo} updateTodo={handleUpdateTodo} />
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