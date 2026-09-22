const DONATIONS_KEY = "ecocareDonations";
const ITEMS_KEY = "ecocareNeededItems";
const COMPANIES_KEY = "ecocareCompanies";
const STOCK_KEY = "ecocareStock";
const EMPLOYEES_KEY = "ecocareEmployees";
const EMPLOYEE_SESSION_KEY = "ecocareEmployeeSession";

const itemForm = document.getElementById("item-form");
const employeeForm = document.getElementById("employee-form");
const donationList = document.getElementById("donation-list");
const itemList = document.getElementById("item-list");
const companyList = document.getElementById("company-list");
const stockList = document.getElementById("stock-list");
const employeeList = document.getElementById("employee-list");
const employeeFeedback = document.getElementById("employee-feedback");
const statusFilter = document.getElementById("status-filter");
const adminTabs = document.querySelectorAll("[data-admin-tab]");
const adminPanels = document.querySelectorAll(".admin-tab-panel");

const defaultEmployee = {
  id: "default-admin",
  name: "Administrador EcoCare",
  email: "admin@ecocare.local",
  password: "admin123",
  role: "Administrador",
  createdAt: new Date().toISOString(),
};

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(EMPLOYEE_SESSION_KEY));
  } catch {
    return null;
  }
}

function ensureDefaultEmployee() {
  const employees = readStorage(EMPLOYEES_KEY);
  const hasDefaultEmployee = employees.some((employee) => employee.email === defaultEmployee.email);

  if (!hasDefaultEmployee) {
    writeStorage(EMPLOYEES_KEY, [defaultEmployee, ...employees]);
  }
}

function requireEmployeeSession() {
  ensureDefaultEmployee();
  const session = readSession();

  if (!session?.employeeId) {
    window.location.href = "login.html";
    return null;
  }

  document.getElementById("session-employee-name").textContent = session.name;
  return session;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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

function updateSummary() {
  const donations = readStorage(DONATIONS_KEY);
  const items = readStorage(ITEMS_KEY);
  const companies = readStorage(COMPANIES_KEY);
  const stock = readStorage(STOCK_KEY);
  const employees = readStorage(EMPLOYEES_KEY);

  document.getElementById("total-donations").textContent = donations.length;
  document.getElementById("pending-donations").textContent = donations.filter(
    (donation) => donation.status === "pendente"
  ).length;
  document.getElementById("pickup-donations").textContent = donations.filter(
    (donation) => donation.delivery?.method === "retirada"
  ).length;
  document.getElementById("active-items").textContent = items.length;
  document.getElementById("registered-companies").textContent = companies.length;
  document.getElementById("stock-total").textContent = stock.length;
  document.getElementById("employee-total").textContent = employees.length;
}

function getDonationAmount(donation) {
  if (typeof donation.quantityAmount === "number") {
    return donation.quantityAmount;
  }

  const parsedAmount = Number.parseFloat(String(donation.quantity || "").replace(",", "."));
  return Number.isFinite(parsedAmount) ? parsedAmount : 0;
}

function getDonationUnit(donation) {
  if (donation.quantityUnit) {
    return donation.quantityUnit;
  }

  const quantityText = String(donation.quantity || "");
  if (quantityText.includes("kg")) return "kg";
  if (quantityText.includes("L")) return "L";
  return "un";
}

function renderDonations() {
  const donations = readStorage(DONATIONS_KEY);
  const selectedStatus = statusFilter.value;
  const visibleDonations = donations.filter(
    (donation) => selectedStatus === "todas" || donation.status === selectedStatus
  );

  donationList.innerHTML = "";

  if (!visibleDonations.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhuma doação encontrada para este filtro.";
    donationList.append(empty);
    return;
  }

  visibleDonations.forEach((donation) => {
    const entry = document.createElement("article");
    entry.className = "donation-entry";

    const deliveryText = donation.delivery
      ? donation.delivery.method === "retirada"
        ? donation.delivery.date && donation.delivery.time
          ? `Retirada em ${donation.delivery.date} as ${donation.delivery.time}`
          : "Retirada solicitada, aguardando contato"
        : `${donation.delivery.pointName || "Entrega em ponto de coleta"} - ${
            donation.delivery.address || "endereço não informado"
          }`
      : "Entrega ainda nao definida";

    const header = document.createElement("header");
    const headingGroup = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const contact = document.createElement("span");
    const date = document.createElement("span");
    const badge = document.createElement("span");
    const help = document.createElement("p");
    const delivery = document.createElement("p");

    title.textContent = donation.name;
    meta.className = "meta";
    contact.textContent = donation.contact;
    date.textContent = formatDate(donation.createdAt);
    badge.className = "badge";
    badge.textContent = donation.status;
    help.textContent = `Ajuda: ${donation.type} - ${donation.quantity}`;
    delivery.textContent = `Entrega: ${deliveryText}`;

    meta.append(contact, date);
    headingGroup.append(title, meta);
    header.append(headingGroup, badge);
    entry.append(header, help, delivery);

    if (donation.receipt) {
      const receipt = document.createElement("p");
      receipt.textContent = `Nota: ${donation.receipt.number} - Código: ${donation.receipt.pickupCode}`;
      entry.append(receipt);
    }

    if (donation.message) {
      const message = document.createElement("p");
      message.textContent = `Mensagem: ${donation.message}`;
      entry.append(message);
    }

    const actions = document.createElement("div");
    actions.className = "donation-actions";
    ["pendente", "em contato", "concluida"].forEach((status) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = status;
      button.className = donation.status === status ? "active" : "";
      button.addEventListener("click", () => updateDonationStatus(donation.id, status));
      actions.append(button);
    });

    entry.append(actions);

    if (donation.receipt) {
      entry.append(createStockDropForm(donation));
    }

    donationList.append(entry);
  });
}

