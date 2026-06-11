(function () {
  const gestures = [
    {
      id: "help",
      tag: "求助",
      title: "雙手靠近胸前",
      phrase: "我需要協助，請問可以幫我嗎？",
      confidence: 94
    },
    {
      id: "metro",
      tag: "交通",
      title: "指向前方再畫路線",
      phrase: "請問捷運站在哪裡？",
      confidence: 91
    },
    {
      id: "ticket",
      tag: "購票",
      title: "手指點掌心兩次",
      phrase: "我要買票，請協助我確認金額。",
      confidence: 88
    },
    {
      id: "slow",
      tag: "溝通",
      title: "掌心向下緩慢移動",
      phrase: "請慢一點，我需要看清楚內容。",
      confidence: 96
    },
    {
      id: "text",
      tag: "文字",
      title: "食指指向文字區",
      phrase: "我聽不見，請用文字讓我知道。",
      confidence: 92
    },
    {
      id: "thanks",
      tag: "禮貌",
      title: "手掌由下巴向前",
      phrase: "謝謝你，我了解了。",
      confidence: 98
    },
    {
      id: "write",
      tag: "補充",
      title: "模擬書寫動作",
      phrase: "請寫下來，我會比較容易確認。",
      confidence: 89
    },
    {
      id: "repeat",
      tag: "確認",
      title: "雙手向內重複一次",
      phrase: "可以請你再說一次嗎？",
      confidence: 93
    }
  ];

  const quickPhrases = [
    "請看這段翻譯文字。",
    "我會使用手語和文字溝通。",
    "請等我一下，我正在確認意思。",
    "可以請你指給我看嗎？",
    "我想改用手機打字。",
    "謝謝你的耐心。"
  ];

  const state = {
    cameraOn: false,
    selectedGestureId: null,
    activePhrase: "",
    queue: [],
    history: [],
    frames: 0,
    intervalId: null,
    toastId: null
  };

  const els = {
    body: document.body,
    cameraStatus: document.getElementById("cameraStatus"),
    confidenceValue: document.getElementById("confidenceValue"),
    frameCount: document.getElementById("frameCount"),
    queueCount: document.getElementById("queueCount"),
    recognitionMode: document.getElementById("recognitionMode"),
    selectedGestureLabel: document.getElementById("selectedGestureLabel"),
    gestureHint: document.getElementById("gestureHint"),
    startCamera: document.getElementById("startCamera"),
    pauseCamera: document.getElementById("pauseCamera"),
    scanGesture: document.getElementById("scanGesture"),
    cameraPanel: document.querySelector(".camera-panel"),
    gestureGrid: document.getElementById("gestureGrid"),
    translationText: document.getElementById("translationText"),
    manualText: document.getElementById("manualText"),
    addToQueue: document.getElementById("addToQueue"),
    speakNow: document.getElementById("speakNow"),
    copyText: document.getElementById("copyText"),
    clearText: document.getElementById("clearText"),
    queueList: document.getElementById("queueList"),
    queueEmpty: document.getElementById("queueEmpty"),
    clearQueue: document.getElementById("clearQueue"),
    quickGrid: document.getElementById("quickGrid"),
    historyList: document.getElementById("historyList"),
    clearHistory: document.getElementById("clearHistory"),
    largeText: document.getElementById("largeText"),
    reduceMotion: document.getElementById("reduceMotion"),
    captionMode: document.getElementById("captionMode"),
    boostContrast: document.getElementById("boostContrast"),
    speechRate: document.getElementById("speechRate"),
    rateValue: document.getElementById("rateValue"),
    toast: document.getElementById("toast")
  };

  function init() {
    renderGestures();
    renderQuickCards();
    restoreSettings();
    bindEvents();
    addHistory("系統", "Demo 已準備就緒，可啟動模擬鏡頭。");
    updateStatus();
  }

  function bindEvents() {
    els.startCamera.addEventListener("click", startCamera);
    els.pauseCamera.addEventListener("click", pauseCamera);
    els.scanGesture.addEventListener("click", scanGesture);
    els.addToQueue.addEventListener("click", addCurrentTextToQueue);
    els.speakNow.addEventListener("click", speakCurrentText);
    els.copyText.addEventListener("click", copyCurrentText);
    els.clearText.addEventListener("click", clearTranslation);
    els.clearQueue.addEventListener("click", clearQueue);
    els.clearHistory.addEventListener("click", clearHistory);

    els.gestureGrid.addEventListener("click", function (event) {
      const card = event.target.closest("[data-gesture-id]");
      if (card) {
        selectGesture(card.dataset.gestureId);
      }
    });

    els.quickGrid.addEventListener("click", function (event) {
      const card = event.target.closest("[data-quick-phrase]");
      if (card) {
        useQuickPhrase(card.dataset.quickPhrase);
      }
    });

    els.queueList.addEventListener("click", function (event) {
      const action = event.target.closest("[data-queue-action]");
      if (!action) {
        return;
      }
      const id = action.dataset.queueId;
      if (action.dataset.queueAction === "play") {
        playQueueItem(id);
      }
      if (action.dataset.queueAction === "remove") {
        removeQueueItem(id);
      }
    });

    els.largeText.addEventListener("change", saveAndApplySettings);
    els.reduceMotion.addEventListener("change", saveAndApplySettings);
    els.captionMode.addEventListener("change", saveAndApplySettings);
    els.boostContrast.addEventListener("change", saveAndApplySettings);
    els.speechRate.addEventListener("input", saveAndApplySettings);
  }

  function renderGestures() {
    els.gestureGrid.innerHTML = gestures
      .map(function (gesture) {
        return [
          '<button class="gesture-card" type="button" data-gesture-id="',
          gesture.id,
          '" aria-pressed="false">',
          '<span class="card-tag">',
          gesture.tag,
          "</span>",
          '<span class="card-title">',
          gesture.title,
          "</span>",
          '<span class="card-phrase">',
          gesture.phrase,
          "</span>",
          "</button>"
        ].join("");
      })
      .join("");
  }

  function renderQuickCards() {
    els.quickGrid.innerHTML = quickPhrases
      .map(function (phrase) {
        return [
          '<button class="quick-card" type="button" data-quick-phrase="',
          escapeAttribute(phrase),
          '">',
          '<span class="card-tag">快速補句</span>',
          '<span class="card-title">',
          phrase,
          "</span>",
          "</button>"
        ].join("");
      })
      .join("");
  }

  function startCamera() {
    if (state.cameraOn) {
      showToast("模擬鏡頭已在辨識中。");
      return;
    }

    state.cameraOn = true;
    state.intervalId = window.setInterval(function () {
      state.frames += 1;
      els.frameCount.textContent = String(state.frames);
    }, 1100);
    addHistory("鏡頭", "模擬鏡頭已啟動，開始接收手勢片段。");
    updateStatus();
  }

  function pauseCamera() {
    state.cameraOn = false;
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    }
    addHistory("鏡頭", "辨識已暫停。");
    updateStatus();
  }

  function scanGesture() {
    if (!state.cameraOn) {
      startCamera();
    }

    const gesture = getSelectedGesture() || gestures[Math.floor(Math.random() * gestures.length)];
    state.selectedGestureId = gesture.id;
    state.frames += 1;
    state.activePhrase = gesture.phrase;
    els.translationText.textContent = gesture.phrase;
    els.confidenceValue.textContent = gesture.confidence + "%";
    els.gestureHint.textContent = gesture.title + "：" + gesture.phrase;
    addHistory("辨識", gesture.tag + "｜" + gesture.phrase);
    renderSelectedGesture();
    updateStatus();
    showToast("已產生即時翻譯文字。");
  }

  function selectGesture(id) {
    const gesture = gestures.find(function (item) {
      return item.id === id;
    });
    if (!gesture) {
      return;
    }

    state.selectedGestureId = id;
    els.selectedGestureLabel.textContent = gesture.tag;
    els.gestureHint.textContent = "已選擇：" + gesture.title;
    renderSelectedGesture();
    showToast("已選擇手勢片段：" + gesture.tag);
  }

  function getSelectedGesture() {
    return gestures.find(function (item) {
      return item.id === state.selectedGestureId;
    });
  }

  function renderSelectedGesture() {
    const cards = els.gestureGrid.querySelectorAll("[data-gesture-id]");
    cards.forEach(function (card) {
      const selected = card.dataset.gestureId === state.selectedGestureId;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const gesture = getSelectedGesture();
    els.selectedGestureLabel.textContent = gesture ? gesture.tag : "尚未選擇";
  }

  function getCurrentText() {
    const manual = els.manualText.value.trim();
    const translated = state.activePhrase.trim();
    if (manual && translated && manual === translated) {
      return manual;
    }
    if (manual && translated) {
      return translated + " " + manual;
    }
    return manual || translated;
  }

  function addCurrentTextToQueue() {
    const text = getCurrentText();
    if (!text) {
      showToast("目前沒有可加入佇列的文字。");
      return;
    }
    addToQueue(text, "手動加入");
    addHistory("佇列", "已加入播報：" + text);
  }

  function addToQueue(text, source) {
    state.queue.push({
      id: String(Date.now()) + "-" + Math.round(Math.random() * 1000),
      text: text,
      source: source,
      time: getTime()
    });
    renderQueue();
    showToast("已加入語音播報佇列。");
  }

  function speakCurrentText() {
    const text = getCurrentText();
    if (!text) {
      showToast("目前沒有可播報的文字。");
      return;
    }
    speak(text);
    addHistory("播報", text);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      showToast("此瀏覽器不支援語音合成，已保留文字提示。");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = Number(els.speechRate.value);
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    showToast("正在播報。");
  }

  function playQueueItem(id) {
    const item = state.queue.find(function (entry) {
      return entry.id === id;
    });
    if (!item) {
      return;
    }
    speak(item.text);
    addHistory("播報", item.text);
  }

  function removeQueueItem(id) {
    state.queue = state.queue.filter(function (entry) {
      return entry.id !== id;
    });
    renderQueue();
    showToast("已移除佇列項目。");
  }

  function renderQueue() {
    els.queueList.innerHTML = state.queue
      .map(function (item) {
        return [
          '<li class="queue-item">',
          '<p class="queue-text">',
          escapeHtml(item.text),
          "</p>",
          '<p class="queue-meta">',
          escapeHtml(item.time),
          "｜",
          escapeHtml(item.source),
          "</p>",
          '<div class="queue-actions">',
          '<button class="queue-action" type="button" data-queue-action="play" data-queue-id="',
          item.id,
          '">播放</button>',
          '<button class="queue-action" type="button" data-queue-action="remove" data-queue-id="',
          item.id,
          '">移除</button>',
          "</div>",
          "</li>"
        ].join("");
      })
      .join("");
    els.queueEmpty.hidden = state.queue.length > 0;
    els.queueCount.textContent = String(state.queue.length);
  }

  function clearQueue() {
    state.queue = [];
    renderQueue();
    addHistory("佇列", "播報佇列已清空。");
  }

  function useQuickPhrase(phrase) {
    els.manualText.value = phrase;
    state.activePhrase = phrase;
    els.translationText.textContent = phrase;
    addToQueue(phrase, "快速卡");
    addHistory("快速卡", phrase);
  }

  function copyCurrentText() {
    const text = getCurrentText();
    if (!text) {
      showToast("目前沒有可複製的文字。");
      return;
    }

    if (!navigator.clipboard) {
      showToast("瀏覽器未開放剪貼簿權限，請手動選取文字。");
      return;
    }

    navigator.clipboard.writeText(text).then(
      function () {
        showToast("已複製翻譯文字。");
      },
      function () {
        showToast("複製失敗，請手動選取文字。");
      }
    );
  }

  function clearTranslation() {
    state.activePhrase = "";
    els.manualText.value = "";
    els.translationText.textContent = "尚未產生翻譯。請選擇手勢片段後按下「模擬辨識」。";
    addHistory("翻譯", "即時翻譯文字已清空。");
  }

  function addHistory(type, text) {
    state.history.unshift({
      type: type,
      text: text,
      time: getTime()
    });
    state.history = state.history.slice(0, 14);
    renderHistory();
  }

  function renderHistory() {
    els.historyList.innerHTML = state.history
      .map(function (item) {
        return [
          '<li class="history-item">',
          '<p class="history-text">',
          escapeHtml(item.text),
          "</p>",
          '<p class="history-meta">',
          escapeHtml(item.time),
          "｜",
          escapeHtml(item.type),
          "</p>",
          "</li>"
        ].join("");
      })
      .join("");
  }

  function clearHistory() {
    state.history = [];
    renderHistory();
    showToast("對話紀錄已清空。");
  }

  function updateStatus() {
    els.cameraStatus.classList.toggle("is-on", state.cameraOn);
    els.cameraStatus.querySelector("span:last-child").textContent = state.cameraOn ? "鏡頭模擬中" : "鏡頭待命";
    els.recognitionMode.textContent = state.cameraOn ? "辨識中" : "待命模式";
    els.cameraPanel.classList.toggle("is-scanning", state.cameraOn);
    els.frameCount.textContent = String(state.frames);
  }

  function saveAndApplySettings() {
    const settings = {
      largeText: els.largeText.checked,
      reduceMotion: els.reduceMotion.checked,
      captionMode: els.captionMode.checked,
      boostContrast: els.boostContrast.checked,
      speechRate: els.speechRate.value
    };
    localStorage.setItem("sign-companion-settings", JSON.stringify(settings));
    applySettings(settings);
  }

  function restoreSettings() {
    let settings = {
      largeText: false,
      reduceMotion: false,
      captionMode: true,
      boostContrast: true,
      speechRate: "1"
    };

    try {
      const saved = JSON.parse(localStorage.getItem("sign-companion-settings"));
      if (saved) {
        settings = Object.assign(settings, saved);
      }
    } catch (error) {
      settings = settings;
    }

    els.largeText.checked = Boolean(settings.largeText);
    els.reduceMotion.checked = Boolean(settings.reduceMotion);
    els.captionMode.checked = Boolean(settings.captionMode);
    els.boostContrast.checked = Boolean(settings.boostContrast);
    els.speechRate.value = settings.speechRate;
    applySettings(settings);
  }

  function applySettings(settings) {
    els.body.classList.toggle("large-type", Boolean(settings.largeText));
    els.body.classList.toggle("reduce-motion", Boolean(settings.reduceMotion));
    els.body.classList.toggle("boost-contrast", Boolean(settings.boostContrast));
    els.gestureHint.hidden = !settings.captionMode;
    els.rateValue.textContent = Number(settings.speechRate).toFixed(1) + "x";
  }

  function showToast(message) {
    window.clearTimeout(state.toastId);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    state.toastId = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2300);
  }

  function getTime() {
    return new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  init();
})();
