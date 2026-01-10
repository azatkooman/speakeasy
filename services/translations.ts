import { AppLanguage } from '../types';

export type TranslationKey = 
  | 'app.title'
  | 'app.new_folder'
  | 'app.empty_folder'
  | 'app.switch_parent'
  | 'app.hint_tap'
  | 'app.hint_move_rest'
  | 'app.home_folder'
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
  | 'nav.boards'
  | 'nav.profiles'
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
  | 'create.in_folder'
  | 'create.change_image'
  | 'create.symbol'
  | 'create.search_type_hint'
  | 'create.no_results'
  | 'create.attribution'
  | 'create.menu_title'
  | 'create.menu_card_desc'
  | 'create.menu_folder_desc'
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
  | 'modal.confirm.delete_folder_desc'
  | 'modal.confirm.cancel'
  | 'modal.confirm.yes'
  | 'folder.edit'
  | 'folder.open'
  | 'folder.open_desc'
  | 'folder.new'
  | 'folder.name_label'
  | 'folder.name_placeholder'
  | 'folder.color_label'
  | 'folder.color_desc'
  | 'folder.icon_search_label'
  | 'folder.icon_search_hint'
  | 'folder.web_symbols'
  | 'folder.searching'
  | 'folder.builtin_icons'
  | 'folder.no_icons'
  | 'folder.saving'
  | 'folder.save'
  | 'fitzgerald.people' | 'fitzgerald.people_desc'
  | 'fitzgerald.verbs' | 'fitzgerald.verbs_desc'
  | 'fitzgerald.nouns' | 'fitzgerald.nouns_desc'
  | 'fitzgerald.adjectives' | 'fitzgerald.adjectives_desc'
  | 'fitzgerald.social' | 'fitzgerald.social_desc'
  | 'fitzgerald.places' | 'fitzgerald.places_desc'
  | 'fitzgerald.emergency' | 'fitzgerald.emergency_desc'
  | 'fitzgerald.time' | 'fitzgerald.time_desc'
  | 'fitzgerald.misc' | 'fitzgerald.misc_desc'
  | 'move.title'
  | 'move.moving'
  | 'move.destination'
  | 'move.home'
  | 'move.no_folders'
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
  | 'category.OTHER'
  | 'edit_options.card_desc'
  | 'edit_options.folder_desc'
  | 'edit_options.move_desc'
  | 'edit_options.delete_desc'
  | 'boards.title'
  | 'boards.create'
  | 'boards.name_placeholder'
  | 'boards.switch'
  | 'boards.active'
  | 'boards.delete_confirm'
  | 'boards.default_name'
  | 'boards.delete_error_last'
  | 'boards.rename'
  | 'create.menu_link_desc'
  | 'link.title'
  | 'link.select_board'
  | 'link.save'
  | 'profile.title'
  | 'profile.add'
  | 'profile.edit'
  | 'profile.name'
  | 'profile.age'
  | 'profile.avatar_color'
  | 'profile.create'
  | 'profile.switch'
  | 'profile.delete_confirm'
  | 'profile.current'
  | 'profile.welcome'
  | 'profile.name_placeholder'
  | 'profile.age_placeholder'
  | 'header.back'
  | 'modal.profile.delete_hover'
  | 'modal.profile.edit_hover'
  | 'modal.profile.change_language'
  | 'recorder.start_recording'
  | 'boards.delete_board_label'
  | 'link.no_boards';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    'app.title': 'SpeakEasy',
    'app.new_folder': 'New Folder',
    'app.empty_folder': 'Empty Folder',
    'app.switch_parent': 'Switch to Parent Mode to add folders or cards.',
    'app.hint_tap': 'Tap',
    'app.hint_move_rest': 'to move items, or long press to reorder.',
    'app.home_folder': 'Home',
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
    'nav.boards': 'Boards',
    'nav.profiles': 'Profiles',
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
    'create.in_folder': 'In folder:',
    'create.change_image': 'Change Image',
    'create.symbol': 'Symbol',
    'create.search_type_hint': 'Type to search symbols',
    'create.no_results': 'No results found',
    'create.attribution': 'Powered by ARASAAC • Creative Commons',
    'create.menu_title': 'Create New',
    'create.menu_card_desc': 'Add a photo or symbol card',
    'create.menu_folder_desc': 'Create a new category folder',
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
    'modal.confirm.delete_title': 'Delete this item?',
    'modal.confirm.delete_desc': 'Are you sure? It will be gone forever.',
    'modal.confirm.delete_folder_desc': 'Deleting this folder will move all its cards to the Home screen.',
    'modal.confirm.cancel': 'Cancel',
    'modal.confirm.yes': 'Yes, Delete',
    'folder.edit': 'Edit Folder',
    'folder.open': 'Open Folder',
    'folder.open_desc': 'Open to view or add items',
    'folder.new': 'New Folder',
    'folder.name_label': 'Folder Name',
    'folder.name_placeholder': 'e.g., Food, School',
    'folder.color_label': 'Fitzgerald Key Color',
    'folder.color_desc': 'Standard color coding helps learning sentence structure.',
    'folder.icon_search_label': 'Icon Search',
    'folder.icon_search_hint': 'Type at least 3 characters to search online symbols.',
    'folder.web_symbols': 'Web Symbols (ARASAAC)',
    'folder.searching': 'Searching ARASAAC...',
    'folder.builtin_icons': 'Built-in Icons',
    'folder.no_icons': 'No icons found. Try searching for something else.',
    'folder.saving': 'Saving...',
    'folder.save': 'Save Folder',
    'fitzgerald.people': 'People / Pronouns',
    'fitzgerald.people_desc': 'Who',
    'fitzgerald.verbs': 'Verbs / Actions',
    'fitzgerald.verbs_desc': 'Doing',
    'fitzgerald.nouns': 'Nouns / Things',
    'fitzgerald.nouns_desc': 'What',
    'fitzgerald.adjectives': 'Adjectives',
    'fitzgerald.adjectives_desc': 'Describe',
    'fitzgerald.social': 'Social',
    'fitzgerald.social_desc': 'Greetings',
    'fitzgerald.places': 'Places',
    'fitzgerald.places_desc': 'Where',
    'fitzgerald.emergency': 'Emergency / Important',
    'fitzgerald.emergency_desc': 'Stop/No',
    'fitzgerald.time': 'Time / Prepositions',
    'fitzgerald.time_desc': 'When/Where',
    'fitzgerald.misc': 'Misc / Grammar',
    'fitzgerald.misc_desc': 'Other',
    'move.title': 'Move Item',
    'move.moving': 'Moving:',
    'move.destination': 'Select Destination',
    'move.home': 'Home (Root)',
    'move.no_folders': 'No valid folders found.',
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
    'edit_options.card_desc': 'Change name, image, or sound',
    'edit_options.folder_desc': 'Change name, color, or icon',
    'edit_options.move_desc': 'Change folder location',
    'edit_options.delete_desc': 'Remove permanently',
    'boards.title': 'My Boards',
    'boards.create': 'Create New Board',
    'boards.name_placeholder': 'Board Name (e.g., Home, School)',
    'boards.switch': 'Switch Board',
    'boards.active': 'Active',
    'boards.delete_confirm': 'Delete this board and all its content?',
    'boards.default_name': 'My First Board',
    'boards.delete_error_last': 'Cannot delete the last remaining board.',
    'boards.rename': 'Rename Board',
    'create.menu_link_desc': 'Card that links to another board',
    'link.title': 'Link to Board',
    'link.select_board': 'Select Target Board',
    'link.save': 'Create Link',
    'profile.title': 'Child Profiles',
    'profile.add': 'Add Child',
    'profile.edit': 'Edit Profile',
    'profile.name': "Child's Name",
    'profile.age': 'Age',
    'profile.avatar_color': 'Avatar Color',
    'profile.create': 'Create Profile',
    'profile.switch': 'Switch Profile',
    'profile.delete_confirm': 'Delete this profile and ALL associated boards, cards, and folders?',
    'profile.current': 'Current',
    'profile.welcome': "Welcome! Let's create a profile for your child.",
    'profile.name_placeholder': 'e.g. John',
    'profile.age_placeholder': 'e.g. 5',
    'header.back': 'Back',
    'modal.profile.delete_hover': 'Delete Profile',
    'modal.profile.edit_hover': 'Edit Profile',
    'modal.profile.change_language': 'Change Language',
    'recorder.start_recording': 'Start Recording',
    'boards.delete_board_label': 'Board',
    'link.no_boards': 'No other boards available.',
  },
  ru: {
    'app.title': 'SpeakEasy',
    'app.new_folder': 'Новая папка',
    'app.empty_folder': 'Пустая папка',
    'app.switch_parent': 'Перейдите в режим родителя, чтобы добавить содержимое.',
    'app.hint_tap': 'Нажмите',
    'app.hint_move_rest': 'для перемещения, удерживайте для сортировки.',
    'app.home_folder': 'Главная',
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
    'nav.boards': 'Доски',
    'nav.profiles': 'Профили',
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
    'create.in_folder': 'В папке:',
    'create.change_image': 'Изменить фото',
    'create.symbol': 'Символ',
    'create.search_type_hint': 'Введите текст для поиска',
    'create.no_results': 'Ничего не найдено',
    'create.attribution': 'На базе ARASAAC • Creative Commons',
    'create.menu_title': 'Создать',
    'create.menu_card_desc': 'Фото или символ',
    'create.menu_folder_desc': 'Новая категория',
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
    'modal.confirm.delete_title': 'Удалить элемент?',
    'modal.confirm.delete_desc': 'Вы уверены? Это действие нельзя отменить.',
    'modal.confirm.delete_folder_desc': 'При удалении папки все карточки из неё переместятся на Главную.',
    'modal.confirm.cancel': 'Отмена',
    'modal.confirm.yes': 'Да, удалить',
    'folder.edit': 'Редактировать папку',
    'folder.open': 'Открыть папку',
    'folder.open_desc': 'Войти для добавления карточек',
    'folder.new': 'Новая папка',
    'folder.name_label': 'Название папки',
    'folder.name_placeholder': 'например, Еда, Школа',
    'folder.color_label': 'Цвет (Фицджеральд)',
    'folder.color_desc': 'Цветовое кодирование помогает изучать структуру речи.',
    'folder.icon_search_label': 'Поиск иконки',
    'folder.icon_search_hint': 'Минимум 3 символа для поиска онлайн.',
    'folder.web_symbols': 'Веб-символы (ARASAAC)',
    'folder.searching': 'Поиск в ARASAAC...',
    'folder.builtin_icons': 'Встроенные иконки',
    'folder.no_icons': 'Иконки не найдены.',
    'folder.saving': 'Сохранение...',
    'folder.save': 'Сохранить папку',
    'fitzgerald.people': 'Люди / Местоимения',
    'fitzgerald.people_desc': 'Кто',
    'fitzgerald.verbs': 'Глаголы / Действия',
    'fitzgerald.verbs_desc': 'Что делает',
    'fitzgerald.nouns': 'Существительные / Вещи',
    'fitzgerald.nouns_desc': 'Что',
    'fitzgerald.adjectives': 'Прилагательные',
    'fitzgerald.adjectives_desc': 'Какой',
    'fitzgerald.social': 'Общение',
    'fitzgerald.social_desc': 'Приветствия',
    'fitzgerald.places': 'Места',
    'fitzgerald.places_desc': 'Где',
    'fitzgerald.emergency': 'Важное / Срочное',
    'fitzgerald.emergency_desc': 'Стоп / Нет',
    'fitzgerald.time': 'Время / Предлоги',
    'fitzgerald.time_desc': 'Когда / Где',
    'fitzgerald.misc': 'Разное',
    'fitzgerald.misc_desc': 'Другое',
    'move.title': 'Переместить',
    'move.moving': 'Перемещение:',
    'move.destination': 'Выберите место',
    'move.home': 'Главная',
    'move.no_folders': 'Папки не найдены.',
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
    'edit_options.card_desc': 'Изменить название, фото или звук',
    'edit_options.folder_desc': 'Изменить название, цвет или иконку',
    'edit_options.move_desc': 'Переместить в другую папку',
    'edit_options.delete_desc': 'Удалить безвозвратно',
    'boards.title': 'Мои доски',
    'boards.create': 'Создать доску',
    'boards.name_placeholder': 'Название (напр., Дом, Школа)',
    'boards.switch': 'Выбрать доску',
    'boards.active': 'Активна',
    'boards.delete_confirm': 'Удалить доску и все карточки на ней?',
    'boards.default_name': 'Моя первая доска',
    'boards.delete_error_last': 'Нельзя удалить единственную доску.',
    'boards.rename': 'Переименовать',
    'create.menu_link_desc': 'Карточка для перехода на другую доску',
    'link.title': 'Ссылка на доску',
    'link.select_board': 'Выберите доску',
    'link.save': 'Создать ссылку',
    'profile.title': 'Профили детей',
    'profile.add': 'Добавить ребенка',
    'profile.edit': 'Редактировать профиль',
    'profile.name': 'Имя ребенка',
    'profile.age': 'Возраст',
    'profile.avatar_color': 'Цвет аватара',
    'profile.create': 'Создать профиль',
    'profile.switch': 'Сменить профиль',
    'profile.delete_confirm': 'Удалить профиль и ВСЕ его доски и карточки?',
    'profile.current': 'Текущий',
    'profile.welcome': 'Добро пожаловать! Давайте создадим профиль для вашего ребенка.',
    'profile.name_placeholder': 'например, Саша',
    'profile.age_placeholder': 'например, 5',
    'header.back': 'Назад',
    'modal.profile.delete_hover': 'Удалить профиль',
    'modal.profile.edit_hover': 'Редактировать профиль',
    'modal.profile.change_language': 'Сменить язык',
    'recorder.start_recording': 'Начать запись',
    'boards.delete_board_label': 'Доска',
    'link.no_boards': 'Нет доступных досок.',
  }
};

export const getTranslation = (lang: AppLanguage, key: TranslationKey): string => {
  return translations[lang][key] || translations['en'][key] || key;
};