function createStockDropForm(donation) {
  const wrapper = document.createElement("div");
  const status = document.createElement("p");

  status.className = "stock-status";

  if (donation.stockEntryId) {
    status.textContent = "Baixa realizada. Item já inserido no estoque.";
    wrapper.append(status);
    return wrapper;
  }

  const form = document.createElement("form");
  const input = document.createElement("input");
  const button = document.createElement("button");

  form.className = "stock-drop-form";
  input.type = "text";
  input.name = "invoiceCode";
  input.placeholder = "Código da NF";
  input.setAttribute("aria-label", `Código da NF para dar baixa na doação ${donation.receipt.number}`);
  button.type = "submit";
  button.textContent = "Dar baixa no estoque";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invoiceCode = input.value.trim().toUpperCase();
    const expectedCode = donation.receipt.number.toUpperCase();

    if (invoiceCode !== expectedCode) {
      status.textContent = "Código inválido. Informe o número da NF de doação.";
      return;
    }

    addDonationToStock(donation.id);
  });

  form.append(input, button);
  wrapper.append(form, status);
  return wrapper;
}

function addDonationToStock(donationId) {
  const donations = readStorage(DONATIONS_KEY);
  const donation = donations.find((item) => item.id === donationId);

  if (!donation || !donation.receipt || donation.stockEntryId) {
    return;
  }

  const stockEntry = {
    id: createId(),
    donationId: donation.id,
    invoiceCode: donation.receipt.number,
    companyId: donation.companyId || null,
    companyName: donation.companyName || "Sem empresa vinculada",
    classification: donation.type,
    amount: getDonationAmount(donation),
    unit: getDonationUnit(donation),
    donorName: donation.name,
    createdAt: new Date().toISOString(),
  };

  const stock = readStorage(STOCK_KEY);
  writeStorage(STOCK_KEY, [stockEntry, ...stock]);
  writeStorage(
    DONATIONS_KEY,
    donations.map((item) =>
      item.id === donation.id ? { ...item, status: "concluida", stockEntryId: stockEntry.id } : item
    )
  );
  renderPage();
}

function updateDonationStatus(id, status) {
  const donations = readStorage(DONATIONS_KEY).map((donation) =>
    donation.id === id ? { ...donation, status } : donation
  );
  writeStorage(DONATIONS_KEY, donations);
  renderPage();
}

function renderItems() {
  const items = readStorage(ITEMS_KEY);
  itemList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum item necessário cadastrado.";
    itemList.append(empty);
    return;
  }

  items.forEach((item) => {
    const entry = document.createElement("article");
    entry.className = "item-entry";

    const image = document.createElement("img");
    image.src = item.image || "donation-supplies.png";
    image.alt = `Imagem do item ${item.name}`;
    image.onerror = () => {
      image.src = "donation-supplies.png";
    };

    const content = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const category = document.createElement("span");
    const quantity = document.createElement("span");

    title.textContent = item.name;
    meta.className = "meta";
    category.textContent = item.category;
    quantity.textContent = item.quantity;
    meta.append(category, quantity);
    content.append(title, meta);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-item";
    removeButton.type = "button";
    removeButton.textContent = "Remover";
    removeButton.addEventListener("click", () => removeItem(item.id));

    entry.append(image, content, removeButton);
    itemList.append(entry);
  });
}

