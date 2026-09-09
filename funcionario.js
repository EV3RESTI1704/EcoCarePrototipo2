const DONATIONS_KEY = "ecocareDonations";
const ITEMS_KEY = "ecocareNeededItems";
const COMPANIES_KEY = "ecocareCompanies";

const itemForm = document.getElementById("item-form");
const donationList = document.getElementById("donation-list");
const itemList = document.getElementById("item-list");
const companyList = document.getElementById("company-list");
const statusFilter = document.getElementById("status-filter");
const companyStatusFilter = document.getElementById("company-status-filter");

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

  document.getElementById("total-donations").textContent = donations.length;
  document.getElementById("pending-donations").textContent = donations.filter(
    (donation) => donation.status === "pendente"
  ).length;
  document.getElementById("pickup-donations").textContent = donations.filter(
    (donation) => donation.delivery?.method === "retirada"
  ).length;
  document.getElementById("active-items").textContent = items.length;
  document.getElementById("registered-companies").textContent = companies.length;
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
    donationList.append(entry);
  });
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
  const selectedStatus = companyStatusFilter.value;
  const visibleCompanies = companies.filter(
    (company) => selectedStatus === "todas" || company.status === selectedStatus
  );

  companyList.innerHTML = "";

  if (!visibleCompanies.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhuma empresa encontrada para este filtro.";
    companyList.append(empty);
    return;
  }

  visibleCompanies.forEach((company) => {
    const entry = document.createElement("article");
    entry.className = "company-entry";

    const header = document.createElement("header");
    const headingGroup = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const cnpj = document.createElement("span");
    const date = document.createElement("span");
    const badge = document.createElement("span");

    title.textContent = company.legalName;
    meta.className = "meta";
    cnpj.textContent = company.cnpj;
    date.textContent = formatDate(company.createdAt);
    badge.className = "badge";
    badge.textContent = company.status;

    meta.append(cnpj, date);
    headingGroup.append(title, meta);
    header.append(headingGroup, badge);

    const details = document.createElement("div");
    details.className = "company-details";
    appendDetail(details, "Nome fantasia", company.tradeName || "Não informado");
    appendDetail(details, "Inscrição estadual", company.stateRegistration);
    appendDetail(details, "Regime tributário", company.taxRegime);
    appendDetail(details, "E-mail fiscal", company.email);
    appendDetail(details, "Telefone", company.phone);
    appendDetail(details, "Endereço", formatCompanyAddress(company));

    const actions = document.createElement("div");
    actions.className = "company-actions";
    ["pendente", "aprovada", "reprovada"].forEach((status) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = status;
      button.className = company.status === status ? "active" : "";
      button.addEventListener("click", () => updateCompanyStatus(company.id, status));
      actions.append(button);
    });

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.textContent = "Gerar prévia NF-e";
    previewButton.addEventListener("click", () => renderInvoicePreview(entry, company));
    actions.append(previewButton);

    entry.append(header, details, actions);
    companyList.append(entry);
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
  appendDetail(grid, "Status EcoCare", company.status);

  preview.append(title, grid);
  entry.append(preview);
}

function updateCompanyStatus(id, status) {
  const companies = readStorage(COMPANIES_KEY).map((company) =>
    company.id === id ? { ...company, status } : company
  );
  writeStorage(COMPANIES_KEY, companies);
  renderPage();
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

statusFilter.addEventListener("change", renderDonations);
companyStatusFilter.addEventListener("change", renderCompanies);

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

renderPage();
