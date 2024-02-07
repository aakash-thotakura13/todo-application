
import { useNavigate } from "react-router";
import { signUpURL } from "../states/urlState";
import { useRecoilValue } from "recoil";
import axios from "axios";

export const SignUp = () => {

  const navigate = useNavigate();
  const url = useRecoilValue(signUpURL);

  async function handleSubmit(e) {
    e.preventDefault();

    const newUser = {
      fullName: e.target.fullName.value,
      userName: e.target.username.value,
      password: e.target.password.value,
    }
    await axios.post(url, newUser);
    e.target.reset();

  }

  function redirectToLogin() {
    navigate("/login");
  }

  return (
    <>

      <form method="post" onSubmit={handleSubmit} >

        <div style={{ ...inlineStyles.divContainer }}>
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            placeholder="Enter Full Name..."
            name="fullName"
            id="fullName"
            style={{ ...inlineStyles.inputContainer }} />
        </div>

        <div style={{ ...inlineStyles.divContainer }}>
          <label htmlFor="username">UserName</label>
          <input
            type="text"
            placeholder="Enter User Name..."
            name="username"
            id="username"
            style={{ ...inlineStyles.inputContainer }} />
        </div>

        <div style={{ ...inlineStyles.divContainer }}>
          <label htmlFor="password">Password</label>
          <input
            type="text"
            placeholder="Enter Password..."
            name="password"
            id="password"
            style={{ ...inlineStyles.inputContainer }} />
        </div>

        <div style={{ ...inlineStyles.divButtonContainer }}>
          <button style={{ ...inlineStyles.buttonContainer }}>Submit</button>
        </div>

      </form>

      <div style={{ ...inlineStyles.divButtonContainer }}>
        <button
          onClick={() => redirectToLogin()}
          style={{ ...inlineStyles.buttonContainer }}>Login</button>
      </div>

    </>
  )
};

const inlineStyles = {
  divContainer: {
    margin: "0.6em 0.1em", display: "grid", gridTemplateColumns: "0.6fr 1.4fr", alignItems: "center",
  },
  inputContainer: {
    padding: "0.4em 0.75em", margin: "0.25em 0.5em", border: "0.2em solid #343456", borderRadius: "1em",
  },
  divButtonContainer: {
    width: "85%", margin: "0.15em auto", display: "grid", gridTemplateColumns: "1fr", alignItems: "center",
  },
  buttonContainer: {
    padding: "0.2em", margin: "0.5em 2em", borderRadius: "1.5em", border: "0.15em solid #656565"
  }
}