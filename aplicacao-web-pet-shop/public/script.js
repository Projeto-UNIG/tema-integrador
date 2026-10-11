(function () {
  "use strict";

  const STORAGE_PETS = "patasecia_pets";
  const STORAGE_APPOINTMENTS = "patasecia_agendamentos";
  const STATUSES = ["Agendado", "Em atendimento", "Concluído", "Cancelado"];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // ---------- Utilitários ----------
  const load = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  };

  const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);

  const formatDate = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const todayISO = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  };

  let toastTimer;
  const showToast = (message) => {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  };

  const trashIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

  // ---------- Navegação ----------
  const header = $("#header");
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  const navLinks = $$(".nav-link");

  const closeMenu = () => {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Abrir menu");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  navLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (section) sectionObserver.observe(section);
  });

  // ---------- Galeria ----------
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      const filter = tab.dataset.filter;
      $$(".gallery-item").forEach((item) => {
        item.classList.toggle("hidden", filter !== "todos" && item.dataset.type !== filter);
      });
    });
  });

  // ---------- Cadastro de Tutor e Pet ----------
  const registerForm = $("#registerForm");
  const phoneInput = $("#tutorPhone");

  phoneInput.addEventListener("input", () => {
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    let masked = digits;
    if (digits.length > 2) masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) {
      const split = digits.length === 11 ? 7 : 6;
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
    }
    phoneInput.value = masked;
  });

  const renderPets = () => {
    const pets = load(STORAGE_PETS);
    const list = $("#petList");

    $("#petCount").textContent = pets.length;
    $("#petEmpty").classList.toggle("hidden", pets.length > 0);

    list.innerHTML = pets
      .slice()
      .reverse()
      .map((pet) => `
        <li class="pet-item">
          <div>
            <h4>${escapeHTML(pet.petName)}</h4>
            <p class="pet-meta">${escapeHTML(pet.species)}${pet.breed ? " · " + escapeHTML(pet.breed) : ""}</p>
            <p class="pet-tutor">Tutor: ${escapeHTML(pet.tutorName)} · ${escapeHTML(pet.tutorPhone)}</p>
            ${pet.notes ? `<p class="pet-notes"><strong>Obs.:</strong> ${escapeHTML(pet.notes)}</p>` : ""}
          </div>
          <button class="icon-btn" data-delete-pet="${pet.id}" aria-label="Excluir cadastro de ${escapeHTML(pet.petName)}">${trashIcon}</button>
        </li>`)
      .join("");

    renderPetOptions();
  };

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const error = $("#registerError");
    const fields = {
      tutorName: $("#tutorName"),
      tutorPhone: phoneInput,
      petName: $("#petName"),
      species: $("#petSpecies"),
    };

    Object.values(fields).forEach((f) => f.classList.remove("invalid"));
    const missing = Object.values(fields).filter((f) => !f.value.trim());

    if (missing.length) {
      missing.forEach((f) => f.classList.add("invalid"));
      error.textContent = "Preencha todos os campos obrigatórios.";
      missing[0].focus();
      return;
    }

    if (phoneInput.value.replace(/\D/g, "").length < 10) {
      phoneInput.classList.add("invalid");
      error.textContent = "Informe um telefone válido com DDD.";
      phoneInput.focus();
      return;
    }

    error.textContent = "";

    const pets = load(STORAGE_PETS);
    pets.push({
      id: uid(),
      tutorName: fields.tutorName.value.trim(),
      tutorPhone: phoneInput.value.trim(),
      petName: fields.petName.value.trim(),
      species: fields.species.value,
      breed: $("#petBreed").value.trim(),
      notes: $("#petNotes").value.trim(),
      createdAt: new Date().toISOString(),
    });
    save(STORAGE_PETS, pets);

    registerForm.reset();
    renderPets();
    showToast("Cadastro salvo com sucesso!");
  });

  $("#petList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-pet]");
    if (!button) return;

    const id = button.dataset.deletePet;
    const hasAppointments = load(STORAGE_APPOINTMENTS).some((a) => a.petId === id);
    const message = hasAppointments
      ? "Este pet possui agendamentos. Excluir o cadastro e todos os agendamentos dele?"
      : "Deseja excluir este cadastro?";
    if (!confirm(message)) return;

    save(STORAGE_PETS, load(STORAGE_PETS).filter((p) => p.id !== id));
    save(STORAGE_APPOINTMENTS, load(STORAGE_APPOINTMENTS).filter((a) => a.petId !== id));
    renderPets();
    renderAppointments();
    showToast("Cadastro excluído.");
  });

  // ---------- Agendamento ----------
  const scheduleForm = $("#scheduleForm");
  const petSelect = $("#schedulePet");
  const dateInput = $("#scheduleDate");
  const timeSelect = $("#scheduleTime");

  dateInput.min = todayISO();

  function renderPetOptions() {
    const pets = load(STORAGE_PETS);
    const current = petSelect.value;

    if (!pets.length) {
      petSelect.innerHTML = '<option value="">Nenhum pet cadastrado</option>';
      return;
    }

    petSelect.innerHTML =
      '<option value="">Selecione o pet</option>' +
      pets
        .map((p) => `<option value="${p.id}">${escapeHTML(p.petName)} (${escapeHTML(p.tutorName)})</option>`)
        .join("");

    if (pets.some((p) => p.id === current)) petSelect.value = current;
  }

  const getTimeSlots = (dateISO) => {
    if (!dateISO) return [];
    const day = new Date(`${dateISO}T00:00:00`).getDay();
    if (day === 0) return [];
    const endHour = day === 6 ? 14 : 18;
    const slots = [];
    for (let h = 8; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  };

  const renderTimeOptions = () => {
    const date = dateInput.value;
    const slots = getTimeSlots(date);

    if (date && !slots.length) {
      timeSelect.innerHTML = '<option value="">Fechado aos domingos</option>';
      return;
    }
    if (!date) {
      timeSelect.innerHTML = '<option value="">Escolha a data</option>';
      return;
    }

    const taken = load(STORAGE_APPOINTMENTS)
      .filter((a) => a.date === date && a.status !== "Cancelado")
      .map((a) => a.time);

    const now = new Date();
    const isToday = date === todayISO();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    timeSelect.innerHTML =
      '<option value="">Selecione</option>' +
      slots
        .map((slot) => {
          const [h, m] = slot.split(":").map(Number);
          const past = isToday && h * 60 + m <= currentMinutes;
          const busy = taken.includes(slot);
          const label = busy ? `${slot} (ocupado)` : past ? `${slot} (indisponível)` : slot;
          return `<option value="${slot}" ${busy || past ? "disabled" : ""}>${label}</option>`;
        })
        .join("");
  };

  dateInput.addEventListener("change", renderTimeOptions);

  scheduleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const error = $("#scheduleError");
    const fields = [petSelect, $("#scheduleService"), dateInput, timeSelect];

    fields.forEach((f) => f.classList.remove("invalid"));

    if (!load(STORAGE_PETS).length) {
      error.textContent = "Cadastre um pet antes de agendar.";
      return;
    }

    const missing = fields.filter((f) => !f.value);
    if (missing.length) {
      missing.forEach((f) => f.classList.add("invalid"));
      error.textContent = "Preencha todos os campos do agendamento.";
      missing[0].focus();
      return;
    }

    if (dateInput.value < todayISO()) {
      dateInput.classList.add("invalid");
      error.textContent = "Escolha uma data a partir de hoje.";
      return;
    }

    const appointments = load(STORAGE_APPOINTMENTS);
    const conflict = appointments.some(
      (a) => a.date === dateInput.value && a.time === timeSelect.value && a.status !== "Cancelado"
    );
    if (conflict) {
      timeSelect.classList.add("invalid");
      error.textContent = "Este horário já está ocupado. Escolha outro.";
      return;
    }

    error.textContent = "";

    appointments.push({
      id: uid(),
      petId: petSelect.value,
      service: $("#scheduleService").value,
      date: dateInput.value,
      time: timeSelect.value,
      status: "Agendado",
      createdAt: new Date().toISOString(),
    });
    save(STORAGE_APPOINTMENTS, appointments);

    scheduleForm.reset();
    renderTimeOptions();
    renderAppointments();
    showToast("Agendamento confirmado!");
  });

  const renderAppointments = () => {
    const pets = load(STORAGE_PETS);
    const filter = $("#statusFilter").value;
    const appointments = load(STORAGE_APPOINTMENTS)
      .filter((a) => filter === "todos" || a.status === filter)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    $("#scheduleEmpty").classList.toggle("hidden", appointments.length > 0);

    $("#scheduleTable").innerHTML = appointments
      .map((a) => {
        const pet = pets.find((p) => p.id === a.petId);
        const petName = pet ? escapeHTML(pet.petName) : "Pet removido";
        const tutor = pet ? escapeHTML(pet.tutorName) : "";
        const statusClass = `status-${a.status.replace(/\s/g, "-")}`;
        return `
          <tr>
            <td><strong>${petName}</strong><small>${tutor}</small></td>
            <td>${escapeHTML(a.service)}</td>
            <td>${formatDate(a.date)}<small>${a.time}</small></td>
            <td>
              <label class="sr-only" for="status-${a.id}">Status de ${petName}</label>
              <select id="status-${a.id}" class="status-select ${statusClass}" data-status-id="${a.id}">
                ${STATUSES.map((s) => `<option value="${s}" ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </td>
            <td><button class="icon-btn" data-delete-appointment="${a.id}" aria-label="Excluir agendamento de ${petName}">${trashIcon}</button></td>
          </tr>`;
      })
      .join("");
  };

  $("#statusFilter").addEventListener("change", renderAppointments);

  $("#scheduleTable").addEventListener("change", (event) => {
    const select = event.target.closest("[data-status-id]");
    if (!select) return;
    const appointments = load(STORAGE_APPOINTMENTS);
    const appointment = appointments.find((a) => a.id === select.dataset.statusId);
    if (!appointment) return;
    appointment.status = select.value;
    save(STORAGE_APPOINTMENTS, appointments);
    renderAppointments();
    renderTimeOptions();
    showToast(`Status atualizado para "${select.value}".`);
  });

  $("#scheduleTable").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-appointment]");
    if (!button || !confirm("Deseja excluir este agendamento?")) return;
    save(STORAGE_APPOINTMENTS, load(STORAGE_APPOINTMENTS).filter((a) => a.id !== button.dataset.deleteAppointment));
    renderAppointments();
    renderTimeOptions();
    showToast("Agendamento excluído.");
  });

  // ---------- Inicialização ----------
  $("#year").textContent = new Date().getFullYear();
  renderPets();
  renderTimeOptions();
  renderAppointments();
})();
