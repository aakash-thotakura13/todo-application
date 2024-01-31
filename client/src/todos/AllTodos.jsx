import React from "react";
import axios from "axios";

const url = `https://todo-application-personal-use.onrender.com/todos`;
// const url = "http://localhost:3000/todos";

export const AllTodos = () => {

  const [allTasks, setAllTasks] = React.useState([]);

  console.log(allTasks)

  const getTasks = React.useCallback(async () => {
    try {
      const result = await axios.get(url);
      setAllTasks(result.data)
    } catch (err) {
      console.log("Request Canceled", err.message)
    }
  })

  React.useEffect(() => {
    getTasks();
  }, [])


  async function handleSubmit(e) { // posting todos
    // A function to handle form submission.
    e.preventDefault();

    let newPost = {
      task: e.target.todo.value,
      date: e.target.date.value
    }
    await axios.post(url, newPost);

    getTasks();
    e.target.reset();
  }


  async function deleteTodo(id) {
    await axios.delete(`${url}/${id}`);
    getTasks();
  }


  async function updateTodo(id) {
    const specificTodo = await axios.get(`${url}/${id}`);

    let updatedData = {
      ...specificTodo.data,
      isChecked: !specificTodo.data.isChecked
    }

    await axios.put(`${url}/${id}`, { ...updatedData })
    getTasks();
  }


  return (
    <>
      <form onSubmit={e => handleSubmit(e)} method="post">
        <div style={{ margin: "0.5em 0.2em", display: "grid", gridTemplateColumns: "0.4fr 1.6fr", alignItems: "center", }}>
          <label htmlFor="todo">Todo: </label>
          <input type="text" name="todo" id="todo" style={{ padding: "0.4em", border: "0.1em solid #555555", }} />
        </div>
        <div style={{ margin: "0.5em 0.2em", display: "grid", gridTemplateColumns: "0.4fr 1.6fr", alignItems: "center", }}>
          <label htmlFor="date">Date: </label>
          <input type="date" name="date" id="date" style={{ padding: "0.4em", border: "0.1em solid #555555", }} />
        </div>
        <button style={{ borderRadius: "1em", padding: "0.4em 0.8em", border: "0.2em solid #555555", }}>Add</button>
      </form>
      <ul></ul>
      {
        allTasks.length > 0
          ? allTasks
            .map((todo, id) =>
              <li key={id} style={{ listStyle: "none", }}>
                <div style={{ padding: "0.8em 0.2em", display: "grid", gridTemplateColumns: "0.1fr 1.9fr", alignItems: "center" }}>
                  <input type="checkbox" checked={todo.isChecked ? true : false} onChange={() => updateTodo(todo._id)} style={{ width: "1em", height: "1em", marginRight: "1em" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", }}>
                    <p style={{ marginLeft: "0.45em", textDecoration: todo.isChecked ? "#010101 line-through" : "none", fontStyle:todo.isChecked ? "italic" : "normal" }}>{todo.task}</p>
                    <button style={{ border: "0.1em groove red", padding: "0.2em 0.5em", borderRadius: "50%", }} onClick={() => deleteTodo(todo._id)} >X</button>
                  </div>

                </div>
                <hr />
              </li>)
          : null
      }
    </>
  )
}