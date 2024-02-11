
import { useNavigate } from "react-router"

export const AnalysisComponent = ({ count, checked, }) => {
  const navigate = useNavigate();

  return (
    <section style={{ display: "flex", justifyContent: "space-around", cursor: "pointer", }} onClick={() => navigate("/analytics")}>
      <p style={{ textAlign: 'center' }}>Tasks: <br /> #{count}</p>
      <p style={{ textAlign: 'center' }}>Completed: <br /> #{checked}</p>
      <p style={{ textAlign: 'center' }}>Pending: <br /> #{count - checked}</p>
    </section>
  )
}
