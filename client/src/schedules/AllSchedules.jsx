import React from "react";
import axios from "axios";

export const AllSchedules = () => {

  const [allTasks, setAllTasks] = React.useState();

  React.useEffect(() => {

    getTasks()

  }, []);

  const getTasks = () => {
    const source = axios.CancelToken.source();;

    axios
      .get("http://localhost:3000/todos", {
        cancelToken: source.token
      })
      .then(result => {
        // console.log(result)
        setAllTasks(result.data)
      })
      .then(() => source.cancel('Request canceled by the user!'))
      .catch(err => {
        axios.isCancel(err)
          ? console.log("Request canceled", err.message)
          : console.log("Request accepted")
      });
  }

  console.log(allTasks)

  return (
    <>
      <p>need to add schedules http requests</p>
    </>
  )
}