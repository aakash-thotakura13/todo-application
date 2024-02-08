
export const InputElement = ({ type, title,  value, setFunction }) => {
  return <div style={{ ...inlineStyle.divContainer }}>
    <label htmlFor={title}>{title.toUpperCase()[0] + title.slice(1)}: </label>
    <input
      type={type}
      name={title}
      id={title}
      value={value}
      placeholder={`Enter your ${title}`}
      style={{ ...inlineStyle.inputContainer }}
      onChange={e => setFunction(e.target.value)}
      autoComplete="off"
    />
  </div>
}

const inlineStyle = {
  divContainer: {
    margin: "0.5em 0.2em",
    display: "grid",
    gridTemplateColumns: "0.4fr 1.6fr",
    alignItems: "center",
  },
  inputContainer: {
    padding: "0.5em",
    border: "0.2em solid #545453",
    borderRadius: "1em",
  }
}