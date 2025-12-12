import { AppLanguage } from '../types';

export type TranslationKey = 
  | 'app.title'
  | 'mode.parent'
  | 'mode.child'
  | 'mode.holding'
  | 'mode.tap_lock'
  | 'mode.hold_edit'
  | 'mode.keep_pressing'
  | 'search.placeholder'
  | 'search.no_results'
  | 'strip.tap_instruction'
  | 'strip.clear'
  | 'strip.history'
  | 'strip.speak'
  | 'strip.backspace'
  | 'nav.categories'
  | 'nav.add_card'
  | 'nav.settings'
  | 'nav.all'
  | 'empty.welcome'
  | 'empty.instruction'
  | 'empty.no_cards'
  | 'empty.hidden_hint'
  | 'modal.create.title_new'
  | 'modal.create.title_edit'
  | 'modal.create.camera'
  | 'modal.create.upload'
  | 'modal.create.change'
  | 'modal.create.retake'
  | 'modal.create.name_label'
  | 'modal.create.name_placeholder'
  | 'modal.create.visibility'
  | 'modal.create.visible'
  | 'modal.create.hidden'
  | 'modal.create.category'
  | 'modal.create.sound_label'
  | 'modal.create.recording'
  | 'modal.create.tts'
  | 'modal.create.tts_placeholder'
  | 'modal.create.tts_hint'
  | 'modal.create.preview'
  | 'modal.create.save'
  | 'modal.create.update'
  | 'modal.history.title'
  | 'modal.history.empty'
  | 'modal.history.empty_desc'
  | 'modal.settings.title'
  | 'modal.settings.language'
  | 'modal.settings.voice'
  | 'modal.settings.speed'
  | 'modal.settings.pitch'
  | 'modal.settings.grid'
  | 'modal.settings.grid_large'
  | 'modal.settings.grid_medium'
  | 'modal.settings.grid_small'
  | 'modal.settings.backup'
  | 'modal.settings.backup_desc'
  | 'modal.settings.export'
  | 'modal.settings.import'
  | 'modal.settings.done'
  | 'modal.categories.title'
  | 'modal.categories.add'
  | 'modal.categories.note'
  | 'modal.categories.name'
  | 'modal.categories.theme'
  | 'modal.categories.cancel'
  | 'modal.categories.save'
  | 'modal.confirm.delete_title'
  | 'modal.confirm.delete_desc'
  | 'modal.confirm.cancel'
  | 'modal.confirm.yes'
  | 'recorder.recording'
  | 'recorder.saved'
  | 'recorder.no_sound'
  | 'recorder.playing'
  | 'recorder.tap_play'
  | 'recorder.tap_red'
  | 'gate.title'
  | 'gate.desc'
  | 'gate.unlock'
  | 'category.NOUN'
  | 'category.VERB'
  | 'category.ADJECTIVE'
  | 'category.SOCIAL'
  | 'category.OTHER';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    'app.title': 'SpeakEasy',
    'mode.parent': 'Parent Mode',
    'mode.child': 'Child Mode',
    'mode.holding': 'Holding...',
    'mode.tap_lock': 'Tap to Lock',
    'mode.hold_edit': 'Hold to Edit',
    'mode.keep_pressing': 'Keep pressing',
    'search.placeholder': 'Search cards...',
    'search.no_results': 'No cards found for',
    'strip.tap_instruction': 'Tap cards to speak',
    'strip.clear': 'Clear All',
    'strip.history': 'Recent Sentences',
    'strip.speak': 'SPEAK',
    'strip.backspace': 'Backspace',
    'nav.categories': 'Categories',
    'nav.add_card': 'Add Card',
    'nav.settings': 'Settings',
    'nav.all': 'All',
    'empty.welcome': 'Welcome to SpeakEasy!',
    'empty.instruction': "It's a bit quiet here. Hold the lock icon to unlock Parent Mode and create your first card.",
    'empty.no_cards': 'No cards available.',
    'empty.hidden_hint': 'Check Parent Mode to see if items are hidden.',
    'modal.create.title_new': 'New Card',
    'modal.create.title_edit': 'Edit Card',
    'modal.create.camera': 'Camera',
    'modal.create.upload': 'Upload',
    'modal.create.change': 'Change',
    'modal.create.retake': 'Retake',
    'modal.create.name_label': 'Name (Label)',
    'modal.create.name_placeholder': 'e.g. Apple',
    'modal.create.visibility': 'Card Visibility',
    'modal.create.visible': 'Visible to child',
    'modal.create.hidden': 'Hidden from child',
    'modal.create.category': 'Category',
    'modal.create.sound_label': 'Card Sound',
    'modal.create.recording': 'Recording',
    'modal.create.tts': 'Text to Speech',
    'modal.create.tts_placeholder': 'Enter what the card should say...',
    'modal.create.tts_hint': 'Leaving this empty will speak the card name.',
    'modal.create.preview': 'Preview Voice',
    'modal.create.save': 'Save Card',
    'modal.create.update': 'Update Card',
    'modal.history.title': 'Recent Sentences',
    'modal.history.empty': 'No history yet',
    'modal.history.empty_desc': 'Sentences you speak will appear here.',
    'modal.settings.title': 'Settings',
    'modal.settings.language': 'Language',
    'modal.settings.voice': 'Voice & Speech',
    'modal.settings.speed': 'Speed',
    'modal.settings.pitch': 'Pitch',
    'modal.settings.grid': 'Card Size',
    'modal.settings.grid_large': 'Large',
    'modal.settings.grid_medium': 'Medium',
    'modal.settings.grid_small': 'Small',
    'modal.settings.backup': 'Backup & Restore',
    'modal.settings.backup_desc': 'Save your library to a file so you can transfer it to another device or restore it later.',
    'modal.settings.export': 'Export',
    'modal.settings.import': 'Import',
    'modal.settings.done': 'Done',
    'modal.categories.title': 'Manage Categories',
    'modal.categories.add': 'Add Custom Category',
    'modal.categories.note': 'Note: Deleting a category does <strong>not</strong> delete the cards inside it. They will turn gray and appear in the "All" tab until you reassign them.',
    'modal.categories.name': 'Name',
    'modal.categories.theme': 'Color Theme',
    'modal.categories.cancel': 'Cancel',
    'modal.categories.save': 'Save',
    'modal.confirm.delete_title': 'Delete this card?',
    'modal.confirm.delete_desc': 'Are you sure? It will be gone forever.',
    'modal.confirm.cancel': 'Cancel',
    'modal.confirm.yes': 'Yes, Delete',
    'recorder.recording': 'Recording...',
    'recorder.saved': 'Sound Saved',
    'recorder.no_sound': 'No Sound',
    'recorder.playing': 'Playing...',
    'recorder.tap_play': 'Tap play to test',
    'recorder.tap_red': 'Tap red button',
    'gate.title': 'For Parents Only',
    'gate.desc': 'Please solve this to unlock editing.',
    'gate.unlock': 'Unlock',
    'category.NOUN': 'Things',
    'category.VERB': 'Actions',
    'category.ADJECTIVE': 'Desc.',
    'category.SOCIAL': 'Social',
    'category.OTHER': 'Other',
  },
  ru: {
    'app.title': 'SpeakEasy',
    'mode.parent': 'Родитель',
    'mode.child': 'Ребенок',
    'mode.holding': 'Держите...',
    'mode.tap_lock': 'Закрыть',
    'mode.hold_edit': 'Удерживайте',
    'mode.keep_pressing': 'Держите еще',
    'search.placeholder': 'Поиск карточек...',
    'search.no_results': 'Ничего не найдено:',
    'strip.tap_instruction': 'Нажмите, чтобы сказать',
    'strip.clear': 'Очистить',
    'strip.history': 'История',
    'strip.speak': 'СКАЗАТЬ',
    'strip.backspace': 'Удалить',
    'nav.categories': 'Категории',
    'nav.add_card': 'Добавить',
    'nav.settings': 'Настройки',
    'nav.all': 'Все',
    'empty.welcome': 'Добро пожаловать!',
    'empty.instruction': 'Здесь пока пусто. Удерживайте замок, чтобы войти в режим родителя и создать первую карточку.',
    'empty.no_cards': 'Нет карточек.',
    'empty.hidden_hint': 'Проверьте режим родителя, возможно карточки скрыты.',
    'modal.create.title_new': 'Новая карточка',
    'modal.create.title_edit': 'Редактировать',
    'modal.create.camera': 'Камера',
    'modal.create.upload': 'Загрузить',
    'modal.create.change': 'Изменить',
    'modal.create.retake': 'Переснять',
    'modal.create.name_label': 'Название',
    'modal.create.name_placeholder': 'например, Яблоко',
    'modal.create.visibility': 'Видимость',
    'modal.create.visible': 'Видно ребенку',
    'modal.create.hidden': 'Скрыто от ребенка',
    'modal.create.category': 'Категория',
    'modal.create.sound_label': 'Звук',
    'modal.create.recording': 'Запись',
    'modal.create.tts': 'Текст в речь',
    'modal.create.tts_placeholder': 'Введите текст для озвучивания...',
    'modal.create.tts_hint': 'Если оставить пустым, будет озвучено название.',
    'modal.create.preview': 'Прослушать',
    'modal.create.save': 'Сохранить',
    'modal.create.update': 'Обновить',
    'modal.history.title': 'Недавние фразы',
    'modal.history.empty': 'История пуста',
    'modal.history.empty_desc': 'Здесь появятся сказанные фразы.',
    'modal.settings.title': 'Настройки',
    'modal.settings.language': 'Язык (Language)',
    'modal.settings.voice': 'Голос и речь',
    'modal.settings.speed': 'Скорость',
    'modal.settings.pitch': 'Высота',
    'modal.settings.grid': 'Размер сетки',
    'modal.settings.grid_large': 'Крупный',
    'modal.settings.grid_medium': 'Средний',
    'modal.settings.grid_small': 'Мелкий',
    'modal.settings.backup': 'Резервное копирование',
    'modal.settings.backup_desc': 'Сохраните библиотеку в файл для переноса на другое устройство.',
    'modal.settings.export': 'Скачать',
    'modal.settings.import': 'Загрузить',
    'modal.settings.done': 'Готово',
    'modal.categories.title': 'Управление категориями',
    'modal.categories.add': 'Добавить категорию',
    'modal.categories.note': 'Примечание: Удаление категории <strong>не</strong> удаляет карточки. Они станут серыми, пока вы не назначите им новую категорию.',
    'modal.categories.name': 'Название',
    'modal.categories.theme': 'Цвет',
    'modal.categories.cancel': 'Отмена',
    'modal.categories.save': 'Сохранить',
    'modal.confirm.delete_title': 'Удалить карточку?',
    'modal.confirm.delete_desc': 'Вы уверены? Это действие нельзя отменить.',
    'modal.confirm.cancel': 'Отмена',
    'modal.confirm.yes': 'Да, удалить',
    'recorder.recording': 'Запись...',
    'recorder.saved': 'Записано',
    'recorder.no_sound': 'Нет звука',
    'recorder.playing': 'Воспроизведение...',
    'recorder.tap_play': 'Нажмите Play',
    'recorder.tap_red': 'Нажмите красную кнопку',
    'gate.title': 'Для родителей',
    'gate.desc': 'Решите пример, чтобы разблокировать.',
    'gate.unlock': 'Открыть',
    'category.NOUN': 'Вещи',
    'category.VERB': 'Действия',
    'category.ADJECTIVE': 'Признаки',
    'category.SOCIAL': 'Общение',
    'category.OTHER': 'Разное',
  }
};

export const getTranslation = (lang: AppLanguage, key: TranslationKey): string => {
  return translations[lang][key] || translations['en'][key] || key;
};