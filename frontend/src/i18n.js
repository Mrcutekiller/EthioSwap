import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
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
      "Home": "Home",
      "Wallet": "Wallet",
      "Trades": "Trades",
      "History": "History",
      "Invite": "Invite",
      "Ranks": "Ranks",
      "Admin": "Admin",

      // Trade
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

      // Chat
      "Type a message...": "Type a message...",
      "Send a message": "Send a message",
      "Upload screenshot": "Upload screenshot",

      // Transaction types
      "Deposit": "Deposit",
      "Withdrawal": "Withdrawal",
      "Trade": "Trade",
      "Send": "Send",
      "Receive": "Receive",
      "Referral Earn": "Referral Earn",

      // Settings
      "Language": "Language",
      "Two-Factor Authentication": "Two-Factor Authentication",
      "Enable 2FA": "Enable 2FA",
      "Extra security for withdrawals and login": "Extra security for withdrawals and login",
      "Verification Method": "Verification Method",
      "Notification Preferences": "Notification Preferences",
      "Security Tips": "Security Tips",
      "App Version": "App Version",
      "Network": "Network",
      "Fee Structure": "Fee Structure",
      "Sign Out": "Sign Out",

      // Dispute
      "Payment sent but USDT not released": "Payment sent but USDT not released",
      "USDT sent but ETB not received": "USDT sent but ETB not received",
      "Wrong amount sent": "Wrong amount sent",
      "Seller/Buyer not responding": "Seller/Buyer not responding",
      "Other": "Other",

      // Rating
      "Rate your trade!": "Rate your trade!",
      "Submit Rating": "Submit Rating",
      "Skip": "Skip",
      "Write a review (optional)...": "Write a review (optional)...",

      // Price Alerts
      "Price Alerts": "Price Alerts",
      "Set Alert": "Set Alert",
      "My Alerts": "My Alerts",
      "Alert me when 1 USDT is above": "Alert me when 1 USDT is above",
      "Alert me when 1 USDT is below": "Alert me when 1 USDT is below",
      "Create Alert": "Create Alert",
      "Active": "Active",
      "Triggered": "Triggered",

      // Internal Transfers
      "Search by username or phone": "Search by username or phone",
      "Enter amount": "Enter amount",
      "Add note (optional)": "Add note (optional)",
      "Platform Fee: FREE": "Platform Fee: FREE",
      "They Receive": "They Receive",
      "Confirm Send": "Confirm Send",
      "Request Money": "Request Money",
      "Share your username": "Share your username",

      // Announcements
      "Announcements": "Announcements",
      "No new announcements": "No new announcements",

      // Market Rates
      "Market Rates": "Market Rates",
      "Best Buy Rates": "Best Buy Rates",
      "Best Sell Rates": "Best Sell Rates",
      "24h High": "24h High",
      "24h Low": "24h Low",
      "24h Change": "24h Change",
      "Updated": "Updated",
      "mins ago": "mins ago",

      // Onboarding
      "Welcome to EthioSwap!": "Welcome to EthioSwap!",
      "Buy & Sell USDT safely in Ethiopia": "Buy & Sell USDT safely in Ethiopia",
      "Safe P2P Trading": "Safe P2P Trading",
      "Our escrow system protects your money": "Our escrow system protects your money until both sides confirm the trade",
      "Best Rates in Ethiopia": "Best Rates in Ethiopia",
      "Trade directly with other Ethiopians": "Trade directly with other Ethiopians at the best available rates",
      "Trusted Traders Only": "Trusted Traders Only",
      "All traders are KYC verified": "All traders are KYC verified. Check ratings before you trade",
      "Ready to Start!": "Ready to Start!",
      "Complete your KYC to unlock all features": "Complete your KYC to unlock all features",
      "Create Account": "Create Account",
      "Login": "Login",
      "Next": "Next",
      "Skip": "Skip",

      // Common
      "Loading...": "Loading...",
      "Error": "Error",
      "Success": "Success",
      "Cancel": "Cancel",
      "Save": "Save",
      "Delete": "Delete",
      "Edit": "Edit",
      "Close": "Close",
      "Back": "Back",
      "Next": "Next",
      "Submit": "Submit",
      "Confirm": "Confirm",
      "Yes": "Yes",
      "No": "No",
      "All": "All",
      "None": "None",
      "Search": "Search",
      "Filter": "Filter",
      "Sort": "Sort",
      "Export": "Export",
      "Import": "Import",
      "Download": "Download",
      "Upload": "Upload",
      "Copy": "Copy",
      "Copied!": "Copied!",
      "Share": "Share",
      "Refresh": "Refresh",
      "Retry": "Retry",
      "View All": "View All",
      "View Details": "View Details",
      "No data available": "No data available",
      "No results found": "No results found",
      "Are you sure?": "Are you sure?",
      "This action cannot be undone": "This action cannot be undone",

      // Errors
      "Please fill in all fields": "Please fill in all fields",
      "Password too short": "Password too short",
      "Invalid email": "Invalid email",
      "Network error": "Network error",
      "Something went wrong": "Something went wrong",
      "Insufficient balance": "Insufficient balance",
      "Minimum amount": "Minimum amount",
      "Maximum amount exceeded": "Maximum amount exceeded",
      "Account suspended": "Account suspended",

      // Success messages
      "Account created successfully!": "Account created successfully!",
      "Profile updated!": "Profile updated!",
      "Settings saved!": "Settings saved!",
      "Password changed!": "Password changed!",
      "Payment sent!": "Payment sent!",
      "Trade initiated!": "Trade initiated!",
      "Dispute opened!": "Dispute opened!",
      "Rating submitted!": "Rating submitted!",
      "Alert created!": "Alert created!",
      "Transfer complete!": "Transfer complete!",
    }
  },
  am: {
    translation: {
      // Navigation
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
      "Home": "መነሻ",
      "Wallet": "ውስጥ",
      "Trades": "ንግዶች",
      "History": "ታሪክ",
      "Invite": "ጋብዝ",
      "Ranks": "ደረጃ",
      "Admin": "አድሚን",

      // Trade
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

      // Chat
      "Type a message...": "መልእክት ይፃፉ...",
      "Send a message": "መልእክት ይላኩ",
      "Upload screenshot": "ስክሪንሾት ይጫኑ",

      // Transaction types
      "Deposit": "ማስገቢያ",
      "Withdrawal": "ማውጫ",
      "Trade": "ንግድ",
      "Send": "መላኪያ",
      "Receive": "ማገቢያ",
      "Referral Earn": "ምርከካ ገቢ",

      // Settings
      "Language": "ቋንቋ",
      "Two-Factor Authentication": "ሁለት-ደረጃ ማረጋገጫ",
      "Enable 2FA": "2FA ያድርጉ",
      "Extra security for withdrawals and login": "ለማውጫ እና ለመግባት ተጨማি ደህንነት",
      "Verification Method": "የማረጋገጫ ዘዴ",
      "Notification Preferences": "የማሳወቂያ ምርጫዎች",
      "Security Tips": "የደህንነት ምክሮች",
      "App Version": "የመተግበሪያ ስርጭት",
      "Network": "ኔት워ክ",
      "Fee Structure": "የክፍያ መዋቅር",
      "Sign Out": "ወጣ",

      // Dispute
      "Payment sent but USDT not released": "ክፍያ ተላክቷል ግን USDT አልተፈትነም",
      "USDT sent but ETB not received": "USDT ተልಕቷል ግን ETB አልተቀበለም",
      "Wrong amount sent": "ስህተት መጠን ተልኳል",
      "Seller/Buyer not responding": "ሽጋጭ/ገዢ አልተመለሰም",
      "Other": "ሌላ",

      // Rating
      "Rate your trade!": "ንግድዎን ደንድሩ!",
      "Submit Rating": "ደረጃ ይላኩ",
      "Skip": "በ莸",
      "Write a review (optional)...": "ግምገማ ይፃፉ (አማራጭ)...",

      // Price Alerts
      "Price Alerts": "የዋጋ ማንቂያ",
      "Set Alert": "ማንቂያ ያድርጉ",
      "My Alerts": "የእኔ ማንቂያዎች",
      "Alert me when 1 USDT is above": "1 USDT ከፍተኛ ሲሆን ያንቁኝ",
      "Alert me when 1 USDT is below": "1 USDT ዝቅተኛ ሲሆን ያንቁኝ",
      "Create Alert": "ማንቂያ ይፍጠሩ",
      "Active": "ንቁ",
      "Triggered": "ተቀንቧል",

      // Internal Transfers
      "Search by username or phone": "በስም ወይም በስልክ ይፈትሹ",
      "Enter amount": "መጠን ያስገቡ",
      "Add note (optional)": "ማስታወሻ ያክሉ (አማራጭ)",
      "Platform Fee: FREE": "የפלטatform ክፍያ: ነፃ",
      "They Receive": "ይቀበላሉ",
      "Confirm Send": "ማስላኩን ያረጋግጡ",
      "Request Money": "ገንዘብ ይጠይቁ",
      "Share your username": "የእርስዎን ስም ያጋሩ",

      // Announcements
      "Announcements": "ማሳወቂያዎች",
      "No new announcements": "አዲስ ማሳወቂያ የለም",

      // Market Rates
      "Market Rates": "የገበያ ዋጋዎች",
      "Best Buy Rates": "ምርጥ የግዢ ዋጋዎች",
      "Best Sell Rates": "ምርጥ የሽያጭ ዋጋዎች",
      "24h High": "24 ሰዓት ከፍተኛ",
      "24h Low": "24 ሰዓት ዝቅተኛ",
      "24h Change": "24 ሰዓት ለውጥ",
      "Updated": "ተመዝግቧል",
      "mins ago": "ደቂቃ በፊት",

      // Onboarding
      "Welcome to EthioSwap!": "ወደ EthioSwap እንኳን በደህና መጡ!",
      "Buy & Sell USDT safely in Ethiopia": "በኢትዮጵያ ውስጥ በደህና USDT ይግዙ እና ይሽጡ",
      "Safe P2P Trading": "ደህንነቱ የተጠበቀ P2P ንግድ",
      "Our escrow system protects your money": "የእኛ የስራ ማጠቃለያ ስርዓት ገንዘብዎን ይጠብቃል እስከ ሁለት በኩሎች ንግዱን ሲያረጋግጡ",
      "Best Rates in Ethiopia": "በኢትዮጵያ ውስጥ ምርጥ ዋጋዎች",
      "Trade directly with other Ethiopians": "ከሌሎች ኢትዮጵያውያን ጋር ቀጥታ ይነግዱ በተሻለ ዋጋ",
      "Trusted Traders Only": "የተመሰከሩ ነጋዴዎች ብቻ",
      "All traders are KYC verified": "ሁሉም ነጋዴዎች KYC ተረጋግጧል። ከመነግድዎ በፊት ደረጃዎችን ይፈትሹ",
      "Ready to Start!": "ለመጀመር ዝግጁ!",
      "Complete your KYC to unlock all features": "ሁሉንም ባህሪዎች ለመክፈት KYC ያጠናቅቁ",
      "Create Account": "שבון ይፍጠሩ",
      "Login": "ይግቡ",
      "Next": "ቀጥል",
      "Skip": "በ",

      // Common
      "Loading...": "በመጫን ላይ...",
      "Error": "ስህተት",
      "Success": "ተሳክቷል",
      "Cancel": "ሰርዝ",
      "Save": "አስቀምጥ",
      "Delete": "ሰርዝ",
      "Edit": "ቀይስ",
      "Close": "ዝጋ",
      "Back": "ተመለስ",
      "Submit": "ላክ",
      "Confirm": "ያረጋግጡ",
      "Yes": "አዎ",
      "No": "አይደለም",
      "All": "ሁሉም",
      "None": "ምንም",
      "Search": "ፈትሽ",
      "Filter": "ማጣሪያ",
      "Sort": "ደርድር",
      "Export": "ወደ ውጪ አdera",
      "Import": "ያስገቡ",
      "Download": "ডাউনলोድ",
      "Upload": "ጫን",
      "Copy": "ቅዳ",
      "Copied!": "ተቅድቧል!",
      "Share": "ያጋሩ",
      "Refresh": "አድስ",
      "Retry": "እንደገና ሞክር",
      "View All": "ሁሉንም ይመልከቱ",
      "View Details": "ዝርዝሮችን ይመልከቱ",
      "No data available": "መረጃ የለም",
      "No results found": "ውጤት አልተገኘም",
      "Are you sure?": "እርግጠኛ ነዎት?",
      "This action cannot be undone": "ይህ ተግባር ሊመለስ አይችልም",

      // Errors
      "Please fill in all fields": "እባክዎን ሁሉንም ስፍሮች ይሙሉ",
      "Password too short": "የየመስጫ ቃል በጣም አጭር ነው",
      "Invalid email": "ማይሆን ኢሜይል",
      "Network error": "የኔት워ክ ስህተት",
      "Something went wrong": "ችግር ተፈጥሯል",
      "Insufficient balance": "በቂ የሆነ ሂሳብ የለም",
      "Minimum amount": "አነስተኛ መጠን",
      "Maximum amount exceeded": "ከፍተኛ መጠን ተጓ唑ኧል",
      "Account suspended": "שבון ተቋቁሟል",

      // Success messages
      "Account created successfully!": "שבון በተሳካ ሁኔታ ተፈጥሯል!",
      "Profile updated!": "መግለጫ ተዘምኗል!",
      "Settings saved!": "ቅንብሮች ተቀምጠዋል!",
      "Password changed!": "የመስጫ ቃል ተቀይጧል!",
      "Payment sent!": "ክፍያ ተልኳል!",
      "Trade initiated!": "ንግድ ተጀምሯል!",
      "Dispute opened!": "ክርክር ተከፍቷል!",
      "Rating submitted!": "ደረጃ ተልኳል!",
      "Alert created!": "ማንቂያ ተፈጥሯል!",
      "Transfer complete!": "ማስተላለፍ ተጠናቋል!",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('ethioswap_language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
