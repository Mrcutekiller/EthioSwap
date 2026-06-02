import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Buy USDT": "Buy USDT",
      "Sell USDT": "Sell USDT",
      "Send": "Send",
      "Receive": "Receive",
      "Balance": "Balance",
      "Deposit": "Deposit",
      "Withdraw": "Withdraw",
      "Trade": "Trade",
      "Profile": "Profile",
      "Settings": "Settings",
      "Trade started": "Trade started",
      "Payment marked as sent": "Payment marked as sent",
      "Trade completed": "Trade completed",
      "Dispute opened": "Dispute opened",
      "I Have Sent Payment": "I Have Sent Payment",
      "I Received Payment": "I Received Payment",
      "Open Dispute": "Open Dispute",
      "Report User": "Report User",
      "Mark Payment Sent": "Mark Payment Sent",
      "Confirm Payment Received": "Confirm Payment Received",
    }
  },
  am: {
    translation: {
      "Buy USDT": "USDT ግዛ",
      "Sell USDT": "USDT ሽጥ",
      "Send": "ላክ",
      "Receive": "ተቀበል",
      "Balance": "ቀሪ ሂሳብ",
      "Deposit": "አስገባ",
      "Withdraw": "አውጣ",
      "Trade": "ይነግዱ",
      "Profile": "መግለጫ",
      "Settings": "ቅንብሮች",
      "Trade started": "ንግድ ተጀምሯል",
      "Payment marked as sent": "ክፍያ መላኩ ተገልጿል",
      "Trade completed": "ንግድ ተጠናቋል",
      "Dispute opened": "ክርክር ተከፍቷል",
      "I Have Sent Payment": "ክፍያ ልኬያለሁ",
      "I Received Payment": "ክፍያ ተቀብያለሁ",
      "Open Dispute": "ክርክር ክፈት",
      "Report User": "ተጠቃሚን ሪፖርት አድርግ",
      "Mark Payment Sent": "ክፍያ መላኩን ምልክት አድርግ",
      "Confirm Payment Received": "ክፍያ መቀበልህን አረጋግጥ",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
