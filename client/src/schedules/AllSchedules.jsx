import React, { useState, useEffect } from "react";
import axios from "axios";

const url = `https://todo-application-personal-use.onrender.com/schedules`;
// const url = "http://localhost:3000/schedules";

const TodoForm = ({ handleSubmit }) => {
  const [todo, setTodo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ task: todo, completedBy: new Date(`${date}T${time}`) });
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
          <p style={{ marginLeft: "0.45em", textDecoration: todo.isChecked ? "#010101 line-through" : "none", fontStyle: todo.isChecked ? "italic" : "normal" }}>{todo.task}</p>
          <button style={{ border: "0.1em groove red", padding: "0.2em 0.5em", borderRadius: "50%", }} onClick={() => deleteTodo(todo._id)} >X</button>
        </div>

      </div>
      <hr />
    </li>
  );
};

export const AllSchedules = () => {
  const [allTasks, setAllTasks] = useState([]);

  // console.log(allTasks.map(todo => {
  //   const mongodbDate = new Date(todo.completedBy); // MongoDB date
  //   const date = mongodbDate.getDate(); // Get hours
  //   const hours = mongodbDate.getHours(); // Get hours
  //   const minutes = mongodbDate.getMinutes(); // Get minutes
  //   // const seconds = mongodbDate.getSeconds(); // Get seconds
  //   return { date, time: `${hours}:${minutes}` }
  // }))

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
    console.log(newPost);
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

  return (
    <>
      <TodoForm handleSubmit={handleSubmit} />
      <TodoList tasks={allTasks} deleteTodo={handleDeleteTodo} updateTodo={handleUpdateTodo} />
    </>
  );
};