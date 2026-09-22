const DONATIONS_KEY = "ecocareDonations";
const ITEMS_KEY = "ecocareNeededItems";
const COMPANIES_KEY = "ecocareCompanies";
const ACTIVE_COMPANY_KEY = "ecocareActiveCompanyId";

const fallbackItems = [
  {
    id: "food",
    name: "Alimentos nao pereciveis",
    category: "Alimentacao",
    quantity: "Prioridade alta",
    image: "donation-supplies.png",
  },
  {
    id: "hygiene",
    name: "Kits de higiene pessoal",
    category: "Higiene",
    quantity: "Uso diario",
    image: "donation-supplies.png",
  },
  {
    id: "blankets",
    name: "Cobertores e toalhas",
    category: "Roupas",
    quantity: "Reposicao semanal",
    image: "hero-community2.png",
  },
];

const carouselSlides = [
  {
    src: "donation-supplies.png",
    alt: "Itens de doacao organizados em caixas",
  },
  {
    src: "hero-community2.png",
    alt: "Voluntarios organizando doacoes em uma sala comunitaria",
  },
  {
    src: "recovery-house.png",
    alt: "Casa de recuperacao com jardim e varanda",
  },
];

let activeSlide = 0;
let activeDonationId = null;
let previousFocus = null;

const donationModal = document.getElementById("donation-modal");
const deliveryModal = document.getElementById("delivery-modal");
const receiptModal = document.getElementById("receipt-modal");
const companyModal = document.getElementById("company-modal");
const historyModal = document.getElementById("history-modal");
const donationForm = document.getElementById("donation-form");
const donationTypeField = document.getElementById("donation-type");
const donationQuantityField = document.getElementById("donation-quantity");
const donationUnitLabel = document.getElementById("donation-unit");
const donationUnitValue = document.getElementById("donation-unit-value");
const pickupForm = document.getElementById("pickup-form");
const collectionAddress = document.getElementById("collection-address");
const feedback = document.getElementById("delivery-feedback");
const companyAlert = document.getElementById("company-alert");
const donationReceipt = document.getElementById("donation-receipt");
const historyList = document.getElementById("history-list");
const historyCompanyContext = document.getElementById("history-company-context");
const companyLoginList = document.getElementById("company-login-list");
const companyProfileSection = document.getElementById("empresa-cadastrada");
const companyProfileCard = document.getElementById("company-profile-card");

const collectionPoints = {
  central: {
    name: "EcoCare - Ponto de coleta central",
    address: "Rua das Acácias, 245 - Jardim Esperança, São Paulo/SP",
    schedule: "Segunda a sexta, das 9h às 17h",
  },
  norte: {
    name: "Unidade Norte - Casa Esperança",
    address: "Avenida das Palmeiras, 880 - Santana, São Paulo/SP",
    schedule: "Terça, quinta e sábado, das 8h às 14h",
  },
  sul: {
    name: "Unidade Sul - Espaço Recomeço",
    address: "Rua Campo Belo, 1320 - Santo Amaro, São Paulo/SP",
    schedule: "Segunda a sexta, das 10h às 16h",
  },
  leste: {
    name: "Unidade Leste - Apoio Comunitário",
    address: "Rua Itaquera, 510 - Vila Carmosina, São Paulo/SP",
    schedule: "Quarta e sexta, das 9h às 15h",
  },
};

const donationUnits = {
  Alimentos: "kg",
  Bebidas: "L",
  "Higiene pessoal": "un",
  Limpeza: "un",
  "Roupas e cobertores": "un",
  "Materiais educativos": "un",
};

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStorage(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function readValue(key) {
  return localStorage.getItem(key);
}

function writeValue(key, value) {
  localStorage.setItem(key, value);
}

function getActiveCompany() {
  const companies = readStorage(COMPANIES_KEY, []);
  const activeCompanyId = readValue(ACTIVE_COMPANY_KEY);
  return companies.find((company) => company.id === activeCompanyId) || null;
}

function getVisibleDonations() {
  const donations = readStorage(DONATIONS_KEY, []);
  const activeCompany = getActiveCompany();
  if (!activeCompany) {
    return [];
  }

  return donations.filter((donation) => donation.companyId === activeCompany.id);
}

function createDonationCode() {
  return `RET-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createReceiptNumber() {
  return `NF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}

function showCompanyRegistrationAlert() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("empresa") !== "cadastrada") {
    return;
  }

  companyAlert.hidden = false;
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);

  window.setTimeout(() => {
    companyAlert.hidden = true;
  }, 6000);
}

