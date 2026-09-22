const EMPLOYEES_KEY = "ecocareEmployees";
const EMPLOYEE_SESSION_KEY = "ecocareEmployeeSession";

const defaultEmployee = {
  id: "default-admin",
  name: "Administrador EcoCare",
  email: "admin@ecocare.local",
  password: "admin123",
  role: "Administrador",
  createdAt: new Date().toISOString(),
};

const loginForm = document.getElementById("login-form");
const feedback = document.getElementById("login-feedback");

function readStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function ensureDefaultEmployee() {
  const employees = readStorage(EMPLOYEES_KEY);
  const hasDefaultEmployee = employees.some((employee) => employee.email === defaultEmployee.email);

  if (!hasDefaultEmployee) {
    writeStorage(EMPLOYEES_KEY, [defaultEmployee, ...employees]);
  }
}

function setFieldError(field, message) {
  const error = field.closest(".field")?.querySelector(".error-message");
  if (error) {
    error.textContent = message;
  }
  field.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateRequiredFields(form) {
  let isValid = true;
  form.querySelectorAll("[required]").forEach((field) => {
    const message = field.value.trim() ? "" : "Preencha este campo.";
    setFieldError(field, message);
    if (message) {
      isValid = false;
    }
  });
  return isValid;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  feedback.textContent = "";

  if (!validateRequiredFields(loginForm)) {
    return;
  }

  const formData = new FormData(loginForm);
  const email = formData.get("email").trim().toLowerCase();
  const password = formData.get("password");
  const employees = readStorage(EMPLOYEES_KEY);
  const employee = employees.find(
    (item) => item.email.toLowerCase() === email && item.password === password
  );

  if (!employee) {
    feedback.textContent = "E-mail ou senha inválidos.";
    return;
  }

  localStorage.setItem(
    EMPLOYEE_SESSION_KEY,
    JSON.stringify({
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      loggedAt: new Date().toISOString(),
    })
  );

  window.location.href = "funcionario.html";
});

ensureDefaultEmployee();
