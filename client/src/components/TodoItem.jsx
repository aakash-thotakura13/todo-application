export const TodoItem = ({ id, todo, deleteTodo, updateTodo }) => {

  const dyanamicStyling = {
    bgClr: {
      backgroundColor: todo.isChecked
        ? "antiquewhite" : new Date(todo.completeBy) < new Date()
          ? "#510101" : "#110101",
    },
    textClr: {
      color: todo.isChecked ? "#110101" : "antiquewhite",
    }
  };

  return (
    <li key={id} style={{
      ...staticStyling.listItem,
      ...dyanamicStyling.bgClr,
    }}>

      <input
        type="checkbox"
        checked={todo.isChecked ? true : false}
        onChange={() => updateTodo(todo._id)}
        style={{ ...staticStyling.checkbox }}
      />

      <details
        open={todo.isChecked ? false : true}
        style={{ aspectRatio: "7/1", ...dyanamicStyling.bgClr, }}>
        <summary
          style={{
            ...staticStyling.summary,
            ...dyanamicStyling.bgClr,
            ...dyanamicStyling.textClr,
            textDecoration: todo.isChecked ? "#110101 line-through" : "none",
          }}>
          {todo.task}
        </summary>

        <section
          style={{
            ...staticStyling.section, ...dyanamicStyling.bgClr,
          }}>
          <p
            style={{
              fontSize: "0.7em",
              ...dyanamicStyling.textClr, ...dyanamicStyling.bgClr,
            }}>
            Date: {new Date(todo.completeBy).toLocaleDateString()}
          </p>
          <p
            style={{
              fontSize: "0.7em",
              ...dyanamicStyling.textClr, ...dyanamicStyling.bgClr,
            }}>
            Time: {new Date(todo.completeBy).toLocaleTimeString()}
          </p>
        </section>
      </details>

      {
        todo.isChecked
          ? <button
            style={{ ...staticStyling.button, }}
            onClick={() => deleteTodo(todo._id)} >
            X
          </button>
          : null
      }

    </li>
  );
};

const staticStyling = {
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
