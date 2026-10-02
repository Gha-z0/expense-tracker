const express = require('express');
const router = express.Router();
const pool = require('../db');
const { validateExpense } = require('../validators');

const COLUMNS = `id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date`;

router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id) || Number(id) > 2147483647) {
    return res.status(404).json({ message: `No expense with id ${id}` });
  }
  next();
});

router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM expenses ORDER BY id`
  );
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT ${COLUMNS} FROM expenses WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: `No expense with id ${id}` });
  }
  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const error = validateExpense(req.body);
  if (error) return res.status(400).json({ message: error });

  const { title, amount, category, date } = req.body;
  const result = await pool.query(
    `INSERT INTO expenses (title, amount, category, date)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [title, amount, category, date]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const error = validateExpense(req.body);
  if (error) return res.status(400).json({ message: error });

  const { title, amount, category, date } = req.body;
  const result = await pool.query(
    `UPDATE expenses
     SET title = $1, amount = $2, category = $3, date = $4
     WHERE id = $5
     RETURNING ${COLUMNS}`,
    [title, amount, category, date, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: `No expense with id ${id}` });
  }
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `DELETE FROM expenses WHERE id = $1 RETURNING id`,
    [id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ message: `No expense with id ${id}` });
  }
  res.json({ message: `Expense ${id} deleted` });
});

module.exports = router;