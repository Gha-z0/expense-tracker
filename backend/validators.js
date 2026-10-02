const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

function validateExpense(body = {}) {
  const { title, amount, category, date } = body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return 'title is required';
  }
  if (title.trim().length > 100) {
    return 'title must be 100 characters or fewer';
  }
  if (typeof amount !== 'number' || amount < 0.01) {
    return 'amount must be a number of at least 0.01';
  }
  if (amount > 99999999.99) {
    return 'amount is too large';
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'date must be in YYYY-MM-DD format';
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return 'date is not a valid date';
  }

  return null;
}

module.exports = { validateExpense, ALLOWED_CATEGORIES };