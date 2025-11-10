// версия виджета в которой добавлена форма для передачи персональных данных напрямую в custom api. В обход LLM
(() => {
  // Создаем функцию инициализации, которая будет вызываться после загрузки DOM
  const initializeWidget = async function (config) {
    // Функция для загрузки marked.js из указанного источника
    const loadMarkedFromSource = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // Массив источников для загрузки библиотеки
    const sources = [
      "https://unpkg.com/marked@4.0.10/marked.min.js",
      "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/marked/4.0.10/marked.min.js",
    ];

    // Пытаемся загрузить библиотеку последовательно из разных источников
    let loaded = false;
    for (const source of sources) {
      try {
        await loadMarkedFromSource(source);
        loaded = true;
        break;
      } catch (error) {
        console.warn(
          `Failed to load marked.js from ${source}, trying next source...`
        );
      }
    }

    if (!loaded) {
      console.error("Failed to load marked.js from all sources");
    }

    if (loaded && typeof marked !== "undefined") {
      const renderer = new marked.Renderer();
      renderer.link = function (href, title, text) {
        return `<a href="${href}"${
          title ? ` title="${title}"` : ""
        } target="_blank" rel="noopener noreferrer">${text}</a>`;
      };
      marked.setOptions({ renderer });
    }

    "marked downloaded:", typeof marked !== "undefined";

    document.head.appendChild(
      Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: "https://vovan.nextbot.work/styles_ver3.css",
      })
    );

    // Добавляем стили для анимации спиннера
    document.head.appendChild(
      Object.assign(document.createElement("style"), {
        textContent: `
            .prefix_chat-icon.loading {
              animation: none !important;
            }
            .prefix_chat-icon.loading svg {
              display: none;
            }
            .prefix_chat-icon.loading::after {
              content: '';
              position: absolute;
              width: 20px;
              height: 20px;
              border: 3px solid var(--spinner-color, #ffffff);
              border-top-color: transparent;
              border-radius: 50%;
              animation: spinner 0.8s linear infinite;
            }
            @keyframes spinner {
              to {transform: rotate(360deg);}
            }
          `,
      })
    );

    const chatWidgetHTML = `
          <div class="prefix_auto-invite-bubble" style="visibility: hidden;">
              <div class="prefix_auto-invite-message"></div>
              <div class="prefix_auto-invite-arrow"></div>
              <div class="prefix_auto-invite-close">×</div>
          </div>
          <div class="prefix_whatsapp-icon" style="visibility: hidden;">W</div>
          <div class="prefix_telegram-icon" style="visibility: hidden;">T</div>
          <div class="prefix_vk-icon" style="visibility: hidden;">V</div>
          <div class="prefix_windowchat-icon" style="visibility: hidden;">💬</div>
          <div class="prefix_chat-icon" style="display: none;">💬</div>
          <div class="prefix_chat-widget" style="visibility: hidden;">    
            <div class="prefix_chat-header">
              <span class="prefix_header-text">NEXTBOT</span>
              <span class="prefix_close-icon">×</span>
            </div>
              <div class="prefix_chat-messages">
              </div>
              <div class="prefix_chat-input">
                <textarea class="chat-input-content" placeholder="Введите ваше сообщение..." rows="1"></textarea>
                <button></button>
              </div>
              <div class="nb-form-icon-container" style="display: none;">
                <button class="nb-form-icon-button" title="Заполнить форму">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </button>
              </div>
              <div class="nb-modal-overlay" style="display: none;">
                <div class="nb-modal-container">
                  <div class="nb-modal-close">×</div>
                  <div class="nb-modal-content"></div>
                </div>
              </div>
          </div>
    `;

    const chatContainer = document.createElement("div");
    chatContainer.id = "chatWidgetContainer";
    chatContainer.innerHTML = chatWidgetHTML;
    document.body.appendChild(chatContainer);

    // Асинхронная функция для получения userId с учётом Яндекс.Метрики
    async function getUserId(config) {
      // Если нет метрики — возвращаем обычный userId
      if (typeof ym !== "function" || !config.ymCounterId) {
        let userId = localStorage.getItem("userId");
        if (!userId) {
          userId = generateUUID();
          localStorage.setItem("userId", userId);
        }
        return userId;
      }
      // Если есть метрика — ждём clientID
      return new Promise((resolve) => {
        ym(config.ymCounterId, "getClientID", function (clientID) {
          let userId;
          if (clientID) {
            userId = "ym" + clientID;
            localStorage.setItem("userId", userId);
          } else {
            userId = localStorage.getItem("userId");
            if (!userId) {
              userId = generateUUID();
              localStorage.setItem("userId", userId);
            }
          }
          resolve(userId);
        });
      });
    }

    // Получаем userId асинхронно
    const userId = await getUserId(config);

    const URL = "https://dev.nextbot.ru";
    const chatWidget = document.querySelector(".prefix_chat-widget");
    const chatIcon = document.querySelector(".prefix_chat-icon");
    const whatsappIcon = document.querySelector(".prefix_whatsapp-icon");
    const telegramIcon = document.querySelector(".prefix_telegram-icon");
    const miniChatWidgetIcon = document.querySelector(
      ".prefix_windowchat-icon"
    );
    const vkIcon = document.querySelector(".prefix_vk-icon");
    const otherIcons = document.querySelectorAll(
      ".prefix_whatsapp-icon, .prefix_telegram-icon, .prefix_vk-icon, .prefix_windowchat-icon"
    );
    const closeIcon = document.querySelector(".prefix_close-icon");
    const chatInput = document.querySelector(".prefix_chat-input");
    const sendButton = document.querySelector(".prefix_chat-input button");
    const messagesElem = document.querySelector(".prefix_chat-messages");
    const chatHeader = document.querySelector(".prefix_chat-header");
    const chatHeaderText = document.querySelector(".prefix_header-text");
    const userBubbles = document.querySelectorAll(".message.user");
    const botBubbles = document.querySelectorAll(".message.assistant");
    const chatIconElem = document.querySelector(".prefix_chat-icon");
    const inputElem = document.querySelector(
      ".prefix_chat-input .chat-input-content"
    );
    const formIconContainer = document.querySelector(".nb-form-icon-container");
    const formIconButton = document.querySelector(".nb-form-icon-button");

    // Инициализация плейсхолдера при загрузке страницы
    if (inputElem) {
      inputElem.setAttribute("data-placeholder", "Введите ваше сообщение...");
      if (inputElem.textContent === "") {
        inputElem.textContent = inputElem.getAttribute("data-placeholder");
        inputElem.style.color = "#a9a9a9";
      }
    }

    const agentId = config.agentId;
    const widgetBottom =
      window.innerWidth <= 500 ? 30 : config.widgetBottom || 30; // Отступ 30 для мобильных
    const widgetRight =
      window.innerWidth <= 500 ? 30 : config.widgetRight || 30; // Отступ 30 для мобильных
    let chatIconLineColor = config.chatIconLineColor;
    let chatIconBackgroundColor = config.chatIconBackgroundColor;
    let secondsToAutoinvite = config.secondsToAutoinvite;
    let messageAutoInvite = config.messageAutoInvite;
    let backgroundColorAutoInvite = config.bgColorAutoInvite;
    let textColorAutoInvite = config.textColorAutoInvite;
    let chatIconNumberSvg = config.chatIconNumberSvg;

    const autoInviteBubbleMessage = document.querySelector(
      ".prefix_auto-invite-message"
    );
    if (autoInviteBubbleMessage && messageAutoInvite) {
      autoInviteBubbleMessage.textContent = messageAutoInvite;
    }

    // Добавляем обработчик клика на бабл
    const autoBubble = document.querySelector(".prefix_auto-invite-bubble");
    if (autoBubble) {
      autoBubble.style.cursor = "pointer"; // Добавляем курсор-указатель
      autoBubble.addEventListener("click", async function (event) {
        // Если клик по крестику, обработаем отдельно
        if (event.target.classList.contains("prefix_auto-invite-close")) {
          autoBubble.classList.add("hide");
          setTimeout(() => {
            autoBubble.style.visibility = "hidden";
            autoBubble.classList.remove("hide", "show");
          }, 300);
          event.stopPropagation();
          return;
        }
        // Сначала скрываем бабл
        autoBubble.classList.add("hide");
        setTimeout(() => {
          autoBubble.style.visibility = "hidden";
          autoBubble.classList.remove("hide", "show");
        }, 300);

        // Затем открываем чат
        await firstOpenChatWidget();
      });
    }

    let headerText;
    let inputTextPlaceholder;
    let headerBgColor;
    let headerTextColor;
    let chatWindowBgColor;
    let bubbleUserBgColor;
    let bubbleUserTextColor;
    let bubbleBotBgColor;
    let bubbleBotTextColor;
    let initialChatInputHeight = chatInput.offsetHeight;
    let chatIconStandardColor;
    let whatsappNumber;
    let telegramLink;
    let vkLink;
    let historyMessages;
    let startMessage;
    let widgetProperties;
    let isWidgetOpen = false;
    let needMiniMenu = false;
    let loading = false;
    let wasWidgetClicked = false; // Добавляем флаг для отслеживания клика
    let formStyles;
    let currentFormData = null; // Хранит данные текущей формы
    let isFormSubmitted = false; // Флаг отправки формы
    let isAdminMode = false; // Флаг режима админа для текущей формы

    const currentPageUrl = window.location.href;

    // Функция для выбора SVG по номеру
    function getChatWidgetSVGByNumber(num) {
      switch (String(num)) {
        case "2":
          return chatWidgetSVG2;
        case "3":
          return chatWidgetSVG3;
        case "4":
          return chatWidgetSVG4;
        case "5":
          return chatWidgetSVG5;
        case "1":
        default:
          return chatWidgetSVG1;
      }
    }

    insertSVGIcon(
      ".prefix_chat-icon",
      getChatWidgetSVGByNumber(chatIconNumberSvg)
    );

    miniChatWidgetIcon.style.bottom = `${Number(widgetBottom) + 55}px`;
    let bottomPosition = Number(widgetBottom) + 110;
    chatWidget.style.bottom = `${
      window.innerWidth <= 500 ? 10 : widgetBottom
    }px`;
    chatWidget.style.right = `${window.innerWidth <= 500 ? 0 : widgetRight}px`;
    chatIcon.style.bottom = `${widgetBottom}px`;
    chatIcon.style.right = `${widgetRight}px`;
    otherIcons.forEach((icon) => {
      icon.style.right = `${widgetRight}px`;
    });

    setStartWidgetProperties();

    function setStartWidgetProperties() {
      if (chatIconElem && chatIconBackgroundColor && chatIconLineColor) {
        chatIconElem.style.backgroundColor = chatIconBackgroundColor;
      }

      const autoBubble = document.querySelector(".prefix_auto-invite-bubble");
      if (autoBubble) {
        autoBubble.style.bottom = `${Number(widgetBottom) + 65}px`;
        autoBubble.style.right = `${Number(widgetRight)}px`;

        // Применяем цвет фона
        if (backgroundColorAutoInvite) {
          autoBubble.style.backgroundColor = backgroundColorAutoInvite;
          // Также меняем цвет стрелки
          const arrow = autoBubble.querySelector(".prefix_auto-invite-arrow");
          if (arrow) {
            arrow.style.borderTopColor = backgroundColorAutoInvite;
          }
        }

        // Применяем цвет текста
        const messageElement = autoBubble.querySelector(
          ".prefix_auto-invite-message"
        );
        if (messageElement && textColorAutoInvite) {
          messageElement.style.color = textColorAutoInvite;
        }
      }

      if (secondsToAutoinvite && secondsToAutoinvite > 0) {
        setTimeout(autoInviteToChat, secondsToAutoinvite * 1000);
      }
      chatIcon.style.display = "flex";
    }

    function setWidgetProperties() {
      if (chatHeaderText && headerText && headerText.trim() !== "") {
        chatHeaderText.textContent = headerText;
      }

      if (inputElem && inputTextPlaceholder) {
        inputElem.setAttribute("data-placeholder", inputTextPlaceholder);
        // Обновляем HTML атрибут placeholder
        inputElem.setAttribute("placeholder", inputTextPlaceholder);
        inputElem.textContent = inputTextPlaceholder;
        inputElem.style.color = "#a9a9a9";
      }

      if (chatHeader && headerBgColor) {
        chatHeader.style.backgroundColor = headerBgColor;
      }
      if (chatHeader && headerTextColor) {
        chatHeader.style.color = headerTextColor;
      }

      if (messagesElem && chatWindowBgColor) {
        messagesElem.style.backgroundColor = chatWindowBgColor;
      }

      userBubbles.forEach((bubble) => {
        if (bubbleUserBgColor) {
          bubble.style.backgroundColor = bubbleUserBgColor;
        }
        if (bubbleUserTextColor) {
          bubble.style.color = bubbleUserTextColor;
        }
      });

      botBubbles.forEach((bubble) => {
        if (bubbleBotBgColor) {
          bubble.style.backgroundColor = bubbleBotBgColor;
        }
        if (bubbleBotTextColor) {
          bubble.style.color = bubbleBotTextColor;
        }
      });

      if (
        otherIcons &&
        chatIconBackgroundColor &&
        chatIconLineColor &&
        !chatIconStandardColor
      ) {
        otherIcons.forEach((icon) => {
          icon.style.backgroundColor = chatIconBackgroundColor;
        });
      }

      // Устанавливаем стили формы
      if (chatWidget) {
        applyFormStylesToModal(chatWidget);
      }
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chatInput);

    let iconsVisible = false; // Добавляем флаг для отслеживания состояния иконок

    chatIcon.addEventListener("click", firstOpenChatWidget);

    miniChatWidgetIcon.addEventListener("click", function () {
      hideIcons();
      iconsVisible = false;
      openChatWidget();
    });

    // Обработчик клика на иконку формы
    if (formIconButton) {
      formIconButton.addEventListener("click", function () {
        if (currentFormData && !isFormSubmitted) {
          renderPersonalDataForms([currentFormData]);
        }
      });
    }

    async function openChatWidget() {
      chatIcon.style.display = "none";
      chatWidget.style.visibility = "visible";
      chatWidget.classList.add("show");

      // Скрываем бабл при открытии чата
      const autoBubble = document.querySelector(".prefix_auto-invite-bubble");
      if (autoBubble) {
        autoBubble.style.visibility = "hidden";
      }

      isWidgetOpen = true;
      otherIcons.forEach((icon) => {
        icon.style.visibility = "hidden";
      });
    }

    closeIcon.addEventListener("click", function () {
      chatWidget.classList.remove("show");
      chatIcon.classList.add("hide");
      chatIcon.style.display = "flex";
      setTimeout(() => {
        insertSVGIcon(
          ".prefix_chat-icon",
          getChatWidgetSVGByNumber(chatIconNumberSvg)
        );
        chatIcon.classList.remove("hide");
        chatWidget.style.visibility = "hidden";
      }, 100);
      isWidgetOpen = false;
    });

    function hideIcons() {
      otherIcons.forEach((icon) => {
        icon.classList.remove("show");
        setTimeout(() => {
          icon.style.visibility = "hidden";
        }, 300);
      });
    }

    function showIcons() {
      otherIcons.forEach((icon) => {
        icon.style.visibility = "visible";
        // Добавляем небольшую задержку перед добавлением класса show для гарантии анимации
        setTimeout(() => {
          icon.classList.add("show");
        }, 10);
      });
      // Скрываем бабл при показе иконок
      const autoBubble = document.querySelector(".prefix_auto-invite-bubble");
      if (autoBubble) {
        autoBubble.classList.add("hide");
        setTimeout(() => {
          autoBubble.style.visibility = "hidden";
          autoBubble.classList.remove("hide", "show");
        }, 300);
      }
    }

    inputElem.addEventListener("focus", function () {
      if (
        inputElem.textContent === inputElem.getAttribute("data-placeholder")
      ) {
        inputElem.textContent = "";
        inputElem.style.color = "black";
      } else {
        // Явно устанавливаем цвет текста при фокусе, даже если поле не пустое
        inputElem.style.color = "black";
      }
    });

    inputElem.addEventListener("blur", function () {
      if (inputElem.textContent === "") {
        inputElem.textContent = inputElem.getAttribute("data-placeholder");
        inputElem.style.color = "#a9a9a9";
      } else {
        // Убедимся, что текст остается черным, если поле не пустое
        inputElem.style.color = "black";
      }
    });

    // Добавляем обработчик события input для поддержания черного цвета при вводе
    inputElem.addEventListener("input", function () {
      // Если текст не является плейсхолдером, устанавливаем черный цвет
      if (
        inputElem.textContent !== inputElem.getAttribute("data-placeholder")
      ) {
        inputElem.style.color = "black";
      }

      // Сбрасываем высоту
      this.style.height = "45px";

      // Вычисляем новую высоту
      const newHeight = Math.min(
        this.scrollHeight,
        parseInt(getComputedStyle(this).maxHeight)
      );

      // Устанавливаем новую высоту
      this.style.height = newHeight + "px";

      // Если контент превышает максимальную высоту, добавляем overflow-y: auto
      if (this.scrollHeight > newHeight) {
        this.style.overflowY = "auto";
      } else {
        this.style.overflowY = "hidden";
      }
    });

    // Функция для применения действий Яндекс.Метрики
    function applyYandexMetrikaAction(yandexMetrikaResults, config) {
      if (
        !Array.isArray(yandexMetrikaResults) ||
        !yandexMetrikaResults.length ||
        typeof ym !== "function" ||
        !config.ymCounterId
      )
        return;

      const ymId = config.ymCounterId;

      yandexMetrikaResults.forEach((result) => {
        const { actionYM, paramsToWidget, actionCustomNameYM } = result;

        if (actionYM === "userParams") {
          ym(ymId, "userParams", paramsToWidget);
        } else if (actionYM === "params") {
          ym(ymId, "params", paramsToWidget);
        } else if (actionYM === "reachGoal") {
          ym(ymId, "reachGoal", actionCustomNameYM, paramsToWidget);
        }
      });
    }
    async function handleSend(message, config) {
      inputElem.value = "";
      sendButton.disabled = true;

      // Сбрасываем высоту поля ввода до стандартной после отправки сообщения
      inputElem.style.height = "45px";
      inputElem.style.overflowY = "hidden";

      // Обновляем высоту области сообщений
      const deltaHeight = inputElem.offsetHeight - initialChatInputHeight;
      messagesElem.style.height = `calc(360px + 40px - ${deltaHeight}px)`;
      messagesElem.scrollTop = messagesElem.scrollHeight;

      sendButton.classList.add("loading");

      addMessageToChat(message, "user");
      messagesElem.scrollTop = messagesElem.scrollHeight;

      const response = await sendMessage(message, config);
      // обрабатываем тригер, видим что в ответе сработала функция
      if (response && response.content) {
        addMessageToChat(response.content, "assistant");
      }
      // --- Рендер формы персональных данных ---
      if (
        response &&
        response.personalDataFormResult &&
        response.personalDataFormResult.fields &&
        response.personalDataFormResult.fields.length > 0
      ) {
        // Сбрасываем флаг отправки для новой формы
        isFormSubmitted = false;
        renderPersonalDataForms([response.personalDataFormResult]);
      }
      // --- Вызов Яндекс.Метрики ---
      if (response && response.yandexMetrikaResult) {
        applyYandexMetrikaAction(response.yandexMetrikaResult, config);
      }
      // --- конец ---

      sendButton.classList.remove("loading");

      sendButton.disabled = false;
    }

    inputElem.addEventListener("keydown", async function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const message = inputElem.value.trim();
        const placeholder = inputElem.getAttribute("data-placeholder");

        if (message && message !== placeholder && !sendButton.disabled) {
          await handleSend(message, config);
        }
      }
    });

    sendButton.addEventListener("click", async function () {
      const message = inputElem.value.trim();
      const placeholder = inputElem.getAttribute("data-placeholder");

      if (message && message !== placeholder && !sendButton.disabled) {
        await handleSend(message, config);
      }
    });

    async function sendMessage(message) {
      const response = await fetch(`${URL}/api/widget/chat/${agentId}`, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          userId,
          messages: [{ role: "user", content: message }],
          widgetUrl: currentPageUrl,
        }),
      });
      return response.ok
        ? await response.json()
        : console.error("Ошибка отправки сообщения:", response.statusText);
    }

    async function fetchInitialProperties(agentId, userId) {
      const response = await fetch(
        `${URL}/api/widget/init/${agentId}?userId=${userId}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      return response.ok
        ? await response.json()
        : console.error("Ошибка получения сообщений:", response.statusText);
    }

    function addMessageToChat(message, role) {
      if (role !== "assistant" && role !== "user") {
        return;
      }
      const messageElem = document.createElement("div");
      try {
        // Используем marked для преобразования Markdown в HTML
        messageElem.innerHTML = marked.parse(message);
      } catch (error) {
        console.error("Ошибка при парсинге Markdown:", error);
        messageElem.textContent = message; // Fallback к обычному тексту
      }
      messageElem.classList.add("message", role);
      messagesElem.appendChild(messageElem);

      applyMessageColors(messageElem, role);
      messagesElem.scrollTop = messagesElem.scrollHeight;
    }

    // Рендер форм персональных данных в модальном окне
    function renderPersonalDataForms(forms) {
      try {
        const modalOverlay = document.querySelector(".nb-modal-overlay");
        const modalContent = document.querySelector(".nb-modal-content");
        const modalClose = document.querySelector(".nb-modal-close");

        if (!modalOverlay || !modalContent || !modalClose) return;

        // Сохраняем данные формы для возможности повторного открытия
        if (forms && forms.length > 0 && !isFormSubmitted) {
          currentFormData = forms[0];
        }

        // Применяем цветовую схему виджета к форме
        const modalContainer = modalOverlay.querySelector(
          ".nb-modal-container"
        );
        applyFormStylesToModal(modalContainer);

        forms.forEach((formConfig) => {
          // Очищаем предыдущее содержимое
          modalContent.innerHTML = "";

          // Создаем заголовок формы
          const formTitle = document.createElement("h2");
          formTitle.classList.add("nb-modal-title");
          formTitle.textContent = formStyles?.formTitle || "Заполните данные";
          modalContent.appendChild(formTitle);

          const formEl = document.createElement("form");
          formEl.classList.add("nb-personal-data-form");

          const fields = Array.isArray(formConfig.fields)
            ? formConfig.fields
            : [];

          // Создаем контейнер для полей с фиксированной высотой
          const fieldsContainer = document.createElement("div");
          fieldsContainer.classList.add("nb-form-fields-container");

          fields.forEach((field) => {
            const fieldWrap = document.createElement("div");
            fieldWrap.classList.add("nb-form-field");

            const label = document.createElement("label");
            const isCheckbox =
              String(field.field_type).toLowerCase() === "consent_checkbox" ||
              String(field.field_type).toLowerCase() === "boolean";

            const input = createInputForField(field);
            input.setAttribute("data-field-id", field.id || "");
            // Сохраняем техническое имя поля для CRM, если есть
            if (field && typeof field.name_in_crm !== "undefined") {
              input.setAttribute(
                "data-field-name-in-crm",
                field.name_in_crm || ""
              );
            }

            if (isCheckbox) {
              // Чекбокс и текст согласия в одной строке
              label.appendChild(input);
              const span = document.createElement("span");
              span.innerHTML = field.consent_text || field.name || "";
              label.appendChild(span);
              fieldWrap.appendChild(label);
            } else {
              label.textContent = `${field.name || ""}${
                field.required ? " *" : ""
              }`;
              fieldWrap.appendChild(label);
              fieldWrap.appendChild(input);
            }

            fieldsContainer.appendChild(fieldWrap);
          });

          // Добавляем контейнер с полями в форму
          formEl.appendChild(fieldsContainer);

          const actionsWrap = document.createElement("div");
          actionsWrap.classList.add("nb-form-actions");
          const submitBtn = document.createElement("button");
          submitBtn.type = "submit";
          submitBtn.textContent = formStyles?.submitButtonText || "Отправить";
          actionsWrap.appendChild(submitBtn);
          formEl.appendChild(actionsWrap);

          formEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            // если мы в админке, то не отправляем форму
            if (isAdminMode) {
              return;
            }
            submitBtn.disabled = true;
            const prevText = submitBtn.textContent;
            submitBtn.textContent = "Отправка...";
            try {
              const preparedFields = (
                Array.isArray(formConfig.fields) ? formConfig.fields : []
              ).map((field) => {
                const el = formEl.querySelector(
                  `[data-field-id="${field.id || ""}"]`
                );
                let val = "";
                const type = String(field.field_type).toLowerCase();
                if (el) {
                  if (type === "consent_checkbox" || type === "boolean") {
                    val = el.checked ? true : false;
                  } else if (type === "number") {
                    val = el.value !== "" ? Number(el.value) : "";
                  } else {
                    val = el.value || "";
                  }
                }
                const fieldObj = {
                  id: field.id,
                  name: field.name,
                  name_in_crm: field.name_in_crm,
                  field_type: field.field_type,
                  value: val,
                  required: !!field.required,
                  consent_text: field.consent_text || "",
                };
                // Добавляем UTC Unix timestamp в секундах для consent_checkbox (и boolean на случай совместимости)
                if (type === "consent_checkbox" || type === "boolean") {
                  // Устанавливаем только дату по UTC (Гринвич) в формате YYYY-MM-DD
                  fieldObj.date_agreement = new Date().toISOString();
                }
                return fieldObj;
              });

              const payload = {
                userId,
                agentId,
                widgetUrl: currentPageUrl,
                form: {
                  fields: preparedFields,
                  custom_api: formConfig.custom_api || undefined,
                },
                functionName: formConfig.functionName,
              };

              const resp = await fetch(
                `${URL}/api/personalDataForm/submit/${agentId}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                }
              );

              let data;
              let errorMessage = "";

              try {
                data = await resp.clone().json();
              } catch (_) {
                // Тело ответа не JSON — оставим data неопределённым
              }

              // Ошибка HTTP (например, 405) или успешный HTTP, но в теле success=false
              if (
                !resp.ok ||
                (data && typeof data === "object" && data.success === false)
              ) {
                // Всегда извлекаем message из ответа, если он есть
                if (data && typeof data === "object" && data.message) {
                  errorMessage = data.message;
                } else if (resp.statusText) {
                  errorMessage = resp.statusText;
                } else {
                  errorMessage = "Не удалось отправить форму";
                }

                // Добавляем код ответа для более детальной информации
                const fullErrorMessage = resp.status
                  ? `${errorMessage} (код ${resp.status})`
                  : errorMessage;

                showToastNotification(fullErrorMessage, "error");
                console.error("Ошибка отправки формы:", errorMessage);

                // Восстанавливаем кнопку
                submitBtn.disabled = false;
                submitBtn.textContent = prevText;
                return;
              }

              // Успех
              submitBtn.textContent = "Отправлено";
              formEl
                .querySelectorAll("input,button,textarea,select")
                .forEach((control) => (control.disabled = true));

              // Сообщение об успехе
              showToastNotification("Спасибо! Форма отправлена.", "success");

              // Добавляем сообщение от бота в чат
              if (data && data.message) {
                addMessageToChat(data.message, "assistant");
              }

              // Устанавливаем флаг отправки формы
              isFormSubmitted = true;
              // Скрываем иконку формы
              if (formIconContainer) {
                formIconContainer.style.display = "none";
              }
            } catch (e) {
              submitBtn.disabled = false;
              submitBtn.textContent = prevText;

              showToastNotification(e.message, "error");
              console.error("Ошибка отправки формы:", e.message);
            }
          });

          modalContent.appendChild(formEl);

          // Скрываем иконку формы при открытии модального окна
          if (formIconContainer) {
            formIconContainer.style.display = "none";
          }

          // Показываем модальное окно
          modalOverlay.style.display = "flex";
        });

        // Обработчик закрытия модального окна
        modalClose.onclick = () => {
          modalOverlay.style.display = "none";
          // Показываем иконку формы, если форма не была отправлена
          if (!isFormSubmitted && currentFormData && formIconContainer) {
            formIconContainer.style.display = "block";
          }
        };

        // Закрытие при клике на overlay
        modalOverlay.onclick = (e) => {
          if (e.target === modalOverlay) {
            modalOverlay.style.display = "none";
            // Показываем иконку формы, если форма не была отправлена
            if (!isFormSubmitted && currentFormData && formIconContainer) {
              formIconContainer.style.display = "block";
            }
          }
        };
      } catch (e) {
        console.error("Ошибка при рендере формы персональных данных:", e);
      }
    }

    function createInputForField(field) {
      const type = String(field.field_type || "").toLowerCase();
      if (type === "consent_checkbox" || type === "boolean") {
        const input = document.createElement("input");
        input.type = "checkbox";
        if (
          String(field.value).toLowerCase() === "true" ||
          field.value === true
        ) {
          input.checked = true;
        }
        input.required = !!field.required;
        return input;
      }

      const input = document.createElement("input");

      // Определяем тип поля на основе field_type
      if (type === "email") {
        input.type = "email";
        input.placeholder = "example@email.com";
      } else if (type === "phone") {
        input.type = "tel";
        input.placeholder = "___ (___) ___-__-__";
        input.maxLength = 15;
      } else {
        input.type = "text";
      }

      // Устанавливаем значение поля, если оно есть
      if (field.value !== undefined && field.value !== null) {
        input.value = String(field.value);
      }

      input.required = !!field.required;
      return input;
    }

    function autoInviteToChat() {
      // Проверяем, был ли клик по виджету
      if (wasWidgetClicked) {
        return;
      }

      // Проверяем, есть ли уже сообщения
      if (messagesElem.children.length > 1) {
        return;
      }

      // Проверяем, не открыт ли уже чат или не показаны ли другие иконки
      const isAnyIconVisible = Array.from(otherIcons).some(
        (icon) => icon.style.visibility === "visible"
      );

      if (chatWidget.style.display === "block" || isAnyIconVisible) {
        return;
      }

      if (
        !messageAutoInvite ||
        !backgroundColorAutoInvite ||
        !textColorAutoInvite ||
        !secondsToAutoinvite
      ) {
        return;
      }

      const autoInviteBubble = document.querySelector(
        ".prefix_auto-invite-bubble"
      );
      const autoInviteBubbleMessage = document.querySelector(
        ".prefix_auto-invite-message"
      );

      if (autoInviteBubble && autoInviteBubbleMessage) {
        autoInviteBubbleMessage.textContent = messageAutoInvite;
        autoInviteBubble.style.backgroundColor = backgroundColorAutoInvite;
        const arrow = autoInviteBubble.querySelector(
          ".prefix_auto-invite-arrow"
        );
        if (arrow) {
          arrow.style.borderTopColor = backgroundColorAutoInvite;
        }
        autoInviteBubbleMessage.style.color = textColorAutoInvite;

        autoInviteBubble.style.visibility = "visible";
        setTimeout(() => {
          autoInviteBubble.classList.add("show");
        }, 10);
      }
      playConnectionSound();
    }

    function applyMessageColors(messageElem, role) {
      if (role === "user") {
        if (bubbleUserBgColor) {
          messageElem.style.backgroundColor = bubbleUserBgColor;
        }
        if (bubbleUserTextColor) {
          messageElem.style.color = bubbleUserTextColor;
        }
      } else if (role === "assistant") {
        if (bubbleBotBgColor) {
          messageElem.style.backgroundColor = bubbleBotBgColor;
        }
        if (bubbleBotTextColor) {
          messageElem.style.color = bubbleBotTextColor;
        }
      }
    }

    function applyFormStylesToModal(modalContainer) {
      if (!modalContainer) return;

      // Устанавливаем CSS-переменные для формы
      // ВАЖНО: Дефолтные значения должны совпадать с DEFAULT_FORM_STYLES из
      // src/constants/defaultSettings/defaultWidgetProperties.ts
      modalContainer.style.setProperty(
        "--modal-bg-color",
        formStyles?.modalBackgroundColor || "white"
      );
      modalContainer.style.setProperty(
        "--modal-title-color",
        formStyles?.modalTitleColor || "#1f2937"
      );
      modalContainer.style.setProperty(
        "--form-label-color",
        formStyles?.labelColor || "#4b5563"
      );
      modalContainer.style.setProperty(
        "--form-input-bg-color",
        formStyles?.inputBackgroundColor || "#f9fafb"
      );
      modalContainer.style.setProperty(
        "--form-input-text-color",
        formStyles?.inputTextColor || "#1f2937"
      );
      modalContainer.style.setProperty(
        "--form-input-border-color",
        formStyles?.inputBorderColor || "#e5e7eb"
      );
      modalContainer.style.setProperty(
        "--form-submit-bg-color",
        formStyles?.submitBackgroundColor || "#667eea"
      );
      modalContainer.style.setProperty(
        "--form-submit-text-color",
        formStyles?.submitTextColor || "white"
      );
      modalContainer.style.setProperty(
        "--form-scrollbar-color",
        formStyles?.scrollbarColor || "#cbd5e0"
      );
      modalContainer.style.setProperty(
        "--form-scrollbar-track-color",
        formStyles?.scrollbarTrackColor || "#f3f4f6"
      );
      modalContainer.style.setProperty(
        "--form-icon-bg-color",
        formStyles?.formIconBackgroundColor || "#667eea"
      );
      modalContainer.style.setProperty(
        "--form-icon-color",
        formStyles?.formIconColor || "white"
      );
    }

    function handleResize(entries) {
      for (let entry of entries) {
        if (entry.target === chatInput) {
          const deltaHeight = entry.contentRect.height - initialChatInputHeight;
          messagesElem.style.height = `calc(360px + 40px - ${deltaHeight}px)`;
        }
      }
      messagesElem.scrollTop = messagesElem.scrollHeight;
    }

    function generateUUID() {
      return "yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    function insertSVGIcon(targetSelector, svgContent) {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        targetElement.innerHTML = svgContent;

        // Если есть chatIconLineColor
        if (chatIconLineColor) {
          if (
            !chatIconStandardColor ||
            (chatIconStandardColor && targetSelector === ".prefix_chat-icon")
          ) {
            // Меняем цвет линий
            const pathsWithStroke =
              targetElement.querySelectorAll("svg path[stroke]");
            pathsWithStroke.forEach((path) => {
              path.setAttribute("stroke", chatIconLineColor);
            });

            // Меняем цвет заливки
            const svg = targetElement.querySelector("svg");
            const pathsWithFill = svg.querySelectorAll('path[fill="white"]');
            pathsWithFill.forEach((path) => {
              path.setAttribute("fill", chatIconLineColor);
            });
            svg.setAttribute("fill", chatIconLineColor);
          }
        }
      } else {
        console.error(`Element with selector "${targetSelector}" not found.`);
      }
    }

    async function firstOpenChatWidget() {
      if (loading) {
        return;
      }

      wasWidgetClicked = true; // Устанавливаем флаг при клике
      const autoBubble = document.querySelector(".prefix_auto-invite-bubble");
      if (autoBubble) {
        autoBubble.style.visibility = "hidden";
      }

      if (!historyMessages && !startMessage) {
        loading = true;
        // Добавляем класс loading для анимации
        chatIcon.classList.add("loading");
        chatIcon.style.setProperty("--spinner-color", chatIconLineColor);
        try {
          const initData = await fetchInitialProperties(agentId, userId);
          historyMessages = initData.historyMessages;
          startMessage = initData.startMessage;
          widgetProperties = initData.widgetProperties;

          if (widgetProperties) {
            headerText = widgetProperties.header_text;
            inputTextPlaceholder = widgetProperties.input_text_placeholder;
            headerBgColor = widgetProperties.header_bg_color;
            headerTextColor = widgetProperties.header_text_color;
            chatWindowBgColor = widgetProperties.chat_window_bg_color;
            bubbleUserBgColor = widgetProperties.bubble_user_bg_color;
            bubbleUserTextColor = widgetProperties.bubble_user_text_color;
            bubbleBotBgColor = widgetProperties.bubble_bot_bg_color;
            bubbleBotTextColor = widgetProperties.bubble_bot_text_color;
            chatIconStandardColor =
              widgetProperties.chat_icon_standard_color === "false" ||
              widgetProperties.chat_icon_standard_color === false
                ? false
                : Boolean(widgetProperties.chat_icon_standard_color);
            whatsappNumber = widgetProperties.whatsapp_number;
            telegramLink = widgetProperties.telegram_link;
            vkLink = widgetProperties.vk_link;
            formStyles = widgetProperties.form_styles;
            setWidgetProperties();

            if (whatsappNumber && /^\d+$/.test(whatsappNumber)) {
              whatsappIcon.style.bottom = `${bottomPosition}px`;
              bottomPosition += 55;
              whatsappIcon.addEventListener("click", () => {
                const whatsappUrl = `https://wa.me/${whatsappNumber}`;
                window.open(whatsappUrl, "_blank");
              });
              needMiniMenu = true;
            } else {
              whatsappIcon.style.display = "none";
            }

            if (telegramLink && telegramLink.startsWith("https://t.me/")) {
              telegramIcon.style.bottom = `${bottomPosition}px`;
              bottomPosition += 55;
              telegramIcon.addEventListener("click", () => {
                window.open(telegramLink, "_blank");
              });
              needMiniMenu = true;
            } else {
              telegramIcon.style.display = "none";
            }

            if (vkLink && vkLink.startsWith("https://vk.com/")) {
              vkIcon.style.bottom = `${bottomPosition}px`;
              vkIcon.addEventListener("click", () => {
                window.open(vkLink, "_blank");
              });
              needMiniMenu = true;
            } else {
              vkIcon.style.display = "none";
            }

            if (!needMiniMenu) {
              miniChatWidgetIcon.style.display = "none";
            }
          }

          insertSVGIcon(".prefix_whatsapp-icon", whatsappSVG);
          insertSVGIcon(".prefix_telegram-icon", telegramSVG);
          insertSVGIcon(".prefix_vk-icon", vkSVG);
          insertSVGIcon(
            ".prefix_windowchat-icon",
            getChatWidgetSVGByNumber(chatIconNumberSvg)
          );

          if (historyMessages && historyMessages.length > 0) {
            historyMessages.forEach((msg) => {
              addMessageToChat(msg.content, msg.role);
            });
          } else {
            // Проверяем, нет ли уже стартового сообщения в чате
            const existingMessages =
              messagesElem.querySelectorAll(".message.assistant");
            const hasStartMessage = Array.from(existingMessages).some(
              (msg) => msg.textContent === startMessage
            );

            if (!hasStartMessage) {
              addMessageToChat(startMessage, "assistant");
            }
          }
          const adminMode = config?.admin === true;
          // Показываем незавершенную форму персональных данных, если она есть
          if (initData.formArguments) {
            // Сбрасываем флаг отправки для новой formArguments
            isFormSubmitted = false;
            renderPersonalDataForms([initData.formArguments]);
            // если основной формы нет, но есть структура для превью, то сохраняем ее для открытия по клику (режим админки)
          } else if (
            adminMode &&
            initData.formStructure &&
            initData.formStructure.fields &&
            initData.formStructure.fields.length > 0
          ) {
            isFormSubmitted = false;
            isAdminMode = true;
            // Сохраняем данные формы, но не открываем сразу
            currentFormData = initData.formStructure;
            // Показываем иконку формы для возможности открытия только если есть поля
            if (formIconContainer) {
              formIconContainer.style.display = "block";
            }
          }
        } catch (error) {
          console.error("Ошибка загрузки данных:", error);
        } finally {
          // Убираем класс loading после завершения загрузки
          chatIcon.classList.remove("loading");
          loading = false;
        }
      }

      if (!needMiniMenu) {
        openChatWidget();
      } else {
        if (iconsVisible) {
          hideIcons();
          insertSVGIcon(
            ".prefix_chat-icon",
            getChatWidgetSVGByNumber(chatIconNumberSvg)
          );
          iconsVisible = false;
        } else {
          showIcons();
          insertSVGIcon(".prefix_chat-icon", chatCrossSVG);
          iconsVisible = true;
        }
      }
    }

    function playConnectionSound() {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Создаем узел усиления
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.05; // Устанавливаем громкость в 0.5 (в два раза тише)
      gainNode.connect(audioCtx.destination); // Подключаем узел усиления к конечному пункту

      [440, 550, 660].forEach((note, i) => {
        const oscillator = audioCtx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          note,
          audioCtx.currentTime + i * 0.1
        );

        // Подключаем осциллятор к узлу усиления
        oscillator.connect(gainNode);

        // Запускаем и останавливаем осциллятор
        oscillator.start(audioCtx.currentTime + i * 0.1);
        oscillator.stop(audioCtx.currentTime + i * 0.2);
      });
    }

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "updateChatIconLineColor") {
        chatIconLineColor = event.data.color;
      }
      if (event.data && event.data.type === "updateNeedMiniMenu") {
        needMiniMenu = event.data.needMiniMenu;
      }
      if (event.data && event.data.type === "updateChatIconSvg") {
        chatIconNumberSvg = event.data.numberSvg;
        insertSVGIcon(
          ".prefix_windowchat-icon",
          getChatWidgetSVGByNumber(chatIconNumberSvg)
        );
        if (!iconsVisible) {
          insertSVGIcon(
            ".prefix_chat-icon",
            getChatWidgetSVGByNumber(chatIconNumberSvg)
          );
        }
      }
      // Обновляем стили формы для превью формы в админке
      if (event.data && event.data.type === "updateFormStyles") {
        formStyles = event.data;
        // Применяем новые стили
        setWidgetProperties();
        // Обновляем стили модального окна, если оно открыто
        const modalContainer = document.querySelector(".nb-modal-container");
        applyFormStylesToModal(modalContainer);
        // Обновляем текстовый контент формы, если она открыта
        const modalTitle = document.querySelector(".nb-modal-title");
        if (modalTitle && formStyles?.formTitle) {
          modalTitle.textContent = formStyles.formTitle;
        }
        const submitButton = document.querySelector(
          ".nb-form-actions button[type='submit']"
        );
        if (
          submitButton &&
          formStyles?.submitButtonText &&
          !submitButton.disabled
        ) {
          submitButton.textContent = formStyles.submitButtonText;
        }
      }
      if (event.data && event.data.type === "updateAutoInviteTest") {
        if (
          event.data.messageAutoInvite != messageAutoInvite ||
          event.data.backgroundColorAutoInvite != backgroundColorAutoInvite ||
          event.data.textColorAutoInvite != textColorAutoInvite ||
          event.data.secondsToAutoinvite != secondsToAutoinvite
        ) {
          wasWidgetClicked = false;
        }
        messageAutoInvite = event.data.messageAutoInvite;
        backgroundColorAutoInvite = event.data.backgroundColorAutoInvite;
        textColorAutoInvite = event.data.textColorAutoInvite;
        secondsToAutoinvite = event.data.secondsToAutoinvite;
        // Проверяем, был ли клик по виджету
        if (wasWidgetClicked) {
          return;
        }

        // Проверяем, есть ли уже сообщения
        if (messagesElem.children.length > 1) {
          return;
        }

        // Проверяем, не открыт ли уже чат или не показаны ли другие иконки
        const isAnyIconVisible = Array.from(otherIcons).some(
          (icon) => icon.style.visibility === "visible"
        );

        if (chatWidget.style.display === "block" || isAnyIconVisible) {
          return;
        }

        if (
          !messageAutoInvite ||
          !backgroundColorAutoInvite ||
          !textColorAutoInvite ||
          !secondsToAutoinvite
        ) {
          return;
        }

        const autoInviteBubble = document.querySelector(
          ".prefix_auto-invite-bubble"
        );
        const autoInviteBubbleMessage = document.querySelector(
          ".prefix_auto-invite-message"
        );

        if (autoInviteBubble && autoInviteBubbleMessage) {
          autoInviteBubbleMessage.textContent = messageAutoInvite;
          autoInviteBubble.style.backgroundColor = backgroundColorAutoInvite;
          const arrow = autoInviteBubble.querySelector(
            ".prefix_auto-invite-arrow"
          );
          if (arrow) {
            arrow.style.borderTopColor = backgroundColorAutoInvite;
          }
          autoInviteBubbleMessage.style.color = textColorAutoInvite;

          autoInviteBubble.style.visibility = "visible";
          setTimeout(() => {
            autoInviteBubble.classList.add("show");
          }, 10);
        }
      }
    });

    // Функция для показа toast-уведомлений
    function showToastNotification(message, type = "success") {
      // Получаем контейнер модального окна
      const modalContainer = document.querySelector(".nb-modal-container");
      if (!modalContainer) return;

      // Удаляем предыдущие toast, если есть
      const existingToasts = modalContainer.querySelectorAll(
        ".nb-form-success, .nb-form-error"
      );
      existingToasts.forEach((toast) => {
        toast.classList.add("nb-toast-hiding");
        setTimeout(() => toast.remove(), 300);
      });

      // Создаем новый toast
      const toast = document.createElement("div");
      toast.classList.add(
        type === "success" ? "nb-form-success" : "nb-form-error"
      );

      // Добавляем текст сообщения
      const messageText = document.createElement("span");
      messageText.textContent = message;
      toast.appendChild(messageText);

      // Добавляем кнопку закрытия
      const closeBtn = document.createElement("button");
      closeBtn.classList.add("nb-toast-close");
      closeBtn.innerHTML = "×";
      closeBtn.onclick = () => {
        toast.classList.add("nb-toast-hiding");
        setTimeout(() => toast.remove(), 300);
      };
      toast.appendChild(closeBtn);

      // Добавляем toast в модальный контейнер
      modalContainer.appendChild(toast);

      // Автоматически скрываем ТОЛЬКО успешные уведомления через 5 секунд
      // Ошибки остаются видимыми, пока пользователь не закроет их сам
      if (type === "success") {
        setTimeout(() => {
          if (toast.parentElement) {
            toast.classList.add("nb-toast-hiding");
            setTimeout(() => toast.remove(), 300);
          }
        }, 5000);
      }
    }

    // Позволяет интегратору открывать чат через кастомное событие
    window.addEventListener("openChatWidgetNB", () => {
      firstOpenChatWidget();
    });
  };

  // Экспортируем функцию в глобальный объект window
  window.initializeChatWidget = function (config) {
    // Проверяем, загружен ли DOM
    if (document.readyState === "loading") {
      // Если DOM еще загружается, добавляем обработчик события
      document.addEventListener("DOMContentLoaded", function () {
        initializeWidget(config);
      });
    } else {
      // Если DOM уже загружен, вызываем функцию напрямую
      initializeWidget(config);
    }

    // Возвращаем промис для обратной совместимости, если код ожидает промис
    return Promise.resolve();
  };

  // блок добавления параметров в YM
})();