function renderCompanies() {
  const companies = readStorage(COMPANIES_KEY);

  companyList.innerHTML = "";

  if (!companies.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhuma empresa cadastrada.";
    companyList.append(empty);
    return;
  }

  companies.forEach((company) => {
    const entry = document.createElement("article");
    entry.className = "company-entry";

    const header = document.createElement("header");
    const headingGroup = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const cnpj = document.createElement("span");
    const date = document.createElement("span");

    title.textContent = company.legalName;
    meta.className = "meta";
    cnpj.textContent = company.cnpj;
    date.textContent = formatDate(company.createdAt);

    meta.append(cnpj, date);
    headingGroup.append(title, meta);
    header.append(headingGroup);

    const details = document.createElement("div");
    details.className = "company-details";
    appendDetail(details, "Nome fantasia", company.tradeName || "Não informado");
    appendDetail(details, "Inscrição estadual", company.stateRegistration);
    appendDetail(details, "Regime tributário", company.taxRegime);
    appendDetail(details, "E-mail fiscal", company.email);
    appendDetail(details, "Telefone", company.phone);
    appendDetail(details, "Endereço", formatCompanyAddress(company));

    const previewButton = document.createElement("button");
    const actions = document.createElement("div");
    actions.className = "company-actions";
    previewButton.type = "button";
    previewButton.textContent = "Ver prévia NF-e";
    previewButton.addEventListener("click", () => renderInvoicePreview(entry, company));
    actions.append(previewButton);

    entry.append(header, details, actions);
    companyList.append(entry);
  });
}

function renderStock() {
  const stock = readStorage(STOCK_KEY);
  stockList.innerHTML = "";

  if (!stock.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum item em estoque. Dê baixa em uma doação confirmada usando o código da NF.";
    stockList.append(empty);
    return;
  }

  const groupedStock = stock.reduce((groups, item) => {
    const key = `${item.classification}|${item.unit}`;
    if (!groups[key]) {
      groups[key] = {
        classification: item.classification,
        unit: item.unit,
        amount: 0,
        entries: 0,
      };
    }
    groups[key].amount += Number(item.amount) || 0;
    groups[key].entries += 1;
    return groups;
  }, {});

  Object.values(groupedStock).forEach((item) => {
    const entry = document.createElement("article");
    const title = document.createElement("h3");
    const grid = document.createElement("div");

    entry.className = "stock-entry";
    title.textContent = item.classification;
    grid.className = "stock-grid";
    appendDetail(grid, "Quantidade total", `${item.amount} ${item.unit}`);
    appendDetail(grid, "Classificação", item.classification);
    appendDetail(grid, "Lançamentos", String(item.entries));
    appendDetail(grid, "Unidade", item.unit);

    entry.append(title, grid);
    stockList.append(entry);
  });
}

function renderEmployees() {
  const employees = readStorage(EMPLOYEES_KEY);
  employeeList.innerHTML = "";

  if (!employees.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum funcionário cadastrado.";
    employeeList.append(empty);
    return;
  }

  employees.forEach((employee) => {
    const entry = document.createElement("article");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const email = document.createElement("span");
    const role = document.createElement("span");
    const createdAt = document.createElement("span");

    entry.className = "employee-entry";
    title.textContent = employee.name;
    meta.className = "meta";
    email.textContent = employee.email;
    role.textContent = employee.role || "Funcionário";
    createdAt.textContent = formatDate(employee.createdAt);
    meta.append(email, role, createdAt);
    entry.append(title, meta);
    employeeList.append(entry);
  });
}

function appendDetail(container, label, value) {
  const detail = document.createElement("span");
  const strong = document.createElement("strong");
  const text = document.createElement("span");

  strong.textContent = label;
  text.textContent = value || "Não informado";
  detail.append(strong, text);
  container.append(detail);
}

function formatCompanyAddress(company) {
  const address = company.address || {};
  return `${address.street || ""}, ${address.number || "s/n"} - ${address.district || ""}, ${
    address.city || ""
  }/${address.state || ""} - CEP ${address.zipCode || ""}`;
}

