import axios from "axios";
import { useRecoilValue } from "recoil";
import { schedulesURL } from "../states/urlState";

export const getTasks = async (url, setTasks) => {
  const arrayName = url.split("/")[4]
  
  try {
    await axios.get(url)
      .then(result => {
        let data = result.data[arrayName]
        typeof (result.data) === "string"
          ? setTasks([])
          : setTasks(data);
      })
      .catch(error => {
        console.log("Error Fetching Data", error);
        setTasks([]);
      })
  } catch (error) {
    console.log("Error Fetching Data", error);
    setTasks([]);
  }
};


export const postTask = async () => {
  let url = useRecoilValue(schedulesURL);
  console.log(url);
}

