import React from "react";
import axios from "axios";

const url = `https://todo-application-personal-use.onrender.com/todos`;

export const AllTodos = () => {

  const [allTasks, setAllTasks] = React.useState();


  React.useEffect(() => {

    getTasks()

  }, []);

  console.log(allTasks);

  const getTasks = () => {
    const source = axios.CancelToken.source();;

    axios
      .get(url, {
        cancelToken: source.token
      })
      .then(result => {
        // console.log(result)
        setAllTasks(result.data)
      })
      // .then(() => source.cancel('Request canceled by the user!'))
      .catch(err => {
        axios.isCancel(err)
          ? console.log("Request canceled", err.message)
          : console.log("Request accepted")
      });
  }


  async function deleteTodo(id) {
    const deleteResponse = await axios.delete(`${url}/${id}`);
    console.log(deleteResponse);
    getTasks()
  }

  async function handleSubmit(e) { // posting todos
    e.preventDefault();
    console.log("todo posted!");
    let newPost = {
      task: e.target.todo.value,
      date: e.target.date.value
    }
    const postResponse = await axios.post(url, newPost);
    console.log(postResponse);
    getTasks()
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