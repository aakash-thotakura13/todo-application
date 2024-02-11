import axios, { all } from "axios";
import { useState, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";

import { todosURL, userTasks } from "../states/urlState";
import { userInfo } from "../states/userState"

import { TodoList } from "../components/TodoList";

import { AnalysisComponent } from "../components/AnalysisComponent";
import { ButtonElement } from "../components/htmlComponent/ButtonElement";
import { InputElement } from "../components/htmlComponent/InputElement";
import { SortButton } from "../components/htmlComponent/SortButtonElement";

import { getTasks } from "../functions/apiOperations";
import { sortingFunction } from "../functions/sortOperations";

import { allTodoTasks } from "../states/taskStates";


const TodoForm = ({ handleSubmit }) => {
  const [todo, setTodo] = useState("");
  const [date, setDate] = useState("");

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ task: todo, completeBy: date, });
    setTodo("");
    setDate("");
  };

  return (
    <form onSubmit={handleFormSubmit} method="post">
      <InputElement type="text" title="task" value={todo} setFunction={setTodo} />
      <InputElement type="date" title="date" value={date} setFunction={setDate} />
      <ButtonElement />
    </form>
  );
};


export const AllTodos = () => {

  const [allTasks, setAllTasks] = useRecoilState(allTodoTasks);

  const [basedOnDate, setBasedOnDate] = useState(false);
  const [basedOnDone, setBasedOnDone] = useState(false);
  const [todaysTasks, setTodaysTasks] = useState(false);
  const [previousTasks, setPreviousTasks] = useState(false);

  const getUserUrl = useRecoilValue(userTasks);
  const _userInfo = useRecoilValue(userInfo);
  const todosUrl = useRecoilValue(todosURL);

  useEffect(() => {
    getTasks(`${getUserUrl}/todos/${_userInfo._id}`, setAllTasks);
  }, []);

  const updatedTasks = allTasks
  .filter(ele => {
    if (todaysTasks) {
      return new Date(ele.completeBy).getDate() === new Date().getDate() &&
        new Date(ele.completeBy).getMonth() === new Date().getMonth() &&
        new Date(ele.completeBy).getFullYear() === new Date().getFullYear()
    } else if (previousTasks) {
      return new Date(ele.completeBy) < new Date()
    } else {
      return ele
    }
  })
  .map(ele => {
    let difference = new Date(ele.completeBy).getTime() - new Date().getTime();
    return {
      ...ele,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    }
  });

  const totalTasks = allTasks.length;
  const totalChecked = allTasks.filter(ele => ele.isChecked).length;

  // curd operations based on todosUrl
  const handleSubmit = async (newPost) => {
    const data = { ...newPost, user: _userInfo._id, };
    try {
      await axios.post(todosUrl, data);
      getTasks(`${getUserUrl}/todos/${_userInfo._id}`, setAllTasks);
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
      await axios.delete(`${todosUrl}/${id}`, { data: reqData });
      getTasks(`${getUserUrl}/todos/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error deleting todo", error);
    }
  };

  const handleUpdateTodo = async (id) => {
    try {
      const specificTodo = await axios.get(`${todosUrl}/${id}`);
      const updatedData = {
        ...specificTodo.data,
        isChecked: !specificTodo.data.isChecked,
      };
      await axios.put(`${todosUrl}/${id}`, updatedData);
      getTasks(`${getUserUrl}/todos/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error updating todo", error);
    }
  };


  return (
    <>
      {/* TODO FORM SECTION */}
      <TodoForm handleSubmit={handleSubmit} />
      <hr style={{ margin: "0.75em" }} />

      {/* ANALYSIS SECTION */}
      <AnalysisComponent count={totalTasks} checked={totalChecked} />
      <hr style={{ margin: "0.75em" }} />

      {/* SORT SECTION */}
      <section style={{ display: "grid", gridTemplateColumns: "0.2fr 1fr", }}>

        <section style={{ borderRight: "0.15em solid #afafaf", padding: "0.5em 0em", borderRadius: "1em", }}>
          <SortButton title="Sort" basedOn="" handleOnClick="" />
        </section>

        <section style={{ borderLeft: "0.15em solid #afafaf", padding: "0.5em 0em", borderRadius: "1em", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5em", }}>

          <SortButton
            title="Previous"
            basedOn={previousTasks}
            handleOnClick={() => setPreviousTasks(!previousTasks)}
          />

          <SortButton
            title="Today"
            basedOn={todaysTasks}
            handleOnClick={() => setTodaysTasks(!todaysTasks)}
          />

          <SortButton
            title="Date"
            basedOn={basedOnDate}
            handleOnClick={() => sortingFunction(
              basedOnDate, setBasedOnDate, setAllTasks,
              `${getUserUrl}/todos/${_userInfo._id}`,
              `${getUserUrl}/todos/date/${_userInfo._id}`,
            )}
          />

          <SortButton
            title="Done"
            basedOn={basedOnDone}
            handleOnClick={() => sortingFunction(
              basedOnDone, setBasedOnDone, setAllTasks,
              `${getUserUrl}/todos/${_userInfo._id}`,
              `${getUserUrl}/todos/done/${_userInfo._id}`,
            )}
          />

        </section>

      </section>

      <hr style={{ margin: "0.75em" }} />
      {
        allTasks !== undefined && allTasks.length > 0
          ? <TodoList
            tasks={updatedTasks}
            deleteTodo={handleDeleteTodo}
            updateTodo={handleUpdateTodo}
          />
          : <></>
      }

    </>
  );
};
