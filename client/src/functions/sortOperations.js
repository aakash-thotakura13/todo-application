import axios from "axios";

export const sortingFunction = async (
  sort, setSort, setTasks,
  url, updatedUrl
) => {
  const arrayName = url.split("/")[4];
  try {
    setSort(!sort);
    const updated = sort ? url : updatedUrl;
    await axios.get(updated)
      .then(result => {
        let data = result.data[arrayName];
        setTasks(data);
      })
      .catch(error => console.error(error))
  } catch (error) {
    console.error("Error Sorting Based 'on date':", error);
  }
}