function formatCompanyAddress(company) {
  const address = company.address || {};
  return `${address.street || ""}, ${address.number || "s/n"} - ${address.district || ""}, ${
    address.city || ""
  }/${address.state || ""} - CEP ${address.zipCode || ""}`;
}

function appendCompanyProfileDetail(container, label, value) {
  const detail = document.createElement("span");
  const title = document.createElement("strong");
  const text = document.createElement("span");

  title.textContent = label;
  text.textContent = value || "Não informado";
  detail.append(title, text);
  container.append(detail);
}

function renderCompanyProfile() {
  const company = getActiveCompany();

  companyProfileCard.innerHTML = "";

  if (!company) {
    companyProfileSection.hidden = true;
    return;
  }

  companyProfileSection.hidden = false;

  const content = document.createElement("div");
  const title = document.createElement("h3");
  const subtitle = document.createElement("p");
  const grid = document.createElement("div");
  const action = document.createElement("a");
  const switchButton = document.createElement("button");

  title.textContent = company.legalName;
  subtitle.textContent = company.tradeName || "Empresa cadastrada para organização fiscal da doação.";
  grid.className = "company-profile-grid";
  appendCompanyProfileDetail(grid, "CNPJ", company.cnpj);
  appendCompanyProfileDetail(grid, "Inscrição estadual", company.stateRegistration);
  appendCompanyProfileDetail(grid, "Regime tributário", company.taxRegime);
  appendCompanyProfileDetail(grid, "E-mail fiscal", company.email);
  appendCompanyProfileDetail(grid, "Telefone", company.phone);
  appendCompanyProfileDetail(grid, "Endereço fiscal", formatCompanyAddress(company));

  action.className = "button button-primary";
  action.href = "empresa.html";
  action.textContent = "Cadastrar outra empresa";

  switchButton.className = "button button-secondary company-switch";
  switchButton.type = "button";
  switchButton.textContent = "Trocar empresa";
  switchButton.addEventListener("click", () => {
    renderCompanyLogin();
    openModal(companyModal);
  });

  content.append(title, subtitle, grid);
  const actions = document.createElement("div");
  actions.className = "company-profile-actions";
  actions.append(switchButton, action);
  companyProfileCard.append(content, actions);
}

function renderNeededItems() {
  const list = document.getElementById("needed-list");
  const items = readStorage(ITEMS_KEY, fallbackItems);
  list.innerHTML = "";

  if (!items.length) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Nenhum item cadastrado no momento.";
    list.append(emptyItem);
    return;
  }

  items.slice(0, 5).forEach((item) => {
    const listItem = document.createElement("li");
    const image = document.createElement("img");
    const content = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");

    image.src = item.image || "donation-supplies.png";
    image.alt = `Imagem do item ${item.name}`;
    image.onerror = () => {
      image.src = "donation-supplies.png";
    };

    title.textContent = item.name;
    meta.textContent = `${item.category || "Geral"} - ${item.quantity || "Quantidade a combinar"}`;

    content.append(title, meta);
    listItem.append(image, content);
    list.append(listItem);
  });
}

function renderDonationCount() {
  const activeCompany = getActiveCompany();
  const count = activeCompany ? getVisibleDonations().length : readStorage(DONATIONS_KEY, []).length;
  document.getElementById("donation-count").textContent = String(count);
}

function getDeliveryText(donation) {
  if (!donation.delivery) {
    return "Entrega ainda não definida";
  }

  if (donation.delivery.method === "retirada") {
    return `Retirada em ${donation.delivery.address}, no dia ${donation.delivery.date} às ${donation.delivery.time}`;
  }

  return `${donation.delivery.pointName} - ${donation.delivery.address}. ${donation.delivery.schedule}`;
}

function getDonationById(id) {
  return readStorage(DONATIONS_KEY, []).find((donation) => donation.id === id);
}

function updateCarousel() {
  const slide = carouselSlides[activeSlide];
  const image = document.getElementById("carousel-image");
  image.src = slide.src;
  image.alt = slide.alt;
  document.getElementById("carousel-counter").textContent = `${activeSlide + 1} de ${carouselSlides.length}`;
}

function openModal(modal) {
  previousFocus = document.activeElement;
  modal.hidden = false;
  const firstField = modal.querySelector("input, select, textarea, button");
  firstField?.focus();
}

function closeModal(modal) {
  modal.hidden = true;
  previousFocus?.focus();
}

function setFieldError(field, message) {
  const wrapper = field.closest(".field");
  const error = wrapper?.querySelector(".error-message");
  if (error) {
    error.textContent = message;
  }
  field.setAttribute("aria-invalid", message ? "true" : "false");
}

function updateDonationUnit() {
  const unit = donationUnits[donationTypeField.value] || "un";
  donationUnitLabel.textContent = unit;
  donationUnitValue.value = unit;
}

