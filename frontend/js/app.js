const API_URL = "http://localhost:3000/api/expenses";

const CATEGORY_COLORS = {
    Food: "success",
    Transport: "primary",
    Bills: "danger",
    Entertainment: "warning",
    Other: "secondary",
};

let expenses = [];
let sortKey = null;
let sortDir = "asc";

// ---------- API & Helpers ----------

async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || `Server error (${response.status})`);
    }
    return data;
}

function getExpenses() {
    return request(API_URL);
}

function showSpinner(visible) {
    document.getElementById("spinner").classList.toggle("d-none", !visible);
}

function showAlert(message, type = "danger", areaId = "alert-area") {
    const div = document.createElement("div");
    div.className = `alert alert-${type} alert-dismissible fade show`;
    div.setAttribute("role", "alert");
    div.textContent = message;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close";
    close.setAttribute("data-bs-dismiss", "alert");
    close.setAttribute("aria-label", "Close");
    div.appendChild(close);

    document.getElementById(areaId).replaceChildren(div);
}

function errorMessage(err) {
    if (err instanceof TypeError) {
        return "Cannot reach the server. Is the backend running?";
    }
    return err.message;
}

// ---------- Rendering ----------

function renderTable(list) {
    const body = document.getElementById("expense-body");
    body.replaceChildren();

    if (list.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "text-center text-muted py-4";
        cell.textContent = "No expenses yet.";
        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    for (const expense of list) {
        const row = document.createElement("tr");

        const title = document.createElement("td");
        title.textContent = expense.title;

        const amount = document.createElement("td");
        amount.textContent = expense.amount.toFixed(2);

        const category = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `badge text-bg-${CATEGORY_COLORS[expense.category] || "secondary"}`;
        badge.textContent = expense.category;
        category.appendChild(badge);

        const date = document.createElement("td");
        date.textContent = expense.date;

        const actions = document.createElement("td");
        actions.className = "text-end";

        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-sm btn-outline-primary me-2 edit-btn";
        editBtn.textContent = "Edit";
        editBtn.dataset.id = expense.id;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-sm btn-outline-danger delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.id = expense.id;

        actions.append(editBtn, deleteBtn);
        row.append(title, amount, category, date, actions);
        body.appendChild(row);
    }
}

function renderSummary(list) {
    const total = list.reduce((sum, e) => sum + e.amount, 0);
    const highest = list.reduce((max, e) => Math.max(max, e.amount), 0);

    document.getElementById("total-amount").textContent = total.toFixed(2);
    document.getElementById("expense-count").textContent = list.length;
    document.getElementById("highest-amount").textContent = highest.toFixed(2);
}

// ---------- Refresh ----------

async function refresh() {
    showSpinner(true);
    try {
        expenses = await getExpenses();
        renderSummary(expenses);
        applyFilter();
    } catch (err) {
        showAlert(errorMessage(err));
    } finally {
        showSpinner(false);
    }
}

// ---------- Form helpers ----------

const FIELDS = ["title", "amount", "category", "date"];

function validateForm(values) {
    const errors = {};
    const title = values.title.trim();
    const amount = Number(values.amount);

    if (!title) errors.title = "Title is required.";
    else if (title.length > 100) errors.title = "Title must be 100 characters or fewer.";

    if (!(amount >= 0.01)) errors.amount = "Amount must be at least 0.01.";
    else if (amount > 99999999.99) errors.amount = "Amount is too large.";

    if (!values.category) errors.category = "Choose a category.";
    if (!values.date) errors.date = "Date is required.";
    return errors;
}

function showFieldErrors(formEl, errors, prefix = "") {
    for (const field of FIELDS) {
        formEl.elements[field].classList.toggle("is-invalid", Boolean(errors[field]));
        document.getElementById(`${prefix}${field}-error`).textContent = errors[field] || "";
    }
}

function readForm(formEl) {
    return {
        title: formEl.elements.title.value,
        amount: formEl.elements.amount.value,
        category: formEl.elements.category.value,
        date: formEl.elements.date.value,
    };
}

function toPayload(values) {
    return {
        title: values.title.trim(),
        amount: Number(values.amount),
        category: values.category,
        date: values.date,
    };
}

// ---------- Add form ----------

const form = document.getElementById("expense-form");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const values = readForm(form);
    const errors = validateForm(values);
    showFieldErrors(form, errors);
    if (Object.keys(errors).length > 0) return;

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
        await request(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toPayload(values)),
        });
        form.reset();
        showAlert("Expense added.", "success");
        await refresh();
    } catch (err) {
        showAlert(errorMessage(err));
    } finally {
        submitBtn.disabled = false;
    }
});

