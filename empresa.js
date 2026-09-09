const COMPANIES_KEY = "ecocareCompanies";

const companyForm = document.getElementById("company-form");
const feedback = document.getElementById("company-feedback");
const cnpjField = document.getElementById("company-cnpj");
const zipField = document.getElementById("company-zip");

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
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

function formatCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatZipCode(value) {
  return onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function isValidCnpj(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calculateDigit = (length) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

function setFieldError(field, message) {
  const error = field.closest(".field")?.querySelector(".error-message");
  if (error) {
    error.textContent = message;
  }
  field.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm(form) {
  let isValid = true;

  form.querySelectorAll("[required]").forEach((field) => {
    const message = field.value.trim() ? "" : "Preencha este campo.";
    setFieldError(field, message);
    if (message) {
      isValid = false;
    }
  });

  if (cnpjField.value.trim() && !isValidCnpj(cnpjField.value)) {
    setFieldError(cnpjField, "Informe um CNPJ válido.");
    isValid = false;
  }

  if (zipField.value.trim() && onlyDigits(zipField.value).length !== 8) {
    setFieldError(zipField, "Informe um CEP válido.");
    isValid = false;
  }

  return isValid;
}

cnpjField.addEventListener("input", () => {
  cnpjField.value = formatCnpj(cnpjField.value);
});

zipField.addEventListener("input", () => {
  zipField.value = formatZipCode(zipField.value);
});

companyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  feedback.textContent = "";

  if (!validateForm(companyForm)) {
    return;
  }

  const formData = new FormData(companyForm);
  const companies = readStorage(COMPANIES_KEY);
  const cnpj = formatCnpj(formData.get("cnpj"));
  const duplicatedCompany = companies.some((company) => company.cnpj === cnpj);

  if (duplicatedCompany) {
    setFieldError(cnpjField, "Este CNPJ já está cadastrado.");
    return;
  }

  const company = {
    id: createId(),
    createdAt: new Date().toISOString(),
    status: "pendente",
    cnpj,
    stateRegistration: formData.get("stateRegistration").trim(),
    legalName: formData.get("legalName").trim(),
    tradeName: formData.get("tradeName").trim(),
    taxRegime: formData.get("taxRegime"),
    cnae: formData.get("cnae").trim(),
    email: formData.get("email").trim(),
    phone: formData.get("phone").trim(),
    address: {
      zipCode: formatZipCode(formData.get("zipCode")),
      state: formData.get("state"),
      street: formData.get("street").trim(),
      number: formData.get("number").trim(),
      district: formData.get("district").trim(),
      city: formData.get("city").trim(),
      complement: formData.get("complement").trim(),
    },
    responsible: {
      name: formData.get("responsibleName").trim(),
      role: formData.get("responsibleRole").trim(),
    },
  };

  writeStorage(COMPANIES_KEY, [company, ...companies]);
  companyForm.reset();
  feedback.textContent = "Cadastro enviado. Redirecionando para a página inicial...";
  window.setTimeout(() => {
    window.location.href = "index.html?empresa=cadastrada";
  }, 700);
});
