
export const SortButton = ({ title, basedOn, handleOnClick }) => {
  return <button
    style={{
      ...inlineStyles.buttonStyle,
      backgroundColor: basedOn ? "#ffffffde" : null,
      color: basedOn ? "#242424" : null,
    }}
    onClick={typeof (handleOnClick) === "string"
      ? null
      : handleOnClick
    }
  >
    {title}
  </button>
}

const inlineStyles = {
  buttonStyle: {
    border: "0.2em solid #545454",
    borderRadius: "1em",
    fontSize: "0.9em",
    margin: "0 0.45em",
    padding: "0.25em 0.5em",
    textDecoration: "none",
  }
}