function renderInvoicePreview(entry, company) {
  entry.querySelector(".invoice-preview")?.remove();

  const preview = document.createElement("section");
  preview.className = "invoice-preview";
  preview.setAttribute("aria-label", `Prévia fiscal de ${company.legalName}`);

  const title = document.createElement("h4");
  title.textContent = "Prévia de dados para NF-e";

  const grid = document.createElement("div");
  grid.className = "invoice-grid";
  appendDetail(grid, "Emitente/Destinatário", company.legalName);
  appendDetail(grid, "CNPJ", company.cnpj);
  appendDetail(grid, "Inscrição estadual", company.stateRegistration);
  appendDetail(grid, "Regime tributário", company.taxRegime);
  appendDetail(grid, "CNAE", company.cnae || "Não informado");
  appendDetail(grid, "Endereço fiscal", formatCompanyAddress(company));
  appendDetail(grid, "Responsável", `${company.responsible?.name || ""} - ${company.responsible?.role || ""}`);
  appendDetail(grid, "Cadastro EcoCare", "Registrado");

  preview.append(title, grid);
  entry.append(preview);
}

function removeItem(id) {
  const shouldRemove = window.confirm("Remover este item da lista de necessidades?");
  if (!shouldRemove) {
    return;
  }

  const items = readStorage(ITEMS_KEY).filter((item) => item.id !== id);
  writeStorage(ITEMS_KEY, items);
  renderPage();
}

function renderPage() {
  updateSummary();
  renderDonations();
  renderItems();
  renderCompanies();
  renderStock();
  renderEmployees();
}

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateRequiredFields(itemForm)) {
    return;
  }

  const formData = new FormData(itemForm);
  const items = readStorage(ITEMS_KEY);
  const item = {
    id: createId(),
    name: formData.get("name").trim(),
    category: formData.get("category"),
    quantity: formData.get("quantity").trim(),
    image: formData.get("image").trim() || "donation-supplies.png",
  };

  writeStorage(ITEMS_KEY, [item, ...items]);
  itemForm.reset();
  renderPage();
});

employeeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  employeeFeedback.textContent = "";

  if (!validateRequiredFields(employeeForm)) {
    return;
  }

  const formData = new FormData(employeeForm);
  const employees = readStorage(EMPLOYEES_KEY);
  const email = formData.get("email").trim().toLowerCase();
  const password = formData.get("password");
  const duplicatedEmployee = employees.some((employee) => employee.email.toLowerCase() === email);

  if (duplicatedEmployee) {
    setFieldError(document.getElementById("new-employee-email"), "Este e-mail já está cadastrado.");
    return;
  }

  if (password.length < 6) {
    setFieldError(document.getElementById("new-employee-password"), "A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  const employee = {
    id: createId(),
    name: formData.get("name").trim(),
    email,
    password,
    role: formData.get("role").trim(),
    createdAt: new Date().toISOString(),
  };

  writeStorage(EMPLOYEES_KEY, [employee, ...employees]);
  employeeForm.reset();
  employeeFeedback.textContent = "Funcionário cadastrado com sucesso.";
  renderPage();
});

statusFilter.addEventListener("change", renderDonations);

adminTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetId = tab.dataset.adminTab;

    adminTabs.forEach((currentTab) => {
      currentTab.classList.toggle("active", currentTab === tab);
    });

    adminPanels.forEach((panel) => {
      panel.hidden = panel.id !== targetId;
      panel.classList.toggle("active", panel.id === targetId);
    });
  });
});

document.getElementById("clear-completed").addEventListener("click", () => {
  const donations = readStorage(DONATIONS_KEY);
  const completedCount = donations.filter((donation) => donation.status === "concluida").length;

  if (!completedCount) {
    return;
  }

  const shouldClear = window.confirm(`Remover ${completedCount} doação(ões) concluída(s)?`);
  if (!shouldClear) {
    return;
  }

  writeStorage(
    DONATIONS_KEY,
    donations.filter((donation) => donation.status !== "concluida")
  );
  renderPage();
});

document.getElementById("logout-button").addEventListener("click", () => {
  localStorage.removeItem(EMPLOYEE_SESSION_KEY);
  window.location.href = "login.html";
});

if (requireEmployeeSession()) {
  renderPage();
}
