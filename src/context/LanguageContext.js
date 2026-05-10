import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

const STORAGE_KEY = '@allway_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const isRTL = language === 'ar';

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(lang => {
      if (lang && lang !== language) {
        applyLanguage(lang, false);
      }
    }).catch(() => {});
  }, []);

  function t(key) {
    const dict = translations[language] ?? translations.en;
    return dict[key] ?? translations.en[key] ?? key;
  }

  async function applyLanguage(lang, showRestartAlert = true) {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);

    const shouldBeRTL = lang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      if (showRestartAlert) {
        Alert.alert(
          lang === 'ar' ? 'إعادة تشغيل التطبيق' : 'Restart Required',
          lang === 'ar'
            ? 'يرجى إغلاق التطبيق وإعادة فتحه لتطبيق اللغة العربية بالكامل.'
            : 'Please close and reopen the app to apply the language change fully.',
          [{ text: lang === 'ar' ? 'حسناً' : 'OK' }]
        );
      }
    }
  }

  async function setLanguage(lang) {
    await applyLanguage(lang, true);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
