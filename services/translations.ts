
import { AppLanguage } from '../types';

export type TranslationKey = 
  | 'app.title'
  | 'app.new_folder'
  | 'app.empty_folder'
  | 'app.switch_parent'
  | 'app.hint_tap'
  | 'app.hint_create'
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
  | 'strip.remove_item'
  | 'modal.create.core'
  | 'modal.create.core_desc'
  | 'modal.settings.grid_board'
  | 'modal.settings.return_home'
  | 'modal.settings.return_home_desc'
  | 'modal.settings.shell'
  | 'modal.settings.shell_young'
  | 'modal.settings.shell_neutral'
  | 'modal.settings.shell_desc'
  | 'modal.settings.access'
  | 'modal.settings.select_release'
  | 'modal.settings.select_press'
  | 'modal.settings.select_dwell'
  | 'modal.settings.select_desc'
  | 'modal.settings.dwell_time'
  | 'modal.settings.preview'
  | 'modal.settings.preview_desc'
  | 'modal.settings.scan'
  | 'modal.settings.scan_off'
  | 'modal.settings.scan_linear'
  | 'modal.settings.scan_rowcol'
  | 'modal.settings.scan_desc'
  | 'modal.settings.scan_rate'
  | 'modal.settings.scan_auto'
  | 'modal.settings.scan_auto_desc'
  | 'forms.title'
  | 'forms.edit_label'
  | 'forms.edit_hint'
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
  | 'modal.settings.done'
  | 'modal.settings.behavior'
  | 'modal.settings.max_length'
  | 'modal.settings.max_length_none'
  | 'modal.settings.auto_clear'
  | 'modal.settings.auto_clear_desc'
  | 'modal.settings.test_voice'
  | 'modal.settings.test_error'
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
  | 'folder.default.people'
  | 'folder.default.actions'
  | 'folder.default.things'
  | 'folder.default.desc'
  | 'folder.default.social'
  | 'folder.default.places'
  | 'folder.default.food'
  | 'folder.default.time'
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
  | 'link.no_boards'
  | 'default.card.i_want'
  | 'default.card.yes'
  | 'default.card.no'
  | 'default.card.stop'
  | 'default.card.apple'
  | 'onboarding.unlock_hint'
  | 'onboarding.dismiss';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    'app.title': 'SpeakEasy',
    'app.new_folder': 'New Folder',
    'app.empty_folder': 'Empty Folder',
    'app.switch_parent': 'Switch to Parent Mode to add folders or cards.',
    'app.hint_tap': 'Tap',
    'app.hint_create': 'to create new folder or card',
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
    'strip.speak': 'Speak',
    'strip.backspace': 'Backspace',
    'strip.remove_item': 'Remove',
    'modal.create.core': 'Always on screen',
    'modal.create.core_desc': 'Stays visible in every folder',
    'modal.settings.grid_board': 'Applies to this board',
    'modal.settings.return_home': 'Return home after choosing',
    'modal.settings.return_home_desc': 'Go back to the main board after a word is picked',
    'modal.settings.shell': 'Appearance',
    'modal.settings.shell_young': 'Young learner',
    'modal.settings.shell_neutral': 'Neutral',
    'modal.settings.shell_desc': 'Same board and colours, calmer styling for older users',
    'modal.settings.access': 'How cards are chosen',
    'modal.settings.select_release': 'On lift',
    'modal.settings.select_press': 'On touch',
    'modal.settings.select_dwell': 'Hold',
    'modal.settings.select_desc': 'On lift lets a finger slide off to cancel. Hold ignores brief or accidental contact.',
    'modal.settings.dwell_time': 'Hold time',
    'modal.settings.preview': 'Hear before choosing',
    'modal.settings.preview_desc': 'First tap says the word, second tap adds it to the sentence',
    'modal.settings.scan': 'Switch scanning',
    'modal.settings.scan_off': 'Off',
    'modal.settings.scan_linear': 'One by one',
    'modal.settings.scan_rowcol': 'Rows first',
    'modal.settings.scan_desc': 'A highlight moves across the board and a switch chooses. Space or Enter selects; arrow keys move when moving by switch.',
    'modal.settings.scan_rate': 'Highlight speed',
    'modal.settings.scan_auto': 'Move on its own',
    'modal.settings.scan_auto_desc': 'Off means one switch moves the highlight and another selects',
    'forms.title': 'Word forms',
    'forms.edit_label': 'Other wordings',
    'forms.edit_hint': 'One per line, e.g. wants, wanted, wanting. The child picks from these on the card.',
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
    'modal.settings.done': 'Done',
    'modal.settings.behavior': 'Sentence Strip',
    'modal.settings.max_length': 'Sentence Length Limit',
    'modal.settings.max_length_none': 'Unlimited',
    'modal.settings.auto_clear': 'Auto-clear after speaking',
    'modal.settings.auto_clear_desc': 'Remove cards automatically after speech finishes.',
    'modal.settings.test_voice': 'Test Voice',
    'modal.settings.test_error': 'Error',
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
    'folder.default.people': 'People',
    'folder.default.actions': 'Actions',
    'folder.default.things': 'Things',
    'folder.default.desc': 'Desc.',
    'folder.default.social': 'Social',
    'folder.default.places': 'Places',
    'folder.default.food': 'Food',
    'folder.default.time': 'Time',
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
    'default.card.i_want': 'I want',
    'default.card.yes': 'Yes',
    'default.card.no': 'No',
    'default.card.stop': 'Stop',
    'default.card.apple': 'Apple',
    'onboarding.unlock_hint': 'Press & hold (1.5s) to unlock Parent Mode.',
    'onboarding.dismiss': 'Got it',
  },
  ru: {
    'app.title': 'SpeakEasy',
    'app.new_folder': 'Новая папка',
    'app.empty_folder': 'Пустая папка',
    'app.switch_parent': 'Перейдите в режим родителя, чтобы добавить содержимое.',
    'app.hint_tap': 'Нажмите',
    'app.hint_create': 'чтобы создать папку или карточку',
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
    'strip.speak': 'Сказать',
    'strip.backspace': 'Удалить',
    'strip.remove_item': 'Убрать',
    'modal.create.core': 'Всегда на экране',
    'modal.create.core_desc': 'Видно в любой папке',
    'modal.settings.grid_board': 'Применяется к этой доске',
    'modal.settings.return_home': 'Возврат на главную после выбора',
    'modal.settings.return_home_desc': 'Возвращаться на главную доску после выбора слова',
    'modal.settings.shell': 'Оформление',
    'modal.settings.shell_young': 'Для малышей',
    'modal.settings.shell_neutral': 'Нейтральное',
    'modal.settings.shell_desc': 'Та же доска и цвета, спокойнее вид для старших',
    'modal.settings.access': 'Как выбираются карточки',
    'modal.settings.select_release': 'При отпускании',
    'modal.settings.select_press': 'При касании',
    'modal.settings.select_dwell': 'Удержание',
    'modal.settings.select_desc': 'При отпускании можно сдвинуть палец и отменить. Удержание не реагирует на случайные касания.',
    'modal.settings.dwell_time': 'Время удержания',
    'modal.settings.preview': 'Сначала прослушать',
    'modal.settings.preview_desc': 'Первое нажатие произносит слово, второе добавляет его в строку',
    'modal.settings.scan': 'Сканирование переключателем',
    'modal.settings.scan_off': 'Выкл.',
    'modal.settings.scan_linear': 'По одной',
    'modal.settings.scan_rowcol': 'Сначала строки',
    'modal.settings.scan_desc': 'Подсветка движется по доске, а переключатель выбирает. Пробел или Ввод — выбор; стрелки — переход.',
    'modal.settings.scan_rate': 'Скорость подсветки',
    'modal.settings.scan_auto': 'Двигается сама',
    'modal.settings.scan_auto_desc': 'Если выкл., один переключатель двигает подсветку, другой выбирает',
    'forms.title': 'Формы слова',
    'forms.edit_label': 'Другие формы',
    'forms.edit_hint': 'По одной в строке, например: хочу, хотел, хочет. Ребёнок выбирает их на карточке.',
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
    'modal.settings.done': 'Готово',
    'modal.settings.behavior': 'Коммуникативная лента',
    'modal.settings.max_length': 'Лимит длины фразы',
    'modal.settings.max_length_none': 'Без ограничений',
    'modal.settings.auto_clear': 'Авто-очистка',
    'modal.settings.auto_clear_desc': 'Удалять карточки после произношения.',
    'modal.settings.test_voice': 'Проверить голос',
    'modal.settings.test_error': 'Ошибка',
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
    'folder.default.people': 'Люди',
    'folder.default.actions': 'Действия',
    'folder.default.things': 'Вещи',
    'folder.default.desc': 'Признаки',
    'folder.default.social': 'Общение',
    'folder.default.places': 'Места',
    'folder.default.food': 'Еда',
    'folder.default.time': 'Время',
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
    'default.card.i_want': 'Я хочу',
    'default.card.yes': 'Да',
    'default.card.no': 'Нет',
    'default.card.stop': 'Стоп',
    'default.card.apple': 'Яблоко',
    'onboarding.unlock_hint': 'Нажмите и удерживайте (1,5 с), чтобы открыть режим родителя.',
    'onboarding.dismiss': 'Понятно',
  },
  fr: {
    'app.title': 'SpeakEasy',
    'app.new_folder': 'Nouveau Dossier',
    'app.empty_folder': 'Dossier Vide',
    'app.switch_parent': 'Passez en Mode Parent pour ajouter des éléments.',
    'app.hint_tap': 'Touchez',
    'app.hint_create': 'pour créer un dossier ou une carte',
    'app.hint_move_rest': 'pour déplacer des éléments, ou maintenez pour réorganiser.',
    'app.home_folder': 'Accueil',
    'mode.parent': 'Mode Parent',
    'mode.child': 'Mode Enfant',
    'mode.holding': 'Maintien...',
    'mode.tap_lock': 'Touchez pour Verrouiller',
    'mode.hold_edit': 'Maintenez pour Modifier',
    'mode.keep_pressing': 'Continuez à appuyer',
    'search.placeholder': 'Rechercher des cartes...',
    'search.no_results': 'Aucune carte trouvée pour',
    'strip.tap_instruction': 'Touchez les cartes pour parler',
    'strip.clear': 'Tout Effacer',
    'strip.history': 'Phrases Récentes',
    'strip.speak': 'Parler',
    'strip.backspace': 'Effacer',
    'strip.remove_item': 'Retirer',
    'modal.create.core': 'Toujours visible',
    'modal.create.core_desc': 'Reste affiché dans chaque dossier',
    'modal.settings.grid_board': 'Concerne ce tableau',
    'modal.settings.return_home': 'Retour à l\'accueil après le choix',
    'modal.settings.return_home_desc': 'Revenir au tableau principal après le choix d\'un mot',
    'modal.settings.shell': 'Apparence',
    'modal.settings.shell_young': 'Jeune enfant',
    'modal.settings.shell_neutral': 'Neutre',
    'modal.settings.shell_desc': 'Même tableau et mêmes couleurs, style plus sobre',
    'modal.settings.access': 'Choix des cartes',
    'modal.settings.select_release': 'Au relâchement',
    'modal.settings.select_press': 'Au contact',
    'modal.settings.select_dwell': 'Maintien',
    'modal.settings.select_desc': 'Au relâchement, glisser le doigt annule. Le maintien ignore les contacts brefs ou accidentels.',
    'modal.settings.dwell_time': 'Durée du maintien',
    'modal.settings.preview': 'Écouter avant de choisir',
    'modal.settings.preview_desc': 'La première pression dit le mot, la seconde l\'ajoute à la phrase',
    'modal.settings.scan': 'Balayage par contacteur',
    'modal.settings.scan_off': 'Désactivé',
    'modal.settings.scan_linear': 'Une par une',
    'modal.settings.scan_rowcol': 'Lignes d\'abord',
    'modal.settings.scan_desc': 'Une surbrillance parcourt le tableau et le contacteur choisit. Espace ou Entrée sélectionne ; les flèches déplacent.',
    'modal.settings.scan_rate': 'Vitesse de la surbrillance',
    'modal.settings.scan_auto': 'Avance tout seul',
    'modal.settings.scan_auto_desc': 'Désactivé : un contacteur déplace, un autre sélectionne',
    'forms.title': 'Formes du mot',
    'forms.edit_label': 'Autres formulations',
    'forms.edit_hint': 'Une par ligne, par exemple : veut, voulait, voulant. L\'enfant choisit parmi elles sur la carte.',
    'nav.categories': 'Catégories',
    'nav.add_card': 'Ajouter une Carte',
    'nav.settings': 'Paramètres',
    'nav.boards': 'Tableaux',
    'nav.profiles': 'Profils',
    'nav.all': 'Tout',
    'empty.welcome': 'Bienvenue sur SpeakEasy !',
    'empty.instruction': "C'est un peu calme ici. Maintenez l'icône de cadenas pour déverrouiller le Mode Parent et créer votre première carte.",
    'empty.no_cards': 'Aucune carte disponible.',
    'empty.hidden_hint': 'Vérifiez le Mode Parent pour voir si des éléments sont masqués.',
    'modal.create.title_new': 'Nouvelle Carte',
    'modal.create.title_edit': 'Modifier la Carte',
    'modal.create.camera': 'Caméra',
    'modal.create.upload': 'Télécharger',
    'modal.create.change': 'Changer',
    'modal.create.retake': 'Refaire',
    'modal.create.name_label': 'Nom (Étiquette)',
    'modal.create.name_placeholder': 'ex. Pomme',
    'modal.create.visibility': 'Visibilité de la Carte',
    'modal.create.visible': "Visible par l'enfant",
    'modal.create.hidden': "Masqué pour l'enfant",
    'modal.create.category': 'Catégorie',
    'modal.create.sound_label': 'Son de la Carte',
    'modal.create.recording': 'Enregistrement',
    'modal.create.tts': 'Texte vers Parole',
    'modal.create.tts_placeholder': 'Entrez ce que la carte doit dire...',
    'modal.create.tts_hint': 'Laissez vide pour prononcer le nom de la carte.',
    'modal.create.preview': 'Aperçu de la Voix',
    'modal.create.save': 'Enregistrer la Carte',
    'modal.create.update': 'Mettre à jour la Carte',
    'create.in_folder': 'Dans le dossier :',
    'create.change_image': "Changer l'Image",
    'create.symbol': 'Symbole',
    'create.search_type_hint': 'Tapez pour rechercher des symboles',
    'create.no_results': 'Aucun résultat trouvé',
    'create.attribution': 'Propulsé par ARASAAC • Creative Commons',
    'create.menu_title': 'Créer Nouveau',
    'create.menu_card_desc': 'Ajouter une carte photo ou un symbole',
    'create.menu_folder_desc': 'Créer un nouveau dossier de catégorie',
    'modal.history.title': 'Phrases Récentes',
    'modal.history.empty': 'Pas encore d\'historique',
    'modal.history.empty_desc': 'Les phrases que vous dites apparaîtront ici.',
    'modal.settings.title': 'Paramètres',
    'modal.settings.language': 'Langue',
    'modal.settings.voice': 'Voix et Parole',
    'modal.settings.speed': 'Vitesse',
    'modal.settings.pitch': 'Hauteur',
    'modal.settings.grid': 'Taille de la Carte',
    'modal.settings.grid_large': 'Grand',
    'modal.settings.grid_medium': 'Moyen',
    'modal.settings.grid_small': 'Petit',
    'modal.settings.done': 'Terminé',
    'modal.settings.behavior': 'Bande de Phrase',
    'modal.settings.max_length': 'Limite de longueur de phrase',
    'modal.settings.max_length_none': 'Illimité',
    'modal.settings.auto_clear': 'Effacement auto après la parole',
    'modal.settings.auto_clear_desc': 'Supprime automatiquement les cartes.',
    'modal.settings.test_voice': 'Tester la Voix',
    'modal.settings.test_error': 'Erreur',
    'modal.categories.title': 'Gérer les Catégories',
    'modal.categories.add': 'Ajouter une Catégorie Personnalisée',
    'modal.categories.note': 'Remarque : Supprimer une catégorie <strong>ne supprime pas</strong> les cartes qui s\'y trouvent. Elles deviendront grises.',
    'modal.categories.name': 'Nom',
    'modal.categories.theme': 'Thème de Couleur',
    'modal.categories.cancel': 'Annuler',
    'modal.categories.save': 'Enregistrer',
    'modal.confirm.delete_title': 'Supprimer cet élément ?',
    'modal.confirm.delete_desc': 'Êtes-vous sûr ? Il sera supprimé définitivement.',
    'modal.confirm.delete_folder_desc': 'Supprimer ce dossier déplacera toutes ses cartes vers l\'écran d\'Accueil.',
    'modal.confirm.cancel': 'Annuler',
    'modal.confirm.yes': 'Oui, Supprimer',
    'folder.edit': 'Modifier le Dossier',
    'folder.open': 'Ouvrir le Dossier',
    'folder.open_desc': 'Ouvrir pour afficher ou ajouter des éléments',
    'folder.new': 'Nouveau Dossier',
    'folder.name_label': 'Nom du Dossier',
    'folder.name_placeholder': 'ex., Nourriture, École',
    'folder.color_label': 'Couleur Clé de Fitzgerald',
    'folder.color_desc': 'Le code couleur standard aide à l\'apprentissage de la structure de la phrase.',
    'folder.icon_search_label': 'Recherche d\'Icônes',
    'folder.icon_search_hint': 'Tapez au moins 3 caractères.',
    'folder.web_symbols': 'Symboles Web (ARASAAC)',
    'folder.searching': 'Recherche ARASAAC...',
    'folder.builtin_icons': 'Icônes Intégrées',
    'folder.no_icons': 'Aucune icône trouvée.',
    'folder.saving': 'Enregistrement...',
    'folder.save': 'Enregistrer le Dossier',
    'folder.default.people': 'Personnes',
    'folder.default.actions': 'Actions',
    'folder.default.things': 'Choses',
    'folder.default.desc': 'Desc.',
    'folder.default.social': 'Social',
    'folder.default.places': 'Lieux',
    'folder.default.food': 'Nourriture',
    'folder.default.time': 'Temps',
    'fitzgerald.people': 'Personnes / Pronoms',
    'fitzgerald.people_desc': 'Qui',
    'fitzgerald.verbs': 'Verbes / Actions',
    'fitzgerald.verbs_desc': 'Faisant',
    'fitzgerald.nouns': 'Noms / Choses',
    'fitzgerald.nouns_desc': 'Quoi',
    'fitzgerald.adjectives': 'Adjectifs',
    'fitzgerald.adjectives_desc': 'Décrire',
    'fitzgerald.social': 'Social',
    'fitzgerald.social_desc': 'Salutations',
    'fitzgerald.places': 'Lieux',
    'fitzgerald.places_desc': 'Où',
    'fitzgerald.emergency': 'Urgence / Important',
    'fitzgerald.emergency_desc': 'Arrêt/Non',
    'fitzgerald.time': 'Temps / Prépositions',
    'fitzgerald.time_desc': 'Quand/Où',
    'fitzgerald.misc': 'Divers / Grammaire',
    'fitzgerald.misc_desc': 'Autre',
    'move.title': 'Déplacer l\'Élément',
    'move.moving': 'Déplacement :',
    'move.destination': 'Sélectionner la Destination',
    'move.home': 'Accueil (Racine)',
    'move.no_folders': 'Aucun dossier valide trouvé.',
    'recorder.recording': 'Enregistrement...',
    'recorder.saved': 'Son Enregistré',
    'recorder.no_sound': 'Pas de Son',
    'recorder.playing': 'Lecture en cours...',
    'recorder.tap_play': 'Touchez lire pour tester',
    'recorder.tap_red': 'Touchez le bouton rouge',
    'category.NOUN': 'Choses',
    'category.VERB': 'Actions',
    'category.ADJECTIVE': 'Desc.',
    'category.SOCIAL': 'Social',
    'category.OTHER': 'Autre',
    'edit_options.card_desc': 'Changer le nom, l\'image ou le son',
    'edit_options.folder_desc': 'Changer le nom, la couleur ou l\'icône',
    'edit_options.move_desc': 'Changer l\'emplacement du dossier',
    'edit_options.delete_desc': 'Supprimer définitivement',
    'boards.title': 'Mes Tableaux',
    'boards.create': 'Créer un Nouveau Tableau',
    'boards.name_placeholder': 'Nom du Tableau (ex., Maison, École)',
    'boards.switch': 'Changer de Tableau',
    'boards.active': 'Actif',
    'boards.delete_confirm': 'Supprimer ce tableau et tout son contenu ?',
    'boards.default_name': 'Mon Premier Tableau',
    'boards.delete_error_last': 'Impossible de supprimer le dernier tableau.',
    'boards.rename': 'Renommer le Tableau',
    'create.menu_link_desc': 'Carte qui renvoie à un autre tableau',
    'link.title': 'Lien vers le Tableau',
    'link.select_board': 'Sélectionner le Tableau Cible',
    'link.save': 'Créer le Lien',
    'profile.title': 'Profils d\'Enfants',
    'profile.add': 'Ajouter un Enfant',
    'profile.edit': 'Modifier le Profil',
    'profile.name': 'Nom de l\'Enfant',
    'profile.age': 'Âge',
    'profile.avatar_color': 'Couleur de l\'Avatar',
    'profile.create': 'Créer le Profil',
    'profile.switch': 'Changer de Profil',
    'profile.delete_confirm': 'Supprimer ce profil et TOUS les tableaux, cartes et dossiers associés ?',
    'profile.current': 'Actuel',
    'profile.welcome': 'Bienvenue ! Créons un profil pour votre enfant.',
    'profile.name_placeholder': 'ex. Jean',
    'profile.age_placeholder': 'ex. 5',
    'header.back': 'Retour',
    'modal.profile.delete_hover': 'Supprimer le Profil',
    'modal.profile.edit_hover': 'Modifier le Profil',
    'modal.profile.change_language': 'Changer de Langue',
    'recorder.start_recording': 'Démarrer l\'Enregistrement',
    'boards.delete_board_label': 'Tableau',
    'link.no_boards': 'Aucun autre tableau disponible.',
    'default.card.i_want': 'Je veux',
    'default.card.yes': 'Oui',
    'default.card.no': 'Non',
    'default.card.stop': 'Arrêt',
    'default.card.apple': 'Pomme',
    'onboarding.unlock_hint': 'Appuyez et maintenez (1,5 s) pour déverrouiller le Mode Parent.',
    'onboarding.dismiss': 'Compris',
  },
  es: {
    'app.title': 'SpeakEasy',
    'app.new_folder': 'Nueva Carpeta',
    'app.empty_folder': 'Carpeta Vacía',
    'app.switch_parent': 'Cambia al Modo Padre para añadir elementos.',
    'app.hint_tap': 'Toca',
    'app.hint_create': 'para crear tarjeta',
    'app.hint_move_rest': 'para mover elementos, o mantén presionado para reordenar.',
    'app.home_folder': 'Inicio',
    'mode.parent': 'Modo Padre',
    'mode.child': 'Modo Niño',
    'mode.holding': 'Manteniendo...',
    'mode.tap_lock': 'Tocar para Bloquear',
    'mode.hold_edit': 'Mantén para Editar',
    'mode.keep_pressing': 'Sigue presionando',
    'search.placeholder': 'Buscar tarjetas...',
    'search.no_results': 'Sin resultados para',
    'strip.tap_instruction': 'Toca para hablar',
    'strip.clear': 'Borrar Todo',
    'strip.history': 'Historial',
    'strip.speak': 'Hablar',
    'strip.backspace': 'Borrar',
    'strip.remove_item': 'Quitar',
    'modal.create.core': 'Siempre visible',
    'modal.create.core_desc': 'Se mantiene en todas las carpetas',
    'modal.settings.grid_board': 'Se aplica a este tablero',
    'modal.settings.return_home': 'Volver al inicio tras elegir',
    'modal.settings.return_home_desc': 'Regresar al tablero principal después de elegir una palabra',
    'modal.settings.shell': 'Aspecto',
    'modal.settings.shell_young': 'Primeros años',
    'modal.settings.shell_neutral': 'Neutro',
    'modal.settings.shell_desc': 'Mismo tablero y colores, estilo más sobrio',
    'modal.settings.access': 'Cómo se eligen las tarjetas',
    'modal.settings.select_release': 'Al soltar',
    'modal.settings.select_press': 'Al tocar',
    'modal.settings.select_dwell': 'Mantener',
    'modal.settings.select_desc': 'Al soltar, deslizar el dedo cancela. Mantener ignora los toques breves o accidentales.',
    'modal.settings.dwell_time': 'Tiempo de mantener',
    'modal.settings.preview': 'Escuchar antes de elegir',
    'modal.settings.preview_desc': 'El primer toque dice la palabra, el segundo la añade a la frase',
    'modal.settings.scan': 'Barrido con pulsador',
    'modal.settings.scan_off': 'Desactivado',
    'modal.settings.scan_linear': 'Una a una',
    'modal.settings.scan_rowcol': 'Filas primero',
    'modal.settings.scan_desc': 'Un resaltado recorre el tablero y el pulsador elige. Espacio o Intro selecciona; las flechas mueven.',
    'modal.settings.scan_rate': 'Velocidad del resaltado',
    'modal.settings.scan_auto': 'Avanza solo',
    'modal.settings.scan_auto_desc': 'Desactivado: un pulsador mueve y otro selecciona',
    'forms.title': 'Formas de la palabra',
    'forms.edit_label': 'Otras formas',
    'forms.edit_hint': 'Una por línea, por ejemplo: quiere, quería, queriendo. El niño elige entre ellas en la tarjeta.',
    'nav.categories': 'Categorías',
    'nav.add_card': 'Añadir',
    'nav.settings': 'Ajustes',
    'nav.boards': 'Tableros',
    'nav.profiles': 'Perfiles',
    'nav.all': 'Todo',
    'empty.welcome': '¡Bienvenido!',
    'empty.instruction': 'Está un poco vacío. Mantén presionado el candado para Modo Padre y crea una tarjeta.',
    'empty.no_cards': 'No hay tarjetas.',
    'empty.hidden_hint': 'Revisa el Modo Padre, pueden estar ocultos.',
    'modal.create.title_new': 'Nueva Tarjeta',
    'modal.create.title_edit': 'Editar Tarjeta',
    'modal.create.camera': 'Cámara',
    'modal.create.upload': 'Subir',
    'modal.create.change': 'Cambiar',
    'modal.create.retake': 'Rehacer',
    'modal.create.name_label': 'Nombre',
    'modal.create.name_placeholder': 'ej. Manzana',
    'modal.create.visibility': 'Visibilidad',
    'modal.create.visible': 'Visible para el niño',
    'modal.create.hidden': 'Oculto para el niño',
    'modal.create.category': 'Categoría',
    'modal.create.sound_label': 'Sonido',
    'modal.create.recording': 'Grabación',
    'modal.create.tts': 'Texto a Voz',
    'modal.create.tts_placeholder': 'Texto para leer...',
    'modal.create.tts_hint': 'Si está vacío, se leerá el nombre de la tarjeta.',
    'modal.create.preview': 'Probar Voz',
    'modal.create.save': 'Guardar',
    'modal.create.update': 'Actualizar',
    'create.in_folder': 'En la carpeta:',
    'create.change_image': 'Cambiar Imagen',
    'create.symbol': 'Símbolo',
    'create.search_type_hint': 'Escribe para buscar símbolos',
    'create.no_results': 'Sin resultados',
    'create.attribution': 'Manejado por ARASAAC • Creative Commons',
    'create.menu_title': 'Crear',
    'create.menu_card_desc': 'Añadir foto o símbolo',
    'create.menu_folder_desc': 'Nueva carpeta de categoría',
    'modal.history.title': 'Historial Reciente',
    'modal.history.empty': 'No hay historial',
    'modal.history.empty_desc': 'Las frases que digas aparecerán aquí.',
    'modal.settings.title': 'Ajustes',
    'modal.settings.language': 'Idioma (Language)',
    'modal.settings.voice': 'Voz y Habla',
    'modal.settings.speed': 'Velocidad',
    'modal.settings.pitch': 'Tono',
    'modal.settings.grid': 'Tamaño de tarjetas',
    'modal.settings.grid_large': 'Grande',
    'modal.settings.grid_medium': 'Medio',
    'modal.settings.grid_small': 'Pequeño',
    'modal.settings.done': 'Hecho',
    'modal.settings.behavior': 'Tira de Oración',
    'modal.settings.max_length': 'Límite de frase',
    'modal.settings.max_length_none': 'Sin límite',
    'modal.settings.auto_clear': 'Auto-limpiar',
    'modal.settings.auto_clear_desc': 'Quitar tarjetas automáticamente después de hablar.',
    'modal.settings.test_voice': 'Probar Voz',
    'modal.settings.test_error': 'Error',
    'modal.categories.title': 'Manejar Categorías',
    'modal.categories.add': 'Añadir Categoría',
    'modal.categories.note': 'Nota: Borrar una categoría <strong>no</strong> borra las tarjetas. Se verán grises hasta que les cambies de categoría.',
    'modal.categories.name': 'Nombre',
    'modal.categories.theme': 'Color o Tema',
    'modal.categories.cancel': 'Cancelar',
    'modal.categories.save': 'Guardar',
    'modal.confirm.delete_title': '¿Borrar esto?',
    'modal.confirm.delete_desc': '¿Estás seguro? Es irrevesible.',
    'modal.confirm.delete_folder_desc': 'Borrar la carpeta moverá todas sus tarjetas al Inicio.',
    'modal.confirm.cancel': 'Cancelar',
    'modal.confirm.yes': 'Sí, Borrar',
    'folder.edit': 'Editar Carpeta',
    'folder.open': 'Abrir Carpeta',
    'folder.open_desc': 'Abrir para añadir ver o items',
    'folder.new': 'Nueva Carpeta',
    'folder.name_label': 'Nombre de carpeta',
    'folder.name_placeholder': 'ej. Comida, Escuela',
    'folder.color_label': 'Color Fitzgerald',
    'folder.color_desc': 'Código de color para estructurar las frases.',
    'folder.icon_search_label': 'Búsqueda de icono',
    'folder.icon_search_hint': 'Coloca al menos 3 caracteres',
    'folder.web_symbols': 'Símbolos online (ARASAAC)',
    'folder.searching': 'Buscando en ARASAAC...',
    'folder.builtin_icons': 'Iconos Locales',
    'folder.no_icons': 'Ninguno.',
    'folder.saving': 'Guardando...',
    'folder.save': 'Guardar Carpeta',
    'folder.default.people': 'Gente',
    'folder.default.actions': 'Acciones',
    'folder.default.things': 'Cosas',
    'folder.default.desc': 'Descrip.',
    'folder.default.social': 'Social',
    'folder.default.places': 'Lugares',
    'folder.default.food': 'Comida',
    'folder.default.time': 'Tiempo',
    'fitzgerald.people': 'Gente / Nombres',
    'fitzgerald.people_desc': 'Quién',
    'fitzgerald.verbs': 'Verbos / Acciones',
    'fitzgerald.verbs_desc': 'Haciendo',
    'fitzgerald.nouns': 'Sustantivos / Cosas',
    'fitzgerald.nouns_desc': 'Qué',
    'fitzgerald.adjectives': 'Adjetivos',
    'fitzgerald.adjectives_desc': 'Describe',
    'fitzgerald.social': 'Social / Cortesía',
    'fitzgerald.social_desc': 'Saludos',
    'fitzgerald.places': 'Lugares',
    'fitzgerald.places_desc': 'Dónde',
    'fitzgerald.emergency': 'Emergencia / Importante',
    'fitzgerald.emergency_desc': 'Parar / No',
    'fitzgerald.time': 'Tiempo / Preposiciones',
    'fitzgerald.time_desc': 'Cuándo / Dónde',
    'fitzgerald.misc': 'Otros / Úti',
    'fitzgerald.misc_desc': 'Otros',
    'move.title': 'Mover',
    'move.moving': 'Moviendo:',
    'move.destination': 'Seleccionar Destino',
    'move.home': 'Inicio',
    'move.no_folders': 'Sin carpetas disponibles.',
    'recorder.recording': 'Grabando...',
    'recorder.saved': 'Sonido guardado',
    'recorder.no_sound': 'Sin sonido',
    'recorder.playing': 'Sonando...',
    'recorder.tap_play': 'Escuchar para probar',
    'recorder.tap_red': 'Elige botón rojo',
    'category.NOUN': 'Cosas',
    'category.VERB': 'Acciones',
    'category.ADJECTIVE': 'Descrip.',
    'category.SOCIAL': 'Social',
    'category.OTHER': 'Otros',
    'edit_options.card_desc': 'Cambia nombre, foto, o sonido',
    'edit_options.folder_desc': 'Cambia nombre, color, o icono',
    'edit_options.move_desc': 'Mover a otra carpeta',
    'edit_options.delete_desc': 'Borrar permanentemente',
    'boards.title': 'Mis Tableros',
    'boards.create': 'Crear Nuevo',
    'boards.name_placeholder': 'Tablero (ej. Casa, Escuela)',
    'boards.switch': 'Cambiar',
    'boards.active': 'Activo',
    'boards.delete_confirm': '¿Borrar esto y todo el contenido?',
    'boards.default_name': 'Mi Primer Tablero',
    'boards.delete_error_last': 'No se puede borrar la última.',
    'boards.rename': 'Renombrar',
    'create.menu_link_desc': 'Tarjeta para ir a otro tablero',
    'link.title': 'Crear Link',
    'link.select_board': 'Elige Tablero Destino',
    'link.save': 'Guardar',
    'profile.title': 'Perfiles Infantiles',
    'profile.add': 'Añadir Hijo',
    'profile.edit': 'Editar Perfil',
    'profile.name': 'Nombre de Hijo(a)',
    'profile.age': 'Edad',
    'profile.avatar_color': 'Color',
    'profile.create': 'Crear',
    'profile.switch': 'Cambiar Perfil',
    'profile.delete_confirm': 'Borrar perfil y TODOS los archivos, tableros y tarjetas asociadas?',
    'profile.current': 'Actual',
    'profile.welcome': '¡Bienvenido! Hagamos el perfil para su estudiante o hijo.',
    'profile.name_placeholder': 'ej. Juan',
    'profile.age_placeholder': 'ej. 5',
    'header.back': 'Volver',
    'modal.profile.delete_hover': 'Borrar Perfil',
    'modal.profile.edit_hover': 'Editar Perfil',
    'modal.profile.change_language': 'Cambiar de Lenguaje',
    'recorder.start_recording': 'Empezar Grabación',
    'boards.delete_board_label': 'Tablero',
    'link.no_boards': 'No hay más tableros.',
    'default.card.i_want': 'Yo quiero',
    'default.card.yes': 'Sí',
    'default.card.no': 'No',
    'default.card.stop': 'Parar',
    'default.card.apple': 'Manzana',
    'onboarding.unlock_hint': 'Mantenga pulsado (1,5 s) para el Modo Padres.',
    'onboarding.dismiss': 'Entendido',
  }
};

export const getTranslation = (lang: AppLanguage, key: TranslationKey): string => {
  return translations[lang][key] || translations['en'][key] || key;
};
