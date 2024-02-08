import { TodoItem } from "./TodoItem";

export const TodoList = ({ tasks, deleteTodo, updateTodo }) => {
  return (
    <ul>
      {tasks.map((todo, id) => (
        <TodoItem
          key={id} todo={todo}
          deleteTodo={deleteTodo}
          updateTodo={updateTodo}
        />
      ))}
    </ul>
  );
};