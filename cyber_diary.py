import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import os
from datetime import datetime, date

class CyberDiary:
    def __init__(self, root):
        self.root = root
        self.root.title("КиберПанк Ежедневник v1.0")
        self.root.geometry("800x600")
        self.root.configure(bg='black')
        self.data_file = "diary_data.json"
        self.notes = self.load_data()

        # Цветовая схема в стиле киберпанк
        self.bg_color = 'black'
        self.text_color = '#00ff00'  # Неоново-зеленый
        self.accent_color = '#ff00ff' # Неоново-розовый
        self.secondary_color = '#0099ff' # Неоново-синий
        self.entry_bg = '#0a0a0a'
        self.font = ('Courier New', 10)
        self.title_font = ('Courier New', 12, 'bold')

        self.setup_ui()

    def setup_ui(self):
        # Фрейм для ввода данных
        input_frame = tk.Frame(self.root, bg=self.bg_color)
        input_frame.pack(padx=10, pady=10, fill=tk.X)

        # Метка и поле для даты
        tk.Label(input_frame, text="ДАТА [ГГГГ-ММ-ДД]:", fg=self.secondary_color, bg=self.bg_color, font=self.font).grid(row=0, column=0, sticky='w', padx=(0, 5))
        self.date_entry = tk.Entry(input_frame, bg=self.entry_bg, fg=self.text_color, insertbackground=self.text_color, font=self.font, width=15)
        self.date_entry.grid(row=0, column=1, padx=(0, 10))
        self.date_entry.insert(0, str(date.today()))  # Установка текущей даты по умолчанию

        # Кнопка для вставки сегодняшней даты
        tk.Button(input_frame, text="СЕГОДНЯ", command=self.insert_today, bg=self.entry_bg, fg=self.accent_color, font=self.font, relief='solid', bd=1).grid(row=0, column=2, padx=(0, 10))

        # Метка и поле для заметки
        tk.Label(input_frame, text="ЗАМЕТКА/ЗАДАЧА:", fg=self.secondary_color, bg=self.bg_color, font=self.font).grid(row=1, column=0, sticky='w', pady=(10, 0))
        self.note_entry = tk.Entry(input_frame, bg=self.entry_bg, fg=self.text_color, insertbackground=self.text_color, font=self.font, width=50)
        self.note_entry.grid(row=1, column=1, columnspan=2, pady=(10, 0), sticky='we')
        self.note_entry.bind('<Return>', lambda event: self.add_note())  # Добавление по Enter

        # Кнопка добавления заметки
        tk.Button(input_frame, text="ДОБАВИТЬ [+] ", command=self.add_note, bg=self.entry_bg, fg=self.accent_color, font=self.title_font, relief='solid', bd=1).grid(row=1, column=3, pady=(10, 0), padx=(10, 0))

        # Разделитель
        separator = ttk.Separator(self.root, orient='horizontal')
        separator.pack(fill=tk.X, padx=10, pady=5)

        # Фрейм для отображения и управления заметками
        list_frame = tk.Frame(self.root, bg=self.bg_color)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Метка списка
        tk.Label(list_frame, text="СПИСОК ЗАМЕТОК:", fg=self.accent_color, bg=self.bg_color, font=self.title_font).pack(anchor='w')

        # Виджет Treeview для отображения списка заметок в виде таблицы
        columns = ('Date', 'Note', 'Status')
        self.notes_tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=15)
        
        # Стилизация Treeview (сложно, но попробуем)
        style = ttk.Style()
        style.theme_use('default')
        style.configure("Treeview", background=self.entry_bg, foreground=self.text_color, fieldbackground=self.entry_bg, borderwidth=0, highlightthickness=0)
        style.configure("Treeview.Heading", background=self.secondary_color, foreground=self.bg_color, font=self.font)
        style.map('Treeview', background=[('selected', self.accent_color)])

        # Настройка колонок
        self.notes_tree.heading('Date', text='ДАТА')
        self.notes_tree.heading('Note', text='ЗАМЕТКА')
        self.notes_tree.heading('Status', text='СТАТУС')
        self.notes_tree.column('Date', width=100, anchor='center')
        self.notes_tree.column('Note', width=500, anchor='w')
        self.notes_tree.column('Status', width=80, anchor='center')

        # Полоса прокрутки для Treeview
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.notes_tree.yview)
        self.notes_tree.configure(yscrollcommand=scrollbar.set)
        self.notes_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Фрейм для кнопок управления
        button_frame = tk.Frame(list_frame, bg=self.bg_color)
        button_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(5, 0))

        # Кнопки удаления и отметки о выполнении
        tk.Button(button_frame, text="ОТМЕТИТЬ ВЫПОЛНЕННЫМ", command=self.mark_done, bg=self.entry_bg, fg=self.secondary_color, font=self.font, relief='solid', bd=1).pack(side=tk.LEFT, padx=(0, 5))
        tk.Button(button_frame, text="УДАЛИТЬ [X]", command=self.delete_note, bg=self.entry_bg, fg='red', font=self.font, relief='solid', bd=1).pack(side=tk.LEFT)

        # Заполняем дерево заметками при запуске
        self.refresh_notes_list()

    def insert_today(self):
        """Вставляет сегодняшнюю дату в поле даты."""
        self.date_entry.delete(0, tk.END)
        self.date_entry.insert(0, str(date.today()))

    def load_data(self):
        """Загружает данные из JSON-файла. Если файла нет, возвращает пустой список."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, Exception):
                return []
        return []

    def save_data(self):
        """Сохраняет данные в JSON-файл."""
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.notes, f, ensure_ascii=False, indent=4)

    def add_note(self):
        """Добавляет новую заметку."""
        note_date = self.date_entry.get().strip()
        note_text = self.note_entry.get().strip()

        if not note_date or not note_text:
            messagebox.showwarning("Предупреждение", "Поля ДАТА и ЗАМЕТКА должны быть заполнены!")
            return

        # Простая проверка даты
        try:
            datetime.strptime(note_date, '%Y-%m-%d')
        except ValueError:
            messagebox.showwarning("Предупреждение", "Неверный формат даты! Используйте ГГГГ-ММ-ДД.")
            return

        new_note = {
            "date": note_date,
            "text": note_text,
            "status": "АКТИВНО"
        }
        self.notes.append(new_note)
        self.save_data()
        self.refresh_notes_list()
        self.note_entry.delete(0, tk.END)  # Очищаем поле ввода заметки
        messagebox.showinfo("Успех", "Заметка добавлена!")

    def delete_note(self):
        """Удаляет выбранную заметку."""
        selected_item = self.notes_tree.selection()
        if not selected_item:
            messagebox.showwarning("Предупреждение", "Выберите заметку для удаления.")
            return
        # Получаем индекс выбранной заметки в дереве (он совпадает с индексом в списке, т.к. мы так заполняем)
        index = self.notes_tree.index(selected_item[0])
        del self.notes[index]
        self.save_data()
        self.refresh_notes_list()

    def mark_done(self):
        """Отмечает выбранную задачу как выполненную."""
        selected_item = self.notes_tree.selection()
        if not selected_item:
            messagebox.showwarning("Предупреждение", "Выберите задачу для отметки.")
            return
        index = self.notes_tree.index(selected_item[0])
        self.notes[index]['status'] = "ВЫПОЛНЕНО"
        self.save_data()
        self.refresh_notes_list()

    def refresh_notes_list(self):
        """Обновляет список заметок в Treeview."""
        # Очищаем текущий список
        for item in self.notes_tree.get_children():
            self.notes_tree.delete(item)
        # Сортируем заметки по дате (от новых к старым)
        sorted_notes = sorted(self.notes, key=lambda x: x['date'], reverse=True)
        # Заполняем дерево
        for note in sorted_notes:
            # Меняем цвет статуса
            status = note['status']
            self.notes_tree.insert('', tk.END, values=(note['date'], note['text'], status))

if __name__ == "__main__":
    root = tk.Tk()
    app = CyberDiary(root)
    root.mainloop()
