
export const ButtonElement = () => {
  return <button style={{ ...inlineStyle.buttonContainer }}>Add</button>
}

const inlineStyle = {
  buttonContainer: {
    borderRadius: "1em",
    padding: "0.4em 0.8em",
    border: "0.2em solid #545454",
  }
}