import axios from "axios";
import { useState, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";

import { schedulesURL, userTasks } from "../states/urlState";
import { userInfo } from "../states/userState"

import { TodoList } from "../components/TodoList";

import { ButtonElement } from "../components/htmlComponent/ButtonElement";
import { InputElement } from "../components/htmlComponent/InputElement";
import { SortButton } from "../components/htmlComponent/SortButtonElement";

import { sortingFunction } from "../functions/sortOperations";
import { getTasks } from "../functions/apiOperations";
import { allScheduleTasks } from "../states/taskStates";


const TodoForm = ({ handleSubmit }) => {
  const [todo, setTodo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ task: todo, completeBy: new Date(`${date}T${time}`) });
    setTodo(""); setDate(""); setTime("");
  };

  return (
    <form onSubmit={handleFormSubmit} method="post">
      <InputElement type="text" title="task" value={todo} setFunction={setTodo} />
      <InputElement type="date" title="date" value={date} setFunction={setDate} />
      <InputElement type="time" title="time" value={time} setFunction={setTime} />
      <ButtonElement />
    </form>
  );
};

export const AllSchedules = () => {

  const [allTasks, setAllTasks] = useRecoilState(allScheduleTasks);

  const [basedOnDate, setBasedOnDate] = useState(false);
  const [basedOnDone, setBasedOnDone] = useState(false);

  const getUserUrl = useRecoilValue(userTasks);
  const schedulesUrl = useRecoilValue(schedulesURL);
  const _userInfo = useRecoilValue(userInfo)

  useEffect(() => {
    getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
  }, []);


  // curd operations based on schedulesUrl
  const handleSubmit = async (newPost) => {
    const data = { ...newPost, user: _userInfo._id, };
    try {
      await axios.post(schedulesUrl, data);
      getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error posting todo", error);
    }
  };

  const handleDeleteTodo = async (id) => {
    const reqData = {
      id,
      user_id: _userInfo._id,
    }
    try {
      await axios.delete(`${schedulesUrl}/${id}`, { data: reqData });
      getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error deleting todo", error);
    }
  };

  const handleUpdateTodo = async (id) => {
    try {
      const specificTodo = await axios.get(`${schedulesUrl}/${id}`);
      const updatedData = {
        ...specificTodo.data,
        isChecked: !specificTodo.data.isChecked,
      };
      await axios.put(`${schedulesUrl}/${id}`, updatedData);
      getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error updating todo", error);
    }
  };


  return (
    <>

      <TodoForm handleSubmit={handleSubmit} />
      <hr style={{ margin: "0.75em" }} />

      <section style={{ display: "flex", justifyContent: "space-between" }}>

        <SortButton title="Sort" basedOn="" handleOnClick="" />

        <section>

          <SortButton
            title="Date"
            basedOn={basedOnDate}
            handleOnClick={() => sortingFunction(
              basedOnDate, setBasedOnDate, setAllTasks,
              `${getUserUrl}/schedules/${_userInfo._id}`,
              `${getUserUrl}/schedules/date/${_userInfo._id}`,
            )}
          />

          <SortButton
            title="Done"
            basedOn={basedOnDone}
            handleOnClick={() => sortingFunction(
              basedOnDone, setBasedOnDone, setAllTasks,
              `${getUserUrl}/schedules/${_userInfo._id}`,
              `${getUserUrl}/schedules/done/${_userInfo._id}`,
            )}
          />

        </section>

      </section>

      <hr style={{ margin: "0.75em" }} />
      {
        allTasks.length > 0
          ? <TodoList
            tasks={allTasks}
            deleteTodo={handleDeleteTodo}
            updateTodo={handleUpdateTodo}
          />
          : <></>
      }

    </>
  );
};
