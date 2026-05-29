const ICON_PATH = '/favicon.ico';

function isNotificationSupported() {
  try {
    return typeof window !== 'undefined' && 'Notification' in window;
  } catch (e) {
    return false;
  }
}

function canUseConstructor() {
  if (!isNotificationSupported()) return false;
  try {
    const test = new Notification.constructor('return this')();
    return test === window;
  } catch {
    return false;
  }
}

export function getPermissionState() {
  if (!isNotificationSupported()) return 'denied';
  try {
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

export async function requestPermission() {
  if (!isNotificationSupported()) return 'denied';
  try {
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

export function showBrowserNotification(title, options = {}) {
  if (!isNotificationSupported() || !canUseConstructor()) {
    showInPageNotification(title, options.body);
    return null;
  }

  try {
    if (Notification.permission !== 'granted') {
      showInPageNotification(title, options.body);
      return null;
    }

    const notification = new Notification(title, {
      body: options.body || '',
      icon: options.icon || ICON_PATH,
      tag: options.tag || 'ethioswap-notification',
      renotify: true,
    });

    notification.onerror = () => {
      showInPageNotification(title, options.body);
    };

    setTimeout(() => notification.close(), 8000);
    return notification;
  } catch (e) {
    showInPageNotification(title, options.body);
    return null;
  }
}

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;

  toastContainer = document.createElement('div');
  toastContainer.id = 'ethioswap-toast-container';
  toastContainer.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 99999;
    display: flex; flex-direction: column; gap: 8px;
    pointer-events: none; max-width: 360px; width: 100%;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showInPageNotification(title, body) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.style.cssText = `
    pointer-events: auto; background: #1a1a2e; color: #e0e0e0;
    border-left: 4px solid #6c63ff; border-radius: 8px;
    padding: 12px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; line-height: 1.4; animation: slideIn 0.3s ease;
    cursor: pointer; transition: opacity 0.3s;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `;
  if (!document.getElementById('ethioswap-toast-styles')) {
    style.id = 'ethioswap-toast-styles';
    document.head.appendChild(style);
  }

  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-weight: 700; margin-bottom: 4px; color: #6c63ff;';
  titleEl.textContent = title;

  toast.appendChild(titleEl);

  if (body) {
    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'color: #b0b0b0; font-size: 13px;';
    bodyEl.textContent = body;
    toast.appendChild(bodyEl);
  }

  toast.addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 6000);

  return toast;
}
