
export const TodoItem = ({ id, todo, deleteTodo, updateTodo }) => {
  
  return (
    <li key={id} style={{ listStyle: "none", }}>
      <div style={{ padding: "0.2em", display: "grid", gridTemplateColumns: "0.1fr 1.9fr", alignItems: "center" }}>

        <input type="checkbox" checked={todo.isChecked ? true : false} onChange={() => updateTodo(todo._id)} style={{ width: "1em", height: "1em", marginRight: "0.2em", }} />

        <div style={{ display: "grid", gridTemplateColumns: "1.9fr 0.1fr", justifyContent: "space-between", alignItems: "center", }}>

          <details open style={{ width: "100%", aspectRatio: "5/1", }}>

            <summary style={{ listStyle: "none", margin: "0.4em 0.8em", textDecoration: todo.isChecked ? "#010101 line-through" : "none", fontStyle: todo.isChecked ? "italic" : "normal", }}>
              {todo.task}
            </summary>

            <section style={{ display: "flex", justifyContent: "space-between", margin: "0.4em 0.8em", }}>
              <p style={{ fontSize: "0.7em", textAlign: "left", }}>Date: {new Date(todo.completeBy).toLocaleDateString()}</p>
              <p style={{ fontSize: "0.7em", textAlign: "right", }}>Time: {new Date(todo.completeBy).toLocaleTimeString()}</p>
            </section>

          </details>

          <button style={{ border: "0.1em groove red", padding: "0.2em 0.5em", borderRadius: "50%", }} onClick={() => deleteTodo(todo._id)} >X</button>

        </div>

      </div>

      <hr style={{ margin: "0em 2em", }} />

    </li>
  );
};