const whatsappSVG = `
    <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" width="30px" height="30px" fill="white">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M3.50002 12C3.50002 7.30558 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C10.3278 20.5 8.77127 20.0182 7.45798 19.1861C7.21357 19.0313 6.91408 18.9899 6.63684 19.0726L3.75769 19.9319L4.84173 17.3953C4.96986 17.0955 4.94379 16.7521 4.77187 16.4751C3.9657 15.176 3.50002 13.6439 3.50002 12ZM12 1.5C6.20103 1.5 1.50002 6.20101 1.50002 12C1.50002 13.8381 1.97316 15.5683 2.80465 17.0727L1.08047 21.107C0.928048 21.4637 0.99561 21.8763 1.25382 22.1657C1.51203 22.4552 1.91432 22.5692 2.28599 22.4582L6.78541 21.1155C8.32245 21.9965 10.1037 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5ZM14.2925 14.1824L12.9783 15.1081C12.3628 14.7575 11.6823 14.2681 10.9997 13.5855C10.2901 12.8759 9.76402 12.1433 9.37612 11.4713L10.2113 10.7624C10.5697 10.4582 10.6678 9.94533 10.447 9.53028L9.38284 7.53028C9.23954 7.26097 8.98116 7.0718 8.68115 7.01654C8.38113 6.96129 8.07231 7.046 7.84247 7.24659L7.52696 7.52195C6.76823 8.18414 6.3195 9.2723 6.69141 10.3741C7.07698 11.5163 7.89983 13.314 9.58552 14.9997C11.3991 16.8133 13.2413 17.5275 14.3186 17.8049C15.1866 18.0283 16.008 17.7288 16.5868 17.2572L17.1783 16.7752C17.4313 16.5691 17.5678 16.2524 17.544 15.9269C17.5201 15.6014 17.3389 15.308 17.0585 15.1409L15.3802 14.1409C15.0412 13.939 14.6152 13.9552 14.2925 14.1824Z"/>
    </svg>
  `;

const telegramSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -5 40 40" width="40px" height="40px" fill="white">
      <path d="M 26.070313 3.996094 C 25.734375 4.011719 25.417969 4.109375 25.136719 4.21875 L 25.132813 4.21875 C 24.847656 4.332031 23.492188 4.902344 21.433594 5.765625 C 19.375 6.632813 16.703125 7.757813 14.050781 8.875 C 8.753906 11.105469 3.546875 13.300781 3.546875 13.300781 L 3.609375 13.277344 C 3.609375 13.277344 3.25 13.394531 2.875 13.652344 C 2.683594 13.777344 2.472656 13.949219 2.289063 14.21875 C 2.105469 14.488281 1.957031 14.902344 2.011719 15.328125 C 2.101563 16.050781 2.570313 16.484375 2.90625 16.722656 C 3.246094 16.964844 3.570313 17.078125 3.570313 17.078125 L 3.578125 17.078125 L 8.460938 18.722656 C 8.679688 19.425781 9.949219 23.597656 10.253906 24.558594 C 10.433594 25.132813 10.609375 25.492188 10.828125 25.765625 C 10.933594 25.90625 11.058594 26.023438 11.207031 26.117188 C 11.265625 26.152344 11.328125 26.179688 11.390625 26.203125 C 11.410156 26.214844 11.429688 26.21875 11.453125 26.222656 L 11.402344 26.210938 C 11.417969 26.214844 11.429688 26.226563 11.441406 26.230469 C 11.480469 26.242188 11.507813 26.246094 11.558594 26.253906 C 12.332031 26.488281 12.953125 26.007813 12.953125 26.007813 L 12.988281 25.980469 L 15.871094 23.355469 L 20.703125 27.0625 L 20.8125 27.109375 C 21.820313 27.550781 22.839844 27.304688 23.378906 26.871094 C 23.921875 26.433594 24.132813 25.875 24.132813 25.875 L 24.167969 25.785156 L 27.902344 6.65625 C 28.007813 6.183594 28.035156 5.742188 27.917969 5.3125 C 27.800781 4.882813 27.5 4.480469 27.136719 4.265625 C 26.769531 4.046875 26.40625 3.980469 26.070313 3.996094 Z M 25.96875 6.046875 C 25.964844 6.109375 25.976563 6.101563 25.949219 6.222656 L 25.949219 6.234375 L 22.25 25.164063 C 22.234375 25.191406 22.207031 25.25 22.132813 25.308594 C 22.054688 25.371094 21.992188 25.410156 21.667969 25.28125 L 15.757813 20.75 L 12.1875 24.003906 L 12.9375 19.214844 C 12.9375 19.214844 22.195313 10.585938 22.59375 10.214844 C 22.992188 9.84375 22.859375 9.765625 22.859375 9.765625 C 22.886719 9.3125 22.257813 9.632813 22.257813 9.632813 L 10.082031 17.175781 L 10.078125 17.15625 L 4.242188 15.191406 L 4.242188 15.1875 C 4.238281 15.1875 4.230469 15.183594 4.226563 15.183594 C 4.230469 15.183594 4.257813 15.171875 4.257813 15.171875 L 4.289063 15.15625 L 4.320313 15.144531 C 4.320313 15.144531 9.53125 12.949219 14.828125 10.71875 C 17.480469 9.601563 20.152344 8.476563 22.207031 7.609375 C 24.261719 6.746094 25.78125 6.113281 25.867188 6.078125 C 25.949219 6.046875 25.910156 6.046875 25.96875 6.046875 Z"/>
    </svg>
  `;

const vkSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 30 30" width="40px" height="40px" fill="white">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M23.405 16.865C22.8611 15.7695 22.1444 14.7688 21.2825 13.9013C20.9892 13.5603 20.6453 13.2238 20.3768 12.9612L20.3393 12.9245C20.2008 12.7889 20.0864 12.6764 19.9928 12.5795C21.1713 10.9407 22.18 9.18595 23.003 7.34222L23.0362 7.26783L23.0595 7.18976C23.1676 6.82687 23.2922 6.1368 22.8515 5.51317C22.396 4.86859 21.6666 4.75234 21.1782 4.75234H18.9311C18.4627 4.73087 17.9988 4.85751 17.6058 5.11498C17.2098 5.37439 16.9069 5.75278 16.7402 6.1951C16.2563 7.34779 15.6508 8.4442 14.9347 9.46598V6.83269C14.9347 6.4923 14.9027 5.92289 14.5382 5.44229C14.1018 4.86685 13.4707 4.75234 13.0326 4.75234H9.46708C9.00771 4.74172 8.56094 4.90597 8.2176 5.21259C7.866 5.52659 7.65052 5.96521 7.61687 6.43543L7.61369 6.47997V6.52463C7.61369 7.01011 7.80606 7.36822 7.95975 7.59344C8.02856 7.69427 8.10216 7.78606 8.14865 7.84403L8.15938 7.85741C8.20895 7.91923 8.24204 7.96049 8.27525 8.00566C8.3626 8.12448 8.48824 8.30768 8.52379 8.78174V10.2547C7.9091 9.24423 7.26066 7.89957 6.77276 6.46344L6.76527 6.4414L6.75697 6.41965C6.63532 6.10103 6.4402 5.63743 6.04941 5.28266C5.59288 4.86821 5.0529 4.75234 4.56182 4.75234H2.28187C1.78506 4.75234 1.18613 4.86857 0.739237 5.33999C0.299773 5.80358 0.25 6.35907 0.25 6.65442V6.78755L0.278039 6.91769C0.909544 9.84881 2.21076 12.5937 4.07946 14.9377C4.92668 16.2737 6.07468 17.3936 7.43213 18.2075C8.81124 19.0345 10.3671 19.5219 11.9715 19.6297L12.0133 19.6325H12.0553C12.7811 19.6325 13.5378 19.5699 14.1068 19.1907C14.8744 18.6792 14.9347 17.8936 14.9347 17.5021V16.3642C15.1317 16.5234 15.3761 16.7378 15.6753 17.0259C16.037 17.3879 16.325 17.7016 16.572 17.9754L16.7038 18.122L16.7046 18.1228C16.8964 18.3364 17.0852 18.5467 17.2571 18.7195C17.4732 18.9367 17.7396 19.1761 18.0745 19.3529C18.4371 19.5444 18.8177 19.631 19.222 19.631H21.5035C21.9841 19.631 22.6735 19.5173 23.1582 18.9554C23.6864 18.343 23.6461 17.5924 23.48 17.053L23.4501 16.956L23.405 16.865ZM17.6857 16.9706C17.4289 16.6859 17.1192 16.3484 16.7278 15.9571L16.7246 15.9539C15.3685 14.6464 14.7348 14.4186 14.2868 14.4186C14.0485 14.4186 13.7848 14.4454 13.6137 14.6585C13.5329 14.7591 13.4905 14.8805 13.4667 15.007C13.4429 15.1333 13.4347 15.2816 13.4347 15.4505V17.5021C13.4347 17.7569 13.3928 17.8639 13.275 17.9425C13.118 18.0471 12.7825 18.1319 12.0637 18.1325C10.6993 18.0395 9.37641 17.6244 8.20349 16.9211C7.02817 16.2164 6.03709 15.2425 5.31187 14.0797L5.30398 14.0671L5.29464 14.0554C3.55337 11.8881 2.34003 9.34571 1.7503 6.6291C1.7535 6.49814 1.78187 6.42045 1.82784 6.37195C1.87521 6.32198 1.98999 6.25234 2.28187 6.25234H4.56182C4.81544 6.25234 4.9467 6.30751 5.04117 6.39327C5.14827 6.4905 5.24116 6.65561 5.35401 6.95042C5.91362 8.5964 6.67038 10.1357 7.387 11.2675C7.74518 11.8332 8.09769 12.3041 8.41529 12.6368C8.57383 12.803 8.72932 12.9406 8.8777 13.0385C9.02132 13.1332 9.18414 13.2079 9.35158 13.2079C9.43994 13.2079 9.54328 13.1988 9.64279 13.1547C9.74983 13.1074 9.83291 13.0284 9.89158 12.9225C9.99536 12.7353 10.0238 12.458 10.0238 12.0947V8.73099L10.0233 8.7231C9.97146 7.90476 9.72439 7.44443 9.48381 7.11718C9.43108 7.04546 9.37909 6.98068 9.33359 6.92399L9.32113 6.90846C9.27117 6.84616 9.23142 6.79582 9.19876 6.74795C9.13891 6.66024 9.11571 6.59909 9.11381 6.53356C9.12162 6.45578 9.15828 6.38361 9.21675 6.33139C9.27744 6.27719 9.35686 6.24897 9.43816 6.25234H13.0326C13.2387 6.25234 13.3081 6.30262 13.343 6.34868C13.3923 6.4137 13.4347 6.54893 13.4347 6.83269V11.3613C13.4347 11.8992 13.6827 12.2634 14.0428 12.2634C14.4572 12.2634 14.7559 12.012 15.2783 11.4896L15.287 11.4809L15.2948 11.4713C16.4656 10.0436 17.4225 8.45298 18.1347 6.74943L18.1392 6.73666C18.1928 6.58613 18.2941 6.45726 18.4278 6.3697C18.5614 6.28215 18.72 6.24072 18.8794 6.25175L18.8881 6.25234H21.1782C21.4905 6.25234 21.5933 6.33183 21.6265 6.37884C21.6618 6.42885 21.6864 6.53604 21.6264 6.74625C20.8053 8.58266 19.7899 10.3258 18.598 11.9464L18.5905 11.9578C18.4748 12.1348 18.3479 12.3306 18.3295 12.5554C18.3098 12.7968 18.4143 13.0163 18.597 13.2515C18.7302 13.4484 19.0049 13.7173 19.2836 13.9901L19.3099 14.0158C19.6021 14.3018 19.9186 14.6116 20.1727 14.9116L20.1795 14.9195L20.1869 14.9269C20.9444 15.6825 21.5743 16.556 22.052 17.5132C22.1283 17.7738 22.0816 17.907 22.0223 17.9757C21.953 18.0561 21.7976 18.131 21.5035 18.131H19.222C19.0438 18.131 18.9063 18.0959 18.7749 18.0265C18.638 17.9542 18.4972 17.8392 18.3206 17.6617C18.1784 17.5187 18.023 17.3457 17.8334 17.1348C17.7864 17.0825 17.7373 17.0277 17.6857 16.9706Z"/>
    </svg>
  `;

const chatCrossSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40px" height="40px" fill="white">
      <path d="M6.99486 7.00636C6.60433 7.39689 6.60433 8.03005 6.99486 8.42058L10.58 12.0057L6.99486 15.5909C6.60433 15.9814 6.60433 16.6146 6.99486 17.0051C7.38538 17.3956 8.01855 17.3956 8.40907 17.0051L11.9942 13.4199L15.5794 17.0051C15.9699 17.3956 16.6031 17.3956 16.9936 17.0051C17.3841 16.6146 17.3841 15.9814 16.9936 15.5909L13.4084 12.0057L16.9936 8.42059C17.3841 8.03007 17.3841 7.3969 16.9936 7.00638C16.603 6.61585 15.9699 6.61585 15.5794 7.00638L11.9942 10.5915L8.40907 7.00636C8.01855 6.61584 7.38538 6.61584 6.99486 7.00636Z" fill="white"/>
    </svg>
  `;

const chatWidgetSVG1 = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 30 30" width="40px" height="40px" fill="white">
      <path d="M13.0867 21.3877L13.7321 21.7697L13.0867 21.3877ZM13.6288 20.4718L12.9833 20.0898L13.6288 20.4718ZM10.3712 20.4718L9.72579 20.8539H9.72579L10.3712 20.4718ZM10.9133 21.3877L11.5587 21.0057L10.9133 21.3877ZM2.3806 15.9134L3.07351 15.6264V15.6264L2.3806 15.9134ZM7.78958 18.9915L7.77666 19.7413L7.78958 18.9915ZM5.08658 18.6194L4.79957 19.3123H4.79957L5.08658 18.6194ZM21.6194 15.9134L22.3123 16.2004V16.2004L21.6194 15.9134ZM16.2104 18.9915L16.1975 18.2416L16.2104 18.9915ZM18.9134 18.6194L19.2004 19.3123H19.2004L18.9134 18.6194ZM19.6125 2.7368L19.2206 3.37628L19.6125 2.7368ZM21.2632 4.38751L21.9027 3.99563V3.99563L21.2632 4.38751ZM4.38751 2.7368L3.99563 2.09732V2.09732L4.38751 2.7368ZM2.7368 4.38751L2.09732 3.99563H2.09732L2.7368 4.38751ZM9.40279 19.2098L9.77986 18.5615L9.77986 18.5615L9.40279 19.2098ZM13.7321 21.7697L14.2742 20.8539L12.9833 20.0898L12.4412 21.0057L13.7321 21.7697ZM9.72579 20.8539L10.2679 21.7697L11.5587 21.0057L11.0166 20.0898L9.72579 20.8539ZM12.4412 21.0057C12.2485 21.3313 11.7515 21.3313 11.5587 21.0057L10.2679 21.7697C11.0415 23.0767 12.9585 23.0767 13.7321 21.7697L12.4412 21.0057ZM10.5 2.75H13.5V1.25H10.5V2.75ZM21.25 10.5V11.5H22.75V10.5H21.25ZM2.75 11.5V10.5H1.25V11.5H2.75ZM1.25 11.5C1.25 12.6546 1.24959 13.5581 1.29931 14.2868C1.3495 15.0223 1.45323 15.6344 1.68769 16.2004L3.07351 15.6264C2.92737 15.2736 2.84081 14.8438 2.79584 14.1847C2.75041 13.5189 2.75 12.6751 2.75 11.5H1.25ZM7.8025 18.2416C6.54706 18.2199 5.88923 18.1401 5.37359 17.9265L4.79957 19.3123C5.60454 19.6457 6.52138 19.7197 7.77666 19.7413L7.8025 18.2416ZM1.68769 16.2004C2.27128 17.6093 3.39066 18.7287 4.79957 19.3123L5.3736 17.9265C4.33223 17.4951 3.50486 16.6678 3.07351 15.6264L1.68769 16.2004ZM21.25 11.5C21.25 12.6751 21.2496 13.5189 21.2042 14.1847C21.1592 14.8438 21.0726 15.2736 20.9265 15.6264L22.3123 16.2004C22.5468 15.6344 22.6505 15.0223 22.7007 14.2868C22.7504 13.5581 22.75 12.6546 22.75 11.5H21.25ZM16.2233 19.7413C17.4786 19.7197 18.3955 19.6457 19.2004 19.3123L18.6264 17.9265C18.1108 18.1401 17.4529 18.2199 16.1975 18.2416L16.2233 19.7413ZM20.9265 15.6264C20.4951 16.6678 19.6678 17.4951 18.6264 17.9265L19.2004 19.3123C20.6093 18.7287 21.7287 17.6093 22.3123 16.2004L20.9265 15.6264ZM13.5 2.75C15.1512 2.75 16.337 2.75079 17.2619 2.83873C18.1757 2.92561 18.7571 3.09223 19.2206 3.37628L20.0044 2.09732C19.2655 1.64457 18.4274 1.44279 17.4039 1.34547C16.3915 1.24921 15.1222 1.25 13.5 1.25V2.75ZM22.75 10.5C22.75 8.87781 22.7508 7.6085 22.6545 6.59611C22.5572 5.57256 22.3554 4.73445 21.9027 3.99563L20.6237 4.77938C20.9078 5.24291 21.0744 5.82434 21.1613 6.73809C21.2492 7.663 21.25 8.84876 21.25 10.5H22.75ZM19.2206 3.37628C19.7925 3.72672 20.2733 4.20752 20.6237 4.77938L21.9027 3.99563C21.4286 3.22194 20.7781 2.57144 20.0044 2.09732L19.2206 3.37628ZM10.5 1.25C8.87781 1.25 7.6085 1.24921 6.59611 1.34547C5.57256 1.44279 4.73445 1.64457 3.99563 2.09732L4.77938 3.37628C5.24291 3.09223 5.82434 2.92561 6.73809 2.83873C7.663 2.75079 8.84876 2.75 10.5 2.75V1.25ZM2.75 10.5C2.75 8.84876 2.75079 7.663 2.83873 6.73809C2.92561 5.82434 3.09223 5.24291 3.37628 4.77938L2.09732 3.99563C1.64457 4.73445 1.44279 5.57256 1.34547 6.59611C1.24921 7.6085 1.25 8.87781 1.25 10.5H2.75ZM3.99563 2.09732C3.22194 2.57144 2.57144 3.22194 2.09732 3.99563L3.37628 4.77938C3.72672 4.20752 4.20752 3.72672 4.77938 3.37628L3.99563 2.09732ZM11.0166 20.0898C10.8136 19.7468 10.6354 19.4441 10.4621 19.2063C10.2795 18.9559 10.0702 18.7304 9.77986 18.5615L9.02572 19.8582C9.07313 19.8857 9.13772 19.936 9.24985 20.0898C9.37122 20.2564 9.50835 20.4865 9.72579 20.8539L11.0166 20.0898ZM7.77666 19.7413C8.21575 19.7489 8.49387 19.7545 8.70588 19.7779C8.90399 19.7999 8.98078 19.832 9.02572 19.8582L9.77986 18.5615C9.4871 18.3912 9.18246 18.3215 8.87097 18.287C8.57339 18.2541 8.21375 18.2487 7.8025 18.2416L7.77666 19.7413ZM14.2742 20.8539C14.4916 20.4865 14.6287 20.2564 14.7501 20.0898C14.8622 19.936 14.9268 19.8857 14.9742 19.8582L14.2201 18.5615C13.9298 18.7304 13.7204 18.9559 13.5379 19.2063C13.3646 19.4441 13.1864 19.7468 12.9833 20.0898L14.2742 20.8539ZM16.1975 18.2416C15.7862 18.2487 15.4266 18.2541 15.129 18.287C14.8175 18.3215 14.5129 18.3912 14.2201 18.5615L14.9742 19.8582C15.0192 19.832 15.096 19.7999 15.2941 19.7779C15.5061 19.7545 15.7842 19.7489 16.2233 19.7413L16.1975 18.2416Z" fill="white"/>
      <path d="M8 9H16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M8 12.5H13.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;

const chatWidgetSVG2 = `
    <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.0867 21.3877L13.7321 21.7697L13.0867 21.3877ZM13.6288 20.4718L12.9833 20.0898L13.6288 20.4718ZM10.3712 20.4718L9.72579 20.8539H9.72579L10.3712 20.4718ZM10.9133 21.3877L11.5587 21.0057L10.9133 21.3877ZM2.3806 15.9134L3.07351 15.6264V15.6264L2.3806 15.9134ZM7.78958 18.9915L7.77666 19.7413L7.78958 18.9915ZM5.08658 18.6194L4.79957 19.3123H4.79957L5.08658 18.6194ZM21.6194 15.9134L22.3123 16.2004V16.2004L21.6194 15.9134ZM16.2104 18.9915L16.1975 18.2416L16.2104 18.9915ZM18.9134 18.6194L19.2004 19.3123H19.2004L18.9134 18.6194ZM19.6125 2.7368L19.2206 3.37628L19.6125 2.7368ZM21.2632 4.38751L21.9027 3.99563V3.99563L21.2632 4.38751ZM4.38751 2.7368L3.99563 2.09732V2.09732L4.38751 2.7368ZM2.7368 4.38751L2.09732 3.99563H2.09732L2.7368 4.38751ZM9.40279 19.2098L9.77986 18.5615L9.77986 18.5615L9.40279 19.2098ZM13.7321 21.7697L14.2742 20.8539L12.9833 20.0898L12.4412 21.0057L13.7321 21.7697ZM9.72579 20.8539L10.2679 21.7697L11.5587 21.0057L11.0166 20.0898L9.72579 20.8539ZM12.4412 21.0057C12.2485 21.3313 11.7515 21.3313 11.5587 21.0057L10.2679 21.7697C11.0415 23.0767 12.9585 23.0767 13.7321 21.7697L12.4412 21.0057ZM10.5 2.75H13.5V1.25H10.5V2.75ZM21.25 10.5V11.5H22.75V10.5H21.25ZM2.75 11.5V10.5H1.25V11.5H2.75ZM1.25 11.5C1.25 12.6546 1.24959 13.5581 1.29931 14.2868C1.3495 15.0223 1.45323 15.6344 1.68769 16.2004L3.07351 15.6264C2.92737 15.2736 2.84081 14.8438 2.79584 14.1847C2.75041 13.5189 2.75 12.6751 2.75 11.5H1.25ZM7.8025 18.2416C6.54706 18.2199 5.88923 18.1401 5.37359 17.9265L4.79957 19.3123C5.60454 19.6457 6.52138 19.7197 7.77666 19.7413L7.8025 18.2416ZM1.68769 16.2004C2.27128 17.6093 3.39066 18.7287 4.79957 19.3123L5.3736 17.9265C4.33223 17.4951 3.50486 16.6678 3.07351 15.6264L1.68769 16.2004ZM21.25 11.5C21.25 12.6751 21.2496 13.5189 21.2042 14.1847C21.1592 14.8438 21.0726 15.2736 20.9265 15.6264L22.3123 16.2004C22.5468 15.6344 22.6505 15.0223 22.7007 14.2868C22.7504 13.5581 22.75 12.6546 22.75 11.5H21.25ZM16.2233 19.7413C17.4786 19.7197 18.3955 19.6457 19.2004 19.3123L18.6264 17.9265C18.1108 18.1401 17.4529 18.2199 16.1975 18.2416L16.2233 19.7413ZM20.9265 15.6264C20.4951 16.6678 19.6678 17.4951 18.6264 17.9265L19.2004 19.3123C20.6093 18.7287 21.7287 17.6093 22.3123 16.2004L20.9265 15.6264ZM13.5 2.75C15.1512 2.75 16.337 2.75079 17.2619 2.83873C18.1757 2.92561 18.7571 3.09223 19.2206 3.37628L20.0044 2.09732C19.2655 1.64457 18.4274 1.44279 17.4039 1.34547C16.3915 1.24921 15.1222 1.25 13.5 1.25V2.75ZM22.75 10.5C22.75 8.87781 22.7508 7.6085 22.6545 6.59611C22.5572 5.57256 22.3554 4.73445 21.9027 3.99563L20.6237 4.77938C20.9078 5.24291 21.0744 5.82434 21.1613 6.73809C21.2492 7.663 21.25 8.84876 21.25 10.5H22.75ZM19.2206 3.37628C19.7925 3.72672 20.2733 4.20752 20.6237 4.77938L21.9027 3.99563C21.4286 3.22194 20.7781 2.57144 20.0044 2.09732L19.2206 3.37628ZM10.5 1.25C8.87781 1.25 7.6085 1.24921 6.59611 1.34547C5.57256 1.44279 4.73445 1.64457 3.99563 2.09732L4.77938 3.37628C5.24291 3.09223 5.82434 2.92561 6.73809 2.83873C7.663 2.75079 8.84876 2.75 10.5 2.75V1.25ZM2.75 10.5C2.75 8.84876 2.75079 7.663 2.83873 6.73809C2.92561 5.82434 3.09223 5.24291 3.37628 4.77938L2.09732 3.99563C1.64457 4.73445 1.44279 5.57256 1.34547 6.59611C1.24921 7.6085 1.25 8.87781 1.25 10.5H2.75ZM3.99563 2.09732C3.22194 2.57144 2.57144 3.22194 2.09732 3.99563L3.37628 4.77938C3.72672 4.20752 4.20752 3.72672 4.77938 3.37628L3.99563 2.09732ZM11.0166 20.0898C10.8136 19.7468 10.6354 19.4441 10.4621 19.2063C10.2795 18.9559 10.0702 18.7304 9.77986 18.5615L9.02572 19.8582C9.07313 19.8857 9.13772 19.936 9.24985 20.0898C9.37122 20.2564 9.50835 20.4865 9.72579 20.8539L11.0166 20.0898ZM7.77666 19.7413C8.21575 19.7489 8.49387 19.7545 8.70588 19.7779C8.90399 19.7999 8.98078 19.832 9.02572 19.8582L9.77986 18.5615C9.4871 18.3912 9.18246 18.3215 8.87097 18.287C8.57339 18.2541 8.21375 18.2487 7.8025 18.2416L7.77666 19.7413ZM14.2742 20.8539C14.4916 20.4865 14.6287 20.2564 14.7501 20.0898C14.8622 19.936 14.9268 19.8857 14.9742 19.8582L14.2201 18.5615C13.9298 18.7304 13.7204 18.9559 13.5379 19.2063C13.3646 19.4441 13.1864 19.7468 12.9833 20.0898L14.2742 20.8539ZM16.1975 18.2416C15.7862 18.2487 15.4266 18.2541 15.129 18.287C14.8175 18.3215 14.5129 18.3912 14.2201 18.5615L14.9742 19.8582C15.0192 19.832 15.096 19.7999 15.2941 19.7779C15.5061 19.7545 15.7842 19.7489 16.2233 19.7413L16.1975 18.2416Z" fill="white"/>
      <path d="M12 15V7" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M8 13V9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M16 13V9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;