function validateRequiredFields(form) {
  let isValid = true;
  form.querySelectorAll("[required]").forEach((field) => {
    const value = field.value.trim();
    const message = value ? "" : "Preencha este campo.";
    setFieldError(field, message);
    if (!value) {
      isValid = false;
    }
  });
  return isValid;
}

function validateDonationForm() {
  const isRequiredValid = validateRequiredFields(donationForm);
  const amount = Number(donationQuantityField.value);

  if (!amount || amount <= 0) {
    setFieldError(donationQuantityField, "Informe uma quantidade maior que zero.");
    return false;
  }

  setFieldError(donationQuantityField, "");
  return isRequiredValid;
}

function createDonation(formData) {
  const donations = readStorage(DONATIONS_KEY, []);
  const activeCompany = getActiveCompany();
  const donation = {
    id: createId(),
    companyId: activeCompany?.id || null,
    companyName: activeCompany?.legalName || "",
    createdAt: new Date().toISOString(),
    status: "pendente",
    name: formData.get("name").trim(),
    contact: formData.get("contact").trim(),
    type: formData.get("type"),
    quantityAmount: Number(formData.get("quantityAmount")),
    quantityUnit: formData.get("quantityUnit"),
    quantity: `${Number(formData.get("quantityAmount"))} ${formData.get("quantityUnit")}`,
    message: formData.get("message").trim(),
    delivery: null,
    receipt: null,
  };

  writeStorage(DONATIONS_KEY, [donation, ...donations]);
  activeDonationId = donation.id;
}

function updateActiveDonation(delivery) {
  const donations = readStorage(DONATIONS_KEY, []);
  let updatedDonation = null;
  const updatedDonations = donations.map((donation) =>
    donation.id === activeDonationId
      ? (updatedDonation = {
          ...donation,
          delivery,
          receipt: {
            number: donation.receipt?.number || createReceiptNumber(),
            pickupCode: donation.receipt?.pickupCode || createDonationCode(),
            issuedAt: new Date().toISOString(),
          },
        })
      : donation
  );
  writeStorage(DONATIONS_KEY, updatedDonations);
  renderDonationCount();
  return updatedDonation;
}

function formatReceiptDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderDonationReceipt(donation) {
  if (!donation?.receipt) {
    return;
  }

  document.getElementById("receipt-number").textContent = donation.receipt.number;
  document.getElementById("receipt-code").textContent = donation.receipt.pickupCode;
  document.getElementById("receipt-donor").textContent = donation.name;
  document.getElementById("receipt-contact").textContent = donation.contact;
  document.getElementById("receipt-items").textContent = `${donation.type} - ${donation.quantity}`;
  document.getElementById("receipt-delivery").textContent = getDeliveryText(donation);
  document.getElementById("receipt-issued-at").textContent = formatReceiptDate(donation.receipt.issuedAt);
}

function openReceiptModal(donation) {
  renderDonationReceipt(donation);
  if (!deliveryModal.hidden) {
    closeModal(deliveryModal);
  }
  openModal(receiptModal);
}

function renderDonationHistory() {
  const activeCompany = getActiveCompany();
  const donations = getVisibleDonations();
  historyList.innerHTML = "";
  historyCompanyContext.textContent = activeCompany
    ? `Histórico vinculado à empresa ${activeCompany.legalName}.`
    : "Entre em uma empresa para visualizar o histórico de doações e NFs dela.";

  if (!donations.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = activeCompany
      ? "Nenhuma doação registrada para esta empresa."
      : "Nenhuma empresa selecionada.";
    historyList.append(empty);
    return;
  }

  donations.forEach((donation) => {
    const entry = document.createElement("article");
    entry.className = "history-entry";

    const content = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const date = document.createElement("span");
    const items = document.createElement("span");
    const delivery = document.createElement("span");

    title.textContent = donation.receipt?.number || "Doação aguardando confirmação";
    meta.className = "history-meta";
    date.textContent = formatReceiptDate(donation.createdAt);
    items.textContent = `${donation.type} - ${donation.quantity}`;
    delivery.textContent = getDeliveryText(donation);
    meta.append(date, items, delivery);
    content.append(title, meta);

    const button = document.createElement("button");
    button.className = "button button-primary";
    button.type = "button";
    button.textContent = donation.receipt ? "Ver NF" : "Sem NF";
    button.disabled = !donation.receipt;
    button.addEventListener("click", () => {
      const currentDonation = getDonationById(donation.id);
      if (currentDonation?.receipt) {
        openReceiptModal(currentDonation);
      }
    });

    entry.append(content, button);
    historyList.append(entry);
  });
}