// ---------- Filter ----------

function getVisibleExpenses() {
    const category = document.getElementById("filter-category").value;
    const search = document.getElementById("search-title").value.trim().toLowerCase();

    // filter() returns a new array, so sort() below cannot change `expenses`
    const list = expenses.filter(
        (e) => (!category || e.category === category) && e.title.toLowerCase().includes(search)
    );

    if (sortKey) {
        list.sort((a, b) => {
            const x = a[sortKey];
            const y = b[sortKey];
            const result = typeof x === "number" ? x - y : x.localeCompare(y);
            return sortDir === "asc" ? result : -result;
        });
    }
    return list;
}

function applyFilter() {
    renderTable(getVisibleExpenses());
}

document.getElementById("filter-category").addEventListener("change", applyFilter);
document.getElementById("search-title").addEventListener("input", applyFilter);

document.querySelector("thead").addEventListener("click", (event) => {
    const th = event.target.closest("th[data-sort]");
    if (!th) return;

    if (sortKey !== th.dataset.sort) {
        sortKey = th.dataset.sort;
        sortDir = "asc";
    } else if (sortDir === "asc") {
        sortDir = "desc"; //
    } else {
        sortKey = null; //
    }

    document.querySelectorAll("th[data-sort]").forEach((h) => h.removeAttribute("aria-sort"));
    if (sortKey) {
        th.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
    }
    applyFilter();
});

// ---------- Edit modal ----------

const editModal = new bootstrap.Modal(document.getElementById("edit-modal"));
const editForm = document.getElementById("edit-form");
let editingId = null;

function openEditModal(expense) {
    editingId = expense.id;
    editForm.elements.title.value = expense.title;
    editForm.elements.amount.value = expense.amount;
    editForm.elements.category.value = expense.category;
    editForm.elements.date.value = expense.date;
    showFieldErrors(editForm, {}, "edit-");
    document.getElementById("edit-alert-area").replaceChildren();
    editModal.show();
}

editForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const values = readForm(editForm);
    const errors = validateForm(values);
    showFieldErrors(editForm, errors, "edit-");
    if (Object.keys(errors).length > 0) return;

    const saveBtn = editForm.querySelector("button[type=submit]");
    saveBtn.disabled = true;
    try {
        await request(`${API_URL}/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toPayload(values)),
        });
        editModal.hide();
        showAlert("Expense updated.", "success");
        await refresh();
    } catch (err) {
        showAlert(errorMessage(err), "danger", "edit-alert-area");
    } finally {
        saveBtn.disabled = false;
    }
});

// ---------- Row buttons (edit and delete) ----------

document.getElementById("expense-body").addEventListener("click", async (event) => {
    const editBtn = event.target.closest(".edit-btn");
    if (editBtn) {
        const expense = expenses.find((e) => e.id === Number(editBtn.dataset.id));
        if (expense) openEditModal(expense);
        return;
    }

    const deleteBtn = event.target.closest(".delete-btn");
    if (!deleteBtn) return;
    if (!confirm("Delete this expense?")) return;

    try {
        await request(`${API_URL}/${deleteBtn.dataset.id}`, { method: "DELETE" });
        await refresh();
    } catch (err) {
        showAlert(errorMessage(err));
    }
});

// ---------- Export CSV ----------

function toCsvCell(value) {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv() {
    const list = getVisibleExpenses();
    if (list.length === 0) {
        showAlert("Nothing to export.", "warning");
        return;
    }

    const lines = ["title,amount,category,date"];
    for (const e of list) {
        lines.push([e.title, e.amount.toFixed(2), e.category, e.date].map(toCsvCell).join(","));
    }

    // "\uFEFF" at the start tells Excel the file is UTF-8 (needed for Arabic titles)
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // let the download start first
}

document.getElementById("export-csv").addEventListener("click", exportCsv);

refresh();