const chatWidgetSVG3 = `
    <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.9886 20.9463L12.88 19.9522L12.35 20.0101L12.1027 20.4825L12.9886 20.9463ZM6.45572 19.09L7.06966 19.8793L8.08109 19.0927L7.07226 18.3027L6.45572 19.09ZM4.23006 20.8211L3.61612 20.0317L3.61611 20.0317L4.23006 20.8211ZM20 12C20 16.1206 16.8838 19.5148 12.88 19.9522L13.0973 21.9404C18.1043 21.3933 22 17.1523 22 12H20ZM12 4C16.4183 4 20 7.58172 20 12H22C22 6.47715 17.5228 2 12 2V4ZM4 12C4 7.58172 7.58172 4 12 4V2C6.47715 2 2 6.47715 2 12H4ZM7.07226 18.3027C5.20015 16.8366 4 14.5587 4 12H2C2 15.1996 3.50381 18.0485 5.83917 19.8773L7.07226 18.3027ZM4.844 21.6104L7.06966 19.8793L5.84178 18.3006L3.61612 20.0317L4.844 21.6104ZM4.29145 20C5.1484 20 5.52041 21.0843 4.84401 21.6104L3.61611 20.0317C2.78939 20.6747 3.24408 22 4.29145 22V20ZM12 20H4.29145V22H12V20ZM12.9 20H12V22H12.9V20ZM12.1027 20.4825C12.2517 20.1979 12.5519 20 12.9 20V22C13.3252 22 13.6921 21.7586 13.8746 21.4102L12.1027 20.4825Z" fill="white"/>
      <path d="M9 12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11C8.55228 11 9 11.4477 9 12Z" fill="white"/>
      <path d="M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12Z" fill="white"/>
      <path d="M17 12C17 12.5523 16.5523 13 16 13C15.4477 13 15 12.5523 15 12C15 11.4477 15.4477 11 16 11C16.5523 11 17 11.4477 17 12Z" fill="white"/>
    </svg>
  `;

