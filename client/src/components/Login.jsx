import axios from "axios";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { userInfo } from "../states/userState";
import { loginURL } from "../states/urlState";
import { useNavigate } from "react-router";


export const UserNamePopup = ({ name }) => {

  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return showPopup
    ? <div style={{ textAlign: "center" }}>
      <h2>hi {name}!</h2>
      <p>Welcome to Daily Planner</p>
    </div>
    : null;
};


export const Login = () => {

  const navigate = useNavigate();
  const url = useRecoilValue(loginURL);
  const [user, setUser] = useRecoilState(userInfo);

  async function handleSubmit(e) {
    e.preventDefault();
    const user = {
      userName: e.target.username.value,
      password: e.target.password.value,
    }

    const checkUser = await axios.post(url, user);
    setUser(checkUser.data);
  }

  function redirectToSignUp() {
    navigate("/signup");
  }

  return (
    <>

      {
        user._id !== undefined
          ? <UserNamePopup name={user.userName} />
          : null
      }

      <form method="post" onSubmit={handleSubmit} >

        <div style={{ margin: "0.6em 0.1em", display: "grid", gridTemplateColumns: "0.6fr 1.4fr", alignItems: "center", }}>
          <label htmlFor="username">UserName</label>
          <input type="text" placeholder="Enter User User Name..." name="username" id="username" style={{ padding: "0.4em 0.75em", margin: "0.25em 0.5em", border: "0.2em solid #343456", borderRadius: "1em", }} />
        </div>

        <div style={{ margin: "0.6em 0.1em", display: "grid", gridTemplateColumns: "0.6fr 1.4fr", alignItems: "center", }}>
          <label htmlFor="password">Password</label>
          <input type="text" placeholder="Enter Password..." name="password" id="password" style={{ padding: "0.4em 0.75em", margin: "0.25em 0.5em", border: "0.2em solid #343456", borderRadius: "1em", }} />
        </div>

        <div style={{ width: "85%", margin: "0.15em auto", display: "grid", gridTemplateColumns: "1fr", alignItems: "center", }}>
          <button style={{ padding: "0.2em", margin: "0.5em 2em", borderRadius: "1.5em", border: "0.15em solid #656565" }}>Submit</button>
        </div>

      </form>

      <div style={{ width: "85%", margin: "0.15em auto", display: "grid", gridTemplateColumns: "1fr", alignItems: "center", }}>
        <button onClick={() => redirectToSignUp()} style={{ padding: "0.2em", margin: "0.5em 2em", borderRadius: "1.5em", border: "0.15em solid #656565" }}>SignUp</button>
      </div>

    </>
  )
};