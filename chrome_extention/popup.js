document.addEventListener("DOMContentLoaded", function () {
  const host = document.getElementById('root');
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Add styles to shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = 'styles.css';
  shadowRoot.appendChild(styleLink);

  const template = document.getElementById('popup-template');
  const instance = template.content.cloneNode(true);
  shadowRoot.appendChild(instance);

  // const apiToggle = document.getElementById('api-toggle');

  // // ストレージから設定を読み込み、チェックボックスの状態を復元
  // chrome.storage.local.get({ useApi: true }, (items) => {
  //   apiToggle.checked = items.useApi;
  // });

  // // チェックボックスの変更を監視し、設定をストレージに保存
  // apiToggle.addEventListener('change', (event) => {
  //   chrome.storage.local.set({ useApi: event.target.checked });
  // });

  const toggleIconCheckbox = shadowRoot.querySelector('#toggle-icon-checkbox');

  if (toggleIconCheckbox) {
    // Load initial state from storage
    chrome.storage.local.get({ iconVisibility: true }, (items) => {
      toggleIconCheckbox.checked = items.iconVisibility;
    });

    // Add change listener to save state
    toggleIconCheckbox.addEventListener('change', (event) => {
      chrome.storage.local.set({ iconVisibility: event.target.checked });
    });
  }
});