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
});