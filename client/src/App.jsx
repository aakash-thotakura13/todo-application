
import './App.css'

function InputContainer({ type, title }) {
  return (
    <div style={{ margin: "0.25em 0.5em", display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', alignItems: "center" }}>

      <label htmlFor="task" >{title || "Add Title"}</label>
      <input style={{ padding: "0.5em", }} type={type} name="task" id="task" placeholder={`Enter ${title || ""}...`} />

    </div>
  )
}

function App() {

  return (
    <>
      <h1>Hello World</h1>
      <p>Hello World</p>

      <InputContainer title="task" type="text" />
      <InputContainer title="completeBy" type="date" />

    </>
  )
}

export default App
