require('dotenv').config();
const express = require("epxress");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlendcoded({ extended: true }));
app.use(express.json());


app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
})
