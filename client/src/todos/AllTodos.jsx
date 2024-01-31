import React from "react";
import axios from "axios";

// const url = `https://todo-application-personal-use.onrender.com/todos`;
const url = "http://localhost:3000/todos";

export const AllTodos = () => {

  const [allTasks, setAllTasks] = React.useState();


  React.useEffect(() => {

    getTasks()

  }, []);

  console.log(allTasks);

  const getTasks = async () => {
    await axios
      .get(url)
      .then(result => setAllTasks(result.data))
      .catch(err => console.log("Request canceled", err.message));
  }


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
        <input type="text" name="todo" id="todo" />
        <input type="date" name="date" id="date" />
        <button>Add</button>
      </form>
      <ul></ul>
      {
        allTasks !== undefined
          ? allTasks
            .map((todo, id) =>
              <li key={id} style={{ listStyle: "none" }}>
                <div style={{ padding: "0.7em 1em", display: "flex", alignItems: "center", justifyContent: "space-between", }}>
                  <input type="checkbox" checked={todo.isChecked ? true : false} onChange={() => updateTodo(todo._id)} />
                  <p style={{ marginLeft: "0.45em", textAlign: "left", }}>{todo.task}</p>
                  <button style={{ border: "0.1em groove red", padding: "0.2em 0.5em", borderRadius: "50%", }} onClick={() => deleteTodo(todo._id)} >X</button>
                </div>
                <hr />
              </li>)
          : null
      }
    </>
  )
}