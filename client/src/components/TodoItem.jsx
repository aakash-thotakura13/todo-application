export const TodoItem = ({ id, todo, deleteTodo, updateTodo }) => {

  return (
    <li key={id} style={{ ...inlineStyles.listItem, backgroundColor: todo.isChecked ? "antiquewhite" : "#110101", }}>

      <input type="checkbox" checked={todo.isChecked ? true : false} onChange={() => updateTodo(todo._id)} style={{ ...inlineStyles.checkbox }} />

      <details open style={{ aspectRatio: "7/1", backgroundColor: todo.isChecked ? "antiquewhite" : "#110101", }}>
        <summary style={{
          ...inlineStyles.summary,
          textDecoration: todo.isChecked ? "#110101 line-through" : "none",
          color: todo.isChecked ? "#110101" : "antiquewhite",
          backgroundColor: todo.isChecked ? "antiquewhite" : "#110101",
        }}>
          {todo.task}
        </summary>

        <section style={{ ...inlineStyles.section, backgroundColor: todo.isChecked ? "antiquewhite" : "#110101", }}>
          <p style={{ fontSize: "0.7em", color: todo.isChecked ? "#110101" : "antiquewhite", backgroundColor: todo.isChecked ? "antiquewhite" : "#110101", }}>Date: {new Date(todo.completeBy).toLocaleDateString()}</p>
          <p style={{ fontSize: "0.7em", color: todo.isChecked ? "#110101" : "antiquewhite", backgroundColor: todo.isChecked ? "antiquewhite" : "#110101", }}>Time: {new Date(todo.completeBy).toLocaleTimeString()}</p>
        </section>
      </details>

      {todo.isChecked ? <button style={{ ...inlineStyles.button, }} onClick={() => deleteTodo(todo._id)} >X</button> : null}

    </li>
  );
};

const inlineStyles = {
  listItem: {
    padding: "0.4em",
    margin: "0.2em 0.4em",
    display: "grid",
    gridTemplateColumns: "0.1fr 1fr 0.1fr",
    alignItems: "center",
    borderTop: "0.1em solid #565445",
    borderBottom: "0.1em solid #565445",
    borderRadius: "1em",
  },
  checkbox: {
    width: "1.1em",
    height: "1.1em",
    marginRight: "0.7em",
  },
  summary: {
    cursor: "pointer",
    listStyle: "none",
  },
  section: {
    display: "flex",
    justifyContent: "space-between",
  },
  button: {
    padding: "0.2em 0.5em",
    margin: "0em 0.2em",
    border: "0.2em groove red",
    borderRadius: "50%",
  },
};
