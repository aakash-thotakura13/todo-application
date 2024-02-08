import axios from "axios";
import { useState, useEffect } from "react";
import { useRecoilValue } from "recoil";

import { todosURL, userTasks } from "../states/urlState";
import { userInfo } from "../states/userState"

import { TodoList } from "../components/TodoList";

import { ButtonElement } from "../components/htmlComponent/ButtonElement";
import { InputElement } from "../components/htmlComponent/InputElement";
import { SortButton } from "../components/htmlComponent/SortButtonElement";

import { sortingFunction } from "../functions/sortOperations";
import { getTasks } from "../functions/apiOperations";


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

  const [allTasks, setAllTasks] = useState([]);

  const [basedOnDate, setBasedOnDate] = useState(false);
  const [basedOnDone, setBasedOnDone] = useState(false);

  const getUserUrl = useRecoilValue(userTasks);
  const todosUrl = useRecoilValue(todosURL);
  const _userInfo = useRecoilValue(userInfo);

  useEffect(() => {
    getTasks(`${getUserUrl}/todos/${_userInfo._id}`, setAllTasks);
  }, []);


  // curd operations based on todosUrl
  const handleSubmit = async (newPost) => {
    console.log(newPost)
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
            tasks={allTasks}
            deleteTodo={handleDeleteTodo}
            updateTodo={handleUpdateTodo}
          />
          : <></>
      }

    </>
  );
};
