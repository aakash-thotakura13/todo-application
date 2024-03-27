import axios from "axios";
import { useState, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";

import { allScheduleTasks } from "../../states/taskStates";
import { schedulesURL, userTasks } from "../../states/urlState";
import { userInfo } from "../../states/userState"

import { AnalysisComponent } from "../AnalysisComponent";

import { ButtonElement } from "../htmlComponent/ButtonElement";
import { InputElement } from "../htmlComponent/InputElement";
import { SortButton } from "../htmlComponent/SortButtonElement";
import { Divider } from "../htmlComponent/DividerComponent";

import { getTasks } from "../../functions/apiOperations";
import { sortingFunction } from "../../functions/sortOperations";

import { TodoList } from "../TodoList";



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
  const [todaysTasks, setTodaysTasks] = useState(false);
  const [previousTasks, setPreviousTasks] = useState(false);

  const [displayForm, setDisplayForm] = useState(false);

  const getUserUrl = useRecoilValue(userTasks);
  const _userInfo = useRecoilValue(userInfo)
  const schedulesUrl = useRecoilValue(schedulesURL);

  useEffect(() => {
    getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
    deletePreviousTasks();
  }, []);

  const sevenDaysAgo = new Date(new Date() - 7 * 24 * 60 * 60 * 1000);

  function deletePreviousTasks() {
    const updateTask = allTasks
      .filter(ele => {
        if (ele.isChecked === true && new Date(ele.completeBy) < sevenDaysAgo) {
          handleDeleteTodo(ele._id)
        } else return ele
      })
    setAllTasks(updateTask)
  }

  const updatedTasks = allTasks
    .filter(ele => {
      if (todaysTasks) {
        return new Date(ele.completeBy).getDate() === new Date().getDate() && new Date(ele.completeBy).getMonth() === new Date().getMonth() && new Date(ele.completeBy).getFullYear() === new Date().getFullYear()
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
    })

  const totalTasks = updatedTasks.length;
  const totalChecked = updatedTasks.filter(ele => ele.isChecked).length;

  // curd operations based on schedulesUrl
  const handleSubmit = async (newPost) => {
    const data = { ...newPost, user: _userInfo._id, };
    try {
      setAllTasks([...allTasks, data]);
      await axios.post(schedulesUrl, data);
      getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error posting todo", error);
    }
    setDisplayForm(!displayForm);
  };

  const handleDeleteTodo = async (id) => {
    const reqData = {
      id,
      user_id: _userInfo._id,
    }
    try {
      setAllTasks(allTasks.filter(ele => ele._id !== id));
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
      setAllTasks(allTasks.map(ele => ele._id === id ? updatedData : ele));
      await axios.put(`${schedulesUrl}/${id}`, updatedData);
      getTasks(`${getUserUrl}/schedules/${_userInfo._id}`, setAllTasks);
    } catch (error) {
      console.error("Error updating todo", error);
    }
  };

  return (
    <>

      {/* ANALYSIS SECTION */}
      <Divider />
      <AnalysisComponent count={totalTasks} checked={totalChecked} />

      {/* SORT SECTION */}
      <Divider />
      <section style={{ display: "grid", gridTemplateColumns: "0.2fr 1fr", }}>

        <section style={{ ...styles.sortSection, ...styles.sortSectionLeft }}>
          <SortButton title="Sort" basedOn="" handleOnClick="" />
        </section>

        <section style={{ ...styles.sortSection, ...styles.sortSectionRight }}>

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

      {/* TODO FORM SECTION */}
      <Divider />
      {
        displayForm
          ? <TodoForm handleSubmit={handleSubmit} />
          : <div style={{ display: "flex" }}>
            <button
              style={{ ...styles.displayFormButtonElement }}
              onClick={() => setDisplayForm(!displayForm)}
            >
              Add
            </button>
          </div>
      }

      <Divider />
      <h3 style={{ textAlign: "right", padding: "0em 1em 0.5em", }}>
        {
          todaysTasks
            ? "Today's Tasks" : previousTasks
              ? "Previous Tasks" : "All Tasks"
        }
      </h3>
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


const styles = {
  displayFormButtonElement: {
    width: "80%",
    padding: "0.4em 0.8em",
    margin: "auto",
    border: "0.2em solid #545454",
    borderRadius: "1em",
    cursor: "pointer",
  },
  sortSection: {
    padding: "0.5em 0em",
    borderRadius: "1em",
  },
  sortSectionLeft: {
    borderRight: "0.15em solid #afafaf",
  },
  sortSectionRight: {
    borderLeft: "0.15em solid #afafaf",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.5em",
  },
}