const chatWidgetSVG4 = `
    <svg width="30px" height="30px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="m174.72 855.68 135.296-45.12 23.68 11.84C388.096 849.536 448.576 864 512 864c211.84 0 384-166.784 384-352S723.84 160 512 160 128 326.784 128 512c0 69.12 24.96 139.264 70.848 199.232l22.08 28.8-46.272 115.584zm-45.248 82.56A32 32 0 0 1 89.6 896l58.368-145.92C94.72 680.32 64 596.864 64 512 64 299.904 256 96 512 96s448 203.904 448 416-192 416-448 416a461.056 461.056 0 0 1-206.912-48.384l-175.616 58.56z"/>
      <path fill="white" d="M512 563.2a51.2 51.2 0 1 1 0-102.4 51.2 51.2 0 0 1 0 102.4zm192 0a51.2 51.2 0 1 1 0-102.4 51.2 51.2 0 0 1 0 102.4zm-384 0a51.2 51.2 0 1 1 0-102.4 51.2 51.2 0 0 1 0 102.4z"/>
    </svg>
  `;

const chatWidgetSVG5 = `
    <svg width="30px" height="30px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <path fill="white" d="M160 826.88 273.536 736H800a64 64 0 0 0 64-64V256a64 64 0 0 0-64-64H224a64 64 0 0 0-64 64v570.88zM296 800 147.968 918.4A32 32 0 0 1 96 893.44V256a128 128 0 0 1 128-128h576a128 128 0 0 1 128 128v416a128 128 0 0 1-128 128H296z"/>
      <path fill="white" d="M352 512h320q32 0 32 32t-32 32H352q-32 0-32-32t32-32zm0-192h320q32 0 32 32t-32 32H352q-32 0-32-32t32-32z"/>
    </svg>
  `;
