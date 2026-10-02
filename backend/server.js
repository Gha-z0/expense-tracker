require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const expensesRouter = require('./routes/expenses');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/expenses', expensesRouter);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    message: status === 500 ? 'Server error' : err.message,
  });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));