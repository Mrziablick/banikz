/* =========================================================
   БАНИ KZ — логика сайта: меню, корзина, бронирование
   ========================================================= */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => Math.round(n).toLocaleString("ru-RU") + " ₸";

  const state = {
    roomId: ROOMS[0].id,
    date: "",
    time: "18:00",
    hours: ROOMS[0].minHours,
    guests: 4,
    services: new Set(),
    cart: {},
    name: "",
    phone: "",
    comment: ""
  };

  const getRoom = (id) => ROOMS.find((r) => r.id === id) || ROOMS[0];
  const getService = (id) => SERVICES.find((s) => s.id === id);
  const getMenuItem = (id) => {
    for (const cat of MENU) {
      const found = cat.items.find((i) => i.id === id);
      if (found) return found;
    }
    return null;
  };

  /* ---------------- Header ---------------- */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#burger");
  const nav = $("#nav");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  $$("#nav a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    })
  );

  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Rooms ---------------- */
  function renderRooms() {
    $("#roomsGrid").innerHTML = ROOMS.map(
      (room) => `
      <article class="room-card reveal">
        <div class="room-card__media">
          <img src="${room.image}" alt="Номер «${room.name}» — ${room.features[0]}" loading="lazy" />
          ${room.badge ? `<span class="room-card__badge">${room.badge}</span>` : ""}
          <span class="room-card__cap">До ${room.capacity} гостей · ${room.minHours} ч минимум</span>
        </div>
        <div class="room-card__body">
          <div class="room-card__top">
            <h3>${room.name}</h3>
            <div class="room-card__price"><strong>${money(room.price)}</strong><small>за час</small></div>
          </div>
          <p class="room-card__desc">${room.desc}</p>
          <div class="room-card__features">${room.features.map((f) => `<span>${f}</span>`).join("")}</div>
          <div class="room-card__foot">
            <span class="room-card__min">Для ${room.capacity} человек</span>
            <button class="btn btn--outline btn--sm" type="button" data-room="${room.id}">Выбрать номер</button>
          </div>
        </div>
      </article>`
    ).join("");

    $$("[data-room]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectRoom(btn.dataset.room);
        $("#booking").scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );
    observeReveals();
  }

  function renderRoomOptions() {
    $("#bookingRooms").innerHTML = ROOMS.map(
      (room) => `
      <label class="room-option ${room.id === state.roomId ? "is-selected" : ""}">
        <input type="radio" name="room" value="${room.id}" ${room.id === state.roomId ? "checked" : ""} />
        <span class="room-option__name">${room.name}</span>
        <span class="room-option__meta">до ${room.capacity} гостей · от ${room.minHours} ч</span>
        <span class="room-option__price">${money(room.price)} / час</span>
      </label>`
    ).join("");

    $$("#bookingRooms input").forEach((input) =>
      input.addEventListener("change", () => selectRoom(input.value))
    );
  }

  function selectRoom(id) {
    state.roomId = id;
    const room = getRoom(id);
    if (state.hours < room.minHours) state.hours = room.minHours;
    if (state.guests > room.capacity) state.guests = room.capacity;
    $$("#bookingRooms .room-option").forEach((el) => {
      const input = $("input", el);
      const selected = input.value === id;
      el.classList.toggle("is-selected", selected);
      input.checked = selected;
    });
    renderHours();
    renderGuests();
    renderSummary();
  }

  /* ---------------- Dates & selects ---------------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function initDateAndTime() {
    const today = new Date();
    state.date = toISO(today);
    const dateInput = $("#date");
    dateInput.min = state.date;
    dateInput.value = state.date;
    dateInput.addEventListener("change", () => {
      state.date = dateInput.value;
      clearError("date");
      renderSummary();
    });

    const times = [];
    for (let h = 0; h < 24; h++) {
      times.push(`${pad(h)}:00`, `${pad(h)}:30`);
    }
    $("#time").innerHTML = times.map((t) => `<option value="${t}">${t}</option>`).join("");
    $("#time").value = state.time;
    $("#time").addEventListener("change", (e) => {
      state.time = e.target.value;
      clearError("time");
      renderSummary();
    });

    $("#hours").addEventListener("change", (e) => {
      const room = getRoom(state.roomId);
      const value = Number(e.target.value);
      state.hours = Number.isFinite(value) && value >= room.minHours ? Math.min(value, 8) : room.minHours;
      renderHours();
      renderSummary();
    });

    $("#guests").addEventListener("change", (e) => {
      const room = getRoom(state.roomId);
      const value = Number(e.target.value);
      state.guests = Number.isFinite(value) && value >= 1 ? Math.min(value, room.capacity) : 1;
      renderGuests();
      renderSummary();
    });

    renderHours();
    renderGuests();
  }

  function renderHours() {
    const room = getRoom(state.roomId);
    const opts = [];
    for (let h = room.minHours; h <= 8; h++) opts.push(h);
    if (!opts.includes(state.hours)) state.hours = room.minHours;
    $("#hours").innerHTML = opts.map((h) => `<option value="${h}">${h} ч${h === 4 ? " · акция 3+1" : ""}</option>`).join("");
    $("#hours").value = String(state.hours);
  }

  function renderGuests() {
    const room = getRoom(state.roomId);
    const opts = [];
    for (let g = 1; g <= room.capacity; g++) opts.push(g);
    if (state.guests > room.capacity) state.guests = room.capacity;
    $("#guests").innerHTML = opts
      .map((g) => `<option value="${g}">${g} ${g === 1 ? "гость" : g < 5 ? "гостя" : "гостей"}</option>`)
      .join("");
    $("#guests").value = String(state.guests);
  }

  /* ---------------- Services ---------------- */
  function renderServices() {
    $("#servicesGrid").innerHTML = SERVICES.map(
      (s) => `
      <article class="service-card ${state.services.has(s.id) ? "is-active" : ""}" data-service-card="${s.id}">
        <h3>${s.name}</h3>
        <p>${s.note}</p>
        <div class="service-card__foot">
          <span class="service-card__price">${money(s.price)}</span>
          <button class="service-card__toggle" type="button" data-service="${s.id}">
            ${state.services.has(s.id) ? "Добавлено" : "Добавить"}
          </button>
        </div>
      </article>`
    ).join("");

    $$("[data-service]").forEach((btn) =>
      btn.addEventListener("click", () => toggleService(btn.dataset.service))
    );

    $("#bookingServices").innerHTML = SERVICES.map(
      (s) => `
      <label class="check ${state.services.has(s.id) ? "is-checked" : ""}" data-check="${s.id}">
        <input type="checkbox" value="${s.id}" ${state.services.has(s.id) ? "checked" : ""} />
        <span>${s.name} <i style="font-style:normal;color:#7d6f62">· ${s.note}</i></span>
        <small>${money(s.price)}</small>
      </label>`
    ).join("");

    $$("#bookingServices input").forEach((input) =>
      input.addEventListener("change", () => toggleService(input.value))
    );
  }

  function toggleService(id) {
    if (state.services.has(id)) state.services.delete(id);
    else state.services.add(id);
    renderServices();
    renderSummary();
  }

  /* ---------------- Menu ---------------- */
  let activeCategory = MENU[0].id;

  function renderTabs() {
    $("#menuTabs").innerHTML = MENU.map(
      (cat) =>
        `<button class="menu__tab ${cat.id === activeCategory ? "is-active" : ""}" type="button" role="tab" aria-selected="${cat.id === activeCategory}" data-tab="${cat.id}">${cat.title}</button>`
    ).join("");

    $$("[data-tab]").forEach((btn) =>
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.tab;
        renderTabs();
        renderMenu();
      })
    );
  }

  function qtyControl(item) {
    const qty = state.cart[item.id] || 0;
    if (qty === 0) {
      return `<button class="menu-item__add" type="button" data-add="${item.id}" aria-label="Добавить ${item.name} в заказ">+</button>`;
    }
    return `
      <div class="menu-item__qty">
        <button type="button" data-dec="${item.id}" aria-label="Убрать одну порцию">−</button>
        <span>${qty}</span>
        <button type="button" data-inc="${item.id}" aria-label="Добавить одну порцию">+</button>
      </div>`;
  }

  function renderMenu() {
    const cat = MENU.find((c) => c.id === activeCategory) || MENU[0];
    $("#menuList").innerHTML = `
      ${cat.note ? `<p class="menu__note">${cat.note}</p>` : ""}
      ${cat.items
        .map(
          (item) => `
        <div class="menu-item">
          <div class="menu-item__info">
            <div class="menu-item__name">
              ${item.name}
              ${item.hit ? `<span class="menu-item__hit">Хит</span>` : ""}
            </div>
            ${item.note ? `<div class="menu-item__desc">${item.note}</div>` : ""}
            <div class="menu-item__row">
              <span class="menu-item__price">${money(item.price)}</span>
              ${qtyControl(item)}
            </div>
          </div>
        </div>`
        )
        .join("")}
    `;

    $("#menuList").innerHTML += `
      <div class="menu__cta">
        <p><strong>Соберите стол заранее.</strong> Мы накроем его к вашему приходу — блюда попадут в общий счёт брони.</p>
        <a href="#booking" class="btn btn--outline btn--sm">К бронированию</a>
      </div>`;
  }

  function changeQty(id, delta) {
    const next = Math.max(0, (state.cart[id] || 0) + delta);
    if (next === 0) delete state.cart[id];
    else state.cart[id] = next;
    renderMenu();
    renderCart();
    renderSummary();
  }

  $("#menuList").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (add) changeQty(add.dataset.add, 1);
    else if (inc) changeQty(inc.dataset.inc, 1);
    else if (dec) changeQty(dec.dataset.dec, -1);
  });

  /* ---------------- Cart drawer ---------------- */
  const drawer = $("#cartDrawer");
  const drawerBody = $("#cartBody");
  const drawerFoot = $("#cartFoot");

  function openCart() {
    renderCart();
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
  }

  $("#cartBtn").addEventListener("click", openCart);
  $$("[data-close-cart]").forEach((el) => el.addEventListener("click", closeCart));
  $("#cartGoBooking").addEventListener("click", () => {
    closeCart();
    setTimeout(() => $("#booking").scrollIntoView({ behavior: "smooth" }), 120);
  });

  function cartLines() {
    return Object.keys(state.cart).map((id) => ({ item: getMenuItem(id), qty: state.cart[id] }));
  }

  function cartTotal() {
    return cartLines().reduce((sum, l) => sum + (l.item ? l.item.price * l.qty : 0), 0);
  }

  function renderCart() {
    const lines = cartLines().filter((l) => l.item);
    const qty = lines.reduce((n, l) => n + l.qty, 0);
    $("#cartCount").textContent = qty;

    if (!lines.length) {
      drawerBody.innerHTML = `<div class="drawer__empty"><strong>Пока пусто</strong>Добавьте блюда из меню — мы приготовим их к вашему приходу.</div>`;
      drawerFoot.style.display = "none";
      $("#cartTotal").textContent = money(0);
      return;
    }

    drawerFoot.style.display = "block";
    drawerBody.innerHTML = lines
      .map(
        (l) => `
      <div class="cart-line">
        <div class="cart-line__info">
          <strong>${l.item.name}</strong>
          <small>${money(l.item.price)} · порция</small>
          <div class="cart-line__qty">
            <button type="button" data-cart-dec="${l.item.id}" aria-label="Убрать">−</button>
            <span>${l.qty}</span>
            <button type="button" data-cart-inc="${l.item.id}" aria-label="Добавить">+</button>
          </div>
        </div>
        <span class="cart-line__price">${money(l.item.price * l.qty)}</span>
      </div>`
      )
      .join("");

    $("#cartTotal").textContent = money(cartTotal());

    $$("[data-cart-inc]").forEach((b) =>
      b.addEventListener("click", () => changeQty(b.dataset.cartInc, 1))
    );
    $$("[data-cart-dec]").forEach((b) =>
      b.addEventListener("click", () => changeQty(b.dataset.cartDec, -1))
    );
  }

  /* ---------------- Summary ---------------- */
  const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

  function selectedDate() {
    return state.date ? new Date(state.date + "T00:00:00") : new Date();
  }

  function startHour() {
    return Number((state.time || "18:00").split(":")[0]);
  }

  function computeTotals() {
    const room = getRoom(state.roomId);
    const roomBase = room.price * state.hours;
    const day = selectedDate().getDay();
    const isWeekday = day >= 1 && day <= 5;
    const earlyBird = isWeekday && startHour() < 18;
    const promo31 = !earlyBird && startHour() >= 18 && state.hours >= 4;

    let roomDiscount = 0;
    let discountLabel = "";
    if (earlyBird) {
      roomDiscount = Math.round(roomBase * 0.5);
      discountLabel = "Скидка 50% — будни до 18:00";
    } else if (promo31) {
      roomDiscount = room.price * Math.floor(state.hours / 4);
      discountLabel = "Акция 3+1 — четвёртый час в подарок";
    }

    const servicesTotal = Array.from(state.services).reduce(
      (sum, id) => sum + (getService(id)?.price || 0),
      0
    );
    const menuTotal = cartTotal();
    const total = roomBase - roomDiscount + servicesTotal + menuTotal;

    return { room, roomBase, roomDiscount, discountLabel, servicesTotal, menuTotal, total };
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`;
  }

  function renderSummary() {
    const t = computeTotals();
    $("#summaryRoomLabel").textContent = t.room.name;

    const serviceRows = Array.from(state.services)
      .map((id) => getService(id))
      .filter(Boolean)
      .map(
        (s) => `<div class="summary__line"><span>${s.name}</span><span>${money(s.price)}</span></div>`
      )
      .join("");

    const lines = cartLines().filter((l) => l.item);
    const menuRows = lines.length
      ? `<div class="summary__sub">Меню · ${lines.reduce((n, l) => n + l.qty, 0)} поз.</div>
         <div class="summary__items">${lines
           .map(
             (l) =>
               `<div><b>${l.item.name} × ${l.qty}</b><span>${money(l.item.price * l.qty)}</span></div>`
           )
           .join("")}</div>`
      : "";

    $("#summaryBody").innerHTML = `
      <div class="summary__line">
        <span>«${t.room.name}» · ${state.hours} ч × ${money(t.room.price)}</span>
        <span>${money(t.roomBase)}</span>
      </div>
      <div class="summary__line">
        <span>${formatDate(state.date)} · ${state.time}</span>
        <span>${state.guests} гост.</span>
      </div>
      ${t.roomDiscount ? `<div class="summary__line summary__line--discount"><span>${t.discountLabel}</span><span>−${money(t.roomDiscount)}</span></div>` : ""}
      ${serviceRows}
      ${menuRows}
      ${!t.roomDiscount && startHour() >= 18 && state.hours === 3 ? `<div class="summary__sub" style="border:0;padding:0;margin:0">Добавьте четвёртый час — он будет в подарок по акции 3+1</div>` : ""}
    `;

    $("#summaryTotal").textContent = money(t.total);
    $("#mobileTotal").textContent = money(t.total);
  }

  /* ---------------- Booking submit ---------------- */
  const form = $("#bookingForm");

  function setError(field, message) {
    const errorEl = $(`[data-error="${field}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.closest(".field").classList.add("has-error");
    }
  }
  function clearError(field) {
    const errorEl = $(`[data-error="${field}"]`);
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.closest(".field").classList.remove("has-error");
    }
  }

  $("#name").addEventListener("input", (e) => {
    state.name = e.target.value;
    if (state.name.trim().length >= 2) clearError("name");
  });
  $("#phone").addEventListener("input", (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("7")) digits = "7" + digits;
    else if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    else if (!digits.startsWith("7")) digits = "7" + digits;
    digits = digits.slice(0, 11);
    let out = "+7";
    if (digits.length > 1) out += " (" + digits.slice(1, 4);
    if (digits.length >= 5) out += ") " + digits.slice(4, 7);
    if (digits.length >= 8) out += "-" + digits.slice(7, 9);
    if (digits.length >= 10) out += "-" + digits.slice(9, 11);
    e.target.value = out;
    state.phone = out;
    if (digits.length === 11) clearError("phone");
  });
  $("#comment").addEventListener("input", (e) => {
    state.comment = e.target.value;
  });

  function validate() {
    let ok = true;
    let firstBad = null;

    if (!state.date) {
      setError("date", "Выберите дату");
      ok = false;
      firstBad = firstBad || $("#date");
    } else {
      const today = new Date();
      const chosen = new Date(state.date + "T00:00:00");
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (chosen < todayStart) {
        setError("date", "Дата уже прошла — выберите другую");
        ok = false;
        firstBad = firstBad || $("#date");
      } else if (chosen.getTime() === todayStart.getTime()) {
        const now = today.getHours() * 60 + today.getMinutes();
        const [h, m] = state.time.split(":").map(Number);
        if (h * 60 + m < now) {
          setError("time", "Это время уже прошло — выберите позже");
          ok = false;
          firstBad = firstBad || $("#time");
        }
      }
    }

    if (state.name.trim().length < 2) {
      setError("name", "Укажите имя");
      ok = false;
      firstBad = firstBad || $("#name");
    }
    const digits = state.phone.replace(/\D/g, "");
    if (digits.length !== 11) {
      setError("phone", "Введите номер телефона полностью");
      ok = false;
      firstBad = firstBad || $("#phone");
    }

    if (firstBad) firstBad.focus({ preventScroll: true });
    return ok && !firstBad;
  }

  function buildWhatsAppText(orderId, totals) {
    const services = Array.from(state.services)
      .map((id) => getService(id))
      .filter(Boolean)
      .map((s) => `• ${s.name} — ${money(s.price)}`);
    const menu = cartLines()
      .filter((l) => l.item)
      .map((l) => `• ${l.item.name} × ${l.qty} — ${money(l.item.price * l.qty)}`);

    const rows = [
      `Здравствуйте! Заявка с сайта ${VENUE.name} №${orderId}.`,
      "",
      `Номер: «${totals.room.name}»`,
      `Дата и время: ${formatDate(state.date)}, ${state.time}`,
      `Длительность: ${state.hours} ч · гостей: ${state.guests}`,
      totals.roomDiscount ? `${totals.discountLabel}: −${money(totals.roomDiscount)}` : "",
      services.length ? "\nУслуги:\n" + services.join("\n") : "",
      menu.length ? "\nМеню:\n" + menu.join("\n") : "",
      "",
      `Итого: ${money(totals.total)} (оплата на месте)`,
      `Имя: ${state.name}`,
      `Телефон: ${state.phone}`,
      state.comment.trim() ? `Комментарий: ${state.comment.trim()}` : ""
    ];
    return rows.filter((r) => r !== "").join("\n");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;

    const totals = computeTotals();
    const now = new Date();
    const orderId =
      "BK-" +
      `${now.getFullYear()}`.slice(2) +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      "-" +
      String(Math.floor(Math.random() * 900) + 100);

    const waText = buildWhatsAppText(orderId, totals);
    $("#orderId").textContent = orderId;

    const menuLines = cartLines().filter((l) => l.item);
    $("#modalSummary").innerHTML = `
      <div><span>Номер</span><span>«${totals.room.name}» · ${state.hours} ч</span></div>
      <div><span>Дата</span><span>${formatDate(state.date)}, ${state.time}</span></div>
      <div><span>Гостей</span><span>${state.guests}</span></div>
      ${
        state.services.size
          ? `<div><span>Услуги</span><span>${Array.from(state.services)
              .map((id) => getService(id)?.name)
              .filter(Boolean)
              .join(", ")}</span></div>`
          : ""
      }
      ${
        menuLines.length
          ? `<div><span>Меню</span><span>${menuLines
              .map((l) => `${l.item.name} × ${l.qty}`)
              .join(", ")}</span></div>`
          : ""
      }
      <div><span>Телефон</span><span>${state.phone}</span></div>
      <div class="modal__total"><span>Итого</span><span>${money(totals.total)}</span></div>
    `;

    $("#waLink").href = `https://wa.me/${VENUE.phoneRaw}?text=${encodeURIComponent(waText)}`;

    openModal();
  });

  /* ---------------- Modal ---------------- */
  const modal = $("#successModal");
  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    form.reset();
    state.name = "";
    state.phone = "";
    state.comment = "";
    state.services.clear();
    state.cart = {};
    $$(".field").forEach((f) => f.classList.remove("has-error"));
    $("#date").value = state.date;
    $("#time").value = state.time;
    selectRoom(state.roomId);
    renderServices();
    renderMenu();
    renderCart();
    renderSummary();
  }
  $$("[data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal.classList.contains("is-open")) closeModal();
      if (drawer.classList.contains("is-open")) closeCart();
    }
  });

  /* ---------------- Reveal animation ---------------- */
  let observer;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
    }
    $$(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
  }

  /* ---------------- Reviews ---------------- */
  function renderReviews() {
    $("#reviewsGrid").innerHTML = REVIEWS.map(
      (r) => `
      <article class="review-card reveal">
        <span class="stars" aria-label="Оценка 5 из 5">★★★★★</span>
        <p>${r.text}</p>
        <div class="review-card__head">
          <span class="review-card__avatar">${r.name.charAt(0)}</span>
          <div><strong>${r.name}</strong><small>${r.date}</small></div>
        </div>
      </article>`
    ).join("");
  }

  /* ---------------- Init ---------------- */
  renderRooms();
  renderRoomOptions();
  initDateAndTime();
  renderServices();
  renderTabs();
  renderMenu();
  renderReviews();
  renderCart();
  renderSummary();
  observeReveals();

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 100);
  }
})();