function renderCompanyLogin() {
  const companies = readStorage(COMPANIES_KEY, []);
  companyLoginList.innerHTML = "";

  if (!companies.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Nenhuma empresa cadastrada neste navegador.";
    companyLoginList.append(empty);
    return;
  }

  companies.forEach((company) => {
    const entry = document.createElement("article");
    entry.className = "company-login-entry";

    const content = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const button = document.createElement("button");

    title.textContent = company.legalName;
    meta.textContent = `${company.cnpj} - ${company.email}`;
    button.className = "button button-primary";
    button.type = "button";
    button.textContent = "Entrar";
    button.addEventListener("click", () => {
      writeValue(ACTIVE_COMPANY_KEY, company.id);
      renderCompanyProfile();
      renderDonationCount();
      renderDonationHistory();
      closeModal(companyModal);
      companyProfileSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    content.append(title, meta);
    entry.append(content, button);
    companyLoginList.append(entry);
  });
}

document.querySelectorAll("[data-open-donation]").forEach((button) => {
  button.addEventListener("click", () => openModal(donationModal));
});

document.querySelector("[data-close-modal]").addEventListener("click", () => closeModal(donationModal));
document.querySelector("[data-close-delivery]").addEventListener("click", () => closeModal(deliveryModal));
document.querySelector("[data-close-receipt]").addEventListener("click", () => closeModal(receiptModal));
document.querySelector("[data-close-company]").addEventListener("click", () => closeModal(companyModal));
document.querySelector("[data-close-history]").addEventListener("click", () => closeModal(historyModal));

donationTypeField.addEventListener("change", updateDonationUnit);

document.getElementById("open-company-modal").addEventListener("click", () => {
  renderCompanyLogin();
  openModal(companyModal);
});

document.getElementById("open-history-modal").addEventListener("click", () => {
  renderDonationHistory();
  openModal(historyModal);
});

donationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateDonationForm()) {
    return;
  }

  createDonation(new FormData(donationForm));
  donationForm.reset();
  closeModal(donationModal);
  feedback.textContent = "";
  collectionAddress.hidden = true;
  pickupForm.hidden = true;
  pickupForm.reset();
  openModal(deliveryModal);
});

document.getElementById("collection-point").addEventListener("click", () => {
  pickupForm.hidden = true;
  pickupForm.reset();
  collectionAddress.hidden = false;
  feedback.textContent = "";
});

document.getElementById("confirm-collection").addEventListener("click", () => {
  const selectedPoint = document.querySelector('input[name="collectionPoint"]:checked')?.value;
  const point = collectionPoints[selectedPoint] || collectionPoints.central;

  const donation = updateActiveDonation({
    method: "ponto de coleta",
    pointName: point.name,
    address: point.address,
    schedule: point.schedule,
  });
  feedback.textContent = `Entrega confirmada em: ${point.name}.`;
  renderDonationCount();
  renderDonationHistory();
  openReceiptModal(donation);
});

document.getElementById("request-pickup").addEventListener("click", () => {
  feedback.textContent = "";
  collectionAddress.hidden = true;
  pickupForm.hidden = false;
  document.getElementById("pickup-address").focus();
});

pickupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateRequiredFields(pickupForm)) {
    return;
  }

  const formData = new FormData(pickupForm);
  const donation = updateActiveDonation({
    method: "retirada",
    address: formData.get("address").trim(),
    date: formData.get("date"),
    time: formData.get("time"),
    reference: formData.get("reference").trim(),
    notes: formData.get("notes").trim(),
  });
  feedback.textContent = "Retirada confirmada. A equipe EcoCare usará os dados informados para combinar a busca.";
  renderDonationCount();
  renderDonationHistory();
  openReceiptModal(donation);
});

document.getElementById("print-receipt").addEventListener("click", () => {
  window.print();
});

document.getElementById("prev-slide").addEventListener("click", () => {
  activeSlide = (activeSlide - 1 + carouselSlides.length) % carouselSlides.length;
  updateCarousel();
});

document.getElementById("next-slide").addEventListener("click", () => {
  activeSlide = (activeSlide + 1) % carouselSlides.length;
  updateCarousel();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!historyModal.hidden) closeModal(historyModal);
    if (!companyModal.hidden) closeModal(companyModal);
    if (!receiptModal.hidden) closeModal(receiptModal);
    if (!deliveryModal.hidden) closeModal(deliveryModal);
    if (!donationModal.hidden) closeModal(donationModal);
  }
});

renderNeededItems();
renderDonationCount();
renderDonationHistory();
renderCompanyProfile();
updateCarousel();
updateDonationUnit();
showCompanyRegistrationAlert();
