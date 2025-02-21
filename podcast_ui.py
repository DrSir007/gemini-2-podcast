import sys
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QPushButton, QLabel, QFileDialog, 
                            QTextEdit, QComboBox, QProgressBar, QMessageBox)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont, QIcon
from dotenv import load_dotenv
import generate_script
import generate_audio
import generate_podcast

class PodcastWorker(QThread):
    progress = pyqtSignal(int)
    finished = pyqtSignal(bool, str)
    
    def __init__(self, content, content_type):
        super().__init__()
        self.content = content
        self.content_type = content_type
        
    def run(self):
        try:
            # Generate script
            script = generate_script.generate_content(self.content_type, self.content)
            self.progress.emit(50)
            
            # Generate audio
            generate_audio.convert_to_audio(script)
            self.progress.emit(100)
            
            self.finished.emit(True, "Podcast generated successfully!")
        except Exception as e:
            self.finished.emit(False, f"Error: {str(e)}")

class PodcastGeneratorUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.initUI()
        
    def initUI(self):
        # Main window setup
        self.setWindowTitle('Podcast Generator')
        self.setMinimumSize(800, 600)
        
        # Create central widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(20)
        layout.setContentsMargins(30, 30, 30, 30)
        
        # Title
        title = QLabel('Convert Content to Podcast')
        title.setFont(QFont('Arial', 24, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # Content type selection
        type_layout = QHBoxLayout()
        type_label = QLabel('Content Type:')
        type_label.setFont(QFont('Arial', 12))
        self.type_combo = QComboBox()
        self.type_combo.addItems(['PDF', 'URL', 'Text', 'Markdown'])
        self.type_combo.setFont(QFont('Arial', 12))
        type_layout.addWidget(type_label)
        type_layout.addWidget(self.type_combo)
        layout.addLayout(type_layout)
        
        # Content input
        content_label = QLabel('Content:')
        content_label.setFont(QFont('Arial', 12))
        layout.addWidget(content_label)
        
        self.content_text = QTextEdit()
        self.content_text.setFont(QFont('Arial', 12))
        self.content_text.setPlaceholderText("Enter URL, paste text, or click 'Browse' for files...")
        layout.addWidget(self.content_text)
        
        # Browse button
        browse_btn = QPushButton('Browse')
        browse_btn.setFont(QFont('Arial', 12))
        browse_btn.clicked.connect(self.browse_file)
        layout.addWidget(browse_btn)
        
        # Generate button
        generate_btn = QPushButton('Generate Podcast')
        generate_btn.setFont(QFont('Arial', 14, QFont.Weight.Bold))
        generate_btn.setMinimumHeight(50)
        generate_btn.clicked.connect(self.generate_podcast)
        layout.addWidget(generate_btn)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setTextVisible(True)
        layout.addWidget(self.progress_bar)
        
        # Status label
        self.status_label = QLabel('')
        self.status_label.setFont(QFont('Arial', 12))
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.status_label)
        
    def browse_file(self):
        content_type = self.type_combo.currentText().lower()
        file_filter = f"{content_type.upper()} Files (*.{content_type})"
        if content_type == 'text':
            file_filter = "Text Files (*.txt)"
            
        file_name, _ = QFileDialog.getOpenFileName(
            self,
            "Select File",
            "",
            file_filter
        )
        
        if file_name:
            try:
                with open(file_name, 'r', encoding='utf-8') as file:
                    self.content_text.setText(file.read())
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Could not read file: {str(e)}")
                
    def generate_podcast(self):
        content = self.content_text.toPlainText().strip()
        if not content:
            QMessageBox.warning(self, "Warning", "Please enter or load some content first!")
            return
            
        content_type = self.type_combo.currentText().lower()
        
        # Disable UI elements
        self.content_text.setEnabled(False)
        self.type_combo.setEnabled(False)
        
        # Reset progress
        self.progress_bar.setValue(0)
        self.status_label.setText("Generating podcast...")
        
        # Create and start worker thread
        self.worker = PodcastWorker(content, content_type)
        self.worker.progress.connect(self.update_progress)
        self.worker.finished.connect(self.generation_finished)
        self.worker.start()
        
    def update_progress(self, value):
        self.progress_bar.setValue(value)
        
    def generation_finished(self, success, message):
        # Re-enable UI elements
        self.content_text.setEnabled(True)
        self.type_combo.setEnabled(True)
        
        # Update status
        self.status_label.setText(message)
        
        if success:
            QMessageBox.information(self, "Success", message)
        else:
            QMessageBox.critical(self, "Error", message)

def main():
    # Load environment variables
    load_dotenv()
    
    # Create and run application
    app = QApplication(sys.argv)
    app.setStyle('Fusion')  # Modern style
    window = PodcastGeneratorUI()
    window.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main() 